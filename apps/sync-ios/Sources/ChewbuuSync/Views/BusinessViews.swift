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
        NavigationStack {
            Form {
                Section("Item") {
                    TextField("Name", text: $name)
                    Picker("Category", selection: $category) {
                        ForEach(categories, id: \.self) { Text($0).tag($0) }
                    }
                    TextField("Price", text: $price)
                    TextField("Short description", text: $description, axis: .vertical)
                }
                Section("Photo") {
                    Button {
                        hasPhoto.toggle()
                    } label: {
                        Label(hasPhoto ? "Photo attached" : "Add a photo", systemImage: hasPhoto ? "checkmark.circle" : "photo")
                    }
                    .foregroundStyle(ChewbuuTheme.burgundy)
                    Text("Optional. The item can be published without a photo.")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
            }
            .scrollContentBackground(.hidden)
            .background(ChewbuuTheme.background)
            .navigationTitle("New menu item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        _ = syncService.addMenuItem(category: category, name: name, priceCents: priceCents, description: description, photoName: hasPhoto ? "new-menu-photo" : nil)
                        dismiss()
                    }
                    .disabled(!canSave)
                }
            }
        }
        .frame(minWidth: 440, minHeight: 430)
    }
}

public struct SpecialsView: View {
    @State private var isLive = true

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Specials", subtitle: "Location-specific offers shown to the right guests.")
                    Spacer()
                    Button {
                        isLive.toggle()
                    } label: {
                        Label(isLive ? "Pause" : "Publish", systemImage: isLive ? "pause" : "play")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }
                SpecialCard(title: "Date Night Dessert", detail: "Complimentary molten cake for Chewbuu Date tables", status: isLive ? "Live tonight" : "Paused", color: ChewbuuTheme.burgundy)
                SpecialCard(title: "Golden Hour", detail: "20% off selected drinks from 4–6pm", status: "Scheduled", color: ChewbuuTheme.gold)
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
    }
}

struct SpecialCard: View {
    let title: String
    let detail: String
    let status: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "tag").font(.title3).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                Text(detail).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            SyncStatusPill(title: status, color: color)
        }
        .padding(15)
        .syncCard(accent: color)
    }
}

public struct HiringView: View {
    @ObservedObject var syncService: SyncService

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Hiring", subtitle: "Roles published for this location.")
                    Spacer()
                    Button {
                        syncService.lastActionMessage = "New job listing flow opened."
                    } label: {
                        Label("New listing", systemImage: "plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 500), spacing: 10)], spacing: 10) {
                    ForEach(syncService.jobListings) { job in
                        HStack(spacing: 12) {
                            Image(systemName: "person.badge.plus").font(.title3).foregroundStyle(ChewbuuTheme.burgundy)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(job.title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                Text("\(job.location) · \(job.schedule)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                                Text("\(job.applicants) applicants").font(.caption2.bold()).foregroundStyle(ChewbuuTheme.burgundy)
                            }
                            Spacer()
                            Button(job.isPublished ? "Published" : "Publish") { syncService.toggleJobListing(jobId: job.id) }
                                .buttonStyle(SyncOutlineButtonStyle(color: job.isPublished ? ChewbuuTheme.success : ChewbuuTheme.burgundy))
                        }
                        .padding(14)
                        .syncCard(accent: job.isPublished ? ChewbuuTheme.success : ChewbuuTheme.burgundy)
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
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
    @State private var acceptTableRequests = true
    @State private var geofenceEnabled = true
    @State private var showMemberBadges = true

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SyncSectionHeader(eyebrow: "Business", title: "Settings", subtitle: "Operating rules for this location.")
                SettingsGroup(title: "Location", icon: "mappin.and.ellipse", color: ChewbuuTheme.burgundy) {
                    SettingsRow(title: "Venue", detail: syncService.locationName)
                    SettingsRow(title: "Service mode", detail: syncService.serviceMode)
                    SettingsRow(title: "Timezone", detail: "America/Los_Angeles")
                }
                SettingsGroup(title: "Service behavior", icon: "slider.horizontal.3", color: ChewbuuTheme.gold) {
                    Toggle("Accept table requests", isOn: $acceptTableRequests)
                    Toggle("One-time attendance geofence", isOn: $geofenceEnabled)
                    Toggle("Show Chewbuu member badges", isOn: $showMemberBadges)
                }
                SettingsGroup(title: "Payments", icon: "creditcard", color: ChewbuuTheme.success) {
                    SettingsRow(title: "Payment capture", detail: "Not enabled — demo close-out only")
                    SettingsRow(title: "Tips & payouts", detail: "Capability gated")
                    Button("Review billing capabilities") { syncService.lastActionMessage = "Billing capabilities are policy-gated until enabled." }
                        .foregroundStyle(ChewbuuTheme.burgundy)
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
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
