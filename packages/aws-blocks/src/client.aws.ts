import { ApiNamespaceClient } from "@aws-blocks/blocks/client";
import "@aws-blocks/bb-realtime/aws-middleware";

import type { AwsBlocksApi } from "./types";

const apiUrl = (
  import.meta as ImportMeta & {
    env?: { VITE_BLOCKS_API_URL?: string };
  }
).env?.VITE_BLOCKS_API_URL;

export const api = ApiNamespaceClient<AwsBlocksApi>("api", {
  url: apiUrl,
});
