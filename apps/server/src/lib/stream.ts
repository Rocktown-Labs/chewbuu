import type { SessionUser } from "./auth-session";

export const toStreamId = (value: string) => {
  const normalized = value.toLowerCase().replaceAll(/[^a-z0-9_-]/g, "_");
  return normalized.slice(0, 64) || "chewbuu_user";
};

export const getStreamClients = () => {
  return null;
};

export const upsertStreamUser = async (
  _clients: unknown,
  user: Pick<SessionUser, "email" | "id" | "name">
) => {
  return {
    id: toStreamId(user.id),
    name: user.name || user.email || "Chewbuu User",
  };
};

export const upsertSyntheticStreamUser = async (
  _clients: unknown,
  user: { displayName: string; id: string; image?: null | string }
) => {
  return {
    id: toStreamId(user.id),
    image: user.image ?? undefined,
    name: user.displayName,
  };
};
