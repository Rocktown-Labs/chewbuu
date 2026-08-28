import SwiftUI

public struct ScheduleAttendanceView: View {
    @ObservedObject var syncService: SyncService

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SyncSectionHeader(eyebrow: "People", title: "Schedules & attendance", subtitle: "See who is expected, on the floor, or needs a check-in.")

                HStack(spacing: 12) {
                    AttendanceMetric(title: "On floor", value: syncService.staffList.filter { $0.status == .onFloor }.count, color: ChewbuuTheme.mint)
                    AttendanceMetric(title: "On break", value: syncService.staffList.filter { $0.status == .onBreak }.count, color: ChewbuuTheme.amber)
                    AttendanceMetric(title: "Needs attention", value: syncService.staffList.filter { $0.status == .late || $0.status == .scheduled }.count, color: ChewbuuTheme.coral)
                }

                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 11) {
                        SectionTitle(title: "Today’s shifts", icon: "calendar.badge.clock", color: ChewbuuTheme.blue)
                        ForEach(syncService.staffList) { member in
                            HStack(spacing: 11) {
                                Circle()
                                    .fill(member.status.color.opacity(0.18))
                                    .frame(width: 38, height: 38)
                                    .overlay(Text(String(member.name.prefix(1))).font(.subheadline.bold()).foregroundStyle(member.status.color))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(member.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                    Text("\(member.role)  ·  \(member.section ?? "Floor")").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 3) {
                                    Text(member.clockInTime == nil ? "17:00–close" : "Clocked \(member.clockInTime ?? "")")
                                        .font(.caption.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                    SyncStatusPill(title: member.status.rawValue, color: member.status.color)
                                }
                            }
                            .padding(12)
                            .syncCard()
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 11) {
                        SectionTitle(title: "Manager tools", icon: "checkmark.shield.fill", color: ChewbuuTheme.amber)
                        VStack(alignment: .leading, spacing: 12) {
                            Label("Daily code \(syncService.dailyAttendanceCode)", systemImage: "key.fill")
                                .font(.headline.bold())
                                .foregroundStyle(ChewbuuTheme.amber)
                            Text("Share the code at the venue. Clock-in remains tied to assigned shifts and location policy.")
                                .font(.subheadline)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            Button {
                                for index in syncService.staffList.indices where syncService.staffList[index].status == .scheduled {
                                    syncService.staffList[index].status = .onFloor
                                    syncService.staffList[index].clockInTime = "Just now"
                                }
                                syncService.lastActionMessage = "Scheduled team members marked on floor."
                            } label: {
                                Label("Mark scheduled team on floor", systemImage: "person.2.fill")
                            }
                            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                        }
                        .padding(16)
                        .syncCard(accent: ChewbuuTheme.amber)

                        EmptyPanel(title: "No attendance exceptions", detail: "Your next action will appear here.", icon: "checkmark.circle.fill", color: ChewbuuTheme.mint)
                    }
                    .frame(width: 310, alignment: .leading)
                }
            }
            .padding(22)
        }
        .background(ChewbuuTheme.background)
    }
}

struct AttendanceMetric: View {
    let title: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("\(value)").font(.system(size: 28, weight: .bold, design: .rounded)).foregroundStyle(color)
            Text(title).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(15)
        .syncCard(accent: color)
    }
}

public struct CustomersView: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    let onOpenOrder: () -> Void
    @State private var search = ""
    @State private var selectedCustomerId: String?

    private var filteredCustomers: [MockCustomer] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return syncService.customers }
        return syncService.customers.filter { $0.name.localizedCaseInsensitiveContains(query) || $0.email.localizedCaseInsensitiveContains(query) || $0.phone.contains(query) }
    }

    private var selectedCustomer: MockCustomer? { syncService.customer(for: selectedCustomerId) }

    public var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 14) {
                SyncSectionHeader(eyebrow: "Guest profiles", title: "Customers", subtitle: "Venue guests and Chewbuu members, in one service view.")
                TextField("Search name, email, or phone", text: $search)
                    .textFieldStyle(.roundedBorder)
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(filteredCustomers) { customer in
                            Button {
                                selectedCustomerId = customer.id
                            } label: {
                                CustomerChoiceRow(customer: customer, isSelected: selectedCustomerId == customer.id, action: {})
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(22)
            .frame(width: 390)
            .background(ChewbuuTheme.surface.opacity(0.55))

            Divider().overlay(ChewbuuTheme.divider)

            if let customer = selectedCustomer {
                CustomerDetailView(syncService: syncService, customer: customer, selectedTableId: $selectedTableId, onOpenOrder: onOpenOrder)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "person.crop.circle.badge.magnifyingglass")
                        .font(.system(size: 42))
                        .foregroundStyle(ChewbuuTheme.amber)
                    Text("Select a customer")
                        .font(.title3.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    Text("Search venue records or find a Chewbuu member dining in tonight.")
                        .font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(30)
            }
        }
        .background(ChewbuuTheme.background)
    }
}

struct CustomerDetailView: View {
    @ObservedObject var syncService: SyncService
    let customer: MockCustomer
    @Binding var selectedTableId: String?
    let onOpenOrder: () -> Void

    private var currentTable: MockTable? { syncService.tables.first { $0.customerId == customer.id } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 14) {
                    Circle()
                        .fill(customer.isChewbuuMember ? ChewbuuTheme.datePink.opacity(0.24) : ChewbuuTheme.blue.opacity(0.2))
                        .frame(width: 68, height: 68)
                        .overlay(Text(String(customer.name.prefix(1))).font(.title.bold()).foregroundStyle(customer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.blue))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(customer.name).font(.system(size: 25, weight: .bold, design: .rounded)).foregroundStyle(ChewbuuTheme.primaryText)
                        Text(customer.sourceLabel).font(.subheadline.bold()).foregroundStyle(customer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.secondaryText)
                        Text("\(customer.visitCount) visits  ·  Last visit \(customer.lastVisit)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                }
                .padding(18)
                .syncCard(accent: customer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.blue)

                HStack(spacing: 12) {
                    CustomerFact(title: "Favorite", value: customer.favoriteOrder, icon: "heart.fill", color: ChewbuuTheme.datePink)
                    CustomerFact(title: "Phone", value: customer.phone.isEmpty ? "Not provided" : customer.phone, icon: "phone.fill", color: ChewbuuTheme.blue)
                }

                if let table = currentTable {
                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "Dining now", icon: "fork.knife", color: ChewbuuTheme.amber)
                        HStack {
                            Text("Table \(table.label)").font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Spacer()
                            Text(formatCurrency(table.billTotalCents)).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Button("Open order") {
                                selectedTableId = table.id
                                onOpenOrder()
                            }
                            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                        }
                        .padding(15)
                        .syncCard()
                    }
                } else {
                    EmptyPanel(title: "Not seated right now", detail: "Select a table when this guest arrives.", icon: "chair.lounge.fill", color: ChewbuuTheme.secondaryText)
                }
            }
            .padding(22)
        }
    }

    private func formatCurrency(_ cents: Int) -> String { String(format: "$%.2f", Double(cents) / 100) }
}

struct CustomerFact: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Image(systemName: icon).foregroundStyle(color)
            Text(title.uppercased()).font(.caption2.weight(.heavy)).tracking(0.8).foregroundStyle(ChewbuuTheme.secondaryText)
            Text(value).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText).lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .syncCard()
    }
}

public struct MenuManagementView: View {
    @ObservedObject var syncService: SyncService
    @State private var selectedCategory = "All"

    private var categories: [String] { ["All"] + Array(Set(syncService.menuCatalog.map(\.category))).sorted() }
    private var items: [CatalogItem] { syncService.menuCatalog.filter { selectedCategory == "All" || $0.category == selectedCategory } }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Menu", subtitle: "Keep every tap-to-order item current for the floor and kitchen.")
                    Spacer()
                    Button { syncService.lastActionMessage = "Menu item creation is ready for the next API-backed pass." } label: { Label("Add menu item", systemImage: "plus.circle.fill") }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(categories, id: \.self) { category in
                            Button(category) { selectedCategory = category }
                                .buttonStyle(SyncChipButtonStyle(isSelected: selectedCategory == category, color: ChewbuuTheme.amber))
                        }
                    }
                }
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 250, maximum: 340), spacing: 12)], spacing: 12) {
                    ForEach(items) { item in
                        VStack(alignment: .leading, spacing: 9) {
                            HStack {
                                Text(item.category.uppercased()).font(.caption2.weight(.heavy)).tracking(0.9).foregroundStyle(ChewbuuTheme.amber)
                                Spacer()
                                Text(String(format: "$%.2f", Double(item.priceCents) / 100)).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            }
                            Text(item.name).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Text(item.description).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText).lineLimit(2)
                            HStack {
                                SyncStatusPill(title: item.isAvailable ? "Available" : "86’d", color: item.isAvailable ? ChewbuuTheme.mint : ChewbuuTheme.coral)
                                Spacer()
                                Button(item.isAvailable ? "Mark 86’d" : "Bring back") { syncService.toggleMenuAvailability(itemId: item.id) }
                                    .font(.caption.bold()).foregroundStyle(ChewbuuTheme.blue)
                            }
                        }
                        .padding(15)
                        .syncCard(accent: item.isAvailable ? ChewbuuTheme.mint : ChewbuuTheme.coral)
                    }
                }
            }
            .padding(22)
        }
        .background(ChewbuuTheme.background)
    }
}

public struct SpecialsView: View {
    @State private var isLive = true

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Specials", subtitle: "Promote the right thing to the right table, without making the menu noisy.")
                    Spacer()
                    Button { isLive.toggle() } label: { Label(isLive ? "Pause specials" : "Publish specials", systemImage: isLive ? "pause.circle.fill" : "play.circle.fill") }
                        .buttonStyle(SyncFilledButtonStyle(color: isLive ? ChewbuuTheme.orange : ChewbuuTheme.mint))
                }
                SpecialCard(title: "Date Night Dessert", detail: "Complimentary molten cake for Chewbuu Date tables", status: isLive ? "Live tonight" : "Paused", color: ChewbuuTheme.datePink)
                SpecialCard(title: "Golden Hour", detail: "20% off selected drinks from 4–6pm", status: "Scheduled", color: ChewbuuTheme.amber)
                EmptyPanel(title: "Add another special", detail: "Create a location-specific offer when you are ready.", icon: "plus.circle.fill", color: ChewbuuTheme.blue)
            }
            .padding(22)
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
        HStack(spacing: 13) {
            Image(systemName: "tag.fill").font(.title2).foregroundStyle(color)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                Text(detail).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            SyncStatusPill(title: status, color: color)
        }
        .padding(17)
        .syncCard(accent: color)
    }
}

public struct HiringView: View {
    @ObservedObject var syncService: SyncService

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "Business", title: "Hiring", subtitle: "Location-specific roles that can be published to your public Chewbuu spot page.")
                    Spacer()
                    Button { syncService.lastActionMessage = "New job listing flow opened." } label: { Label("Create listing", systemImage: "plus.circle.fill") }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                }
                ForEach(syncService.jobListings) { job in
                    HStack(spacing: 14) {
                        Image(systemName: "person.badge.plus").font(.title2).foregroundStyle(ChewbuuTheme.amber)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(job.title).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Text("\(job.location)  ·  \(job.schedule)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                            Text("\(job.applicants) applicants").font(.caption2.bold()).foregroundStyle(ChewbuuTheme.blue)
                        }
                        Spacer()
                        Button(job.isPublished ? "Published" : "Publish") { syncService.toggleJobListing(jobId: job.id) }
                            .buttonStyle(SyncFilledButtonStyle(color: job.isPublished ? ChewbuuTheme.mint : ChewbuuTheme.blue))
                    }
                    .padding(16)
                    .syncCard(accent: job.isPublished ? ChewbuuTheme.mint : ChewbuuTheme.blue)
                }
            }
            .padding(22)
        }
        .background(ChewbuuTheme.background)
    }
}

public struct AnalyticsView: View {
    @ObservedObject var syncService: SyncService

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SyncSectionHeader(eyebrow: "Business", title: "Service analytics", subtitle: "Operational signals for tonight, not vanity numbers.")
                HStack(spacing: 12) {
                    AnalyticsMetric(title: "Tonight’s sales", value: "$486.00", detail: "before tax & tip", color: ChewbuuTheme.amber)
                    AnalyticsMetric(title: "Avg. check", value: "$48.60", detail: "10 completed checks", color: ChewbuuTheme.blue)
                    AnalyticsMetric(title: "Kitchen time", value: "18m", detail: "median ticket", color: ChewbuuTheme.mint)
                }
                VStack(alignment: .leading, spacing: 13) {
                    SectionTitle(title: "Orders by hour", icon: "chart.bar.fill", color: ChewbuuTheme.blue)
                    HStack(alignment: .bottom, spacing: 12) {
                        ForEach(Array([3, 5, 4, 8, 12, 9, 6].enumerated()), id: \.offset) { index, value in
                            VStack(spacing: 6) {
                                RoundedRectangle(cornerRadius: 7, style: .continuous)
                                    .fill(index == 4 ? ChewbuuTheme.amber : ChewbuuTheme.blue.opacity(0.55))
                                    .frame(maxHeight: .infinity)
                                    .frame(width: 30)
                                Text("\(17 + index)").font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                            }
                            .frame(maxWidth: .infinity, maxHeight: 170)
                        }
                    }
                    .padding(18)
                    .frame(height: 220)
                    .syncCard()
                }
                HStack(alignment: .top, spacing: 12) {
                    AnalyticsMetric(title: "Active tables", value: "\(syncService.activeTableCount)", detail: "right now", color: ChewbuuTheme.violet)
                    AnalyticsMetric(title: "Chewbuu Dates", value: "\(syncService.diningDates.count)", detail: "tracked experiences", color: ChewbuuTheme.datePink)
                }
            }
            .padding(22)
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
        VStack(alignment: .leading, spacing: 5) {
            Text(value).font(.system(size: 27, weight: .bold, design: .rounded)).foregroundStyle(color)
            Text(title).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
            Text(detail).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
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
                SyncSectionHeader(eyebrow: "Business", title: "Settings", subtitle: "Configure this location’s operating rhythm and customer experience.")
                SettingsGroup(title: "Location", icon: "mappin.and.ellipse", color: ChewbuuTheme.blue) {
                    SettingsRow(title: "Venue", detail: syncService.locationName)
                    SettingsRow(title: "Service mode", detail: syncService.serviceMode)
                    SettingsRow(title: "Timezone", detail: "America/Los_Angeles")
                }
                SettingsGroup(title: "Service behavior", icon: "slider.horizontal.3", color: ChewbuuTheme.amber) {
                    Toggle("Accept table requests", isOn: $acceptTableRequests)
                    Toggle("One-time attendance geofence", isOn: $geofenceEnabled)
                    Toggle("Show Chewbuu member badges", isOn: $showMemberBadges)
                }
                SettingsGroup(title: "Payments", icon: "creditcard.fill", color: ChewbuuTheme.mint) {
                    SettingsRow(title: "Payment capture", detail: "Not enabled — test close-out only")
                    SettingsRow(title: "Tips & payouts", detail: "Capability gated")
                    Button("Review billing capabilities") { syncService.lastActionMessage = "Billing capabilities are policy-gated until enabled." }
                        .foregroundStyle(ChewbuuTheme.blue)
                }
            }
            .padding(22)
        }
        .background(ChewbuuTheme.background)
    }
}

struct SettingsGroup<Content: View>: View {
    let title: String
    let icon: String
    let color: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: title, icon: icon, color: color)
            VStack(alignment: .leading, spacing: 13) { content }
                .padding(16)
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
            Text(detail).font(.subheadline).foregroundStyle(ChewbuuTheme.secondaryText)
        }
    }
}
