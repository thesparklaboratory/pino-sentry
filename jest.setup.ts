import requireActual = jest.requireActual;

jest.mock("@sentry/node", () => {
  const sentryNode = requireActual("@sentry/node");
  return ({
    ...sentryNode,
    init: jest.fn(),
  });
});
