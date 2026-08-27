# Chewbuu Sync operations API

The Sync operations API is a platform-neutral service contract for staff and managers using iPhone, Android, iPad, web, or a future SwiftUI client. It is intentionally separate from Dating, Circles, and Crews even though all contexts use the same authenticated Chewbuu account.

## Scope

Every operation is scoped to a `locationId` and authorized through the Better Auth organization, location assignment, and venue role. An organization can own multiple physical locations. A user must be assigned to a location before receiving its staff channel, service board, or operational data.

Supported roles are `owner`, `admin`, `manager`, `lead`, `server`, `host`, `kitchen`, and `staff`.

## Staff service board

`getVenueServiceBoard({ locationId, at? })` returns the current operator view:

- service mode: `pre_open`, `open`, `closing`, or `closed`
- the viewer's active shift and attendance
- assigned tables and current order IDs
- customer display names
- open service orders
- pre-orders
- location staff status
- the daily manager attendance code for manager roles only

Service mode uses the location's configured UTC open/close minute defaults of 11:00 and 22:00. Managers configure those values, the geofence center/radius, or an exceptional `service_mode_override` through `updateVenueServiceConfig`.

## Attendance

`clockInVenueShift` requires the assigned `shiftId`, six-digit daily code, and location permission when the venue has coordinates configured. The API does not continuously track location.

```json
{
  "locationId": "location-id",
  "shiftId": "shift-id",
  "code": "123456",
  "latitude": 34.7465,
  "longitude": -92.2896
}
```

`updateVenueAttendance` accepts these transitions:

- `break_out` / `break_in`
- `lunch_out` / `lunch_in`
- `clock_out`

Attendance segments and operational events are retained for audit and analytics. `reportVenueStaffLate` records minutes and an optional ETA for the manager view.

Set `SYNC_ATTENDANCE_SECRET` in production. The daily code is derived from that server-side secret, the location ID, and the UTC date; it is never persisted as plaintext.

## Service operations

- `createVenueServiceCustomer` creates a location-scoped walk-in/customer record.
- `listVenueServiceCustomers` returns location-scoped customer records for service lookup.
- `upsertVenueShift` lets managers schedule a staff member and assign their service section.
- `createVenueServiceOrder` creates a staff or pre-order record linked to a table, dining session, customer, and menu item IDs. Modifier selections are retained with each order item.
- `updateVenueServiceOrder` updates assignment, kitchen/order status, payment state, and tip amount.
- `listVenueSyncChannels` provisions or returns the location's shared staff channel.

Existing `getMessages` and `sendMessage` can be used with the returned Sync room ID. General Dating room discovery excludes `sync_staff` rooms so work conversations do not appear in the Dating chat surface.

Orders remain unpaid test records until a separately enabled Stripe payment flow captures payment.

## Staff access

`getVenueStaffStatus` returns joined, invited, suspended, and removed staff status. `updateVenueStaff` changes a member's role/status and removes them from the location's shared Sync channel when removed. Removed members cannot clock in, read the location service board, or send work messages until reactivated and assigned again. Historical shifts, attendance, orders, and audit events remain intact.

Venue email invites now retain their `locationId`. Phone invitations retain the normalized phone number and can be accepted after the user's account phone matches. SMS delivery remains a transport integration; it does not change the authorization model.

## Hiring

`upsertVenueJobListing` and `listVenueJobListings` are private manager APIs. `listPublicVenueJobListings` only returns published, unexpired listings for claimed/live/verified locations with verified venue Stripe Identity. Listings are attached to physical location IDs so each branch can hire independently.
