export default function errorHandler(error: unknown) {
  const cause = (error as { cause?: unknown } | undefined)?.cause;
  const original = (cause ?? {}) as {
    name?: string;
    message?: string;
    stack?: string;
  };
  console.error(
    "[ssr-error]:",
    original.stack || original.message || String(error)
  );
  return new Response(
    JSON.stringify(
      {
        name: (error as { name?: string } | undefined)?.name,
        message: (error as { message?: string } | undefined)?.message,
        status: (error as { status?: number } | undefined)?.status,
        causeName: original.name,
        causeMessage: original.message,
        causeStack: original.stack,
      },
      null,
      2
    ),
    {
      status: 500,
      headers: { "content-type": "application/json" },
    }
  );
}
