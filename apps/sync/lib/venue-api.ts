import { api as blocksApi } from "@chewbuu/aws-blocks";
import type {
  ApiChatMessage,
  SendChatMessageInput,
  VenueJobListing,
  VenueLocation,
  VenueMenuItem,
  VenueServiceBoard,
  VenueServiceConfig,
  VenueServiceCustomer,
  VenueServiceOrder,
  VenueSpecial,
  VenueStaffStatus,
  VenueSyncChannel,
  VenueWorkspace,
} from "@chewbuu/aws-blocks";

export type {
  ApiChatMessage,
  SendChatMessageInput,
  VenueJobListing,
  VenueLocation,
  VenueMenuItem,
  VenueServiceBoard,
  VenueServiceConfig,
  VenueServiceCustomer,
  VenueServiceOrder,
  VenueSpecial,
  VenueStaffStatus,
  VenueSyncChannel,
  VenueWorkspace,
} from "@chewbuu/aws-blocks";

export const venueApi = {
  getLocations: (): Promise<{ locations: VenueLocation[] }> =>
    blocksApi.getVenueLocations(),
  getWorkspace: (locationId: string): Promise<VenueWorkspace> =>
    blocksApi.getVenueWorkspace(locationId),
  getServiceBoard: (locationId: string): Promise<VenueServiceBoard> =>
    blocksApi.getVenueServiceBoard({ locationId }),
  getServiceConfig: (
    locationId: string
  ): Promise<{ config: VenueServiceConfig }> =>
    blocksApi.getVenueServiceConfig(locationId),
  getStaff: (locationId: string): Promise<{ staff: VenueStaffStatus[] }> =>
    blocksApi.getVenueStaffStatus(locationId),
  getCustomers: (input: {
    locationId: string;
    search?: string;
  }): Promise<{ customers: VenueServiceCustomer[] }> =>
    blocksApi.listVenueServiceCustomers(input),
  getChannels: (
    locationId: string
  ): Promise<{ channels: VenueSyncChannel[] }> =>
    blocksApi.listVenueSyncChannels(locationId),
  getMessages: (roomId: string): Promise<{ messages: ApiChatMessage[] }> =>
    blocksApi.getMessages(roomId),
  sendMessage: (roomId: string, input: SendChatMessageInput) =>
    blocksApi.sendMessage(roomId, input),
  getMenuItems: (locationId: string): Promise<{ items: VenueMenuItem[] }> =>
    blocksApi.listVenueMenuItems(locationId),
  upsertMenuItem: (input: {
    available?: boolean;
    description?: string;
    id?: string;
    locationId: string;
    name: string;
    photoUrl?: string;
    priceCents: number;
    section?: string;
    sortOrder?: number;
    status?: "draft" | "published" | "archived";
  }) => blocksApi.upsertVenueMenuItem(input),
  getSpecials: (locationId: string): Promise<{ specials: VenueSpecial[] }> =>
    blocksApi.listVenueSpecials(locationId),
  createSpecial: (input: {
    category: string;
    description?: string;
    displayOrder?: number;
    endsAt?: string | null;
    featured?: boolean;
    locationId: string;
    priceText?: string;
    startsAt?: string;
    title: string;
  }) => blocksApi.createVenueSpecial(input),
  updateSpecial: (input: {
    category?: string;
    description?: string;
    displayOrder?: number;
    endsAt?: string | null;
    featured?: boolean;
    id: string;
    locationId?: string;
    priceText?: string;
    startsAt?: string;
    status?: "archived" | "draft" | "published";
    title?: string;
  }) => blocksApi.updateVenueSpecial(input),
  getJobListings: (
    locationId: string
  ): Promise<{ listings: VenueJobListing[] }> =>
    blocksApi.listVenueJobListings(locationId),
  upsertJobListing: (input: {
    applicationUrl?: string;
    description: string;
    employmentType: string;
    expiresAt?: string;
    id?: string;
    locationId: string;
    payText?: string;
    scheduleText?: string;
    status?: "archived" | "draft" | "published";
    title: string;
  }) => blocksApi.upsertVenueJobListing(input),
  updateReservation: (input: {
    reservationId: string;
    status: string;
    tableLabel?: string;
  }) => blocksApi.updateVenueReservation(input),
  requestReservation: (input: {
    locationId: string;
    notes?: string;
    partySize: number;
    requestedAt: string;
  }) => blocksApi.requestVenueReservation(input),
  startSession: (input: {
    locationId: string;
    reservationId?: string;
    tableLabel?: string;
  }) => blocksApi.startVenueDiningSession(input),
  endSession: (
    sessionId: string
  ): Promise<{ endedAt: string; sessionId: string }> =>
    blocksApi.endVenueDiningSession(sessionId),
  createCustomer: (input: {
    displayName: string;
    email?: string;
    locationId: string;
    notes?: string;
    phone?: string;
    userId?: string;
  }): Promise<{ customer: VenueServiceCustomer }> =>
    blocksApi.createVenueServiceCustomer(input),
  createOrder: (input: {
    customerId?: string;
    customerName?: string;
    diningSessionId?: string;
    items: {
      menuItemId?: string;
      modifiers?: unknown[];
      name: string;
      notes?: string;
      quantity: number;
      unitPriceCents: number;
    }[];
    locationId: string;
    source?: "preorder" | "staff";
    tableId?: string;
    tipCents?: number;
  }) => blocksApi.createVenueServiceOrder(input),
  updateServiceOrder: (input: {
    assignedStaffUserId?: string;
    orderId: string;
    paymentStatus?: "paid" | "unpaid";
    status?: string;
    tipCents?: number;
  }) => blocksApi.updateVenueServiceOrder(input),
  clockIn: (input: {
    code: string;
    latitude?: number;
    locationId: string;
    longitude?: number;
    shiftId: string;
  }) => blocksApi.clockInVenueShift(input),
  updateAttendance: (input: {
    action: "break_in" | "break_out" | "clock_out" | "lunch_in" | "lunch_out";
    attendanceId: string;
  }) => blocksApi.updateVenueAttendance(input),
  setPublicAnalytics: (input: {
    enabled: boolean;
    locationId: string;
    minSamples?: number;
  }) => blocksApi.setVenuePublicAnalytics(input),
  updateServiceConfig: (input: {
    closeMinute?: number;
    geofenceRadiusMeters?: number;
    latitude?: number | null;
    locationId: string;
    longitude?: number | null;
    openMinute?: number;
    override?: "closed" | "closing" | "open" | "pre_open" | null;
  }) => blocksApi.updateVenueServiceConfig(input),
  subscribeEvents: (locationId: string) =>
    blocksApi.subscribeVenueEvents(locationId),
};
