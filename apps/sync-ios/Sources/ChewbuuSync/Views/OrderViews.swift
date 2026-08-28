import SwiftUI

public struct OrdersView: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    @State private var showingNewOrder = false
    @State private var composerCustomerId: String?

    private var openTables: [MockTable] {
        syncService.tables.filter { $0.status != .available && $0.status != .paid }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Orders & Checks")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("Tap a table to modify an order, add another round, or close the check.")
                        .font(.subheadline)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
                Button {
                    composerCustomerId = nil
                    showingNewOrder = true
                } label: {
                    Label("Take a new order", systemImage: "plus.circle.fill")
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
            }
            .padding(22)

            HStack(spacing: 12) {
                OrderSummaryCard(title: "Open checks", value: "\(openTables.count)", color: ChewbuuTheme.blue)
                OrderSummaryCard(title: "Needs service", value: "\(syncService.tableRequests.filter { $0.status != .resolved }.count)", color: ChewbuuTheme.amber)
                OrderSummaryCard(title: "Ready to serve", value: "\(syncService.tables.flatMap(\.orders).filter { $0.status == .ready }.count)", color: ChewbuuTheme.mint)
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 17)

            Divider().overlay(ChewbuuTheme.divider)

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if !syncService.tableRequests.filter({ $0.status != .resolved }).isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            SectionTitle(title: "Requests from tables", icon: "bell.badge.fill", color: ChewbuuTheme.amber)
                            ForEach(syncService.tableRequests.filter { $0.status != .resolved }) { request in
                                TableRequestCard(syncService: syncService, request: request) {
                                    selectedTableId = request.tableId
                                    composerCustomerId = request.customerId
                                    syncService.acceptTableRequest(request.id)
                                    showingNewOrder = true
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "Open checks", icon: "receipt.fill", color: ChewbuuTheme.blue)
                        if openTables.isEmpty {
                            EmptyPanel(title: "No open checks", detail: "Seat a party or start a new order to begin.", icon: "receipt", color: ChewbuuTheme.blue)
                        } else {
                            ForEach(openTables) { table in
                                Button {
                                    selectedTableId = table.id
                                } label: {
                                    OpenCheckRow(table: table, isSelected: selectedTableId == table.id)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(22)
            }
        }
        .background(ChewbuuTheme.background)
        .sheet(isPresented: $showingNewOrder) {
            OrderComposerView(syncService: syncService, initialTableId: selectedTableId, initialCustomerId: composerCustomerId)
        }
    }
}

struct OrderSummaryCard: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(color.opacity(0.18))
                .frame(width: 30, height: 30)
                .overlay(Circle().stroke(color.opacity(0.5), lineWidth: 1))
            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
        }
        .padding(12)
        .syncCard(accent: color)
    }
}

struct OpenCheckRow: View {
    let table: MockTable
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 8) {
                    Text(table.label)
                        .font(.title3.bold())
                        .foregroundStyle(ChewbuuTheme.blue)
                    Text(table.partyName ?? "Walk-in guest")
                        .font(.headline)
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    if table.isChewbuuDate {
                        Text("CHEWBUU DATE")
                            .font(.caption2.weight(.heavy))
                            .tracking(0.7)
                            .foregroundStyle(ChewbuuTheme.datePink)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 4)
                            .background(ChewbuuTheme.datePink.opacity(0.13), in: Capsule())
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
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .padding(16)
        .syncCard(isSelected: isSelected, accent: ChewbuuTheme.blue)
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
    @State private var selectedCustomerId: String?
    @State private var customerSearch = ""
    @State private var selectedCategory = "All"
    @State private var selectedItem: CatalogItem?
    @State private var draftLines: [DraftOrderLine] = []

    public init(syncService: SyncService, initialTableId: String? = nil, initialCustomerId: String? = nil) {
        self.syncService = syncService
        self.initialTableId = initialTableId
        self.initialCustomerId = initialCustomerId
        _selectedTableId = State(initialValue: initialTableId)
        _selectedCustomerId = State(initialValue: initialCustomerId)
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
    private var orderTotal: Int { draftLines.reduce(0) { $0 + $1.item.priceCents * $1.quantity } }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    ComposerContext(title: "Table", value: selectedTable?.label ?? "Choose a table", icon: "square.grid.2x2.fill", color: ChewbuuTheme.blue)
                    ComposerContext(title: "Guest", value: syncService.customer(for: selectedCustomerId)?.name ?? "Walk-in guest", icon: "person.crop.circle.fill", color: ChewbuuTheme.datePink)
                    Spacer()
                    Text(formatCurrency(orderTotal))
                        .font(.title2.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                }
                .padding(18)
                .background(ChewbuuTheme.surface)

                HStack(spacing: 0) {
                    VStack(alignment: .leading, spacing: 13) {
                        Text("Who is dining?")
                            .font(.headline.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        TextField("Search venue guests or Chewbuu members", text: $customerSearch)
                            .textFieldStyle(.roundedBorder)
                        ScrollView {
                            VStack(spacing: 8) {
                                CustomerChoiceRow(customer: nil, isSelected: selectedCustomerId == nil) {
                                    selectedCustomerId = nil
                                }
                                ForEach(filteredCustomers) { customer in
                                    CustomerChoiceRow(customer: customer, isSelected: selectedCustomerId == customer.id) {
                                        selectedCustomerId = customer.id
                                    }
                                }
                            }
                        }
                    }
                    .padding(18)
                    .frame(width: 280)
                    .background(ChewbuuTheme.background)

                    Divider().overlay(ChewbuuTheme.divider)

                    VStack(alignment: .leading, spacing: 13) {
                        HStack {
                            Text("Choose a table")
                                .font(.headline.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                            Spacer()
                            Picker("Table", selection: $selectedTableId) {
                                Text("Select table").tag(String?.none)
                                ForEach(syncService.tables.filter { $0.status != .paid }) { table in
                                    Text("\(table.label) · \(table.partyName ?? "Available")").tag(Optional(table.id))
                                }
                            }
                            .frame(width: 260)
                        }

                        Text("Build the order")
                            .font(.headline.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(categories, id: \.self) { category in
                                    Button(category) { selectedCategory = category }
                                        .buttonStyle(SyncChipButtonStyle(isSelected: selectedCategory == category, color: ChewbuuTheme.amber))
                                }
                            }
                        }

                        ScrollView {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 185, maximum: 245), spacing: 12)], spacing: 12) {
                                ForEach(filteredItems) { item in
                                    Button {
                                        selectedItem = item
                                    } label: {
                                        MenuChoiceCard(item: item)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding(18)
                    .frame(maxWidth: .infinity)

                    Divider().overlay(ChewbuuTheme.divider)

                    VStack(alignment: .leading, spacing: 13) {
                        Text("This order")
                            .font(.headline.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        if draftLines.isEmpty {
                            EmptyPanel(title: "Nothing added", detail: "Tap a menu item to start.", icon: "hand.tap.fill", color: ChewbuuTheme.amber)
                        } else {
                            ScrollView {
                                VStack(spacing: 8) {
                                    ForEach(draftLines) { line in
                                        DraftLineRow(line: line) {
                                            draftLines.removeAll { $0.id == line.id }
                                        }
                                    }
                                }
                            }
                        }
                        Spacer()
                        VStack(alignment: .leading, spacing: 7) {
                            HStack {
                                Text("Subtotal")
                                Spacer()
                                Text(formatCurrency(orderTotal)).bold()
                            }
                            Text("Payment happens at checkout. Sending to kitchen is free-flowing and editable.")
                                .font(.caption)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                        }
                        Button {
                            submitOrder()
                        } label: {
                            Label("Send order to kitchen", systemImage: "paperplane.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                        .disabled(selectedTableId == nil || draftLines.isEmpty)
                        .opacity(selectedTableId == nil || draftLines.isEmpty ? 0.45 : 1)
                    }
                    .padding(18)
                    .frame(width: 315)
                    .background(ChewbuuTheme.surface)
                }
            }
            .background(ChewbuuTheme.background)
            .navigationTitle("Take an Order")
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
        }
        .frame(minWidth: 1050, minHeight: 650)
    }

    private func submitOrder() {
        guard let tableId = selectedTableId else { return }
        if let selectedCustomerId { syncService.assignCustomer(tableId: tableId, customerId: selectedCustomerId) }
        for line in draftLines {
            syncService.addOrderItem(tableId: tableId, item: line.item, selectedModifiers: line.modifiers, quantity: line.quantity, notes: line.notes)
        }
        dismiss()
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
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
        .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

struct CustomerChoiceRow: View {
    let customer: MockCustomer?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 9) {
                Circle()
                    .fill(customer?.isChewbuuMember == true ? ChewbuuTheme.datePink.opacity(0.2) : ChewbuuTheme.blue.opacity(0.18))
                    .frame(width: 31, height: 31)
                    .overlay(Image(systemName: customer == nil ? "figure.walk" : "person.fill").font(.caption).foregroundStyle(customer?.isChewbuuMember == true ? ChewbuuTheme.datePink : ChewbuuTheme.blue))
                VStack(alignment: .leading, spacing: 2) {
                    Text(customer?.name ?? "Walk-in guest").font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Text(customer?.sourceLabel ?? "No profile selected").font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
                if isSelected { Image(systemName: "checkmark.circle.fill").foregroundStyle(ChewbuuTheme.mint) }
            }
            .padding(9)
            .syncCard(isSelected: isSelected, accent: customer?.isChewbuuMember == true ? ChewbuuTheme.datePink : ChewbuuTheme.blue)
        }
        .buttonStyle(.plain)
    }
}

struct MenuChoiceCard: View {
    let item: CatalogItem

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .top) {
                Text(item.category.uppercased())
                    .font(.caption2.weight(.heavy))
                    .tracking(0.8)
                    .foregroundStyle(ChewbuuTheme.amber)
                Spacer()
                Text(formatCurrency(item.priceCents))
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
            }
            Text(item.name)
                .font(.headline.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
                .multilineTextAlignment(.leading)
            Text(item.description)
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
                .lineLimit(2)
            Label("Tap to customize", systemImage: "hand.tap.fill")
                .font(.caption2.bold())
                .foregroundStyle(ChewbuuTheme.blue)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .syncCard(accent: ChewbuuTheme.amber)
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}

struct DraftLineRow: View {
    let line: DraftOrderLine
    let remove: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("\(line.quantity)x")
                .font(.subheadline.bold())
                .foregroundStyle(ChewbuuTheme.blue)
            VStack(alignment: .leading, spacing: 3) {
                Text(line.item.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                if !line.modifiers.isEmpty { Text(line.modifiers.joined(separator: ", ")).font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText) }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(formatCurrency(line.item.priceCents * line.quantity)).font(.caption.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                Button("Remove", action: remove).font(.caption2).foregroundStyle(ChewbuuTheme.coral)
            }
        }
        .padding(10)
        .syncCard()
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
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
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(item.name).font(.system(size: 28, weight: .bold, design: .rounded)).foregroundStyle(ChewbuuTheme.primaryText)
                    Text(item.description).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .padding(.top, 10)

                VStack(alignment: .leading, spacing: 10) {
                    Text("Tap modifiers").font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    FlowLayout(spacing: 8) {
                        ForEach(item.modifiers, id: \.self) { modifier in
                            Button {
                                if selectedModifiers.contains(modifier) { selectedModifiers.remove(modifier) } else { selectedModifiers.insert(modifier) }
                            } label: {
                                Label(modifier, systemImage: selectedModifiers.contains(modifier) ? "checkmark.circle.fill" : "circle")
                            }
                            .buttonStyle(SyncChipButtonStyle(isSelected: selectedModifiers.contains(modifier), color: ChewbuuTheme.amber))
                        }
                    }
                }

                HStack {
                    Text("Quantity").font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Spacer()
                    Stepper("\(quantity)", value: $quantity, in: 1...20)
                        .labelsHidden()
                    Text("\(quantity)").font(.title3.bold()).frame(width: 30)
                }
                .padding(14)
                .syncCard()

                TextField("Kitchen note (optional)", text: $notes, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)

                Spacer()

                Button {
                    onAdd(quantity, Array(selectedModifiers).sorted(), notes)
                    dismiss()
                } label: {
                    Label("Add \(quantity)x to order · \(formatCurrency(item.priceCents * quantity))", systemImage: "plus.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
            }
            .padding(24)
            .background(ChewbuuTheme.background)
            .navigationTitle("Customize item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
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
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                Text(item.name).font(.system(size: 28, weight: .bold, design: .rounded)).foregroundStyle(ChewbuuTheme.primaryText)
                HStack { Text("Quantity").font(.headline); Spacer(); Stepper("\(quantity)", value: $quantity, in: 1...20).labelsHidden(); Text("\(quantity)").font(.title3.bold()) }
                    .padding(14).syncCard()
                if !availableModifiers.isEmpty {
                    Text("Modifiers").font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    FlowLayout(spacing: 8) {
                        ForEach(availableModifiers, id: \.self) { modifier in
                            Button {
                                if selectedModifiers.contains(modifier) { selectedModifiers.remove(modifier) } else { selectedModifiers.insert(modifier) }
                            } label: { Label(modifier, systemImage: selectedModifiers.contains(modifier) ? "checkmark.circle.fill" : "circle") }
                                .buttonStyle(SyncChipButtonStyle(isSelected: selectedModifiers.contains(modifier), color: ChewbuuTheme.amber))
                        }
                    }
                }
                TextField("Kitchen note", text: $notes, axis: .vertical).textFieldStyle(.roundedBorder).lineLimit(2...4)
                Spacer()
                HStack(spacing: 12) {
                    Button("Delete item", role: .destructive) { syncService.removeOrderItem(tableId: tableId, itemId: item.id); dismiss() }
                    Spacer()
                    Button("Save changes") {
                        syncService.updateOrderItem(tableId: tableId, itemId: item.id, quantity: quantity, modifiers: Array(selectedModifiers).sorted(), notes: notes)
                        dismiss()
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                }
            }
            .padding(24)
            .background(ChewbuuTheme.background)
            .navigationTitle("Modify order item")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
        .frame(minWidth: 480, minHeight: 500)
    }
}

struct SyncChipButtonStyle: ButtonStyle {
    let isSelected: Bool
    let color: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.bold())
            .foregroundStyle(isSelected ? ChewbuuTheme.primaryText : ChewbuuTheme.secondaryText)
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(isSelected ? color.opacity(0.28) : ChewbuuTheme.surfaceMuted, in: Capsule())
            .overlay(Capsule().stroke(isSelected ? color : ChewbuuTheme.divider, lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}
