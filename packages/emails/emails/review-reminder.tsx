import { ReviewReminderEmail } from "../src/templates/lifecycle";

const ReviewReminderPreview = Object.assign(ReviewReminderEmail, {
  PreviewProps: {
    ctaUrl: "https://chewbuu.com/me/dates/date_preview",
    name: "Avery",
  } satisfies Parameters<typeof ReviewReminderEmail>[0],
});

export default ReviewReminderPreview;
