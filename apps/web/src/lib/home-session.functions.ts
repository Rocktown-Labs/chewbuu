import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { authClient } from "@/lib/auth-client";

export const getHomepageSession = createServerFn({ method: "GET" }).handler(
  async () =>
    authClient.getSession({
      fetchOptions: {
        headers: getRequest().headers,
      },
    })
);
