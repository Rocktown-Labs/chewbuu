import SwiftUI

public struct KitchenKDSView: View {
    @ObservedObject var syncService: SyncService
    @State private var selectedStatus = "All"

    private let statuses = ["All", "Pending", "Preparing", "Ready", "Served"]

    private var allOrders: [(tableLabel: String, item: MockOrderItem, tableId: String)] {
        syncService.tables.flatMap { table in
            table.orders
                .filter { selectedStatus == "All" || $0.status.rawValue == selectedStatus }
                .map { (table.label, $0, table.id) }
        }
    }

    public var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                ForEach(statuses, id: \.self) { status in
                    Button(status) { selectedStatus = status }
                        .buttonStyle(SyncChipButtonStyle(isSelected: selectedStatus == status, color: ChewbuuTheme.orange))
                }
                Spacer()
                Label("\(allOrders.filter { $0.item.status != .served }.count) active tickets", systemImage: "flame.fill")
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.orange)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 13)
            .background(ChewbuuTheme.surface.opacity(0.7))

            Divider().overlay(ChewbuuTheme.divider)

            if allOrders.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 50))
                        .foregroundStyle(ChewbuuTheme.mint)
                    Text("Kitchen is clear")
                        .font(.title3.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("New orders will appear here as soon as they are sent.")
                        .font(.subheadline)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 275, maximum: 370), spacing: 14)], spacing: 14) {
                        ForEach(allOrders, id: \.item.id) { entry in
                            KdsTicketCard(tableLabel: entry.tableLabel, item: entry.item) {
                                syncService.advanceItem(tableId: entry.tableId, itemId: entry.item.id)
                            }
                        }
                    }
                    .padding(20)
                }
            }
        }
        .background(ChewbuuTheme.background)
    }
}

struct KdsTicketCard: View {
    let tableLabel: String
    let item: MockOrderItem
    let advance: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Table \(tableLabel)", systemImage: "square.grid.2x2.fill")
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.blue)
                Spacer()
                Label("\(item.minutesAgo)m", systemImage: "timer")
                    .font(.caption.bold())
                    .foregroundStyle(item.minutesAgo > 15 ? ChewbuuTheme.coral : ChewbuuTheme.secondaryText)
            }
            HStack(alignment: .top, spacing: 10) {
                Text("\(item.quantity)x")
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.amber)
                VStack(alignment: .leading, spacing: 5) {
                    Text(item.name).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    ForEach(item.modifiers, id: \.self) { modifier in
                        Text("• \(modifier)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                }
            }
            Divider().overlay(ChewbuuTheme.divider)
            HStack {
                SyncStatusPill(title: item.status.rawValue, color: item.status.color)
                Spacer()
                if item.status != .served {
                    Button(nextActionTitle) { advance() }
                        .buttonStyle(SyncFilledButtonStyle(color: item.status == .ready ? ChewbuuTheme.mint : ChewbuuTheme.blue))
                }
            }
        }
        .padding(15)
        .syncCard(isSelected: item.status == .ready, accent: item.status == .ready ? ChewbuuTheme.mint : ChewbuuTheme.orange)
    }

    private var nextActionTitle: String {
        switch item.status {
        case .pending: return "Start prep"
        case .preparing: return "Mark ready"
        case .ready: return "Mark served"
        case .served: return "Completed"
        }
    }
}
