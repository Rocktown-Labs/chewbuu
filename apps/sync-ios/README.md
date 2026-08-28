# Chewbuu Sync for iPadOS (Native Swift / SwiftUI)

`apps/sync-ios` is the native iPadOS application for **Chewbuu Sync** — a venue point-of-sale (POS), kitchen display system (KDS), table floor management, and shift operations cockpit.

## Architecture & Code Generation

This app integrates with the **AWS Blocks backend (`packages/aws-blocks`)** via **`aws-blocks-swift`** and **`BlocksCodegenBuildPlugin`**.

```
apps/sync-ios/
├── Package.swift
├── Sources/
│   └── ChewbuuSync/
│       ├── blocks.spec.json   ← Build plugin discovers this automatically
│       ├── App.swift          ← SwiftUI entrypoint
│       └── Configuration/
│           └── Environment.swift
└── Tests/
```

During `swift build` or Xcode compilation, `BlocksCodegenBuildPlugin` consumes `blocks.spec.json` and emits `Models.swift` and `API.swift` directly into derived sources.

### Refreshing the Backend Spec

Whenever API endpoints or types change in `packages/aws-blocks`:

```bash
bun run --filter @chewbuu/aws-blocks export:spec
```

This exports the latest OpenRPC `blocks.spec.json` directly into `Sources/ChewbuuSync/blocks.spec.json`.

---

## Sync Operations Domain Reference

See [`docs/sync-operations-api.md`](../../docs/sync-operations-api.md) for full server contract documentation.

### 1. 3-Digit Daily Attendance Code & Kiosk Clock-In

- **Daily Code**: Memorable 3-digit number (e.g. `101`, `258`, `042`) generated server-side via HMAC for each location and UTC date. Visible on manager/lead service boards.
- **Clock-In**: `api.clockInVenueShift({ locationId, shiftId, code, targetUserId?, latitude?, longitude? })`.
- **Clock-In Sans Phone**: Staff without smartphones can walk up to the iPad terminal, tap their name/shift, and enter the 3-digit code (or a manager can clock them in using `targetUserId`).
- **Attendance Transitions**: `api.updateVenueAttendance({ attendanceId, action })` with `break_in`, `break_out`, `lunch_in`, `lunch_out`, `clock_out`.

### 2. Live Service Board & Role Scoping

- **`api.getVenueServiceBoard({ locationId })`**:
  - `mode`: `pre_open`, `open`, `closing`, `closed`.
  - `viewerRole`: `owner`, `admin`, `manager`, `lead`, `server`, `host`, `kitchen`, `staff`.
  - `tables`: `VenueServiceTable[]` with occupancy, assigned order IDs, customer names.
  - `orders`: `VenueServiceOrder[]` with modifiers, line items, and kitchen status.
  - `dailyCode`: Revealed to manager/lead roles only.

### 3. Kitchen Display System (KDS) & Order Flow

- **Orders**: `createVenueServiceOrder`, `updateVenueServiceOrder`.
- **Statuses**: `draft` → `submitted` → `accepted` → `preparing` → `ready` → `served` → `completed`.
- **Modifiers**: Hierarchical modifiers (`VenueMenuModifierGroup`, `VenueMenuModifierOption`) stored on line items.

### 4. Staff Sync Channels

- **`api.listVenueSyncChannels(locationId)`**: Returns dedicated `sync_staff` chat rooms isolated from public Dating/Circles discovery.

## iPad Cockpit Navigation

The native cockpit is organized into four manager-friendly groups:

- **Operations**: Overview, Tables & Floor, Reservations, Orders & Checks, Kitchen KDS
- **People**: Team, Schedules & Attendance, Staff Chat
- **Business**: Menu, Specials, Hiring, Analytics, Business Settings, Customers
- **Terminal**: Kiosk Clock-In

The main column stays full-width until a table, reservation, staff member, customer, or menu item is selected. That selection opens a closable right-side inspector; tapping the same item again closes it.

The dummy data supports a complete tap-through demonstration:

1. Seat a party and select a venue guest or Chewbuu member profile.
2. Take an order by category, menu item, quantity, modifiers, drinks, and kitchen notes.
3. Send the order to the kitchen, advance ticket status, modify items, or add another round.
4. Open a table request from Overview or Orders.
5. Close the check with the demo checkout flow and clear the table for the next guest.

The demo checkout never charges a card. Payment capture, tips, payouts, refunds, and disputes remain capability-gated in production.

---

## Building & Testing

### Command Line

```bash
cd apps/sync-ios
swift build
swift test
```

### Xcode

Open `apps/sync-ios/Package.swift` in Xcode 16+ on macOS. Target: iPad (iPadOS 18+).
