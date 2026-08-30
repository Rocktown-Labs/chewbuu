import type { auth as authInstance } from "./index";

type AuthInstance = typeof authInstance;

const getProperty = (value: unknown, property: string): unknown => {
  if (
    (typeof value !== "object" || value === null) &&
    typeof value !== "function"
  ) {
    return undefined;
  }
  return Reflect.get(value, property);
};

const hasAuthApi = (value: unknown): value is AuthInstance => {
  const api = getProperty(value, "api");
  return (
    typeof api === "object" &&
    api !== null &&
    typeof getProperty(api, "getSession") === "function"
  );
};

/**
 * Resolve Better Auth from either native ESM or CommonJS interop shapes.
 * AWS Blocks' Lambda bundler can wrap workspace modules differently between
 * local and deployed builds, so relying on only a named `auth` export is not
 * safe at runtime.
 */
export const resolveAuthModule = (module: unknown): AuthInstance => {
  const defaultExport = getProperty(module, "default");
  const candidates = [
    getProperty(module, "auth"),
    getProperty(defaultExport, "auth"),
    defaultExport,
    module,
  ];

  for (const candidate of candidates) {
    if (hasAuthApi(candidate)) {
      return candidate;
    }
  }

  const factories = [
    getProperty(module, "createAuth"),
    getProperty(defaultExport, "createAuth"),
  ];
  for (const factory of factories) {
    if (typeof factory !== "function") {
      continue;
    }
    const created = factory();
    if (hasAuthApi(created)) {
      return created;
    }
  }

  throw new Error("Better Auth module did not expose an initialized auth API.");
};
