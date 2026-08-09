import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getServerSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { auth } = await import("@chewbuu/auth");
    const data = await auth.api.getSession({
      headers: getRequest().headers,
    });

    return {
      data,
      error: null,
    };
  }
);
