import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const webRoot = path.resolve(import.meta.dirname, "..");
const outputNodeModules = path.join(
  webRoot,
  ".output",
  "server",
  "node_modules"
);

const runtimeDeps = ["react", "react-dom", "scheduler"];

mkdirSync(outputNodeModules, { recursive: true });

for (const name of runtimeDeps) {
  const sourceDir =
    name === "scheduler"
      ? path.dirname(
          require.resolve("scheduler/package.json", {
            paths: [path.dirname(require.resolve("react-dom/package.json"))],
          })
        )
      : path.dirname(require.resolve(`${name}/package.json`));
  const targetDir = path.join(outputNodeModules, name);
  if (!existsSync(targetDir)) {
    cpSync(sourceDir, targetDir, { recursive: true, dereference: true });
  }
}
