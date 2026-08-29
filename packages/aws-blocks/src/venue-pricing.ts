import type { Kysely } from "kysely";

import type { BlocksDatabase } from "./database";

type VenueOrderPricingItem = {
  menuItemId?: string;
  quantity: number;
  unitPriceCents: number;
};

export const validateVenueOrderItems = async (
  db: Kysely<BlocksDatabase>,
  locationId: string,
  items: VenueOrderPricingItem[]
) => {
  let subtotalCents = 0;
  for (const item of items) {
    if (item.menuItemId) {
      const menuItem = await db
        .selectFrom("venue_menu_item")
        .select(["available", "price_cents", "status"])
        .where("id", "=", item.menuItemId)
        .where("location_id", "=", locationId)
        .executeTakeFirst();
      if (!menuItem || !menuItem.available || menuItem.status === "archived") {
        throw new Error("One or more menu items are not available.");
      }
      if (menuItem.price_cents !== item.unitPriceCents) {
        throw new Error("The menu changed. Refresh the order and try again.");
      }
    }
    subtotalCents += item.quantity * item.unitPriceCents;
  }
  return subtotalCents;
};
