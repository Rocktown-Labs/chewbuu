import path from "node:path";

import {
  BlocksStack,
  SandboxDisableDeletionProtection,
} from "@aws-blocks/blocks/cdk";
import { getStackName } from "@aws-blocks/blocks/scripts";
import * as cdk from "aws-cdk-lib";
import { Mixins, RemovalPolicies } from "aws-cdk-lib";

const directory = import.meta.dirname;
const app = new cdk.App();
const sandboxMode = app.node.tryGetContext("sandboxMode") === "true";
const projectRoot = app.node.tryGetContext("projectRoot") || process.cwd();

export const blocksStack = await BlocksStack.create(
  app,
  getStackName({ projectRoot, sandbox: sandboxMode }),
  {
    backendCDKPath: path.join(directory, "index.ts"),
    backendHandlerPath: path.join(directory, "index.handler.ts"),
  }
);

if (sandboxMode) {
  RemovalPolicies.of(blocksStack).destroy();
  Mixins.of(blocksStack).apply(new SandboxDisableDeletionProtection());
  blocksStack.handler.addEnvironment("BLOCKS_SANDBOX", "true");
}

blocksStack.handler.addEnvironment(
  "CORS_ALLOWED_ORIGINS",
  process.env.CORS_ALLOWED_ORIGINS ??
    "^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$,https://(.*\\.)?chewbuu\\.com,https://.*\\.vercel\\.app"
);

const blocksApiOutput = new cdk.CfnOutput(blocksStack, "BlocksApiUrl", {
  value: blocksStack.apiUrl,
});

void blocksApiOutput;
