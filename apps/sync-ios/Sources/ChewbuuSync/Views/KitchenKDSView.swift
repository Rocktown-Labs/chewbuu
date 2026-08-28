import SwiftUI

public struct KitchenKDSView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void
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
            HStack(spacing: 7) {
                ForEach(statuses, id: \.self) { status in
                    Button(status) { selectedStatus = status }
                        .buttonStyle(SyncChipButtonStyle(isSelected: selectedStatus == status, color: ChewbuuTheme.burgundy))
                }
                Spacer()
                Label("\(allOrders.filter { $0.item.status != .served }.count) active", systemImage: "flame")
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.burgundy)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(ChewbuuTheme.surface)

            Divider().overlay(ChewbuuTheme.divider)

            if allOrders.isEmpty {
                VStack(spacing: 10) {
                    Spacer()
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 42))
                        .foregroundStyle(ChewbuuTheme.success)
                    Text("Kitchen is clear")
                        .font(.title3.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("New orders appear after they are sent.")
                        .font(.subheadline)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                    Spacer()
                }
                .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 270, maximum: 380), spacing: 11)], spacing: 11) {
                        ForEach(allOrders, id: \.item.id) { entry in
                            KdsTicketCard(tableLabel: entry.tableLabel, item: entry.item, onSelect: { onInspect(.table(entry.tableId)) }) {
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
    let onSelect: () -> Void
    let advance: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(action: onSelect) {
                HStack {
                    Label("Table \(tableLabel)", systemImage: "square.grid.2x2")
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.burgundy)
                    Spacer()
                    Label("\(item.minutesAgo)m", systemImage: "timer")
                        .font(.caption.bold())
                        .foregroundStyle(item.minutesAgo > 15 ? ChewbuuTheme.coral : ChewbuuTheme.secondaryText)
                }
            }
            .buttonStyle(.plain)
            HStack(alignment: .top, spacing: 9) {
                Text("\(item.quantity)x")
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.burgundy)
                VStack(alignment: .leading, spacing: 4) {
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
                    Button(nextActionTitle, action: advance)
                        .buttonStyle(SyncOutlineButtonStyle(color: item.status == .ready ? ChewbuuTheme.success : ChewbuuTheme.burgundy))
                }
            }
        }
        .padding(14)
        .syncCard(accent: item.status == .ready ? ChewbuuTheme.success : ChewbuuTheme.burgundy)
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
