const setDefaultEnv = (key: string, value: string) => {
  process.env[key] ??= value;
};

setDefaultEnv("BETTER_AUTH_SECRET", "test-secret-at-least-thirty-two-chars");
setDefaultEnv("BETTER_AUTH_URL", "http://localhost:3000/api/auth");
setDefaultEnv("CORS_ORIGIN", "http://localhost:3001");
setDefaultEnv(
  "DATABASE_URL",
  "postgres://user:password@localhost:5432/chewbuu_test"
);
setDefaultEnv("NODE_ENV", "test");
