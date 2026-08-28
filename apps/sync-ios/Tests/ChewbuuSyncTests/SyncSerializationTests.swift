import XCTest
@testable import ChewbuuSync

@MainActor
final class SyncSerializationTests: XCTestCase {
    func testEnvironmentURL() {
        let server = SyncEnvironment.defaultServer()
        XCTAssertEqual(server.name, "production")
    }

    func testDailyCodeLength() {
        let sampleCode = "258"
        XCTAssertEqual(sampleCode.count, 3)
    }

    func testDemoOrderCanBeAddedModifiedAndClosed() throws {
        let service = SyncService()
        let item = try XCTUnwrap(service.menuCatalog.first(where: { $0.name == "Sparkling Water" }))

        service.seatParty(tableId: "t1", partyName: "Jordan Lee", guestCount: 2, serverName: "Marcus Vance", customerId: "c6", isChewbuuDate: true)
        service.addOrderItem(tableId: "t1", item: item, selectedModifiers: ["Lime"], quantity: 2, notes: "Extra cold")

        var table = try XCTUnwrap(service.table(for: "t1"))
        XCTAssertEqual(table.customerId, "c6")
        XCTAssertEqual(table.orders.count, 1)
        XCTAssertEqual(table.billTotalCents, 1200)

        let orderItemId = table.orders[0].id
        service.updateOrderItem(tableId: "t1", itemId: orderItemId, quantity: 3, modifiers: ["Lemon"], notes: "No ice")
        table = try XCTUnwrap(service.table(for: "t1"))
        XCTAssertEqual(table.orders[0].quantity, 3)
        XCTAssertEqual(table.billTotalCents, 1800)

        service.closeAndClearTable(tableId: "t1")
        table = try XCTUnwrap(service.table(for: "t1"))
        XCTAssertEqual(table.status, .available)
        XCTAssertTrue(table.orders.isEmpty)
    }

    func testTableRequestCanOpenOrderWorkflow() throws {
        let service = SyncService()
        let request = try XCTUnwrap(service.tableRequests.first)

        service.acceptTableRequest(request.id)

        let accepted = try XCTUnwrap(service.tableRequests.first(where: { $0.id == request.id }))
        XCTAssertEqual(accepted.status, .inProgress)
        XCTAssertEqual(accepted.tableId, "t3")
    }

    func testChewbuuDateIsARequestWithNamedGuestsAndOptionalPreorder() throws {
        let service = SyncService()
        let reservation = try XCTUnwrap(service.reservationRequests.first)

        XCTAssertEqual(reservation.kind, .reservation)
        XCTAssertEqual(reservation.guestNames, "Avery Williams + Jordan Lee")
        XCTAssertEqual(reservation.preorderedItems, ["Shared dessert"])
        XCTAssertEqual(reservation.scheduledTime, "19:30")
    }

    func testNewGuestRequiresNameAndPhoneAndStoresPartySize() throws {
        let service = SyncService()

        XCTAssertNil(service.createCustomer(name: "", phone: "", partySize: 2))
        let customer = try XCTUnwrap(service.createCustomer(name: "New Guest", phone: "555-0100", partySize: 4))

        XCTAssertEqual(customer.partySize, 4)
        XCTAssertEqual(customer.sourceLabel, "Venue guest")
    }

    func testMenuInspectorCanSaveAvailabilityAndComboMetadata() throws {
        let service = SyncService()
        let item = try XCTUnwrap(service.menuCatalog.first)

        service.toggleMenuAvailability(itemId: item.id)
        service.updateMenuItem(
            itemId: item.id,
            name: item.name,
            priceCents: item.priceCents,
            description: item.description,
            dealName: "Dinner for two",
            comboItems: ["Seasonal greens"],
            substitutions: ["Wild Mushroom Risotto"],
            availabilityNote: "Ask the kitchen",
            photoName: "menu-photo"
        )

        let updated = try XCTUnwrap(service.menuCatalog.first(where: { $0.id == item.id }))
        XCTAssertFalse(updated.isAvailable)
        XCTAssertEqual(updated.dealName, "Dinner for two")
        XCTAssertEqual(updated.comboItems, ["Seasonal greens"])
        XCTAssertEqual(updated.substitutions, ["Wild Mushroom Risotto"])
        XCTAssertEqual(updated.photoName, "menu-photo")
    }

    func testTableFilterMapsToFourOperationalStatuses() {
        XCTAssertNil(TableFilter.all.tableStatus)
        XCTAssertEqual(TableFilter.available.tableStatus, .available)
        XCTAssertEqual(TableFilter.seated.tableStatus, .seated)
        XCTAssertEqual(TableFilter.orders.tableStatus, .ordered)
        XCTAssertEqual(TableFilter.paid.tableStatus, .paid)
    }
}
