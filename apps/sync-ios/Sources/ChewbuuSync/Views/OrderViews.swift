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
    @State private var selectedCustomerId: String?
    @State private var customerSearch = ""
    @State private var selectedCategory = "All"
    @State private var selectedItem: CatalogItem?
    @State private var draftLines: [DraftOrderLine] = []
    @State private var showingNewGuest = false

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
    private var selectedCustomer: MockCustomer? { syncService.customer(for: selectedCustomerId) }
    private var orderTotal: Int { draftLines.reduce(0) { $0 + $1.item.priceCents * $1.quantity } }
    private var canSubmit: Bool { selectedTableId != nil && selectedCustomerId != nil && !draftLines.isEmpty }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack(spacing: 14) {
                    ComposerContext(title: "Table", value: selectedTable?.label ?? "Choose a table", icon: "square.grid.2x2", color: ChewbuuTheme.burgundy)
                    ComposerContext(title: "Guest", value: selectedCustomer?.name ?? "Choose or create", icon: "person.crop.circle", color: ChewbuuTheme.burgundy)
                    Spacer()
                    Text(formatCurrency(orderTotal))
                        .font(.title2.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                }
                .padding(16)
                .background(ChewbuuTheme.surface)

                HStack(spacing: 0) {
                    guestColumn
                    Divider().overlay(ChewbuuTheme.divider)
                    menuColumn
                    Divider().overlay(ChewbuuTheme.divider)
                    reviewColumn
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
                    selectedCustomerId = customer.id
                }
            }
        }
        .frame(minWidth: 1050, minHeight: 650)
    }

    private var guestColumn: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Guest")
                    .font(.headline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Spacer()
                Button("New guest", systemImage: "plus") {
                    showingNewGuest = true
                }
                .font(.caption.bold())
                .foregroundStyle(ChewbuuTheme.burgundy)
            }
            TextField("Search name or phone", text: $customerSearch)
                .textFieldStyle(.roundedBorder)
            Text("Contact details are required for a new guest.")
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
            ScrollView {
                VStack(spacing: 7) {
                    ForEach(filteredCustomers) { customer in
                        CustomerChoiceRow(customer: customer, isSelected: selectedCustomerId == customer.id) {
                            selectedCustomerId = customer.id
                        }
                    }
                }
            }
            Text("Table")
                .font(.headline.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
            Picker("Table", selection: $selectedTableId) {
                Text("Select table").tag(String?.none)
                ForEach(syncService.tables.filter { $0.status != .paid }) { table in
                    Text("\(table.label) · \(table.partyName ?? "Available")").tag(Optional(table.id))
                }
            }
            .pickerStyle(.menu)
            .tint(ChewbuuTheme.burgundy)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .frame(width: 255)
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
            if selectedCustomerId == nil {
                Text("Choose an existing guest or create a new guest before sending.")
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
        .frame(width: 300)
        .background(ChewbuuTheme.surface)
    }

    private func submitOrder() {
        guard let tableId = selectedTableId, let selectedCustomerId else { return }
        syncService.assignCustomer(tableId: tableId, customerId: selectedCustomerId)
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
        NavigationStack {
            Form {
                Section("Contact") {
                    TextField("Name", text: $name)
                    TextField("Phone", text: $phone)
                }
                Section("Visit") {
                    Stepper("Party size · \(partySize)", value: $partySize, in: 1...20)
                }
                Section {
                    Text("This creates a venue guest record. Chewbuu member accounts remain separate and can be found by search.")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                if showValidation {
                    Text("Name and phone are required.")
                        .foregroundStyle(ChewbuuTheme.warning)
                }
            }
            .scrollContentBackground(.hidden)
            .background(ChewbuuTheme.background)
            .navigationTitle("New guest")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard canSave, let customer = syncService.createCustomer(name: name, phone: phone, partySize: partySize) else {
                            showValidation = true
                            return
                        }
                        onSave(customer)
                        dismiss()
                    }
                    .disabled(!canSave)
                }
            }
        }
        .frame(minWidth: 430, minHeight: 360)
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
        NavigationStack {
            Form {
                Section {
                    Text(item.name).font(.title3.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Text(item.description).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Section("Modifiers") {
                    ForEach(item.modifiers, id: \.self) { modifier in
                        Toggle(modifier, isOn: Binding(
                            get: { selectedModifiers.contains(modifier) },
                            set: { enabled in
                                if enabled { selectedModifiers.insert(modifier) } else { selectedModifiers.remove(modifier) }
                            }
                        ))
                    }
                }
                Section("Quantity & notes") {
                    Stepper("Quantity · \(quantity)", value: $quantity, in: 1...20)
                    TextField("Kitchen note (optional)", text: $notes, axis: .vertical)
                }
            }
            .scrollContentBackground(.hidden)
            .background(ChewbuuTheme.background)
            .navigationTitle("Add item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add \(quantity) · \(formatCurrency(item.priceCents * quantity))") {
                        onAdd(quantity, Array(selectedModifiers).sorted(), notes)
                        dismiss()
                    }
                }
            }
        }
        .frame(minWidth: 450, minHeight: 450)
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
            Form {
                Section {
                    Text(item.name).font(.title3.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Stepper("Quantity · \(quantity)", value: $quantity, in: 1...20)
                }
                if !availableModifiers.isEmpty {
                    Section("Modifiers") {
                        ForEach(availableModifiers, id: \.self) { modifier in
                            Toggle(modifier, isOn: Binding(
                                get: { selectedModifiers.contains(modifier) },
                                set: { enabled in
                                    if enabled { selectedModifiers.insert(modifier) } else { selectedModifiers.remove(modifier) }
                                }
                            ))
                        }
                    }
                }
                Section("Notes") {
                    TextField("Kitchen note", text: $notes, axis: .vertical)
                }
            }
            .scrollContentBackground(.hidden)
            .background(ChewbuuTheme.background)
            .navigationTitle("Modify item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        syncService.updateOrderItem(tableId: tableId, itemId: item.id, quantity: quantity, modifiers: Array(selectedModifiers).sorted(), notes: notes)
                        dismiss()
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button("Delete item", role: .destructive) {
                    syncService.removeOrderItem(tableId: tableId, itemId: item.id)
                    dismiss()
                }
                .padding(.bottom, 8)
            }
        }
        .frame(minWidth: 450, minHeight: 430)
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
