import { jest } from "@jest/globals";

// Create mock functions
export const mockInit = jest.fn();
export const mockCaptureException = jest.fn();
export const mockCaptureMessage = jest.fn();
export const mockWithScope = jest.fn((callback: any) => callback({}));

// Export mock Sentry
export const Sentry = {
  init: mockInit,
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
  withScope: mockWithScope,
};

// Export createWriteStream function that uses the mocks
export function createWriteStream(options: any) {
  if (!options.sentryInstance) {
    mockInit(options);
  }
  return {
    write: (obj: any) => {
      // Actually use the obj parameter
      if (obj.level >= 50) {
        // Error or fatal in pino
        mockCaptureException(obj);
      } else {
        mockCaptureMessage(obj.msg || JSON.stringify(obj));
      }
      return true;
    },
  };
}
