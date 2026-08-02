import {
  handleRequest,
  RejectUpload,
  route,
  type Router,
} from "@better-upload/server";
import { cloudflare } from "@better-upload/server/clients";
import { getObjectStream } from "@better-upload/server/helpers";
import { env } from "@chewbuu/env/server";
import { get, put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";

import { getSessionUser } from "../lib/auth-session";
import { createRouter } from "../lib/create-app";

const clientMetadataSchema = z.object({
  slot: z.enum(["profile_photo", "intro_video", "photo"]).default("photo"),
});
const uploadSlotSchema = clientMetadataSchema.shape.slot;

const mediaLimits = {
  intro_video: {
    accept: "video/",
    maxBytes: 1024 * 1024 * 250,
    route: "introVideo",
  },
  photo: {
    accept: "image/",
    maxBytes: 1024 * 1024 * 12,
    route: "photo",
  },
  profile_photo: {
    accept: "image/",
    maxBytes: 1024 * 1024 * 12,
    route: "profilePhoto",
  },
} as const;
const clientUploadPayloadSchema = z.object({
  slot: uploadSlotSchema,
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

const getUploadContentType = (file: File, slot: keyof typeof mediaLimits) => {
  if (slot === "intro_video") {
    if (file.type.includes("mp4")) {
      return "video/mp4";
    }

    return "video/webm";
  }

  return file.type || "application/octet-stream";
};

const ensureFileExtension = (
  fileName: string,
  contentType: string,
  fallbackName: string
) => {
  const cleanName = cleanFileName(fileName) || fallbackName;

  if (cleanName.includes(".")) {
    return cleanName;
  }

  const extension = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("webm")
      ? "webm"
      : contentType.includes("png")
        ? "png"
        : "jpg";

  return `${cleanName}.${extension}`;
};

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

const mediaUrlFromBlobPathname = (pathname: string) =>
  `/upload/blob?pathname=${encodeURIComponent(pathname)}`;

const getRangeResponseHeaders = (blobHeaders: Headers, contentType: string) => {
  const headers = new Headers({
    "cache-control": "private, no-cache",
    "content-type": contentType,
    "x-content-type-options": "nosniff",
  });
  const forwardedHeaders = [
    "accept-ranges",
    "content-disposition",
    "content-length",
    "content-range",
    "etag",
    "last-modified",
  ];

  for (const header of forwardedHeaders) {
    const value = blobHeaders.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  return headers;
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
  .post("/upload/blob", async (c) => {
    const sessionUser = await getSessionUser(c.req.raw.headers);
    const body = await c.req.formData();
    const file = body.get("file");
    const slotResult = uploadSlotSchema.safeParse(body.get("slot") ?? "photo");

    if (!slotResult.success) {
      return c.json(
        {
          error: {
            message: "Upload media slot is invalid.",
            type: "invalid_media_slot",
          },
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    if (!(file instanceof File)) {
      return c.json(
        {
          error: {
            message: "Upload file is required.",
            type: "missing_file",
          },
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const slot = slotResult.data;
    const limit = mediaLimits[slot];

    if (!file.type.startsWith(limit.accept)) {
      return c.json(
        {
          error: {
            message: `Expected a ${limit.accept.replace("/", "")} upload.`,
            type: "invalid_file_type",
          },
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    if (file.size > limit.maxBytes) {
      return c.json(
        {
          error: {
            message: "Upload file is too large.",
            type: "file_too_large",
          },
        },
        413
      );
    }

    const contentType = getUploadContentType(file, slot);
    const fileName = ensureFileExtension(file.name, contentType, "upload");
    const pathname = `profiles/${sessionUser.id}/${slot}/${crypto.randomUUID()}-${fileName}`;
    const blob = await put(pathname, file, {
      access: "private",
      contentType,
      multipart: slot === "intro_video",
    });

    return c.json({
      file: {
        name: file.name,
        pathname: blob.pathname,
        route: limit.route,
        size: file.size,
        type: contentType,
      },
      url: mediaUrlFromBlobPathname(blob.pathname),
    });
  })
  .post("/upload/blob/client", async (c) => {
    const body = await c.req.json();

    if (body?.type === "blob.generate-client-token") {
      await getSessionUser(c.req.raw.headers);
    }

    const result = await handleUpload({
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientUploadPayloadSchema.parse(
          clientPayload ? JSON.parse(clientPayload) : null
        );
        const limit = mediaLimits[payload.slot];
        const requiredPrefix = `profiles/client/${payload.slot}/`;

        if (!pathname.startsWith(requiredPrefix)) {
          throw new Error("Upload pathname is invalid.");
        }

        return {
          addRandomSuffix: false,
          allowedContentTypes:
            payload.slot === "intro_video"
              ? ["video/mp4", "video/webm", "video/quicktime"]
              : ["image/jpeg", "image/png", "image/webp", "image/heic"],
          allowOverwrite: false,
          maximumSizeInBytes: limit.maxBytes,
        };
      },
      onUploadCompleted: async () => {},
      request: c.req.raw,
    });

    return c.json(result);
  })
  .get("/upload/blob", async (c) => {
    await getSessionUser(c.req.raw.headers);
    const pathname = c.req.query("pathname");
    const range = c.req.header("range");

    if (!pathname?.startsWith("profiles/")) {
      return c.json(
        {
          error: {
            message: "Upload media pathname is invalid.",
            type: "invalid_media_pathname",
          },
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const result = await get(pathname, {
      access: "private",
      headers: range ? { range } : undefined,
      useCache: false,
    });

    if (!result) {
      return new Response("Not found", { status: HttpStatusCodes.NOT_FOUND });
    }

    if (result.statusCode === 304) {
      return new Response(null, { status: HttpStatusCodes.NOT_MODIFIED });
    }

    return new Response(result.stream, {
      headers: getRangeResponseHeaders(result.headers, result.blob.contentType),
      status: range && result.headers.get("content-range") ? 206 : 200,
    });
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
export { mediaUrlFromBlobPathname, mediaUrlFromKey };
