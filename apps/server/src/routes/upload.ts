import {
  handleRequest,
  RejectUpload,
  route,
  type Router,
} from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { getObjectStream } from "@better-upload/server/helpers";
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

const getUploadStorage = () => {
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

  return {
    bucketName,
    client: cloudflare({
      accessKeyId,
      accountId,
      secretAccessKey,
    }),
  };
};

const createUploadRouter = (): Router | null => {
  const storage = getUploadStorage();

  if (!storage) {
    return null;
  }

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
    bucketName: storage.bucketName,
    client: storage.client,
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

const mediaUrlFromKey = (key: string) => {
  const baseUrl = publicBaseUrl();

  if (baseUrl) {
    return `${baseUrl}/${key}`;
  }

  return `/upload/media?key=${encodeURIComponent(key)}`;
};

const storageNotConfiguredResponse = () =>
  ({
    error: {
      message:
        "Cloudflare R2 upload storage is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.",
      type: "storage_not_configured",
    },
  }) as const;

const router = createRouter()
  .post("/upload", async (c) => {
    const uploadRouter = createUploadRouter();

    if (!uploadRouter) {
      return c.json(
        storageNotConfiguredResponse(),
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
  })
  .get("/upload/media", async (c) => {
    await getSessionUser(c.req.raw.headers);
    const storage = getUploadStorage();
    const key = c.req.query("key");

    if (!storage) {
      return c.json(
        storageNotConfiguredResponse(),
        HttpStatusCodes.SERVICE_UNAVAILABLE
      );
    }

    if (!key?.startsWith("profiles/")) {
      return c.json(
        {
          error: {
            message: "Upload media key is invalid.",
            type: "invalid_media_key",
          },
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const object = await getObjectStream(storage.client, {
      bucket: storage.bucketName,
      key,
    });

    return new Response(object.stream, {
      headers: {
        "cache-control": "private, max-age=300",
        "content-length": object.contentLength.toString(),
        "content-type": object.contentType,
        etag: object.eTag,
      },
    });
  });

export default router;
export { mediaUrlFromKey };
