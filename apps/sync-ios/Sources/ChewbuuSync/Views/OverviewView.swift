import SwiftUI

public struct OverviewView: View {
    @ObservedObject var syncService: SyncService
    let onNavigate: (SyncDestination) -> Void
    let onInspect: (SyncInspectorSelection) -> Void
    let onNewOrder: () -> Void

    private var activeRequests: [MockTableRequest] {
        syncService.tableRequests.filter { $0.status != .resolved && $0.kind == .service }
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .top, spacing: 20) {
                    SyncSectionHeader(
                        eyebrow: "Tonight · \(syncService.locationName)",
                        title: "Overview",
                        subtitle: "The few things worth knowing before the next table needs you."
                    )
                    Spacer(minLength: 12)
                    HStack(spacing: 8) {
                        SyncStatusPill(title: syncService.serviceMode, color: ChewbuuTheme.success)
                        Button {
                            onNavigate(.kiosk)
                        } label: {
                            Label("Clock in / Terminal", systemImage: "clock.badge.checkmark")
                        }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                    }
                }

                HStack(spacing: 0) {
                    OverviewCount(value: syncService.activeTableCount, title: "active tables")
                    OverviewCount(value: syncService.activeOrderCount, title: "kitchen items")
                    OverviewCount(value: activeRequests.count, title: "table requests")
                    OverviewCount(value: syncService.reservationRequests.filter { $0.status != .resolved }.count, title: "reservations")
                }
                .padding(.vertical, 16)
                .background(ChewbuuTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(ChewbuuTheme.divider))

                HStack(alignment: .top, spacing: 18) {
                    OverviewPanel(title: "Needs attention", detail: "Requests from guests at the table.", icon: "bell", color: ChewbuuTheme.gold) {
                        if activeRequests.isEmpty {
                            EmptyPanel(title: "All caught up", detail: "No open guest requests.", icon: "checkmark.circle", color: ChewbuuTheme.success)
                        } else {
                            ForEach(activeRequests.prefix(3)) { request in
                                Button {
                                    onInspect(.request(request.id))
                                } label: {
                                    OverviewRequestRow(syncService: syncService, request: request)
                                }
                                .buttonStyle(.plain)
                            }
                            if activeRequests.count > 3 {
                                Button("See all \(activeRequests.count) requests") { onNavigate(.orders) }
                                    .font(.caption.bold())
                                    .foregroundStyle(ChewbuuTheme.burgundy)
                            }
                        }
                    }

                    OverviewPanel(title: "Reservations tonight", detail: "Chewbuu Dates arrive as named table requests.", icon: "calendar.badge.clock", color: ChewbuuTheme.burgundy) {
                        if syncService.reservationRequests.isEmpty {
                            EmptyPanel(title: "No reservations", detail: "The evening is open.", icon: "calendar", color: ChewbuuTheme.secondaryText)
                        } else {
                            ForEach(syncService.reservationRequests.prefix(3)) { request in
                                Button {
                                    onInspect(.request(request.id))
                                } label: {
                                    OverviewReservationRow(request: request)
                                }
                                .buttonStyle(.plain)
                            }
                            Button("Open reservations") { onNavigate(.reservations) }
                                .font(.caption.bold())
                                .foregroundStyle(ChewbuuTheme.burgundy)
                        }
                    }
                }

                HStack(alignment: .top, spacing: 18) {
                    OverviewPanel(title: "Tables", detail: "Choose a view by service state.", icon: "square.grid.2x2", color: ChewbuuTheme.burgundy) {
                        HStack(spacing: 8) {
                            ForEach(TableFilter.allCases) { filter in
                                let count = tableCount(for: filter)
                                Button {
                                    onNavigate(.tables)
                                } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("\(count)")
                                            .font(.title3.bold())
                                            .foregroundStyle(ChewbuuTheme.primaryText)
                                        Text(filter.rawValue)
                                            .font(.caption)
                                            .foregroundStyle(ChewbuuTheme.secondaryText)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(11)
                                    .syncCard(accent: filter.tableStatus?.color ?? ChewbuuTheme.burgundy)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    OverviewPanel(title: "Quick actions", detail: "Keep the next tap close.", icon: "arrow.forward.circle", color: ChewbuuTheme.gold) {
                        HStack(spacing: 10) {
                            QuickAction(title: "New order", icon: "plus", color: ChewbuuTheme.burgundy) { onNewOrder() }
                            QuickAction(title: "Seat party", icon: "person.badge.plus", color: ChewbuuTheme.burgundy) { onNavigate(.tables) }
                            QuickAction(title: "Kitchen", icon: "flame", color: ChewbuuTheme.warning) { onNavigate(.kitchen) }
                        }
                    }
                }
            }
            .padding(26)
        }
        .background(ChewbuuTheme.background)
    }

    private func tableCount(for filter: TableFilter) -> Int {
        guard let status = filter.tableStatus else { return syncService.tables.count }
        return syncService.tables.filter { $0.status == status }.count
    }
}

struct OverviewCount: View {
    let value: Int
    let title: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text("\(value)")
                .font(.system(size: 25, weight: .bold, design: .rounded))
                .foregroundStyle(ChewbuuTheme.primaryText)
            Text(title)
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 18)
    }
}

struct OverviewPanel<Content: View>: View {
    let title: String
    let detail: String
    let icon: String
    let color: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: icon)
                    .foregroundStyle(color)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.headline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text(detail)
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
            }
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .syncCard(accent: color)
    }
}

struct OverviewRequestRow: View {
    @ObservedObject var syncService: SyncService
    let request: MockTableRequest

    private var table: MockTable? { syncService.table(for: request.tableId) }
    private var customer: MockCustomer? { syncService.customer(for: request.customerId) }

    var body: some View {
        HStack(spacing: 10) {
            Text(table?.label ?? request.tableId)
                .font(.subheadline.bold())
                .foregroundStyle(ChewbuuTheme.burgundy)
                .frame(width: 34, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(request.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(customer?.name ?? request.detail)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(1)
            }
            Spacer()
            Text("\(request.ageMinutes)m")
                .font(.caption.bold())
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .padding(11)
        .syncCard(accent: ChewbuuTheme.gold)
    }
}

struct OverviewReservationRow: View {
    let request: MockTableRequest

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "heart.fill")
                .foregroundStyle(ChewbuuTheme.burgundy)
            VStack(alignment: .leading, spacing: 2) {
                Text(request.guestNames ?? request.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text("\(request.scheduledTime ?? "Tonight")  ·  \(request.preorderedItems.isEmpty ? "No pre-order" : request.preorderedItems.joined(separator: ", "))")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(1)
            }
            Spacer()
            SyncStatusPill(title: request.status.rawValue, color: request.status.color)
        }
        .padding(11)
        .syncCard(accent: ChewbuuTheme.burgundy)
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
                .foregroundStyle(ChewbuuTheme.warmWhite)
                .padding(.horizontal, 12)
                .padding(.vertical, 11)
                .frame(maxWidth: .infinity)
                .background(color, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct EmptyPanel: View {
    let title: String
    let detail: String
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
        }
        .padding(12)
        .syncCard()
    }
}
