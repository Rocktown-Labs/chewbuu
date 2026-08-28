import SwiftUI

public struct OverviewView: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    let onNavigate: (SyncDestination) -> Void

    private let columns = [GridItem(.adaptive(minimum: 155, maximum: 230), spacing: 12)]

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .bottom) {
                    SyncSectionHeader(
                        eyebrow: "Good evening",
                        title: "Run the room, simply.",
                        subtitle: "A live snapshot of your Chewbuu venue operation."
                    )
                    Spacer()
                    Text("Updated \(syncService.lastSyncTime.formatted(date: .omitted, time: .shortened))")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }

                LazyVGrid(columns: columns, spacing: 12) {
                    OverviewMetric(title: "Active tables", value: "\(syncService.activeTableCount)", detail: "of \(syncService.tables.count) mapped", icon: "square.grid.2x2.fill", color: ChewbuuTheme.blue) {
                        onNavigate(.tables)
                    }
                    OverviewMetric(title: "Kitchen items", value: "\(syncService.activeOrderCount)", detail: "need attention", icon: "flame.fill", color: ChewbuuTheme.orange) {
                        onNavigate(.kitchen)
                    }
                    OverviewMetric(title: "On the floor", value: "\(syncService.staffList.filter { $0.status == .onFloor }.count)", detail: "of \(syncService.staffList.count) team", icon: "person.2.fill", color: ChewbuuTheme.mint) {
                        onNavigate(.team)
                    }
                    OverviewMetric(title: "Open checks", value: "\(syncService.tables.filter { $0.billTotalCents > 0 }.count)", detail: "ready to manage", icon: "receipt.fill", color: ChewbuuTheme.amber) {
                        onNavigate(.orders)
                    }
                }

                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "Table requests", icon: "bell.badge.fill", color: ChewbuuTheme.amber)
                        let activeRequests = syncService.tableRequests.filter { $0.status != .resolved }
                        if activeRequests.isEmpty {
                            EmptyPanel(title: "No table requests", detail: "Guests are all set for now.", icon: "checkmark.circle.fill", color: ChewbuuTheme.mint)
                        } else {
                            ForEach(activeRequests) { request in
                                TableRequestCard(syncService: syncService, request: request) {
                                    selectedTableId = request.tableId
                                    syncService.acceptTableRequest(request.id)
                                    onNavigate(.orders)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "Chewbuu Dates", icon: "heart.circle.fill", color: ChewbuuTheme.datePink)
                        ForEach(syncService.diningDates) { date in
                            DiningDateCard(date: date)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                HStack(alignment: .top, spacing: 16) {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "Fast actions", icon: "bolt.fill", color: ChewbuuTheme.blue)
                        HStack(spacing: 10) {
                            QuickAction(title: "Take an order", icon: "plus.circle.fill", color: ChewbuuTheme.blue) {
                                selectedTableId = syncService.tables.first(where: { $0.status != .available && $0.status != .paid })?.id
                                onNavigate(.orders)
                            }
                            QuickAction(title: "Seat a party", icon: "person.crop.circle.badge.plus", color: ChewbuuTheme.mint) {
                                onNavigate(.tables)
                            }
                            QuickAction(title: "See kitchen", icon: "flame.fill", color: ChewbuuTheme.orange) {
                                onNavigate(.kitchen)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "Service pulse", icon: "waveform.path.ecg", color: ChewbuuTheme.mint)
                        HStack(spacing: 14) {
                            PulseRow(title: "Prepping", count: syncService.tables.flatMap(\.orders).filter { $0.status == .preparing }.count, color: ChewbuuTheme.amber)
                            PulseRow(title: "Ready", count: syncService.tables.flatMap(\.orders).filter { $0.status == .ready }.count, color: ChewbuuTheme.mint)
                            PulseRow(title: "Late", count: syncService.staffList.filter { $0.status == .late }.count, color: ChewbuuTheme.coral)
                        }
                        .padding(15)
                        .syncCard()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(22)
        }
        .scrollContentBackground(.hidden)
        .background(ChewbuuTheme.background)
    }
}

struct OverviewMetric: View {
    let title: String
    let value: String
    let detail: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: icon)
                        .foregroundStyle(color)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Text(value)
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(ChewbuuTheme.primaryText)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .syncCard(accent: color)
        }
        .buttonStyle(.plain)
    }
}

struct SectionTitle: View {
    let title: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(title)
                .font(.headline.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
        }
    }
}

struct TableRequestCard: View {
    @ObservedObject var syncService: SyncService
    let request: MockTableRequest
    let action: () -> Void

    var table: MockTable? { syncService.table(for: request.tableId) }
    var customer: MockCustomer? { syncService.customer(for: request.customerId) }

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(table?.label ?? request.tableId)
                        .font(.headline.bold())
                        .foregroundStyle(ChewbuuTheme.blue)
                    SyncStatusPill(title: request.status.rawValue, color: request.status.color)
                }
                Text(request.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(request.detail)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(2)
                if let customer {
                    Text("\(customer.name)  ·  \(request.ageMinutes)m ago")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(customer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.secondaryText)
                }
            }
            Spacer()
            Button(request.status == .new ? "Take it" : "Open") { action() }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
        }
        .padding(14)
        .syncCard(accent: request.status.color)
    }
}

struct DiningDateCard: View {
    let date: MockDiningDate

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [ChewbuuTheme.datePurple, ChewbuuTheme.datePink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 48, height: 48)
                Image(systemName: "heart.fill")
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(date.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text("\(date.guests)  ·  Table \(date.tableLabel)")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                Text(date.detail)
                    .font(.caption2)
                    .foregroundStyle(ChewbuuTheme.datePink)
            }
            Spacer()
            Text(date.status)
                .font(.caption2.bold())
                .foregroundStyle(ChewbuuTheme.datePink)
        }
        .padding(13)
        .background(
            LinearGradient(
                colors: [ChewbuuTheme.datePurple.opacity(0.27), ChewbuuTheme.datePink.opacity(0.10)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ), in: RoundedRectangle(cornerRadius: 18, style: .continuous)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(ChewbuuTheme.datePink.opacity(0.35), lineWidth: 1)
        )
    }
}

struct QuickAction: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.subheadline.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(color.opacity(0.18), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(color.opacity(0.45), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct PulseRow: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("\(count)")
                .font(.title2.bold())
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
    }
}

struct EmptyPanel: View {
    let title: String
    let detail: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
        }
        .padding(16)
        .syncCard()
    }
}

struct SyncFilledButtonStyle: ButtonStyle {
    let color: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.bold())
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(color.opacity(configuration.isPressed ? 0.7 : 1), in: Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}
