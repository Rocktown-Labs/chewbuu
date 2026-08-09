import { FriendDateInviteEmail } from "../src/templates/lifecycle";

const FriendDateInvitePreview = Object.assign(FriendDateInviteEmail, {
  PreviewProps: {
    ctaUrl: "https://chewbuu.com/me/dates",
    name: "Avery",
  } satisfies Parameters<typeof FriendDateInviteEmail>[0],
});

export default FriendDateInvitePreview;
