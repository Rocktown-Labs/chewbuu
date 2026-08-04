import path from "node:path";

import {
  BlocksStack,
  Hosting,
  SandboxDisableDeletionProtection,
} from "@aws-blocks/blocks/cdk";
import { getStackName } from "@aws-blocks/blocks/scripts";
import * as cdk from "aws-cdk-lib";
import { Mixins, RemovalPolicies } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

const directory = import.meta.dirname;
const app = new cdk.App();
const sandboxMode = app.node.tryGetContext("sandboxMode") === "true";
const projectRoot = app.node.tryGetContext("projectRoot") || process.cwd();
const deployFrontend =
  process.env.DEPLOY_FRONTEND_TO_AWS === "true" ||
  process.env.AWS_HOSTING === "true";

export const blocksStack = await BlocksStack.create(
  app,
  getStackName({ projectRoot, sandbox: sandboxMode }),
  {
    backendCDKPath: path.join(directory, "index.ts"),
    backendHandlerPath: path.join(directory, "index.handler.ts"),
  }
);

if (deployFrontend && !sandboxMode) {
  const webHosting = new Hosting(blocksStack, "WebHosting", {
    root: path.resolve(directory, "../../../apps/web"),
    framework: "tanstack-start",
    api: blocksStack,
  });
  void webHosting;
}

if (sandboxMode) {
  RemovalPolicies.of(blocksStack).destroy();
  Mixins.of(blocksStack).apply(new SandboxDisableDeletionProtection());
  blocksStack.handler.addEnvironment("BLOCKS_SANDBOX", "true");
}

blocksStack.handler.addEnvironment(
  "CORS_ALLOWED_ORIGINS",
  process.env.CORS_ALLOWED_ORIGINS ||
    "^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$,https://(.*\\.)?chewbuu\\.com,https://.*\\.vercel\\.app"
);

if (process.env.VITE_NEON_AUTH_URL) {
  blocksStack.handler.addEnvironment(
    "VITE_NEON_AUTH_URL",
    process.env.VITE_NEON_AUTH_URL
  );
}
if (process.env.DATABASE_URL) {
  blocksStack.handler.addEnvironment("DATABASE_URL", process.env.DATABASE_URL);
}

blocksStack.handler.addToRolePolicy(
  new cdk.aws_iam.PolicyStatement({
    actions: [
      "chime:CreateAttendee",
      "chime:CreateMeeting",
      "chime:DeleteMeeting",
      "chime:GetMeeting",
    ],
    resources: ["*"],
  })
);

const dateLifecycleSchedule = new events.Rule(
  blocksStack,
  "DateLifecycleSchedule",
  {
    schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
    targets: [new targets.LambdaFunction(blocksStack.handler)],
  }
);
void dateLifecycleSchedule;

const blocksApiOutput = new cdk.CfnOutput(blocksStack, "BlocksApiUrl", {
  value: blocksStack.apiUrl,
});

void blocksApiOutput;
