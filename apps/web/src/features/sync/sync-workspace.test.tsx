import type {
  VenueServiceBoard,
  VenueServiceConfig,
  VenueSyncChannel,
} from "@chewbuu/aws-blocks";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VenueLocation } from "@/lib/dating-api";

import { SyncWorkspace } from "./sync-workspace";

const mocks = vi.hoisted(() => ({
  connectApi: {
    getVenueStatus: vi.fn(),
    startVenueOnboarding: vi.fn(),
    startWorkerOnboarding: vi.fn(),
  },
  chatApi: {
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
  paymentsApi: {
    checkout: vi.fn(),
  },
  venueApi: {
    clockIn: vi.fn(),
    createServiceCustomer: vi.fn(),
    createServiceOrder: vi.fn(),
    getServiceBoard: vi.fn(),
    getServiceConfig: vi.fn(),
    getStaffStatus: vi.fn(),
    listJobListings: vi.fn(),
    listMenuItems: vi.fn(),
    listServiceCustomers: vi.fn(),
    listSyncChannels: vi.fn(),
    reportLate: vi.fn(),
    updateAttendance: vi.fn(),
    updateServiceConfig: vi.fn(),
    updateServiceOrder: vi.fn(),
    updateStaff: vi.fn(),
    upsertJobListing: vi.fn(),
    upsertShift: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/chat-api", () => ({ chatApi: mocks.chatApi }));
vi.mock("@/lib/dating-api", () => ({
  connectApi: mocks.connectApi,
  paymentsApi: mocks.paymentsApi,
  venueApi: mocks.venueApi,
}));

const location: VenueLocation = {
  address: "123 Main Street",
  id: "loc-1",
  name: "Southern Cafe",
  organizationId: "org-1",
  status: "live",
};

const channel: VenueSyncChannel = {
  id: "channel-1",
  locationId: "loc-1",
  roomId: "room-1",
  title: "Staff channel",
};

const config: VenueServiceConfig = {
  closeMinute: 1380,
  geofenceRadiusMeters: 150,
  latitude: 34.7,
  locationId: "loc-1",
  longitude: -92.2,
  openMinute: 540,
};

const board = (
  viewerRole: VenueServiceBoard["viewerRole"]
): VenueServiceBoard => ({
  attendance: undefined,
  dailyCode: viewerRole === "manager" ? "123456" : undefined,
  locationId: "loc-1",
  mode: "open",
  orders: [],
  preOrders: [],
  shifts: [
    {
      endAt: "2026-08-29T18:00:00.000Z",
      id: "shift-1",
      locationId: "loc-1",
      role: "server",
      startAt: "2026-08-29T10:00:00.000Z",
      status: "scheduled",
      userId: "user-1",
    },
  ],
  staff: [],
  tables: [],
  viewerRole,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connectApi.getVenueStatus.mockResolvedValue({
    accountId: null,
    onboardingStatus: "not_started",
    requirements: {},
    transferCapabilityStatus: "inactive",
  });
  mocks.venueApi.getServiceBoard.mockResolvedValue(board("manager"));
  mocks.venueApi.listServiceCustomers.mockResolvedValue({ customers: [] });
  mocks.venueApi.listMenuItems.mockResolvedValue({ items: [] });
  mocks.venueApi.listSyncChannels.mockResolvedValue({ channels: [channel] });
  mocks.chatApi.getMessages.mockResolvedValue({ messages: [] });
  mocks.venueApi.getStaffStatus.mockResolvedValue({ staff: [] });
  mocks.venueApi.getServiceConfig.mockResolvedValue({ config });
  mocks.venueApi.listJobListings.mockResolvedValue({ listings: [] });
  mocks.venueApi.createServiceOrder.mockResolvedValue({ order: {} });
});

describe("SyncWorkspace", () => {
  it("loads a manager desk with service controls and the daily code", async () => {
    render(<SyncWorkspace currentUserId="user-1" locations={[location]} />);

    expect(await screen.findByText("Keep the floor moving.")).toBeVisible();
    expect(screen.getByText("123456")).toBeVisible();
    expect(screen.getByText("Service settings")).toBeVisible();
    expect(screen.getByText("Schedule a shift")).toBeVisible();
    expect(mocks.venueApi.getServiceBoard).toHaveBeenCalledWith({
      locationId: "loc-1",
    });
  });

  it("creates a custom service order from the manager desk", async () => {
    const user = userEvent.setup();
    render(<SyncWorkspace currentUserId="user-1" locations={[location]} />);

    await screen.findByText("Keep the floor moving.");
    await user.type(screen.getByLabelText("Item name"), "Sweet tea");
    await user.type(screen.getByLabelText("Price (USD)"), "3.50");
    await user.type(
      screen.getByLabelText("Customer name (optional)"),
      "Table 4"
    );
    await user.click(
      screen.getByRole("button", { name: /create service order/i })
    );

    await waitFor(() => {
      expect(mocks.venueApi.createServiceOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: "Table 4",
          items: [
            expect.objectContaining({
              name: "Sweet tea",
              unitPriceCents: 350,
            }),
          ],
          locationId: "loc-1",
        })
      );
    });
  });

  it("keeps manager controls out of the staff view and supports clock-in", async () => {
    const user = userEvent.setup();
    mocks.venueApi.getServiceBoard.mockResolvedValue(board("server"));
    mocks.venueApi.clockIn.mockResolvedValue({ attendance: undefined });

    render(<SyncWorkspace currentUserId="user-1" locations={[location]} />);

    expect(await screen.findByText("Your shift desk")).toBeVisible();
    expect(screen.queryByText("Service settings")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Manager's daily code"), "123456");
    await user.click(screen.getByRole("button", { name: /^clock in$/i }));

    await waitFor(() => {
      expect(mocks.venueApi.clockIn).toHaveBeenCalledWith({
        code: "123456",
        locationId: "loc-1",
        shiftId: "shift-1",
      });
    });
  });
});
