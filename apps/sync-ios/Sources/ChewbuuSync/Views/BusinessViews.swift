import SwiftUI

public struct ScheduleAttendanceView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SyncSectionHeader(eyebrow: "People", title: "Schedules & attendance", subtitle: "A compact view of who is expected and who is here.")

                HStack(spacing: 8) {
                    AttendanceMetric(title: "On floor", value: syncService.staffList.filter { $0.status == .onFloor }.count, color: ChewbuuTheme.success)
                    AttendanceMetric(title: "On break", value: syncService.staffList.filter { $0.status == .onBreak }.count, color: ChewbuuTheme.gold)
                    AttendanceMetric(title: "Needs attention", value: syncService.staffList.filter { $0.status == .late || $0.status == .scheduled }.count, color: ChewbuuTheme.warning)
                }

                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "Today’s shifts", icon: "calendar.badge.clock", color: ChewbuuTheme.burgundy)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 290, maximum: 450), spacing: 9)], spacing: 9) {
                            ForEach(syncService.staffList) { member in
                                Button {
                                    onInspect(.staff(member.id))
                                } label: {
                                    CompactStaffRow(member: member)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "At the venue", icon: "checkmark.shield", color: ChewbuuTheme.gold)
                        VStack(alignment: .leading, spacing: 11) {
                            HStack {
                                Image(systemName: "key.fill").foregroundStyle(ChewbuuTheme.burgundy)
                                Text("Daily code").font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                Spacer()
                                Text(syncService.dailyAttendanceCode).font(.title3.bold()).foregroundStyle(ChewbuuTheme.burgundy)
                            }
                            Text("Share it at the venue. Location checks are one-time, never continuous.")
                                .font(.caption)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            Button {
                                for index in syncService.staffList.indices where syncService.staffList[index].status == .scheduled {
                                    syncService.staffList[index].status = .onFloor
                                    syncService.staffList[index].clockInTime = "Just now"
                                }
                                syncService.lastActionMessage = "Scheduled team marked on floor."
                            } label: {
                                Label("Mark scheduled on floor", systemImage: "person.2")
                            }
                            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                        }
                        .padding(14)
                        .syncCard(accent: ChewbuuTheme.gold)
                    }
                    .frame(width: 300, alignment: .leading)
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
    }
}

struct AttendanceMetric: View {
    let title: String
    let value: Int
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Text("\(value)")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
            Spacer()
        }
        .padding(13)
        .syncCard(accent: color)
    }
}

struct CompactStaffRow: View {
    let member: MockStaffMember

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(member.status.color.opacity(0.14))
                .frame(width: 38, height: 38)
                .overlay(Text(String(member.name.prefix(1))).font(.subheadline.bold()).foregroundStyle(member.status.color))
            VStack(alignment: .leading, spacing: 2) {
                Text(member.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                Text("\(member.role) · \(member.section ?? "Floor")").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            SyncStatusPill(title: member.status.rawValue, color: member.status.color)
        }
        .padding(11)
        .syncCard(accent: member.status.color)
    }
}

public struct CustomersView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void
    let onOpenOrder: (String) -> Void
    @State private var search = ""
    @State private var showingNewCustomer = false

    public init(syncService: SyncService, onInspect: @escaping (SyncInspectorSelection) -> Void, onOpenOrder: @escaping (String) -> Void) {
        self.syncService = syncService
        self.onInspect = onInspect
        self.onOpenOrder = onOpenOrder
    }

    private var filteredCustomers: [MockCustomer] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return syncService.customers }
        return syncService.customers.filter {
            $0.name.localizedCaseInsensitiveContains(query) || $0.email.localizedCaseInsensitiveContains(query) || $0.phone.contains(query)
        }
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    SyncSectionHeader(eyebrow: "Business", title: "Customers", subtitle: "Venue guest records and Chewbuu members, kept distinct.")
                    Spacer()
                    Button {
                        showingNewCustomer = true
                    } label: {
                        Label("New customer", systemImage: "plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }
                TextField("Search name or phone", text: $search)
                    .textFieldStyle(.roundedBorder)
                    .frame(maxWidth: 430)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 270, maximum: 430), spacing: 10)], spacing: 10) {
                    ForEach(filteredCustomers) { customer in
                        Button {
                            onInspect(.customer(customer.id))
                        } label: {
                            BusinessCustomerRow(customer: customer)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
        .sheet(isPresented: $showingNewCustomer) {
            NewCustomerSheet(syncService: syncService) { customer in
                onInspect(.customer(customer.id))
            }
        }
    }
}

struct BusinessCustomerRow: View {
    let customer: MockCustomer

    var body: some View {
        HStack(spacing: 11) {
            Circle()
                .fill(ChewbuuTheme.burgundy.opacity(0.11))
                .frame(width: 42, height: 42)
                .overlay(Text(String(customer.name.prefix(1))).font(.headline.bold()).foregroundStyle(ChewbuuTheme.burgundy))
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(customer.name).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    if customer.isChewbuuMember {
                        Image(systemName: "heart.fill").font(.caption).foregroundStyle(ChewbuuTheme.burgundy)
                    }
                }
                Text("\(customer.sourceLabel) · \(customer.phone.isEmpty ? "No phone" : customer.phone)")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.bold())
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .padding(13)
        .syncCard(accent: ChewbuuTheme.burgundy)
    }
}

public struct MenuManagementView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void
    @State private var selectedCategory = "All"
    @State private var showingNewItem = false

    public init(syncService: SyncService, onInspect: @escaping (SyncInspectorSelection) -> Void) {
        self.syncService = syncService
        self.onInspect = onInspect
    }

    private var categories: [String] { ["All"] + Array(Set(syncService.menuCatalog.map(\.category))).sorted() }
    private var items: [CatalogItem] { syncService.menuCatalog.filter { selectedCategory == "All" || $0.category == selectedCategory } }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    SyncSectionHeader(eyebrow: "Business", title: "Menu", subtitle: "Tap an item to inspect it. Use the inspector for availability, combos, and substitutions.")
                    Spacer()
                    Button {
                        showingNewItem = true
                    } label: {
                        Label("New item", systemImage: "plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 7) {
                        ForEach(categories, id: \.self) { category in
                            Button(category) { selectedCategory = category }
                                .buttonStyle(SyncChipButtonStyle(isSelected: selectedCategory == category, color: ChewbuuTheme.burgundy))
                        }
                    }
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 260, maximum: 390), spacing: 11)], spacing: 11) {
                    ForEach(items) { item in
                        Button {
                            onInspect(.menuItem(item.id))
                        } label: {
                            MenuCatalogCard(item: item)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
        .sheet(isPresented: $showingNewItem) {
            NewMenuItemSheet(syncService: syncService)
        }
    }
}

struct MenuCatalogCard: View {
    let item: CatalogItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(item.category.uppercased())
                    .font(.caption2.weight(.heavy))
                    .tracking(0.8)
                    .foregroundStyle(ChewbuuTheme.burgundy)
                Spacer()
                Text(String(format: "$%.2f", Double(item.priceCents) / 100))
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
            }
            Text(item.name)
                .font(.headline.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
            Text(item.description)
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
                .lineLimit(2)
            HStack(spacing: 7) {
                SyncStatusPill(title: item.isAvailable ? "Available" : "Unavailable", color: item.isAvailable ? ChewbuuTheme.success : ChewbuuTheme.coral)
                if !item.comboItems.isEmpty {
                    Text("Combo")
                        .font(.caption2.bold())
                        .foregroundStyle(ChewbuuTheme.burgundy)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .syncCard(accent: ChewbuuTheme.burgundy)
    }
}

public struct NewMenuItemSheet: View {
    @ObservedObject var syncService: SyncService
    @Environment(\.dismiss) private var dismiss
    @State private var category = "Mains"
    @State private var name = ""
    @State private var price = ""
    @State private var description = ""
    @State private var hasPhoto = false

    private var categories: [String] { Array(Set(syncService.menuCatalog.map(\.category))).sorted() }
    private var priceCents: Int { Int((Double(price) ?? 0) * 100) }
    private var canSave: Bool { !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && priceCents > 0 }

    public var body: some View {
        SyncSheetScaffold(title: "New menu item", subtitle: "Add something the floor can tap immediately.") {
            VStack(alignment: .leading, spacing: 14) {
                SyncFormSection(title: "Item") {
                    VStack(spacing: 10) {
                        SyncLabeledField(title: "Name", placeholder: "Item name", text: $name)
                        Picker("Category", selection: $category) {
                            ForEach(categories, id: \.self) { Text($0).tag($0) }
                        }
                        .tint(ChewbuuTheme.yellow)
                        SyncLabeledField(title: "Price", placeholder: "0.00", text: $price)
                        SyncLabeledField(title: "Description", placeholder: "Short description", text: $description, axis: .vertical)
                    }
                }
                SyncFormSection(title: "Photo") {
                    HStack {
                        Image(systemName: hasPhoto ? "checkmark.circle.fill" : "photo")
                            .foregroundStyle(ChewbuuTheme.yellow)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(hasPhoto ? "Photo attached" : "No photo yet")
                                .font(.subheadline.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                            Text("Optional. You can add one later from the item inspector.")
                                .font(.caption)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                        }
                        Spacer()
                        Button(hasPhoto ? "Remove" : "Add photo") { hasPhoto.toggle() }
                            .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                    }
                }
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }
                    .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Add item") {
                    _ = syncService.addMenuItem(category: category, name: name, priceCents: priceCents, description: description, photoName: hasPhoto ? "new-menu-photo" : nil)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                .disabled(!canSave)
                .opacity(canSave ? 1 : 0.5)
            }
        }
        .frame(minWidth: 500, minHeight: 510)
    }
}

public struct SpecialsView: View {
    @ObservedObject var syncService: SyncService
    @State private var showingNewSpecial = false
    @State private var editingSpecial: MockSpecial?

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Specials", subtitle: "Link a simple offer to the menu items it includes.")
                    Spacer()
                    Button {
                        showingNewSpecial = true
                    } label: {
                        Label("New special", systemImage: "plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                }
                if syncService.specials.isEmpty {
                    EmptyPanel(title: "No specials yet", detail: "Create a location-specific offer and choose its menu items.", icon: "tag", color: ChewbuuTheme.yellow)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 310, maximum: 520), spacing: 10)], spacing: 10) {
                        ForEach(syncService.specials) { special in
                            SpecialCard(
                                syncService: syncService,
                                special: special,
                                onEdit: { editingSpecial = special },
                                onToggle: { syncService.toggleSpecial(specialId: special.id) }
                            )
                        }
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
        .sheet(isPresented: $showingNewSpecial) {
            SpecialEditorSheet(syncService: syncService, special: nil)
        }
        .sheet(item: $editingSpecial) { special in
            SpecialEditorSheet(syncService: syncService, special: special)
        }
    }
}

struct SpecialCard: View {
    @ObservedObject var syncService: SyncService
    let special: MockSpecial
    let onEdit: () -> Void
    let onToggle: () -> Void

    private var menuItems: String {
        special.menuItemIds.compactMap { id in syncService.menuCatalog.first(where: { $0.id == id })?.name }.joined(separator: ", ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "tag.fill").font(.title3).foregroundStyle(ChewbuuTheme.yellow)
                VStack(alignment: .leading, spacing: 3) {
                    Text(special.title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Text(special.discount).font(.caption.bold()).foregroundStyle(ChewbuuTheme.yellow)
                }
                Spacer()
                Button(special.isPublished ? "Pause" : "Publish", action: onToggle)
                    .buttonStyle(SyncOutlineButtonStyle(color: special.isPublished ? ChewbuuTheme.success : ChewbuuTheme.yellow))
                Button(action: onEdit) {
                    Image(systemName: "chevron.right")
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .buttonStyle(.plain)
            }
            Text(special.detail).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText).lineLimit(2)
            Label(menuItems.isEmpty ? "No menu items linked" : menuItems, systemImage: "menucard")
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(15)
        .syncCard(accent: ChewbuuTheme.yellow)
    }
}

public struct SpecialEditorSheet: View {
    @ObservedObject var syncService: SyncService
    let special: MockSpecial?
    @Environment(\.dismiss) private var dismiss
    @State private var title: String
    @State private var detail: String
    @State private var discount: String
    @State private var selectedMenuItemIds: Set<String>

    init(syncService: SyncService, special: MockSpecial?) {
        self.syncService = syncService
        self.special = special
        _title = State(initialValue: special?.title ?? "")
        _detail = State(initialValue: special?.detail ?? "")
        _discount = State(initialValue: special?.discount ?? "")
        _selectedMenuItemIds = State(initialValue: Set(special?.menuItemIds ?? []))
    }

    private var menuCategories: [String] { Array(Set(syncService.menuCatalog.map(\.category))).sorted() }
    private var canSave: Bool { !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !selectedMenuItemIds.isEmpty }

    public var body: some View {
        SyncSheetScaffold(title: special == nil ? "New special" : "Edit special", subtitle: "Choose the menu items this offer applies to.") {
            VStack(alignment: .leading, spacing: 14) {
                SyncFormSection(title: "Offer") {
                    VStack(spacing: 10) {
                        SyncLabeledField(title: "Name", placeholder: "e.g. Golden hour", text: $title)
                        SyncLabeledField(title: "Discount", placeholder: "e.g. 20% off", text: $discount)
                        SyncLabeledField(title: "Description", placeholder: "What guests receive", text: $detail, axis: .vertical)
                    }
                }
                SyncFormSection(title: "Menu items · tap to include") {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(menuCategories, id: \.self) { category in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(category).font(.caption.bold()).foregroundStyle(ChewbuuTheme.yellow)
                                FlowLayout(spacing: 6) {
                                    ForEach(syncService.menuCatalog.filter { $0.category == category }) { item in
                                        Button(item.name) {
                                            if selectedMenuItemIds.contains(item.id) { selectedMenuItemIds.remove(item.id) } else { selectedMenuItemIds.insert(item.id) }
                                        }
                                        .buttonStyle(SyncChipButtonStyle(isSelected: selectedMenuItemIds.contains(item.id), color: ChewbuuTheme.yellow))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }.buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button(special == nil ? "Create draft" : "Save changes") {
                    if let special {
                        syncService.updateSpecial(specialId: special.id, title: title, detail: detail, discount: discount, menuItemIds: Array(selectedMenuItemIds).sorted())
                    } else {
                        _ = syncService.addSpecial(title: title, detail: detail, discount: discount, menuItemIds: Array(selectedMenuItemIds).sorted())
                    }
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                .disabled(!canSave)
                .opacity(canSave ? 1 : 0.5)
            }
        }
        .frame(minWidth: 560, minHeight: 620)
    }
}

public struct HiringView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void
    @State private var showingNewListing = false

    public init(syncService: SyncService, onInspect: @escaping (SyncInspectorSelection) -> Void) {
        self.syncService = syncService
        self.onInspect = onInspect
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Hiring", subtitle: "Publish roles and review who applied, in one place.")
                    Spacer()
                    Button {
                        showingNewListing = true
                    } label: {
                        Label("New listing", systemImage: "plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 500), spacing: 10)], spacing: 10) {
                    ForEach(syncService.jobListings) { job in
                        HStack(spacing: 12) {
                            Button {
                                onInspect(.job(job.id))
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "person.badge.plus")
                                        .font(.title3)
                                        .foregroundStyle(ChewbuuTheme.yellow)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(job.title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                        Text("\(job.location) · \(job.schedule)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                                        Text("\(job.applicantList.count) applicant\(job.applicantList.count == 1 ? "" : "s")")
                                            .font(.caption2.bold())
                                            .foregroundStyle(ChewbuuTheme.yellow)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption.bold())
                                        .foregroundStyle(ChewbuuTheme.secondaryText)
                                }
                            }
                            .buttonStyle(.plain)
                            Button(job.isPublished ? "Pause" : "Publish") {
                                syncService.toggleJobListing(jobId: job.id)
                            }
                            .buttonStyle(SyncOutlineButtonStyle(color: job.isPublished ? ChewbuuTheme.success : ChewbuuTheme.yellow))
                        }
                        .padding(14)
                        .syncCard(accent: job.isPublished ? ChewbuuTheme.success : ChewbuuTheme.yellow)
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
        .sheet(isPresented: $showingNewListing) {
            NewJobListingSheet(syncService: syncService)
        }
    }
}

public struct NewJobListingSheet: View {
    @ObservedObject var syncService: SyncService
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var location = "Downtown"
    @State private var schedule = ""

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !schedule.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public var body: some View {
        SyncSheetScaffold(title: "New job listing", subtitle: "Create a draft for this venue location.") {
            VStack(alignment: .leading, spacing: 14) {
                SyncFormSection(title: "Role") {
                    VStack(spacing: 10) {
                        SyncLabeledField(title: "Title", placeholder: "e.g. Evening server", text: $title)
                        SyncLabeledField(title: "Location", placeholder: "Venue location", text: $location)
                        SyncLabeledField(title: "Schedule", placeholder: "e.g. Thu–Sun · 4pm–close", text: $schedule)
                    }
                }
                Text("New listings start as drafts. Publish them only when the role, schedule, and location are ready.")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }.buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Create draft") {
                    _ = syncService.addJobListing(title: title, location: location, schedule: schedule)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                .disabled(!canSave)
                .opacity(canSave ? 1 : 0.5)
            }
        }
        .frame(minWidth: 500, minHeight: 420)
    }
}

public struct AnalyticsView: View {
    @ObservedObject var syncService: SyncService

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SyncSectionHeader(eyebrow: "Business", title: "Service analytics", subtitle: "Signals for tonight’s service.")
                HStack(spacing: 8) {
                    AnalyticsMetric(title: "Tonight’s sales", value: "$486.00", detail: "before tax & tip", color: ChewbuuTheme.burgundy)
                    AnalyticsMetric(title: "Avg. check", value: "$48.60", detail: "10 completed checks", color: ChewbuuTheme.gold)
                    AnalyticsMetric(title: "Kitchen time", value: "18m", detail: "median ticket", color: ChewbuuTheme.success)
                }
                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Orders by hour", icon: "chart.bar", color: ChewbuuTheme.burgundy)
                    HStack(alignment: .bottom, spacing: 10) {
                        ForEach(Array([3, 5, 4, 8, 12, 9, 6].enumerated()), id: \.offset) { index, value in
                            VStack(spacing: 5) {
                                RoundedRectangle(cornerRadius: 4, style: .continuous)
                                    .fill(index == 4 ? ChewbuuTheme.burgundy : ChewbuuTheme.gold.opacity(0.65))
                                    .frame(maxHeight: .infinity)
                                    .frame(width: 26)
                                Text("\(17 + index)").font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                            }
                            .frame(maxWidth: .infinity, maxHeight: 150)
                            .scaleEffect(y: CGFloat(value) / 12, anchor: .bottom)
                        }
                    }
                    .padding(16)
                    .frame(height: 195)
                    .syncCard()
                }
                HStack(spacing: 8) {
                    AnalyticsMetric(title: "Active tables", value: "\(syncService.activeTableCount)", detail: "right now", color: ChewbuuTheme.burgundy)
                    AnalyticsMetric(title: "Chewbuu Dates", value: "\(syncService.reservationRequests.count)", detail: "named table requests", color: ChewbuuTheme.gold)
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
    }
}

struct AnalyticsMetric: View {
    let title: String
    let value: String
    let detail: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(.system(size: 26, weight: .bold, design: .rounded)).foregroundStyle(color)
            Text(title).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
            Text(detail).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .syncCard(accent: color)
    }
}

public struct BusinessSettingsView: View {
    @ObservedObject var syncService: SyncService
    @State private var serviceMode = "Open service"
    @State private var acceptTableRequests = true
    @State private var acceptReservations = true
    @State private var geofenceEnabled = true
    @State private var showMemberBadges = true
    @State private var kitchenAlerts = true
    @State private var requestAlerts = true
    @State private var lateStaffAlerts = true
    @State private var allowCustomerLookup = true
    @State private var workChatEnabled = true
    @State private var maxPartySize = 12

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SyncSectionHeader(eyebrow: "Business", title: "Settings", subtitle: "The operating rules behind tables, guests, staff, menu, and money.")

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 330, maximum: 520), spacing: 14)], alignment: .leading, spacing: 16) {
                    SettingsGroup(title: "Venue", icon: "mappin.and.ellipse", color: ChewbuuTheme.yellow) {
                        SettingsRow(title: "Location", detail: syncService.locationName)
                        SettingsRow(title: "Timezone", detail: "America/Los_Angeles")
                        SettingsRow(title: "Viewer role", detail: syncService.viewerRole)
                        Button("Edit venue profile") { syncService.lastActionMessage = "Venue profile editing is location-scoped." }
                            .foregroundStyle(ChewbuuTheme.yellow)
                    }

                    SettingsGroup(title: "Service", icon: "door.left.hand.open", color: ChewbuuTheme.yellow) {
                        Picker("Service mode", selection: $serviceMode) {
                            Text("Pre-open").tag("Pre-open")
                            Text("Open service").tag("Open service")
                            Text("Closing").tag("Closing")
                            Text("Closed").tag("Closed")
                        }
                        .tint(ChewbuuTheme.yellow)
                        .onChange(of: serviceMode) { _, newValue in syncService.serviceMode = newValue }
                        Toggle("Accept table requests", isOn: $acceptTableRequests)
                        Toggle("Accept reservations", isOn: $acceptReservations)
                    }

                    SettingsGroup(title: "Floor & reservations", icon: "square.grid.2x2", color: ChewbuuTheme.gold) {
                        SyncStepperControl(title: "Maximum party size", value: $maxPartySize, range: 1...30)
                        SettingsRow(title: "Reservation model", detail: "Named table requests")
                        SettingsRow(title: "Chewbuu Dates", detail: "Optional pre-ordered items")
                    }

                    SettingsGroup(title: "Menu & kitchen", icon: "menucard", color: ChewbuuTheme.yellow) {
                        SettingsRow(title: "Menu source", detail: "Venue-owned catalog")
                        SettingsRow(title: "Unavailable items", detail: "Hide from new orders")
                        Toggle("Kitchen status alerts", isOn: $kitchenAlerts)
                        Button("Open menu and specials") { syncService.lastActionMessage = "Use Menu and Specials to edit catalog content." }
                            .foregroundStyle(ChewbuuTheme.yellow)
                    }

                    SettingsGroup(title: "People & privacy", icon: "person.2", color: ChewbuuTheme.yellow) {
                        Toggle("Allow venue customer lookup", isOn: $allowCustomerLookup)
                        Toggle("Show Chewbuu member badges", isOn: $showMemberBadges)
                        Toggle("Enable Sync work chat", isOn: $workChatEnabled)
                        Toggle("One-time attendance geofence", isOn: $geofenceEnabled)
                    }

                    SettingsGroup(title: "Notifications", icon: "bell", color: ChewbuuTheme.gold) {
                        Toggle("New table request alerts", isOn: $requestAlerts)
                        Toggle("Late staff alerts", isOn: $lateStaffAlerts)
                        SettingsRow(title: "Delivery", detail: "Sync app + staff channel")
                        SettingsRow(title: "Continuous tracking", detail: "Never used")
                    }

                    SettingsGroup(title: "Payments & close-out", icon: "creditcard", color: ChewbuuTheme.success) {
                        SettingsRow(title: "Payment capture", detail: "Not enabled — demo only")
                        SettingsRow(title: "Tips & payouts", detail: "Capability gated")
                        SettingsRow(title: "Refunds & disputes", detail: "Policy gated")
                        Button("Review billing capabilities") { syncService.lastActionMessage = "Billing capabilities are policy-gated until enabled." }
                            .foregroundStyle(ChewbuuTheme.yellow)
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
        .onAppear { serviceMode = syncService.serviceMode }
    }
}

struct SectionTitle: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: icon).foregroundStyle(color)
            Text(title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
        }
    }
}

struct SettingsGroup<Content: View>: View {
    let title: String
    let icon: String
    let color: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle(title: title, icon: icon, color: color)
            VStack(alignment: .leading, spacing: 12) { content }
                .padding(15)
                .syncCard(accent: color)
        }
    }
}

struct SettingsRow: View {
    let title: String
    let detail: String

    var body: some View {
        HStack {
            Text(title).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
            Spacer()
            Text(detail).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText).multilineTextAlignment(.trailing)
        }
    }
}
