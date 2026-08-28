import SwiftUI

public struct OrdersView: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    let onInspect: (SyncInspectorSelection) -> Void
    @State private var showingNewOrder = false
    @State private var composerCustomerId: String?

    private var openTables: [MockTable] {
        syncService.tables.filter { $0.status == .seated || $0.status == .ordered }
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(alignment: .top) {
                    SyncSectionHeader(
                        eyebrow: "Operations",
                        title: "Orders & Checks",
                        subtitle: "Open a table to review the check, add an item, or close it out."
                    )
                    Spacer()
                    Button {
                        composerCustomerId = nil
                        showingNewOrder = true
                    } label: {
                        Label("New order", systemImage: "plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }

                HStack(spacing: 8) {
                    OrderSummaryBadge(title: "Open checks", value: openTables.count, color: ChewbuuTheme.burgundy)
                    OrderSummaryBadge(title: "Needs service", value: syncService.tableRequests.filter { $0.status != .resolved && $0.kind == .service }.count, color: ChewbuuTheme.gold)
                    OrderSummaryBadge(title: "Ready to serve", value: syncService.tables.flatMap(\.orders).filter { $0.status == .ready }.count, color: ChewbuuTheme.success)
                }

                if !serviceRequests.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "Table requests", icon: "bell", color: ChewbuuTheme.gold)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 500), spacing: 10)], spacing: 10) {
                            ForEach(serviceRequests) { request in
                                OrderRequestRow(syncService: syncService, request: request) {
                                    selectedTableId = request.tableId
                                    composerCustomerId = request.customerId
                                    syncService.acceptTableRequest(request.id)
                                    showingNewOrder = true
                                }
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Open checks", icon: "receipt", color: ChewbuuTheme.burgundy)
                    if openTables.isEmpty {
                        EmptyPanel(title: "No open checks", detail: "Start a new order or seat a party to begin.", icon: "receipt", color: ChewbuuTheme.secondaryText)
                    } else {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 330, maximum: 560), spacing: 10)], spacing: 10) {
                            ForEach(openTables) { table in
                                OpenCheckRow(table: table, isSelected: selectedTableId == table.id)
                                    .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                    .onTapGesture {
                                        onInspect(.table(table.id))
                                    }
                            }
                        }
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
        .sheet(isPresented: $showingNewOrder) {
            OrderComposerView(syncService: syncService, initialTableId: selectedTableId, initialCustomerId: composerCustomerId)
        }
    }

    private var serviceRequests: [MockTableRequest] {
        syncService.tableRequests.filter { $0.status != .resolved && $0.kind == .service }
    }
}

struct OrderSummaryBadge: View {
    let title: String
    let value: Int
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Text("\(value)")
                .font(.title3.bold())
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
            Spacer()
        }
        .padding(12)
        .syncCard(accent: color)
    }
}

struct OrderRequestRow: View {
    @ObservedObject var syncService: SyncService
    let request: MockTableRequest
    let action: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 7) {
                    Text(syncService.table(for: request.tableId)?.label ?? request.tableId)
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.burgundy)
                    SyncStatusPill(title: request.status.rawValue, color: request.status.color)
                }
                Text(request.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(request.detail)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(1)
            }
            Spacer()
            Button(request.status == .new ? "Open" : "Continue", action: action)
                .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.burgundy))
        }
        .padding(12)
        .syncCard(accent: ChewbuuTheme.gold)
    }
}

struct OpenCheckRow: View {
    let table: MockTable
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 13) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 7) {
                    Text(table.label)
                        .font(.title3.bold())
                        .foregroundStyle(ChewbuuTheme.burgundy)
                    Text(table.partyName ?? "Walk-in guest")
                        .font(.headline)
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    if table.isChewbuuDate {
                        Text("DATE")
                            .font(.caption2.weight(.heavy))
                            .tracking(0.7)
                            .foregroundStyle(ChewbuuTheme.burgundy)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(ChewbuuTheme.burgundy.opacity(0.1), in: Capsule())
                    }
                }
                Text("\(table.orders.count) items  ·  \(table.serverName)  ·  \(table.seatedTimeMinutes)m in service")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 5) {
                Text(formatCurrency(table.billTotalCents))
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                SyncStatusPill(title: table.status.rawValue, color: table.status.color)
            }
            Image(systemName: "chevron.right")
                .font(.caption.bold())
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .padding(14)
        .syncCard(isSelected: isSelected, accent: ChewbuuTheme.burgundy)
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}

public struct OrderComposerView: View {
    @ObservedObject var syncService: SyncService
    let initialTableId: String?
    let initialCustomerId: String?
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTableId: String?
    @State private var partyGuests: [PartyGuest] = []
    @State private var customerSearch = ""
    @State private var selectedCategory = "All"
    @State private var selectedItem: CatalogItem?
    @State private var draftLines: [DraftOrderLine] = []
    @State private var showingNewGuest = false
    @State private var showingTablePicker = false

    public init(syncService: SyncService, initialTableId: String? = nil, initialCustomerId: String? = nil) {
        self.syncService = syncService
        self.initialTableId = initialTableId
        self.initialCustomerId = initialCustomerId
        _selectedTableId = State(initialValue: initialTableId)
        let initialGuests = initialCustomerId.flatMap { id in
            syncService.customer(for: id).map { customer in
                [PartyGuest(name: customer.name, phone: customer.phone, customerId: customer.id)]
            }
        } ?? []
        _partyGuests = State(initialValue: initialGuests)
    }

    private var categories: [String] {
        ["All"] + Array(Set(syncService.menuCatalog.map(\.category))).sorted()
    }

    private var filteredItems: [CatalogItem] {
        syncService.menuCatalog.filter { item in
            item.isAvailable && (selectedCategory == "All" || item.category == selectedCategory)
        }
    }

    private var filteredCustomers: [MockCustomer] {
        let search = customerSearch.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !search.isEmpty else { return syncService.customers }
        return syncService.customers.filter {
            $0.name.localizedCaseInsensitiveContains(search) || $0.email.localizedCaseInsensitiveContains(search) || $0.phone.contains(search)
        }
    }

    private var selectedTable: MockTable? { syncService.table(for: selectedTableId) }
    private var partyLabel: String { partyGuests.map(\.name).joined(separator: ", ") }
    private var orderTotal: Int { draftLines.reduce(0) { $0 + $1.item.priceCents * $1.quantity } }
    private var canSubmit: Bool { selectedTableId != nil && !partyGuests.isEmpty && !draftLines.isEmpty }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 14) {
                    Button {
                        showingTablePicker = true
                    } label: {
                        ComposerContext(title: "Table", value: selectedTable?.label ?? "Choose a table", icon: "square.grid.2x2", color: ChewbuuTheme.yellow)
                    }
                    .buttonStyle(.plain)
                    ComposerContext(title: "Guests", value: partyLabel.isEmpty ? "Choose or create" : partyLabel, icon: "person.2", color: ChewbuuTheme.yellow)
                    Spacer()
                    Text(formatCurrency(orderTotal))
                        .font(.title2.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                }
                .padding(16)
                .background(ChewbuuTheme.surface)

                GeometryReader { geometry in
                    HStack(spacing: 0) {
                        guestColumn
                            .frame(width: min(max(geometry.size.width * 0.24, 260), 330))
                        Divider().overlay(ChewbuuTheme.divider)
                        menuColumn
                            .frame(maxWidth: .infinity)
                        Divider().overlay(ChewbuuTheme.divider)
                        reviewColumn
                            .frame(width: min(max(geometry.size.width * 0.24, 290), 360))
                    }
                }
            }
            .background(ChewbuuTheme.background)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(item: $selectedItem) { item in
                ItemCustomizerSheet(item: item) { quantity, modifiers, notes in
                    draftLines.append(DraftOrderLine(id: UUID().uuidString, item: item, quantity: quantity, modifiers: modifiers, notes: notes))
                }
            }
            .sheet(isPresented: $showingNewGuest) {
                NewCustomerSheet(syncService: syncService) { customer in
                    addGuest(customer)
                }
            }
            .popover(isPresented: $showingTablePicker, arrowEdge: .bottom) {
                OpenTablePicker(syncService: syncService, selectedTableId: $selectedTableId) {
                    showingTablePicker = false
                }
            }
        }
        .frame(minWidth: 900, minHeight: 620)
    }

    private var guestColumn: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Party")
                    .font(.headline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Spacer()
                Button("New guest", systemImage: "plus") {
                    showingNewGuest = true
                }
                .font(.caption.bold())
                .foregroundStyle(ChewbuuTheme.yellow)
            }

            if partyGuests.isEmpty {
                Text("Add each person who is dining. New guests need a name and phone.")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            } else {
                VStack(spacing: 6) {
                    ForEach(partyGuests) { guest in
                        PartyGuestRow(guest: guest) { removeGuest(guest) }
                    }
                }
            }

            TextField("Search name or phone", text: $customerSearch)
                .textFieldStyle(.roundedBorder)
            ScrollView {
                VStack(spacing: 7) {
                    ForEach(filteredCustomers) { customer in
                        CustomerChoiceRow(customer: customer, isSelected: partyGuests.contains(where: { $0.customerId == customer.id })) {
                            addGuest(customer)
                        }
                    }
                }
            }

            if let selectedTable {
                HStack {
                    Label("Table \(selectedTable.label)", systemImage: "square.grid.2x2")
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Spacer()
                    Button("Change") { showingTablePicker = true }
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.yellow)
                }
                .padding(11)
                .syncCard(accent: ChewbuuTheme.yellow)
            } else {
                Button {
                    showingTablePicker = true
                } label: {
                    Label("Choose an open table", systemImage: "square.grid.2x2")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
            }
        }
        .padding(16)
        .background(ChewbuuTheme.background)
    }

    private var menuColumn: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Menu")
                .font(.headline.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 7) {
                    ForEach(categories, id: \.self) { category in
                        Button(category) { selectedCategory = category }
                            .buttonStyle(SyncChipButtonStyle(isSelected: selectedCategory == category, color: ChewbuuTheme.burgundy))
                    }
                }
            }
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 155, maximum: 230), spacing: 9)], spacing: 9) {
                    ForEach(filteredItems) { item in
                        Button {
                            selectedItem = item
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(alignment: .top) {
                                    Text(item.category)
                                        .font(.caption2.weight(.heavy))
                                        .foregroundStyle(ChewbuuTheme.burgundy)
                                    Spacer()
                                    Text(formatCurrency(item.priceCents))
                                        .font(.caption.bold())
                                        .foregroundStyle(ChewbuuTheme.primaryText)
                                }
                                Text(item.name)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(ChewbuuTheme.primaryText)
                                    .multilineTextAlignment(.leading)
                                Text(item.description)
                                    .font(.caption)
                                    .foregroundStyle(ChewbuuTheme.secondaryText)
                                    .lineLimit(2)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .syncCard(accent: ChewbuuTheme.burgundy)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
    }

    private var reviewColumn: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("This order")
                    .font(.headline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Spacer()
                Text("\(draftLines.count) lines")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            if draftLines.isEmpty {
                EmptyPanel(title: "Nothing added", detail: "Tap an item to begin.", icon: "hand.tap", color: ChewbuuTheme.gold)
            } else {
                ScrollView {
                    VStack(spacing: 7) {
                        ForEach(draftLines) { line in
                            DraftLineRow(line: line) {
                                draftLines.removeAll { $0.id == line.id }
                            }
                        }
                    }
                }
            }
            Spacer()
            Divider().overlay(ChewbuuTheme.divider)
            HStack {
                Text("Subtotal")
                    .font(.subheadline)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                Spacer()
                Text(formatCurrency(orderTotal))
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
            }
            if partyGuests.isEmpty {
                Text("Add at least one guest before sending.")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.warning)
            }
            Button {
                submitOrder()
            } label: {
                Label("Send to kitchen", systemImage: "paperplane")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
            .disabled(!canSubmit)
            .opacity(canSubmit ? 1 : 0.45)
        }
        .padding(16)
        .background(ChewbuuTheme.surface)
    }

    private func addGuest(_ customer: MockCustomer) {
        guard !partyGuests.contains(where: { $0.customerId == customer.id }) else { return }
        partyGuests.append(PartyGuest(name: customer.name, phone: customer.phone, customerId: customer.id))
    }

    private func removeGuest(_ guest: PartyGuest) {
        partyGuests.removeAll { $0.id == guest.id }
    }

    private func submitOrder() {
        guard let tableId = selectedTableId, !partyGuests.isEmpty else { return }
        syncService.assignPartyGuests(tableId: tableId, guests: partyGuests)
        for line in draftLines {
            syncService.addOrderItem(tableId: tableId, item: line.item, selectedModifiers: line.modifiers, quantity: line.quantity, notes: line.notes)
        }
        dismiss()
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}

public struct NewCustomerSheet: View {
    @ObservedObject var syncService: SyncService
    let onSave: (MockCustomer) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var partySize = 2
    @State private var showValidation = false

    public init(syncService: SyncService, onSave: @escaping (MockCustomer) -> Void) {
        self.syncService = syncService
        self.onSave = onSave
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public var body: some View {
        SyncSheetScaffold(title: "New guest", subtitle: "Add the contact details needed to start this visit.") {
            VStack(alignment: .leading, spacing: 14) {
                SyncFormSection(title: "Contact") {
                    VStack(spacing: 10) {
                        SyncLabeledField(title: "Name", placeholder: "Full name", text: $name)
                        SyncLabeledField(title: "Phone", placeholder: "Phone number", text: $phone)
                    }
                }
                SyncFormSection(title: "Party") {
                    SyncStepperControl(title: "Party size", value: $partySize, range: 1...20)
                }
                Text("Venue guest records stay separate from Chewbuu member accounts. Existing members can be found by search.")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                if showValidation {
                    Text("Name and phone are required.")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.warning)
                }
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }
                    .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Create guest") {
                    guard canSave, let customer = syncService.createCustomer(name: name, phone: phone, partySize: partySize) else {
                        showValidation = true
                        return
                    }
                    onSave(customer)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                .disabled(!canSave)
                .opacity(canSave ? 1 : 0.5)
            }
        }
        .frame(minWidth: 470, minHeight: 420)
    }
}

struct DraftOrderLine: Identifiable, Equatable {
    let id: String
    let item: CatalogItem
    var quantity: Int
    var modifiers: [String]
    var notes: String
}

struct ComposerContext: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 1) {
                Text(title.uppercased()).font(.caption2.weight(.heavy)).foregroundStyle(ChewbuuTheme.secondaryText)
                Text(value).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
            }
        }
        .padding(9)
        .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

struct CustomerChoiceRow: View {
    let customer: MockCustomer
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Circle()
                    .fill(customer.isChewbuuMember ? ChewbuuTheme.burgundy.opacity(0.12) : ChewbuuTheme.gold.opacity(0.2))
                    .frame(width: 29, height: 29)
                    .overlay(Image(systemName: customer.isChewbuuMember ? "heart.fill" : "person.fill").font(.caption).foregroundStyle(ChewbuuTheme.burgundy))
                VStack(alignment: .leading, spacing: 2) {
                    Text(customer.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Text("\(customer.sourceLabel)  ·  \(customer.phone.isEmpty ? "No phone" : customer.phone)")
                        .font(.caption2)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                        .lineLimit(1)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(ChewbuuTheme.burgundy)
                }
            }
            .padding(9)
            .syncCard(isSelected: isSelected, accent: ChewbuuTheme.burgundy)
        }
        .buttonStyle(.plain)
    }
}

struct PartyGuestRow: View {
    let guest: PartyGuest
    let remove: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "person.fill")
                .foregroundStyle(ChewbuuTheme.yellow)
            VStack(alignment: .leading, spacing: 2) {
                Text(guest.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(guest.phone)
                    .font(.caption2)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            Button(action: remove) {
                Image(systemName: "minus.circle")
                    .foregroundStyle(ChewbuuTheme.coral)
            }
            .buttonStyle(.plain)
            .help("Remove guest from party")
        }
        .padding(9)
        .syncCard(accent: ChewbuuTheme.yellow)
    }
}

struct OpenTablePicker: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    let onSelect: () -> Void

    private let sections = ["Main Dining", "Patio", "Bar & High Tops"]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Choose a table")
                        .font(.headline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("Available for this order")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
                Image(systemName: "square.grid.2x2")
                    .foregroundStyle(ChewbuuTheme.yellow)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(sections, id: \.self) { section in
                        let tables = syncService.tables.filter { $0.section == section && $0.status != .paid }
                        if !tables.isEmpty {
                            VStack(alignment: .leading, spacing: 7) {
                                Text(section)
                                    .font(.caption.weight(.heavy))
                                    .tracking(0.8)
                                    .foregroundStyle(ChewbuuTheme.yellow)
                                ForEach(tables) { table in
                                    Button {
                                        selectedTableId = table.id
                                        onSelect()
                                    } label: {
                                        HStack(spacing: 9) {
                                            Text(table.label)
                                                .font(.headline.bold())
                                                .foregroundStyle(ChewbuuTheme.primaryText)
                                            VStack(alignment: .leading, spacing: 1) {
                                                Text(table.partyName ?? "Open table")
                                                    .font(.subheadline)
                                                    .foregroundStyle(ChewbuuTheme.secondaryText)
                                                Text("\(table.occupiedSeats)/\(table.seats) guests")
                                                    .font(.caption2)
                                                    .foregroundStyle(ChewbuuTheme.secondaryText)
                                            }
                                            Spacer()
                                            SyncStatusPill(title: table.status.rawValue, color: table.status.color)
                                            if selectedTableId == table.id {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundStyle(ChewbuuTheme.yellow)
                                            }
                                        }
                                        .padding(10)
                                        .syncCard(isSelected: selectedTableId == table.id, accent: ChewbuuTheme.yellow)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(width: 390, height: 460)
        .background(ChewbuuTheme.background)
    }
}

struct DraftLineRow: View {
    let line: DraftOrderLine
    let remove: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(line.quantity)x")
                .font(.subheadline.bold())
                .foregroundStyle(ChewbuuTheme.burgundy)
            VStack(alignment: .leading, spacing: 3) {
                Text(line.item.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                if !line.modifiers.isEmpty {
                    Text(line.modifiers.joined(separator: ", "))
                        .font(.caption2)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "$%.2f", Double(line.item.priceCents * line.quantity) / 100))
                    .font(.caption.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Button("Remove", action: remove)
                    .font(.caption2)
                    .foregroundStyle(ChewbuuTheme.coral)
            }
        }
        .padding(10)
        .syncCard()
    }
}

public struct ItemCustomizerSheet: View {
    let item: CatalogItem
    let onAdd: (Int, [String], String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var quantity = 1
    @State private var selectedModifiers: Set<String> = []
    @State private var notes = ""

    public var body: some View {
        SyncSheetScaffold(title: "Add item", subtitle: item.name) {
            VStack(alignment: .leading, spacing: 14) {
                SyncFormSection(title: "Item") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name).font(.title3.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                        Text(item.description).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText)
                        Text(formatCurrency(item.priceCents * quantity)).font(.headline).foregroundStyle(ChewbuuTheme.yellow)
                    }
                }
                if !item.modifiers.isEmpty {
                    SyncFormSection(title: "Modifiers · tap to toggle") {
                        FlowLayout(spacing: 7) {
                            ForEach(item.modifiers, id: \.self) { modifier in
                                Button(modifier) {
                                    if selectedModifiers.contains(modifier) { selectedModifiers.remove(modifier) } else { selectedModifiers.insert(modifier) }
                                }
                                .buttonStyle(SyncChipButtonStyle(isSelected: selectedModifiers.contains(modifier), color: ChewbuuTheme.yellow))
                            }
                        }
                    }
                }
                SyncStepperControl(title: "Quantity", value: $quantity, range: 1...20)
                SyncFormSection(title: "Kitchen note") {
                    SyncLabeledField(title: "Optional", placeholder: "Add a note for the kitchen", text: $notes, axis: .vertical)
                }
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }
                    .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Add \(quantity) · \(formatCurrency(item.priceCents * quantity))") {
                    onAdd(quantity, Array(selectedModifiers).sorted(), notes)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
            }
        }
        .frame(minWidth: 480, minHeight: 500)
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}

public struct OrderItemEditorSheet: View {
    @ObservedObject var syncService: SyncService
    let tableId: String
    let item: MockOrderItem
    @Environment(\.dismiss) private var dismiss
    @State private var quantity: Int
    @State private var selectedModifiers: Set<String>
    @State private var notes: String

    public init(syncService: SyncService, tableId: String, item: MockOrderItem) {
        self.syncService = syncService
        self.tableId = tableId
        self.item = item
        _quantity = State(initialValue: item.quantity)
        _selectedModifiers = State(initialValue: Set(item.modifiers))
        _notes = State(initialValue: item.notes)
    }

    private var availableModifiers: [String] {
        syncService.menuCatalog.first(where: { $0.name == item.name })?.modifiers ?? item.modifiers
    }

    public var body: some View {
        SyncSheetScaffold(title: "Modify item", subtitle: item.name) {
            VStack(alignment: .leading, spacing: 14) {
                SyncStepperControl(title: "Quantity", value: $quantity, range: 1...20)
                if !availableModifiers.isEmpty {
                    SyncFormSection(title: "Modifiers · tap to toggle") {
                        FlowLayout(spacing: 7) {
                            ForEach(availableModifiers, id: \.self) { modifier in
                                Button(modifier) {
                                    if selectedModifiers.contains(modifier) { selectedModifiers.remove(modifier) } else { selectedModifiers.insert(modifier) }
                                }
                                .buttonStyle(SyncChipButtonStyle(isSelected: selectedModifiers.contains(modifier), color: ChewbuuTheme.yellow))
                            }
                        }
                    }
                }
                SyncFormSection(title: "Kitchen note") {
                    SyncLabeledField(title: "Optional", placeholder: "Add a note for the kitchen", text: $notes, axis: .vertical)
                }
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Delete item", role: .destructive) {
                    syncService.removeOrderItem(tableId: tableId, itemId: item.id)
                    dismiss()
                }
                Button("Cancel") { dismiss() }
                    .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Save changes") {
                    syncService.updateOrderItem(tableId: tableId, itemId: item.id, quantity: quantity, modifiers: Array(selectedModifiers).sorted(), notes: notes)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
            }
        }
        .frame(minWidth: 480, minHeight: 470)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 320
        var height: CGFloat = 0
        var rowX: CGFloat = 0
        var rowY: CGFloat = 0
        var maxRowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowX + size.width > width, rowX > 0 {
                rowX = 0
                rowY += maxRowHeight + spacing
                maxRowHeight = 0
            }
            rowX += size.width + spacing
            maxRowHeight = max(maxRowHeight, size.height)
        }
        height = rowY + maxRowHeight
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var rowX = bounds.minX
        var rowY = bounds.minY
        var maxRowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowX + size.width > bounds.maxX, rowX > bounds.minX {
                rowX = bounds.minX
                rowY += maxRowHeight + spacing
                maxRowHeight = 0
            }
            subview.place(at: CGPoint(x: rowX, y: rowY), proposal: ProposedViewSize(size))
            rowX += size.width + spacing
            maxRowHeight = max(maxRowHeight, size.height)
        }
    }
}
