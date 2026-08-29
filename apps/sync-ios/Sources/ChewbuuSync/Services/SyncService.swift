import Foundation
import SwiftUI
import BlocksRuntime

@MainActor
public final class SyncService: ObservableObject {
    public static let shared = SyncService()

    private let api: Api

    @Published public var currentLocationId: String = "loc-flagship-downtown"
    @Published public var locationName: String = "Chewbuu Bistro — Downtown"
    @Published public var serviceMode: String = "Open Service"
    @Published public var viewerRole: String = "Manager"
    @Published public var dailyAttendanceCode: String = "258"
    @Published public var isConnected: Bool = true
    @Published public var isLoading: Bool = false
    @Published public var lastSyncTime: Date = Date()
    @Published public var tables: [MockTable] = []
    @Published public var staffList: [MockStaffMember] = []
    @Published public var menuCatalog: [CatalogItem] = []
    @Published public var customers: [MockCustomer] = []
    @Published public var tableRequests: [MockTableRequest] = []
    @Published public var jobListings: [MockJobListing] = []
    @Published public var specials: [MockSpecial] = []
    @Published public var lastActionMessage: String?

    public init(server: BlocksServer = SyncEnvironment.defaultServer()) {
        self.api = Api(server: server)
        loadInitialData()
    }

    public var reservationRequests: [MockTableRequest] {
        tableRequests.filter { $0.kind == .reservation }
    }

    public var openCheckCount: Int {
        tables.filter { $0.status == .seated || $0.status == .ordered }.count
    }

    public func loadInitialData() {
        customers = [
            MockCustomer(id: "c1", name: "Avery Williams", email: "avery@example.com", phone: "(555) 014-0192", partySize: 2, favoriteOrder: "Ribeye · Medium Rare", lastVisit: "Tonight", isChewbuuMember: true, visitCount: 8),
            MockCustomer(id: "c2", name: "Chen VIP Group", email: "chen@example.com", phone: "(555) 014-0231", partySize: 5, favoriteOrder: "Hamachi Crudo", lastVisit: "Tonight", isChewbuuMember: false, visitCount: 3),
            MockCustomer(id: "c3", name: "Davis Anniversary", email: "davis@example.com", phone: "(555) 014-0334", partySize: 2, favoriteOrder: "Molten Lava Cake", lastVisit: "Today", isChewbuuMember: true, visitCount: 5),
            MockCustomer(id: "c4", name: "Smith Table", email: "smith@example.com", phone: "(555) 014-0468", partySize: 2, favoriteOrder: "Wild Mushroom Risotto", lastVisit: "Yesterday", isChewbuuMember: false, visitCount: 2),
            MockCustomer(id: "c5", name: "Walk-in Pair", email: "", phone: "", partySize: 2, favoriteOrder: "Smoked Old Fashioned", lastVisit: "Tonight", isChewbuuMember: false, visitCount: 1),
            MockCustomer(id: "c6", name: "Jordan Lee", email: "jordan@chewbuu.com", phone: "(555) 014-0799", partySize: 2, favoriteOrder: "Sparkling Water", lastVisit: "Last Friday", isChewbuuMember: true, visitCount: 12),
            MockCustomer(id: "c7", name: "Maya & Sam", email: "maya@example.com", phone: "(555) 014-0818", partySize: 2, favoriteOrder: "Espresso Martini", lastVisit: "Last month", isChewbuuMember: true, visitCount: 4),
        ]

        tables = [
            MockTable(id: "t1", label: "T1", section: "Main Dining", seats: 4, occupiedSeats: 0, status: .available, serverName: "David Kim", seatedTimeMinutes: 0, billTotalCents: 0, partyName: nil, customerId: nil, orders: [], isChewbuuDate: false),
            MockTable(id: "t2", label: "T2", section: "Main Dining", seats: 2, occupiedSeats: 2, status: .ordered, serverName: "Marcus Vance", seatedTimeMinutes: 28, billTotalCents: 8400, partyName: "Williams Party", customerId: "c1", orders: [
                MockOrderItem(id: "o1", name: "Prime Dry-Aged Ribeye", quantity: 1, unitPriceCents: 5200, modifiers: ["Medium Rare", "Truffle Butter"], notes: "", status: .preparing, minutesAgo: 14),
                MockOrderItem(id: "o2", name: "Truffle Parmesan Fries", quantity: 1, unitPriceCents: 1400, modifiers: ["Extra Garlic Aioli"], notes: "", status: .ready, minutesAgo: 8),
                MockOrderItem(id: "o3", name: "Smoked Old Fashioned", quantity: 1, unitPriceCents: 1800, modifiers: ["Large Rock", "Orange Peel"], notes: "", status: .served, minutesAgo: 24),
            ], isChewbuuDate: true),
            MockTable(id: "t3", label: "T3", section: "Main Dining", seats: 6, occupiedSeats: 5, status: .seated, serverName: "Chloe Bennett", seatedTimeMinutes: 12, billTotalCents: 4200, partyName: "Chen VIP Group", customerId: "c2", orders: [
                MockOrderItem(id: "o4", name: "Hamachi Crudo", quantity: 2, unitPriceCents: 2100, modifiers: ["Yuzu Ponzu", "Jalapeno Crisp"], notes: "", status: .pending, minutesAgo: 6),
            ], isChewbuuDate: false),
            MockTable(id: "t4", label: "T4", section: "Patio", seats: 4, occupiedSeats: 4, status: .paid, serverName: "David Kim", seatedTimeMinutes: 65, billTotalCents: 14200, partyName: "Davis Anniversary", customerId: "c3", orders: [], isChewbuuDate: true),
            MockTable(id: "t5", label: "P1", section: "Patio", seats: 4, occupiedSeats: 0, status: .available, serverName: "Chloe Bennett", seatedTimeMinutes: 0, billTotalCents: 0, partyName: nil, customerId: nil, orders: [], isChewbuuDate: false),
            MockTable(id: "t6", label: "P2", section: "Patio", seats: 2, occupiedSeats: 2, status: .ordered, serverName: "Chloe Bennett", seatedTimeMinutes: 34, billTotalCents: 6800, partyName: "Smith Table", customerId: "c4", orders: [
                MockOrderItem(id: "o5", name: "Wild Mushroom Risotto", quantity: 2, unitPriceCents: 3400, modifiers: ["Shaved Black Truffle"], notes: "", status: .preparing, minutesAgo: 18),
            ], isChewbuuDate: false),
            MockTable(id: "t7", label: "B1", section: "Bar & High Tops", seats: 2, occupiedSeats: 2, status: .seated, serverName: "Elena Rostova", seatedTimeMinutes: 15, billTotalCents: 3600, partyName: "Walk-in Pair", customerId: "c5", orders: [], isChewbuuDate: false),
            MockTable(id: "t8", label: "B2", section: "Bar & High Tops", seats: 2, occupiedSeats: 0, status: .available, serverName: "Elena Rostova", seatedTimeMinutes: 0, billTotalCents: 0, partyName: nil, customerId: nil, orders: [], isChewbuuDate: false),
        ]

        staffList = [
            MockStaffMember(id: "s1", name: "Marcus Vance", role: "Lead Server", section: "Main Dining", status: .onFloor, clockInTime: "16:45"),
            MockStaffMember(id: "s2", name: "Chloe Bennett", role: "Server", section: "Patio", status: .onFloor, clockInTime: "17:00"),
            MockStaffMember(id: "s3", name: "David Kim", role: "Server", section: "Main Dining", status: .onBreak, clockInTime: "16:30"),
            MockStaffMember(id: "s4", name: "Elena Rostova", role: "Head Bartender", section: "Bar", status: .onFloor, clockInTime: "16:15"),
            MockStaffMember(id: "s5", name: "Chef Mario", role: "Kitchen Lead", section: "Kitchen", status: .onFloor, clockInTime: "15:30"),
            MockStaffMember(id: "s6", name: "Alex Rivera", role: "Host", section: "Front Entrance", status: .scheduled, clockInTime: nil),
        ]

        menuCatalog = [
            CatalogItem(id: "m1", category: "Mains", name: "Prime Dry-Aged Ribeye", priceCents: 5200, description: "14oz prime cut, garlic herb butter", modifiers: ["Rare", "Medium Rare", "Medium", "Well Done", "Truffle Butter", "Chimichurri"], isAvailable: true, photoName: "ribeye", dealName: "Chef's table", comboItems: [], substitutions: ["Wild Mushroom Risotto"], availabilityNote: "Cook to order"),
            CatalogItem(id: "m2", category: "Mains", name: "Wild Mushroom Risotto", priceCents: 3400, description: "Arborio rice, chanterelles, parmesan", modifiers: ["Extra Parmesan", "Shaved Black Truffle", "Vegan Option"], isAvailable: true, comboItems: ["Seasonal greens"], substitutions: ["Prime Dry-Aged Ribeye"], availabilityNote: "Contains dairy"),
            CatalogItem(id: "m3", category: "Appetizers", name: "Hamachi Crudo", priceCents: 2100, description: "Yellowtail, citrus ponzu, serrano", modifiers: ["Extra Ponzu", "No Jalapeno"], isAvailable: true, photoName: "crudo", availabilityNote: "Limited tonight"),
            CatalogItem(id: "m4", category: "Appetizers", name: "Truffle Parmesan Fries", priceCents: 1400, description: "Hand-cut kennebec fries, truffle oil", modifiers: ["Extra Garlic Aioli", "Extra Parmesan"], isAvailable: true, comboItems: ["House aioli"], substitutions: ["Seasonal greens"]),
            CatalogItem(id: "m5", category: "Drinks", name: "Smoked Old Fashioned", priceCents: 1800, description: "Bourbon, bitters, hickory smoke", modifiers: ["Large Rock", "Neat", "Orange Peel"], isAvailable: true),
            CatalogItem(id: "m6", category: "Drinks", name: "Craft Espresso Martini", priceCents: 1600, description: "Vodka, espresso, kahlua, vanilla", modifiers: ["Oat Milk", "Decaf", "Extra Dry"], isAvailable: true),
            CatalogItem(id: "m7", category: "Desserts", name: "Molten Lava Cake", priceCents: 1500, description: "Valrhona chocolate, vanilla gelato", modifiers: ["Extra Gelato", "Berry Coulis"], isAvailable: true),
            CatalogItem(id: "m8", category: "Drinks", name: "Sparkling Water", priceCents: 600, description: "Chilled bottle, lemon or lime", modifiers: ["Lemon", "Lime", "No Ice"], isAvailable: true),
            CatalogItem(id: "m9", category: "Drinks", name: "Cucumber Lime Spritz", priceCents: 1200, description: "Cucumber, lime, mint, soda", modifiers: ["Less Sweet", "No Mint"], isAvailable: true),
            CatalogItem(id: "m10", category: "Appetizers", name: "Oysters on the Half Shell", priceCents: 2400, description: "Six oysters, mignonette, lemon", modifiers: ["Extra Mignonette", "No Horseradish"], isAvailable: true),
        ]

        tableRequests = [
            MockTableRequest(id: "r1", tableId: "t3", customerId: "c2", title: "Add-on order", detail: "Two sparkling waters and another round of crudo", ageMinutes: 3, status: .new),
            MockTableRequest(id: "r2", tableId: "t2", customerId: "c1", title: "Dessert & drinks", detail: "Chocolate cake and two espresso martinis", ageMinutes: 7, status: .new),
            MockTableRequest(id: "r3", tableId: "t7", customerId: "c5", title: "Ready for the check", detail: "Guest tapped for close-out", ageMinutes: 11, status: .new),
            MockTableRequest(id: "r4", tableId: "t5", customerId: nil, title: "Avery Williams + Jordan Lee", detail: "Chewbuu Date · dinner reservation", ageMinutes: 0, status: .new, kind: .reservation, guestNames: "Avery Williams + Jordan Lee", scheduledTime: "19:30", preorderedItems: ["Shared dessert"]),
        ]

        jobListings = [
            MockJobListing(
                id: "j1",
                title: "Evening Server",
                location: "Downtown",
                schedule: "Thu–Sun · 4pm–close",
                applicants: 8,
                isPublished: true,
                applicantList: [
                    MockApplicant(id: "a1", name: "Taylor Brooks", phone: "(555) 014-1020", email: "taylor@example.com", availability: "Thu–Sun evenings", experience: "4 years · full service", note: "Strong wine knowledge; looking for a stable floor team.", status: "New"),
                    MockApplicant(id: "a2", name: "Riley Chen", phone: "(555) 014-1094", email: "riley@example.com", availability: "Fri–Sun evenings", experience: "2 years · neighborhood bistro", note: "Can start next week.", status: "Review"),
                ]
            ),
            MockJobListing(
                id: "j2",
                title: "Barback",
                location: "Downtown",
                schedule: "Fri–Sat · 5pm–close",
                applicants: 3,
                isPublished: false,
                applicantList: [
                    MockApplicant(id: "a3", name: "Morgan Ellis", phone: "(555) 014-1118", email: "morgan@example.com", availability: "Fri–Sat nights", experience: "1 year · cocktail bar", note: "Interested in growing into bartending.", status: "New"),
                ]
            ),
        ]

        specials = [
            MockSpecial(id: "sp1", title: "Date Night Dessert", detail: "Complimentary molten cake for Chewbuu Date tables", discount: "Complimentary", menuItemIds: ["m7"], isPublished: true),
            MockSpecial(id: "sp2", title: "Golden Hour", detail: "20% off selected drinks from 4–6pm", discount: "20% off", menuItemIds: ["m5", "m6", "m9"], isPublished: false),
        ]
    }

    public func startCheckout(tableId: String) async -> URL? {
        guard let orderId = UUID(uuidString: tableId),
              UUID(uuidString: currentLocationId) != nil else {
            lastActionMessage = "This demo table has no live order ID for Stripe checkout."
            return nil
        }
        do {
            let result = try await api.createVenueCheckoutSession(
                input: Api.CreateVenueCheckoutSession.Input(
                    cancelUrl: URL(string: "https://chewbuu.com/sync?payment=cancelled")!,
                    experienceKind: .dine_In,
                    orderId: orderId,
                    successUrl: URL(string: "https://chewbuu.com/sync?payment=success")!
                )
            )
            lastActionMessage = "Stripe checkout opened for Table \(tableId)."
            return result.checkoutUrl
        } catch {
            lastActionMessage = "Stripe checkout could not start: \(error.localizedDescription)"
            return nil
        }
    }

    public func fetchLiveBoard() async {
        guard let locUuid = UUID(uuidString: currentLocationId) else { return }
        isLoading = true
        do {
            let board = try await api.getVenueServiceBoard(input: Api.GetVenueServiceBoard.Input(at: nil, locationId: locUuid))
            if let code = board.dailyCode { dailyAttendanceCode = code }
            serviceMode = board.mode.rawValue
            viewerRole = board.viewerRole.rawValue.capitalized
            lastSyncTime = Date()
            isConnected = true
        } catch {
            isConnected = false
        }
        isLoading = false
    }

    public func table(for id: String?) -> MockTable? {
        guard let id else { return nil }
        return tables.first(where: { $0.id == id })
    }

    public func customer(for id: String?) -> MockCustomer? {
        guard let id else { return nil }
        return customers.first(where: { $0.id == id })
    }

    @discardableResult
    public func createCustomer(name: String, phone: String, partySize: Int) -> MockCustomer? {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty, !cleanPhone.isEmpty else { return nil }
        let customer = MockCustomer(id: UUID().uuidString, name: cleanName, email: "", phone: cleanPhone, partySize: partySize, favoriteOrder: "New guest", lastVisit: "Tonight", isChewbuuMember: false, visitCount: 1)
        customers.insert(customer, at: 0)
        lastActionMessage = "Added \(cleanName) as a venue guest."
        return customer
    }

    public func seatParty(tableId: String, partyName: String, guestCount: Int, serverName: String, customerId: String? = nil, isChewbuuDate: Bool = false) {
        guard let index = tables.firstIndex(where: { $0.id == tableId }) else { return }
        tables[index].status = .seated
        tables[index].partyName = partyName
        tables[index].customerId = customerId
        tables[index].occupiedSeats = guestCount
        tables[index].serverName = serverName
        tables[index].seatedTimeMinutes = 1
        tables[index].isChewbuuDate = isChewbuuDate
        tables[index].partyGuestNames = [partyName]
        lastActionMessage = "Seated \(partyName) at Table \(tables[index].label)."
    }

    public func assignCustomer(tableId: String, customerId: String?) {
        guard let index = tables.firstIndex(where: { $0.id == tableId }) else { return }
        tables[index].customerId = customerId
        if let customer = customer(for: customerId) {
            tables[index].partyName = customer.name
            tables[index].partyGuestNames = [customer.name]
            tables[index].occupiedSeats = max(tables[index].occupiedSeats, customer.partySize)
        }
    }

    public func assignPartyGuests(tableId: String, guests: [PartyGuest]) {
        guard let index = tables.firstIndex(where: { $0.id == tableId }), !guests.isEmpty else { return }
        let names = guests.map(\.name)
        tables[index].partyGuestNames = names
        tables[index].partyName = names.joined(separator: " + ")
        tables[index].customerId = guests.first?.customerId
        tables[index].occupiedSeats = min(tables[index].seats, max(tables[index].occupiedSeats, guests.count))
    }

    public func addOrderItem(tableId: String, item: CatalogItem, selectedModifiers: [String], quantity: Int, notes: String = "") {
        guard let index = tables.firstIndex(where: { $0.id == tableId }) else { return }
        if tables[index].status == .available {
            tables[index].status = .seated
            tables[index].occupiedSeats = max(tables[index].occupiedSeats, 1)
            tables[index].partyName = tables[index].partyName ?? "Walk-in guest"
        }
        let orderItem = MockOrderItem(id: UUID().uuidString, name: item.name, quantity: quantity, unitPriceCents: item.priceCents, modifiers: selectedModifiers, notes: notes, status: .pending, minutesAgo: 0)
        tables[index].orders.append(orderItem)
        tables[index].billTotalCents += item.priceCents * quantity
        tables[index].status = .ordered
        lastActionMessage = "Added \(quantity)x \(item.name) to Table \(tables[index].label)."
    }

    public func updateOrderItem(tableId: String, itemId: String, quantity: Int, modifiers: [String], notes: String) {
        guard let tableIndex = tables.firstIndex(where: { $0.id == tableId }), let itemIndex = tables[tableIndex].orders.firstIndex(where: { $0.id == itemId }) else { return }
        let oldTotal = tables[tableIndex].orders[itemIndex].unitPriceCents * tables[tableIndex].orders[itemIndex].quantity
        tables[tableIndex].orders[itemIndex].quantity = quantity
        tables[tableIndex].orders[itemIndex].modifiers = modifiers
        tables[tableIndex].orders[itemIndex].notes = notes
        let newTotal = tables[tableIndex].orders[itemIndex].unitPriceCents * quantity
        tables[tableIndex].billTotalCents += newTotal - oldTotal
        lastActionMessage = "Updated \(tables[tableIndex].orders[itemIndex].name)."
    }

    public func removeOrderItem(tableId: String, itemId: String) {
        guard let tableIndex = tables.firstIndex(where: { $0.id == tableId }), let item = tables[tableIndex].orders.first(where: { $0.id == itemId }) else { return }
        tables[tableIndex].billTotalCents -= item.unitPriceCents * item.quantity
        tables[tableIndex].orders.removeAll(where: { $0.id == itemId })
        if tables[tableIndex].orders.isEmpty && tables[tableIndex].partyName == nil { tables[tableIndex].status = .seated }
        lastActionMessage = "Removed \(item.name) from the order."
    }

    public func advanceItem(tableId: String, itemId: String) {
        guard let tableIndex = tables.firstIndex(where: { $0.id == tableId }), let itemIndex = tables[tableIndex].orders.firstIndex(where: { $0.id == itemId }) else { return }
        switch tables[tableIndex].orders[itemIndex].status {
        case .pending: tables[tableIndex].orders[itemIndex].status = .preparing
        case .preparing: tables[tableIndex].orders[itemIndex].status = .ready
        case .ready: tables[tableIndex].orders[itemIndex].status = .served
        case .served: return
        }
    }

    public func acceptTableRequest(_ requestId: String) {
        guard let index = tableRequests.firstIndex(where: { $0.id == requestId }) else { return }
        tableRequests[index].status = .inProgress
        lastActionMessage = "Request opened for Table \(tableRequests[index].tableId.uppercased())."
    }

    public func resolveTableRequest(_ requestId: String) {
        guard let index = tableRequests.firstIndex(where: { $0.id == requestId }) else { return }
        tableRequests[index].status = .resolved
    }

    public func closeAndClearTable(tableId: String) {
        guard let index = tables.firstIndex(where: { $0.id == tableId }) else { return }
        let label = tables[index].label
        tables[index].status = .available
        tables[index].partyName = nil
        tables[index].customerId = nil
        tables[index].occupiedSeats = 0
        tables[index].billTotalCents = 0
        tables[index].seatedTimeMinutes = 0
        tables[index].orders.removeAll()
        tables[index].isChewbuuDate = false
        tables[index].partyGuestNames.removeAll()
        lastActionMessage = "Table \(label) closed and available."
    }

    public func toggleMenuAvailability(itemId: String) {
        guard let index = menuCatalog.firstIndex(where: { $0.id == itemId }) else { return }
        menuCatalog[index].isAvailable.toggle()
        lastActionMessage = menuCatalog[index].isAvailable ? "\(menuCatalog[index].name) is available." : "\(menuCatalog[index].name) is unavailable."
    }

    public func updateMenuItem(itemId: String, name: String, priceCents: Int, description: String, dealName: String, comboItems: [String], substitutions: [String], availabilityNote: String, photoName: String?) {
        guard let index = menuCatalog.firstIndex(where: { $0.id == itemId }) else { return }
        menuCatalog[index].name = name
        menuCatalog[index].priceCents = priceCents
        menuCatalog[index].description = description
        menuCatalog[index].dealName = dealName.isEmpty ? nil : dealName
        menuCatalog[index].comboItems = comboItems
        menuCatalog[index].substitutions = substitutions
        menuCatalog[index].availabilityNote = availabilityNote
        menuCatalog[index].photoName = photoName
        lastActionMessage = "Saved \(name)."
    }

    @discardableResult
    public func addMenuItem(category: String, name: String, priceCents: Int, description: String, photoName: String?) -> CatalogItem? {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanName.isEmpty, priceCents > 0 else { return nil }
        let item = CatalogItem(id: UUID().uuidString, category: category, name: cleanName, priceCents: priceCents, description: description, modifiers: [], isAvailable: true, photoName: photoName)
        menuCatalog.append(item)
        lastActionMessage = "Added \(cleanName) to the menu."
        return item
    }

    public func toggleJobListing(jobId: String) {
        guard let index = jobListings.firstIndex(where: { $0.id == jobId }) else { return }
        jobListings[index].isPublished.toggle()
    }

    @discardableResult
    public func addJobListing(title: String, location: String, schedule: String) -> MockJobListing? {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else { return nil }
        let listing = MockJobListing(id: UUID().uuidString, title: cleanTitle, location: location, schedule: schedule, applicants: 0, isPublished: false)
        jobListings.append(listing)
        lastActionMessage = "Created \(cleanTitle)."
        return listing
    }

    @discardableResult
    public func addSpecial(title: String, detail: String, discount: String, menuItemIds: [String]) -> MockSpecial? {
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty, !menuItemIds.isEmpty else { return nil }
        let special = MockSpecial(id: UUID().uuidString, title: cleanTitle, detail: detail, discount: discount, menuItemIds: menuItemIds, isPublished: false)
        specials.append(special)
        lastActionMessage = "Created special \(cleanTitle)."
        return special
    }

    public func toggleSpecial(specialId: String) {
        guard let index = specials.firstIndex(where: { $0.id == specialId }) else { return }
        specials[index].isPublished.toggle()
    }

    public func updateSpecial(specialId: String, title: String, detail: String, discount: String, menuItemIds: [String]) {
        guard let index = specials.firstIndex(where: { $0.id == specialId }) else { return }
        specials[index].title = title
        specials[index].detail = detail
        specials[index].discount = discount
        specials[index].menuItemIds = menuItemIds
        lastActionMessage = "Saved special \(title)."
    }

    public var activeOrderCount: Int {
        tables.reduce(0) { $0 + $1.orders.filter { $0.status != .served }.count }
    }

    public var activeTableCount: Int {
        tables.filter { $0.status != .available && $0.status != .paid }.count
    }
}
