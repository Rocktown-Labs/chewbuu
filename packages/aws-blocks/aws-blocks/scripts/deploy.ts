import path from "node:path";

import { deploy } from "@aws-blocks/blocks/scripts";

await deploy({
  cdkAppPath: path.join(import.meta.dirname, "..", "index.cdk.ts"),
  projectRoot: path.join(import.meta.dirname, "..", ".."),
});
