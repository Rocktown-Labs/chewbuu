import path from "node:path";

import {
  BlocksStack,
  Hosting,
  SandboxDisableDeletionProtection,
} from "@aws-blocks/blocks/cdk";
import { getStackName } from "@aws-blocks/blocks/scripts";
import { normalizeConnectionString } from "@chewbuu/db/connection-string";
import * as cdk from "aws-cdk-lib";
import { Mixins, RemovalPolicies } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

const directory = import.meta.dirname;
const app = new cdk.App();
const sandboxMode = app.node.tryGetContext("sandboxMode") === "true";
const projectRoot = app.node.tryGetContext("projectRoot") || process.cwd();
const deployFrontend =
  process.env.DEPLOY_FRONTEND_TO_AWS === "true" ||
  process.env.AWS_HOSTING === "true";
const prNumber = process.env.PR_NUMBER;
const stackName = prNumber
  ? `chewbuu-preview-pr-${prNumber}`
  : getStackName({ projectRoot, sandbox: sandboxMode });
const awsAccount =
  process.env.CDK_DEFAULT_ACCOUNT ?? process.env.AWS_ACCOUNT_ID;
const awsRegion =
  process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const cloudfrontCertificateArn = process.env.CLOUDFRONT_CERTIFICATE_ARN;
const deploymentStage = prNumber ? `preview-pr-${prNumber}` : "production";

export const blocksStack = await BlocksStack.create(app, stackName, {
  backendCDKPath: path.join(directory, "index.ts"),
  backendHandlerPath: path.join(directory, "index.handler.ts"),
  env: {
    ...(awsAccount ? { account: awsAccount } : {}),
    region: awsRegion,
  },
});

// Env vars consumed by the Blocks API handler (packages/aws-blocks/src/
// index.blocks.ts), the Better Auth runtime bundled into the SSR Lambda
// (packages/auth/src/index.ts), and the SSR env schema (packages/env/src/
// server.ts). Empty values are skipped so nothing overrides runtime defaults.
const runtimeEnvironment: Record<string, string | undefined> = {
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  BETTER_AUTH_ADMIN_EMAILS: process.env.BETTER_AUTH_ADMIN_EMAILS,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  BLOCKS_AUTH_SECRET_PARAMETER: process.env.BLOCKS_AUTH_SECRET_PARAMETER,
  CHEWBUU_STAGE: process.env.CHEWBUU_STAGE ?? deploymentStage,
  CHIME_MEDIA_REGION: process.env.CHIME_MEDIA_REGION,
  CHIME_REGION: process.env.CHIME_REGION,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  DATABASE_URL: normalizeConnectionString(process.env.DATABASE_URL),
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_URL: process.env.KV_URL,
  LOG_LEVEL: process.env.LOG_LEVEL,
  PR_NUMBER: process.env.PR_NUMBER,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  REDIS_URL: process.env.REDIS_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  SENT_DM_API_KEY: process.env.SENT_DM_API_KEY,
  SENT_DM_BASE_URL: process.env.SENT_DM_BASE_URL,
  SENT_DM_FROM: process.env.SENT_DM_FROM,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
  SENTRY_DSN: process.env.SENTRY_DSN,
  STREAM_API_KEY: process.env.STREAM_API_KEY,
  STREAM_API_SECRET: process.env.STREAM_API_SECRET,
  STRIPE_MINGLE_ANNUAL_PRICE_ID: process.env.STRIPE_MINGLE_ANNUAL_PRICE_ID,
  STRIPE_MINGLE_PRICE_ID: process.env.STRIPE_MINGLE_PRICE_ID,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_SUGAR_ANNUAL_PRICE_ID: process.env.STRIPE_SUGAR_ANNUAL_PRICE_ID,
  STRIPE_SUGAR_PRICE_ID: process.env.STRIPE_SUGAR_PRICE_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

let webHosting: Hosting | undefined;

if (deployFrontend && !sandboxMode) {
  webHosting = new Hosting(blocksStack, "WebHosting", {
    ...(prNumber
      ? {}
      : {
          domain: {
            ...(cloudfrontCertificateArn
              ? {
                  certificate: acm.Certificate.fromCertificateArn(
                    blocksStack,
                    "CloudFrontCertificate",
                    cloudfrontCertificateArn
                  ),
                }
              : {}),
            domainName: ["chewbuu.com", "www.chewbuu.com"],
            hostedZone: "chewbuu.com",
            wwwRedirect: "toApex",
          },
        }),
    root: path.resolve(directory, "../../../apps/web"),
    buildCommand: "bun run build",
    buildOutputDir: ".output",
    framework: "nitro",
    api: blocksStack,
  });
}

for (const [key, value] of Object.entries(runtimeEnvironment)) {
  if (value) {
    blocksStack.handler.addEnvironment(key, value);
    webHosting?.ssrFunction?.addEnvironment(key, value);
  }
}

if (sandboxMode) {
  RemovalPolicies.of(blocksStack).destroy();
  Mixins.of(blocksStack).apply(new SandboxDisableDeletionProtection());
  blocksStack.handler.addEnvironment("BLOCKS_SANDBOX", "true");
}

blocksStack.handler.addEnvironment(
  "CORS_ALLOWED_ORIGINS",
  process.env.CORS_ALLOWED_ORIGINS ||
    "^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$,https://(.*\\.)?chewbuu\\.com,https://.*\\.vercel\\.app,https://(.*\\.)?cloudfront\\.net"
);

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

if (webHosting) {
  const hostingUrlOutput = new cdk.CfnOutput(blocksStack, "HostingUrl", {
    value: webHosting.url,
  });
  void hostingUrlOutput;

  const { ssrFunction } = webHosting;
  if (ssrFunction) {
    const ssrFunctionMetric = (metricName: string, statistic: string) =>
      new cloudwatch.Metric({
        dimensionsMap: {
          FunctionName: ssrFunction.functionName,
        },
        metricName,
        namespace: "AWS/Lambda",
        period: cdk.Duration.minutes(1),
        statistic,
      });

    const ssrDashboard = new cloudwatch.Dashboard(
      blocksStack,
      "WebSsrDashboard",
      {
        dashboardName: `chewbuu-${deploymentStage}-web-ssr`,
        start: "-PT8H",
        widgets: [
          [
            new cloudwatch.TextWidget({
              height: 1,
              markdown: `# Chewbuu Web SSR - ${deploymentStage}`,
              width: 24,
            }),
          ],
          [
            new cloudwatch.GraphWidget({
              height: 6,
              left: [
                ssrFunctionMetric("Invocations", "Sum"),
                ssrFunctionMetric("Errors", "Sum"),
              ],
              title: "SSR invocations and errors",
              width: 12,
            }),
            new cloudwatch.GraphWidget({
              height: 6,
              left: [ssrFunctionMetric("Duration", "p95")],
              title: "SSR duration p95",
              width: 12,
            }),
          ],
          [
            new cloudwatch.LogQueryWidget({
              height: 8,
              logGroupNames: [`/aws/lambda/${ssrFunction.functionName}`],
              queryLines: [
                "fields @timestamp, @message",
                'filter @message like /"method":/',
                "sort @timestamp desc",
                "limit 50",
              ],
              title: "Recent web requests",
              width: 24,
            }),
          ],
          [
            new cloudwatch.LogQueryWidget({
              height: 8,
              logGroupNames: [`/aws/lambda/${ssrFunction.functionName}`],
              queryLines: [
                "fields @timestamp, @message",
                'filter @message like /"path":"\\/api\\/auth/',
                'filter @message like /"status":[45][0-9][0-9]/',
                "sort @timestamp desc",
                "limit 50",
              ],
              title: "Recent auth failures",
              width: 24,
            }),
          ],
          [
            new cloudwatch.LogQueryWidget({
              height: 8,
              logGroupNames: [`/aws/lambda/${ssrFunction.functionName}`],
              queryLines: [
                "fields @timestamp, @message",
                "filter @message like /ERROR|Error|Service Temporarily Unavailable|500/",
                "sort @timestamp desc",
                "limit 50",
              ],
              title: "Recent SSR errors",
              width: 24,
            }),
          ],
        ],
      }
    );
    void ssrDashboard;
  }
}
