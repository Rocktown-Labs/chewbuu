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
}
