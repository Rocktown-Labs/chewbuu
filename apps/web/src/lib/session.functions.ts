import { resolveAuthModule } from "@chewbuu/auth/runtime";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

type ServerSession = Awaited<
  ReturnType<ReturnType<typeof resolveAuthModule>["api"]["getSession"]>
>;

/**
 * Resolve the current session for a server-rendered route.
 *
 * Public routes use the session only to redirect signed-in visitors. A
 * transient auth or database failure must not turn a public page into a 500,
 * so a failed lookup returns an anonymous session and logs the cause instead
 * of throwing.
 */
export const loadServerSession = async (
  headers: Headers
): Promise<{ data: ServerSession | null; error: null }> => {
  try {
    const auth = resolveAuthModule(await import("@chewbuu/auth"));
    const data = await auth.api.getSession({ headers });

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error("getServerSession failed", error);
    return {
      data: null,
      error: null,
    };
  }
};

export const getServerSession = createServerFn({ method: "GET" }).handler(
  async () => loadServerSession(getRequest().headers)
);
