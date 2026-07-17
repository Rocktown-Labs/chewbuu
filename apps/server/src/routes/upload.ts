import {
  handleRequest,
  RejectUpload,
  route,
  type Router,
} from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { env } from "@chewbuu/env/server";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";

const clientMetadataSchema = z.object({
  slot: z.enum(["profile_photo", "intro_video", "photo"]).default("photo"),
});

const missingConfig = () =>
  !env.R2_ACCOUNT_ID ||
  !env.R2_ACCESS_KEY_ID ||
  !env.R2_SECRET_ACCESS_KEY ||
  !env.R2_BUCKET_NAME;

const cleanFileName = (name: string) =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 80);

const publicBaseUrl = () => env.R2_PUBLIC_URL?.replace(/\/$/, "");

const createUploadRouter = (): Router | null => {
  if (missingConfig()) {
    return null;
  }
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  const client = cloudflare({
    accessKeyId,
    accountId,
    secretAccessKey,
  });

  const beforeUpload = async ({
    clientMetadata,
    file,
    req,
  }: {
    clientMetadata: z.infer<typeof clientMetadataSchema>;
    file: { name: string };
    req: Request;
  }) => {
    const sessionUser = await getSessionUser(req.headers);
    const fileName = cleanFileName(file.name) || "upload";

    return {
      objectInfo: {
        key: `profiles/${sessionUser.id}/${clientMetadata.slot}/${crypto.randomUUID()}-${fileName}`,
      },
    };
  };

  const afterSignedUrl = () => ({
    metadata: {
      publicBaseUrl: publicBaseUrl() ?? "",
    },
  });

  return {
    bucketName,
    client,
    routes: {
      introVideo: route({
        clientMetadataSchema,
        fileTypes: ["video/*"],
        maxFileSize: 1024 * 1024 * 250,
        onAfterSignedUrl: afterSignedUrl,
        onBeforeUpload: beforeUpload,
        signedUrlExpiresIn: 300,
      }),
      photo: route({
        clientMetadataSchema,
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 12,
        onAfterSignedUrl: afterSignedUrl,
        onBeforeUpload: beforeUpload,
        signedUrlExpiresIn: 300,
      }),
      profilePhoto: route({
        clientMetadataSchema,
        fileTypes: ["image/*"],
        maxFileSize: 1024 * 1024 * 12,
        onAfterSignedUrl: afterSignedUrl,
        onBeforeUpload: beforeUpload,
        signedUrlExpiresIn: 300,
      }),
    },
  };
};

const router = createRouter().post("/upload", async (c) => {
  const uploadRouter = createUploadRouter();

  if (!uploadRouter) {
    return c.json(
      {
        error: {
          message:
            "Cloudflare R2 upload storage is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
          type: "storage_not_configured",
        },
      },
      HttpStatusCodes.SERVICE_UNAVAILABLE
    );
  }

  try {
    return await handleRequest(c.req.raw, uploadRouter);
  } catch (error) {
    if (error instanceof RejectUpload) {
      return c.json(
        { error: { message: error.message, type: "rejected" } },
        HttpStatusCodes.FORBIDDEN
      );
    }

    throw error;
  }
});

export default router;
