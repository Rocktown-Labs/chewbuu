import { startSandbox } from "@aws-blocks/blocks/scripts";

await startSandbox({
  backendPath: `${import.meta.dirname}/../index.cdk.ts`,
  devCommand: "bun run dev:blocks",
});
