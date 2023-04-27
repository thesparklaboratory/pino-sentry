import {
  createErrorWithMessage,
  PinoSentryOptions,
  PinoSentryTransport, PinoSerializedError,
  SEVERITIES_MAP,
  Severity
} from "../src/transport";

describe('PinoSentryTransport', () => {
  describe('constructor', () => {
    it('should create an instance with default values', () => {
      const transport = new PinoSentryTransport({dsn: "mockDsn"});
      expect(transport).toBeDefined();
    });

    it('should create an instance with custom options', () => {
      const options: PinoSentryOptions = {
        level: Severity.Error,
        dsn: "mockDsn"
      };
      const transport = new PinoSentryTransport(options);
      expect(transport.minimumLogLevel).toBe(5); // Error level
    });
  });

  describe('getLogSeverity', () => {
    it('should return the correct Severity based on level', () => {
      const transport = new PinoSentryTransport({dsn: "mockDsn"});
      const level = 50; // pino: error
      const severity = transport.getLogSeverity(level);
      expect(severity).toBe(Severity.Error);
    });
  });

  describe('SEVERITIES_MAP', () => {
    it('should have correct Severity values mapped to log levels', () => {
      expect(SEVERITIES_MAP[10]).toBe(Severity.Debug);
      expect(SEVERITIES_MAP[20]).toBe(Severity.Debug);
      expect(SEVERITIES_MAP[30]).toBe(Severity.Info);
      expect(SEVERITIES_MAP[40]).toBe(Severity.Warning);
      expect(SEVERITIES_MAP[50]).toBe(Severity.Error);
      expect(SEVERITIES_MAP[60]).toBe(Severity.Fatal);
      expect(SEVERITIES_MAP.trace).toBe(Severity.Debug);
      expect(SEVERITIES_MAP.debug).toBe(Severity.Debug);
      expect(SEVERITIES_MAP.info).toBe(Severity.Info);
      expect(SEVERITIES_MAP.warning).toBe(Severity.Warning);
      expect(SEVERITIES_MAP.error).toBe(Severity.Error);
      expect(SEVERITIES_MAP.fatal).toBe(Severity.Fatal);
    });

    describe('shouldLog', () => {
      it('should return true if severity is equal to or greater than minimumLogLevel', () => {
        const transport = new PinoSentryTransport({
          level: Severity.Error,
          dsn: "mockDsn"
        });

        const shouldLogWarning = (transport as any).shouldLog(Severity.Warning);
        const shouldLogError = (transport as any).shouldLog(Severity.Error);
        const shouldLogFatal = (transport as any).shouldLog(Severity.Fatal);

        expect(shouldLogWarning).toBe(false);
        expect(shouldLogError).toBe(true);
        expect(shouldLogFatal).toBe(true);
      });

      it('should return false if severity is less than minimumLogLevel', () => {
        const transport = new PinoSentryTransport({level: Severity.Error, dsn: "mockDsn"});

        const shouldLogInfo = (transport as any).shouldLog(Severity.Info);
        const shouldLogDebug = (transport as any).shouldLog(Severity.Debug);

        expect(shouldLogInfo).toBe(false);
        expect(shouldLogDebug).toBe(false);
      });
    });


    describe('createErrorWithMessage', () => {
      it('should create a new error with the given message when err is undefined', () => {
        const message = 'Test message';
        const result = createErrorWithMessage({err: undefined, msg: message});
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toEqual(message);
      });

      it('should create a new error with the prefixed message when err is provided', () => {
        const originalError: PinoSerializedError = {
          type: 'Error',
          message: 'Original error message',
          stack: 'Original stack trace',
        };
        const prefixMessage = 'Prefix message';

        const result = createErrorWithMessage({err: originalError, msg: prefixMessage});
        expect(result).toBeInstanceOf(Error);
        expect(result.message).toEqual(`${prefixMessage}: ${originalError.message}`);
      });

      it('should preserve the original error stack trace and type when err is provided', () => {
        const originalError: PinoSerializedError = {
          type: 'Error',
          message: 'Original error message',
          stack: 'Original stack trace',
        };
        const prefixMessage = 'Prefix message';

        const result = createErrorWithMessage({err: originalError, msg: prefixMessage});
        expect(result.stack).toEqual(originalError.stack);
        expect(result.name).toEqual(originalError.type);
      });
    });
  });


});
