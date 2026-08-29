import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

interface OpenRpcParam {
  name: string;
  description?: string;
  required?: boolean;
  schema: Record<string, unknown>;
}

interface OpenRpcMethod {
  name: string;
  description?: string;
  params: OpenRpcParam[];
  result: {
    name: string;
    description?: string;
    schema: Record<string, unknown>;
  };
}

interface OpenRpcDocument {
  openrpc: "1.2.6";
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: {
    name: string;
    url: string;
    description?: string;
  }[];
  methods: OpenRpcMethod[];
  components: {
    schemas: Record<string, unknown>;
  };
}

export function buildBlocksSpec(): OpenRpcDocument {
  const schemas: Record<string, unknown> = {
    VenueStaffRole: {
      type: "string",
      enum: [
        "admin",
        "host",
        "kitchen",
        "lead",
        "manager",
        "owner",
        "server",
        "staff",
      ],
    },
    VenueAttendanceStatus: {
      type: "string",
      enum: ["rest_break", "clocked_in", "clocked_out", "lunch", "scheduled"],
    },
    VenueServiceMode: {
      type: "string",
      enum: ["closed", "closing", "open", "pre_open"],
    },
    VenueAttendanceSegment: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        kind: { type: "string", enum: ["rest_break", "lunch"] },
        startedAt: { type: "string", format: "date-time" },
        endedAt: { type: "string", format: "date-time" },
      },
      required: ["id", "kind", "startedAt"],
    },
    VenueShiftAttendance: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        shiftId: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        userId: { type: "string" },
        status: { $ref: "#/components/schemas/VenueAttendanceStatus" },
        clockInAt: { type: "string", format: "date-time" },
        clockOutAt: { type: "string", format: "date-time" },
        currentSegmentKind: { type: "string", enum: ["rest_break", "lunch"] },
        currentSegmentStartedAt: { type: "string", format: "date-time" },
        lateMinutes: { type: "integer" },
        etaAt: { type: "string", format: "date-time" },
        segments: {
          type: "array",
          items: { $ref: "#/components/schemas/VenueAttendanceSegment" },
        },
      },
      required: [
        "id",
        "shiftId",
        "locationId",
        "userId",
        "status",
        "lateMinutes",
        "segments",
      ],
    },
    VenueStaffStatus: {
      type: "object",
      properties: {
        userId: { type: "string" },
        displayName: { type: "string" },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        role: { $ref: "#/components/schemas/VenueStaffRole" },
        status: {
          type: "string",
          enum: ["active", "invited", "removed", "suspended"],
        },
        attendance: { $ref: "#/components/schemas/VenueShiftAttendance" },
      },
      required: ["displayName", "role", "status"],
    },
    VenueServiceCustomer: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        displayName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string", format: "email" },
        notes: { type: "string" },
        userId: { type: "string" },
      },
      required: ["id", "locationId", "displayName"],
    },
    VenueServiceOrderItem: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        menuItemId: { type: "string" },
        name: { type: "string" },
        quantity: { type: "integer" },
        unitPriceCents: { type: "integer" },
        notes: { type: "string" },
        modifiers: {
          type: "array",
          items: { type: "object" },
        },
      },
      required: ["id", "name", "quantity", "unitPriceCents", "modifiers"],
    },
    VenueServiceOrder: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        diningSessionId: { type: "string", format: "uuid" },
        tableId: { type: "string", format: "uuid" },
        status: { type: "string" },
        paymentStatus: { type: "string" },
        currency: { type: "string" },
        subtotalCents: { type: "integer" },
        tipCents: { type: "integer" },
        totalCents: { type: "integer" },
        assignedStaffUserId: { type: "string" },
        source: { type: "string", enum: ["guest", "preorder", "staff"] },
        customer: { $ref: "#/components/schemas/VenueServiceCustomer" },
        items: {
          type: "array",
          items: { $ref: "#/components/schemas/VenueServiceOrderItem" },
        },
      },
      required: [
        "id",
        "locationId",
        "status",
        "paymentStatus",
        "currency",
        "subtotalCents",
        "tipCents",
        "totalCents",
        "source",
        "items",
      ],
    },
    VenueServiceTable: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        label: { type: "string" },
        capacity: { type: "integer" },
        status: { type: "string" },
        section: { type: "string" },
        customerNames: { type: "array", items: { type: "string" } },
        currentOrderIds: { type: "array", items: { type: "string" } },
        occupiedSeats: { type: "integer" },
      },
      required: [
        "id",
        "locationId",
        "label",
        "capacity",
        "status",
        "customerNames",
        "currentOrderIds",
        "occupiedSeats",
      ],
    },
    VenueServiceBoard: {
      type: "object",
      properties: {
        locationId: { type: "string", format: "uuid" },
        mode: { $ref: "#/components/schemas/VenueServiceMode" },
        viewerRole: { $ref: "#/components/schemas/VenueStaffRole" },
        dailyCode: {
          type: "string",
          description: "3-digit daily attendance code for managers/leads",
        },
        assignedSection: { type: "string" },
        attendance: { $ref: "#/components/schemas/VenueShiftAttendance" },
        tables: {
          type: "array",
          items: { $ref: "#/components/schemas/VenueServiceTable" },
        },
        orders: {
          type: "array",
          items: { $ref: "#/components/schemas/VenueServiceOrder" },
        },
        preOrders: {
          type: "array",
          items: { $ref: "#/components/schemas/VenueServiceOrder" },
        },
        staff: {
          type: "array",
          items: { $ref: "#/components/schemas/VenueStaffStatus" },
        },
      },
      required: [
        "locationId",
        "mode",
        "viewerRole",
        "tables",
        "orders",
        "preOrders",
        "staff",
      ],
    },
    VenueSyncChannel: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        roomId: { type: "string" },
        title: { type: "string" },
      },
      required: ["id", "locationId", "roomId", "title"],
    },
    VenueJobListing: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        title: { type: "string" },
        description: { type: "string" },
        employmentType: { type: "string" },
        payText: { type: "string" },
        scheduleText: { type: "string" },
        applicationUrl: { type: "string" },
        status: { type: "string", enum: ["archived", "draft", "published"] },
        publishedAt: { type: "string", format: "date-time" },
        expiresAt: { type: "string", format: "date-time" },
      },
      required: [
        "id",
        "locationId",
        "title",
        "description",
        "employmentType",
        "status",
      ],
    },
    VenueMenuItem: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        locationId: { type: "string", format: "uuid" },
        name: { type: "string" },
        description: { type: "string" },
        priceCents: { type: "integer" },
        section: { type: "string" },
        available: { type: "boolean" },
        photoUrl: { type: "string" },
        sortOrder: { type: "integer" },
        status: { type: "string", enum: ["draft", "published", "archived"] },
      },
      required: [
        "id",
        "locationId",
        "name",
        "priceCents",
        "available",
        "sortOrder",
        "status",
      ],
    },
    StripeTipAllocationInput: {
      type: "object",
      properties: {
        amountCents: { type: "integer" },
        beneficiaryKind: { type: "string", enum: ["cook", "house", "server"] },
        beneficiaryUserId: { type: "string" },
      },
      required: ["amountCents", "beneficiaryKind"],
    },
    StripeCheckoutSessionResponse: {
      type: "object",
      properties: {
        checkoutSessionId: { type: "string" },
        checkoutUrl: { type: "string", format: "uri" },
        orderId: { type: "string", format: "uuid" },
        paymentId: { type: "string", format: "uuid" },
        recipientCount: { type: "integer" },
        transferGroup: { type: "string" },
      },
      required: [
        "checkoutSessionId",
        "checkoutUrl",
        "orderId",
        "paymentId",
        "recipientCount",
        "transferGroup",
      ],
    },
    StripeConnectedAccountResponse: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        dashboard: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
        livemode: { type: "boolean" },
        requirements: { type: "object" },
        transferCapabilityStatus: { type: "string" },
        url: { type: "string", format: "uri" },
      },
      required: [
        "accountId",
        "livemode",
        "requirements",
        "transferCapabilityStatus",
      ],
    },
    StripeVenueConnectStatus: {
      type: "object",
      properties: {
        accountId: { type: "string" },
        onboardingStatus: { type: "string" },
        requirements: { type: "object" },
        transferCapabilityStatus: { type: "string" },
      },
      required: [
        "onboardingStatus",
        "requirements",
        "transferCapabilityStatus",
      ],
    },
    StripeRefundResponse: {
      type: "object",
      properties: {
        amountCents: { type: "integer" },
        refundId: { type: "string" },
        status: { type: "string" },
      },
      required: ["amountCents", "refundId"],
    },
  };

  const methods: OpenRpcMethod[] = [
    {
      name: "api.getVenueServiceBoard",
      description:
        "Fetch live operational service board with floor matrix, active shifts, and orders.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              locationId: { type: "string", format: "uuid" },
              at: { type: "string", format: "date-time" },
            },
            required: ["locationId"],
          },
        },
      ],
      result: {
        name: "board",
        schema: { $ref: "#/components/schemas/VenueServiceBoard" },
      },
    },
    {
      name: "api.clockInVenueShift",
      description:
        "Clock in to an assigned shift using the 3-digit daily code or kiosk manager assistance.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              locationId: { type: "string", format: "uuid" },
              shiftId: { type: "string", format: "uuid" },
              code: {
                type: "string",
                description: "3-digit daily attendance code",
              },
              latitude: { type: "number" },
              longitude: { type: "number" },
              targetUserId: {
                type: "string",
                description:
                  "Optional staff user ID when clocking in via tablet kiosk",
              },
            },
            required: ["locationId", "shiftId", "code"],
          },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            attendance: { $ref: "#/components/schemas/VenueShiftAttendance" },
          },
          required: ["attendance"],
        },
      },
    },
    {
      name: "api.updateVenueAttendance",
      description:
        "Record attendance status transitions (break_out, break_in, lunch_out, lunch_in, clock_out).",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              attendanceId: { type: "string", format: "uuid" },
              action: {
                type: "string",
                enum: [
                  "break_in",
                  "break_out",
                  "clock_out",
                  "lunch_in",
                  "lunch_out",
                ],
              },
            },
            required: ["attendanceId", "action"],
          },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            attendance: { $ref: "#/components/schemas/VenueShiftAttendance" },
          },
          required: ["attendance"],
        },
      },
    },
    {
      name: "api.reportVenueStaffLate",
      description: "Report delay with estimated minutes and optional ETA.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              attendanceId: { type: "string", format: "uuid" },
              lateMinutes: { type: "integer" },
              etaAt: { type: "string", format: "date-time" },
            },
            required: ["attendanceId", "lateMinutes"],
          },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            attendance: { $ref: "#/components/schemas/VenueShiftAttendance" },
          },
          required: ["attendance"],
        },
      },
    },
    {
      name: "api.createVenueServiceOrder",
      description:
        "Create a staff or pre-order ticket with modifiers and kitchen notes.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              locationId: { type: "string", format: "uuid" },
              tableId: { type: "string", format: "uuid" },
              diningSessionId: { type: "string", format: "uuid" },
              customerId: { type: "string" },
              customerName: { type: "string" },
              source: { type: "string", enum: ["preorder", "staff"] },
              tipCents: { type: "integer" },
              tipAllocations: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/StripeTipAllocationInput",
                },
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    quantity: { type: "integer" },
                    unitPriceCents: { type: "integer" },
                    menuItemId: { type: "string" },
                    notes: { type: "string" },
                    modifiers: { type: "array", items: { type: "object" } },
                  },
                  required: ["name", "quantity", "unitPriceCents"],
                },
              },
            },
            required: ["locationId", "items"],
          },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            order: { $ref: "#/components/schemas/VenueServiceOrder" },
          },
          required: ["order"],
        },
      },
    },
    {
      name: "api.updateVenueServiceOrder",
      description:
        "Update kitchen status, payment state, assigned server, or tip amount.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              orderId: { type: "string", format: "uuid" },
              status: { type: "string" },
              paymentStatus: { type: "string", enum: ["paid", "unpaid"] },
              tipCents: { type: "integer" },
              assignedStaffUserId: { type: "string" },
            },
            required: ["orderId"],
          },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            order: { $ref: "#/components/schemas/VenueServiceOrder" },
          },
          required: ["order"],
        },
      },
    },
    {
      name: "api.getStripeIntegrationHealth",
      description:
        "Read admin-only Stripe catalog, webhook, and Connect health.",
      params: [],
      result: { name: "response", schema: { type: "object" } },
    },
    {
      name: "api.syncStripeWebhookEndpoints",
      description: "Reconcile the three Chewbuu Stripe webhook endpoints.",
      params: [],
      result: { name: "response", schema: { type: "object" } },
    },
    {
      name: "api.createVenueCheckoutSession",
      description:
        "Create a hosted platform Checkout Session for a date, dine-in, or pickup order.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              cancelUrl: { type: "string", format: "uri" },
              experienceKind: {
                type: "string",
                enum: ["date", "dine_in", "pickup"],
              },
              orderId: { type: "string", format: "uuid" },
              successUrl: { type: "string", format: "uri" },
              tipAllocations: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/StripeTipAllocationInput",
                },
              },
            },
            required: ["cancelUrl", "orderId", "successUrl"],
          },
        },
      ],
      result: {
        name: "response",
        schema: { $ref: "#/components/schemas/StripeCheckoutSessionResponse" },
      },
    },
    {
      name: "api.createReferrerConnectOnboarding",
      description: "Create or resume referral reward recipient onboarding.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: { locationId: { type: "string", format: "uuid" } },
            required: ["locationId"],
          },
        },
      ],
      result: {
        name: "response",
        schema: { $ref: "#/components/schemas/StripeConnectedAccountResponse" },
      },
    },
    {
      name: "api.createVenueConnectOnboarding",
      description: "Create or resume venue Connect recipient onboarding.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: { locationId: { type: "string", format: "uuid" } },
            required: ["locationId"],
          },
        },
      ],
      result: {
        name: "response",
        schema: { $ref: "#/components/schemas/StripeConnectedAccountResponse" },
      },
    },
    {
      name: "api.createWorkerConnectOnboarding",
      description: "Create or resume worker Connect recipient onboarding.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              locationId: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
            },
            required: ["locationId", "userId"],
          },
        },
      ],
      result: {
        name: "response",
        schema: { $ref: "#/components/schemas/StripeConnectedAccountResponse" },
      },
    },
    {
      name: "api.getVenueConnectStatus",
      description:
        "Read the venue Connect onboarding and transfer capability state.",
      params: [
        {
          name: "locationId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      result: {
        name: "response",
        schema: { $ref: "#/components/schemas/StripeVenueConnectStatus" },
      },
    },
    {
      name: "api.getStripePayment",
      description:
        "Read an authorized order's Stripe payment and transfer ledger.",
      params: [
        {
          name: "orderId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      result: { name: "response", schema: { type: "object" } },
    },
    {
      name: "api.createVenueRefund",
      description:
        "Create an idempotent venue order refund and reverse transfers.",
      params: [
        {
          name: "input",
          required: true,
          schema: {
            type: "object",
            properties: {
              amountCents: { type: "integer" },
              orderId: { type: "string", format: "uuid" },
              reason: { type: "string" },
            },
            required: ["orderId"],
          },
        },
      ],
      result: {
        name: "response",
        schema: { $ref: "#/components/schemas/StripeRefundResponse" },
      },
    },
    {
      name: "api.listVenueSyncChannels",
      description:
        "Retrieve or provision the dedicated Sync staff chat room for this location.",
      params: [
        {
          name: "locationId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            channels: {
              type: "array",
              items: { $ref: "#/components/schemas/VenueSyncChannel" },
            },
          },
          required: ["channels"],
        },
      },
    },
    {
      name: "api.getVenueStaffStatus",
      description:
        "Get staff roster with assignment roles and live attendance.",
      params: [
        {
          name: "locationId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            staff: {
              type: "array",
              items: { $ref: "#/components/schemas/VenueStaffStatus" },
            },
          },
          required: ["staff"],
        },
      },
    },
    {
      name: "api.listVenueJobListings",
      description: "List hiring opportunities for a location (manager view).",
      params: [
        {
          name: "locationId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              items: { $ref: "#/components/schemas/VenueJobListing" },
            },
          },
          required: ["listings"],
        },
      },
    },
    {
      name: "api.listVenueMenuItems",
      description: "List food and drink catalog items.",
      params: [
        {
          name: "locationId",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/VenueMenuItem" },
            },
          },
          required: ["items"],
        },
      },
    },
    {
      name: "api.generateAiResponse",
      description:
        "AI operational assistant for floor pacing and menu questions.",
      params: [
        {
          name: "messages",
          required: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["assistant", "user"] },
                parts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["text"] },
                      text: { type: "string" },
                    },
                    required: ["type", "text"],
                  },
                },
              },
              required: ["role", "parts"],
            },
          },
        },
      ],
      result: {
        name: "response",
        schema: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
    },
  ];

  return {
    openrpc: "1.2.6",
    info: {
      title: "Chewbuu AWS Blocks API",
      version: "1.0.0",
      description:
        "Type-safe OpenRPC specification for Chewbuu Sync, Dating, and Venue operations.",
    },
    servers: [
      {
        name: "production",
        url: "https://api.chewbuu.com",
        description: "AWS Blocks Production Gateway",
      },
      {
        name: "local",
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    methods,
    components: {
      schemas,
    },
  };
}

export function exportSpecFiles() {
  const spec = buildBlocksSpec();
  const jsonContent = JSON.stringify(spec, null, 2);

  const targets = [
    path.resolve(import.meta.dirname, "../generated/blocks.spec.json"),
    path.resolve(
      import.meta.dirname,
      "../../../apps/sync-ios/Sources/ChewbuuSync/blocks.spec.json"
    ),
  ];

  for (const target of targets) {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, jsonContent, "utf-8");
    console.log(`[export-spec] Wrote OpenRPC spec to: ${target}`);
  }
}

exportSpecFiles();
