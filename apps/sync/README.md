# Chewbuu Sync mobile

The Expo mobile workspace for venue staff and managers. It shares the platform-neutral Sync API with the native iPad cockpit and uses the same Chewbuu burgundy/yellow operational visual system.

## Routes

- **Operations:** Overview, Tables, Orders, Reservations, Kitchen, Clock in
- **People:** Staff & shifts, Guests, Work chat
- **Business:** Menu, Specials, Jobs, Business settings
- **Account:** Sync account and sign out

The app requires an authenticated Chewbuu account. Every workspace request uses the active venue location returned by the Sync API; the client does not seed production data. Payment capture remains capability-gated and clock-in location checks are explicit rather than continuous.

## Development

```bash
bun run --filter sync start
bun run --filter sync check-types
bun run --filter sync web
```
