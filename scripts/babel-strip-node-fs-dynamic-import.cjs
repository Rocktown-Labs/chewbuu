/**
 * Shared Metro/Babel plugin for the Expo apps.
 *
 * @aws-blocks/core's browser client contains a dynamic `import("node:fs")`
 * (config-file discovery for Node SSR). Hermes cannot parse dynamic import
 * in that position, so production bundles (`expo export` / EAS builds) fail
 * with `SyntaxError: Invalid expression encountered`, and dev logs the same
 * error per bundle.
 *
 * The call site is guarded by `process.versions?.node` (never true on
 * native/web) and already wrapped in try/catch with a config-file fallback,
 * so replacing it with a rejected promise preserves behavior on every
 * platform while keeping the module parseable.
 */
function stripNodeFsDynamicImport(babel) {
  const { template } = babel;
  return {
    visitor: {
      Import(path, state) {
        const args = path.parentPath.get("arguments") ?? [];
        const [firstArg] = args;
        const filename = state.file?.opts?.filename ?? state.filename ?? "";
        if (
          firstArg &&
          typeof firstArg.isStringLiteral === "function" &&
          firstArg.isStringLiteral() &&
          firstArg.node.value === "node:fs" &&
          filename.includes("@aws-blocks")
        ) {
          path.parentPath.replaceWith(
            template.ast(
              'Promise.reject(new Error("node:fs is unavailable in this environment"))'
            )
          );
        }
      },
    },
  };
}

module.exports = { stripNodeFsDynamicImport };
