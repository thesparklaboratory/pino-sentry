import { jest } from "@jest/globals";
import pino from "pino";

// Import the mocks directly
import { createWriteStream, Sentry, mockInit } from "../src/__mocks__/index";

jest.mock("../src/index");

describe("logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Test logger creation", () => {
    const SENTRY_DSN = "https://123@123.ingest.sentry.io/123";
    const options = { level: "info" };

    const stream = createWriteStream({
      dsn: SENTRY_DSN,
      sentryInstance: undefined,
    });

    const logger = pino(options, stream);

    // Use the explicit mock functions
    expect(mockInit).toHaveBeenCalled();

    logger.info("testtt info log");
    logger.error("testtt log");
  });

  test("should not initialize sentry when sentryInstance is provided", () => {
    const SENTRY_DSN = "https://123@123.ingest.sentry.io/123";
    const options = { level: "info" };

    const stream = createWriteStream({
      dsn: SENTRY_DSN,
      sentryInstance: Sentry,
    });

    pino(options, stream);

    // Check that it wasn't called after resetting mocks
    expect(mockInit).not.toHaveBeenCalled();
  });
});
