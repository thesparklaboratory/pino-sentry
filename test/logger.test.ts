import pinoLogger from "pino";

import {createWriteStream, Sentry} from "../src";


describe('logger', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('Test logger creation', () => {
    const SENTRY_DSN = "https://123@123.ingest.sentry.io/123";

    const options = {
      level: "info"
    };

    const stream = createWriteStream({dsn: SENTRY_DSN, sentryInstance: undefined});


    const logger = pinoLogger(options, stream);
    expect(Sentry.init).toHaveBeenCalled();

    logger.info('testtt info log');
    logger.error('testtt log');
  });


  test("should not initialize sentry when sentryInstance is provided", () => {
    const SENTRY_DSN = "https://123@123.ingest.sentry.io/123";

    const options = {
      level: "info"
    };

    const stream = createWriteStream({dsn: SENTRY_DSN, sentryInstance: Sentry});

    pinoLogger(options, stream);

    expect(Sentry.init).not.toHaveBeenCalled();
  });

});


