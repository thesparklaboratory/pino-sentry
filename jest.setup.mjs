import { jest } from "@jest/globals";

jest.mock("@sentry/node", () => {
  const sentryNode = jest.requireActual("@sentry/node");
  return {
    ...sentryNode,
    init: jest.fn(),
  };
});
