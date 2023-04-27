import stream from 'stream';
import {AsyncResource} from 'async_hooks';
import split from 'split2';
import Pump from 'pumpify';
import through from 'through2';
import * as Sentry from '@sentry/node';
import {SeverityLevel} from "@sentry/node";

type ValueOf<T> = T extends any[] ? T[number] : T[keyof T]

export const SentryInstance = Sentry;


// Local enum declaration, as @sentry/node deprecated using enums over strings for bundle size
export enum Severity {
  Fatal = "fatal",
  Error = "error",
  Warning = "warning",
  Log = "log",
  Info = "info",
  Debug = "debug",
  // @deprecated: "critical" is not present in sentry 7.x sdk
  // https://github.com/getsentry/sentry-javascript/issues/3067
  Critical = "critical",
}

export const SEVERITIES_MAP = {
  10: Severity.Debug,   // pino: trace
  20: Severity.Debug,   // pino: debug
  30: Severity.Info,    // pino: info
  40: Severity.Warning, // pino: warn
  50: Severity.Error,   // pino: error
  60: Severity.Fatal,   // pino: fatal
  // Support for useLevelLabels
  // https://github.com/pinojs/pino/blob/master/docs/api.md#uselevellabels-boolean
  trace: Severity.Debug,
  debug: Severity.Debug,
  info: Severity.Info,
  warning: Severity.Warning,
  error: Severity.Error,
  fatal: Severity.Fatal,
} as const;

// How severe the Severity is
const SeverityIota = {
  [Severity.Debug]: 1,
  [Severity.Log]: 2,
  [Severity.Info]: 3,
  [Severity.Warning]: 4,
  [Severity.Error]: 5,
  [Severity.Fatal]: 6,
  [Severity.Critical]: 7,
} as const;

export interface PinoSentryOptions {
  release?: string;
  dist?: string;
  maxBreadcrumbs?: number;
  sampleRate?: number;
  sentryInstance?: typeof Sentry;
  debug?: boolean;
  dsn?: string;
  serverName?: string;
  environment?: string;
  /** Minimum level for a log to be reported to Sentry from pino-sentry */
  level?: keyof typeof SeverityIota;
  maxValueLength?: number;
  sentryExceptionLevels?: Severity[];
  decorateScope?: (data: Record<string, unknown>, _scope: Sentry.Scope) => void;
}

/**
 * These contain the expected data coming from pino, and it's usage with the @thesparklaboratory/logger package
 */
type Chunk = {
  [key: string]: unknown;
  msg: string;
  err: {
    type: string;
    message: string;
    stack: string;
  };
  hostname: string;
  level: keyof typeof SEVERITIES_MAP;
  pid: number;
  time: number;
  category: string;
  tags: Record<string, string | number | boolean>;
};

export type PinoSerializedError = { type: string; message: string; stack: string };

interface ErrorWithMessageParams {
  err?: PinoSerializedError;
  msg: string;
}

export function createErrorWithMessage({err, msg}: ErrorWithMessageParams) {
  const error = err ? new Error(`${msg}: ${err.message}`) : new Error(msg);
  if (err) {
    error.stack = err.stack;
    error.name = err.type;
  }
  return error;
}

export class PinoSentryTransport {
  // Default minimum log level to `debug`
  minimumLogLevel: ValueOf<typeof SeverityIota> = SeverityIota[Severity.Debug];

  maxValueLength = 250;
  sentryExceptionLevels = [Severity.Fatal, Severity.Error];
  sentryInstance: typeof Sentry = Sentry;

  public constructor(options?: PinoSentryOptions & Sentry.NodeOptions)
  public constructor(options?: PinoSentryOptions) {
    const validatedOptions = this.validateOptions(options || {});

    if (!options?.sentryInstance) {
      Sentry.init(validatedOptions);
    }
  }

  public getLogSeverity(level: keyof typeof SEVERITIES_MAP): Severity {
    return SEVERITIES_MAP[level] || Severity.Info;
  }

  public get sentry() {
    return Sentry;
  }

  public transformer(): stream.Transform {
    return through.obj((chunk: any, _enc: any, cb: any) => {
      this.prepareAndGo(chunk, cb);
    });
  }

  public prepareAndGo(chunkInfo: ChunkInfo, cb: any): void {
    chunkInfo.run((chunk) => {
      this.chunkInfoCallback(chunk, cb);
    });
  }

  private chunkInfoCallback(chunk: Chunk, cb: any) {
    const {
      level,
      msg,
      category,
      err,
      tags = {},
      ...restOfData
    } = chunk;
    const severity = this.getLogSeverity(level);

    if (!this.shouldLog(severity)) {
      setImmediate(cb);
      return;
    }

    if (this.isSentryException(severity)) {
      const error = createErrorWithMessage({err: err, msg: msg});
      Sentry.captureException(error, {extra: {...restOfData, category, error: err, msg}, tags});
      setImmediate(cb);
    } else {
      Sentry.addBreadcrumb({
        message: msg,
        data: {...restOfData, error: err},
        category,
        level: severity as SeverityLevel
      });
      setImmediate(cb);
    }
  }

  private validateOptions(options: PinoSentryOptions): PinoSentryOptions {
    const dsn = options.dsn || process.env.SENTRY_DSN;

    if (!options.sentryInstance && !dsn) {
      console.log('Warning: [pino-sentry] Sentry DSN must be supplied if no sentryInstance is provided, otherwise logs will not be reported. Pass via options or `SENTRY_DSN` environment variable.');
    }

    if (options.level) {
      const allowedLevels = Object.keys(SeverityIota);

      if (!allowedLevels.includes(options.level)) {
        throw new Error(`[pino-sentry] Option \`level\` must be one of: ${allowedLevels.join(', ')}. Received: ${options.level}`);
      }
      // Set minimum log level
      this.minimumLogLevel = SeverityIota[options.level];
    }

    this.sentryInstance = options.sentryInstance ?? Sentry;
    this.maxValueLength = options.maxValueLength ?? this.maxValueLength;
    this.sentryExceptionLevels = options.sentryExceptionLevels ?? this.sentryExceptionLevels;

    return {
      dsn,
      // npm_package_name will be available if ran with
      // from a "script" field in package.json.
      serverName: process.env.npm_package_name || 'pino-sentry',
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
      debug: !!process.env.SENTRY_DEBUG || false,
      sampleRate: 1.0,
      maxBreadcrumbs: 100,
      ...options,
    };
  }

  private isSentryException(level: Severity): boolean {
    return this.sentryExceptionLevels.includes(level);
  }

  private shouldLog(severity: Severity): boolean {
    const logLevel = SeverityIota[severity];
    return logLevel >= this.minimumLogLevel;
  }
}

class ChunkInfo extends AsyncResource {
  constructor(private readonly chunk: Chunk) {
    super("ChunkInfo");
  }

  run<T extends readonly unknown[], R>(callback: (...args: any[]) => R, ...args: T): R {
    try {
      return this.runInAsyncScope(callback, undefined, this.chunk, ...args);
    } finally {
      this.emitDestroy();
    }
  }
}

export function createWriteStream(options?: PinoSentryOptions): stream.Duplex {
  const transport = new PinoSentryTransport(options);
  const sentryTransformer = transport.transformer();

  return new Pump(
    split((line) => {
      try {
        return new ChunkInfo(JSON.parse(line));
      } catch (e) {
        // Returning undefined will not run the sentryTransformer
        return;
      }
    }),
    sentryTransformer
  );
}

// Duplicate to not break API
export const createWriteStreamAsync = createWriteStream;
