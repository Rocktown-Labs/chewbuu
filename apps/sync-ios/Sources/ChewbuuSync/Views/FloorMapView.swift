import SwiftUI

public struct FloorMapView: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    @State private var filterSection = "All"
    @State private var tableToSeat: MockTable?

    private let sections = ["All", "Main Dining", "Patio", "Bar & High Tops"]

    private var filteredTables: [MockTable] {
        filterSection == "All" ? syncService.tables : syncService.tables.filter { $0.section == filterSection }
    }

    public var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                ForEach(sections, id: \.self) { section in
                    Button(section) {
                        withAnimation(.easeOut(duration: 0.18)) { filterSection = section }
                    }
                    .buttonStyle(SyncChipButtonStyle(isSelected: filterSection == section, color: ChewbuuTheme.blue))
                }
                Spacer()
                HStack(spacing: 10) {
                    LegendItem(color: ChewbuuTheme.mint, label: "Available")
                    LegendItem(color: ChewbuuTheme.orange, label: "Seated")
                    LegendItem(color: ChewbuuTheme.violet, label: "Orders")
                    LegendItem(color: ChewbuuTheme.blue, label: "Paid")
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 13)
            .background(ChewbuuTheme.surface.opacity(0.7))

            Divider().overlay(ChewbuuTheme.divider)

            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 190, maximum: 255), spacing: 14)], spacing: 14) {
                    ForEach(filteredTables) { table in
                        TableCardView(table: table, isSelected: selectedTableId == table.id) {
                            tableToSeat = table
                        }
                        .onTapGesture {
                            withAnimation(.easeOut(duration: 0.18)) { selectedTableId = table.id }
                        }
                    }
                }
                .padding(20)
            }
        }
        .background(ChewbuuTheme.background)
        .sheet(item: $tableToSeat) { table in
            SeatPartySheet(syncService: syncService, table: table)
        }
    }
}

struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 7, height: 7)
            Text(label).font(.caption2.bold()).foregroundStyle(ChewbuuTheme.secondaryText)
        }
    }
}

struct TableCardView: View {
    let table: MockTable
    let isSelected: Bool
    let onSeatTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(table.label).font(.system(size: 23, weight: .bold, design: .rounded)).foregroundStyle(ChewbuuTheme.primaryText)
                    Text(table.section).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
                SyncStatusPill(title: table.status.rawValue, color: table.status.color)
            }

            HStack {
                Label("\(table.occupiedSeats)/\(table.seats)", systemImage: "person.2.fill")
                Spacer()
                if table.status != .available { Label("\(table.seatedTimeMinutes)m", systemImage: "clock") }
            }
            .font(.caption.bold())
            .foregroundStyle(ChewbuuTheme.secondaryText)

            Divider().overlay(ChewbuuTheme.divider)

            if let partyName = table.partyName, table.status != .available {
                HStack {
                    Text(partyName).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText).lineLimit(1)
                    if table.isChewbuuDate { Image(systemName: "heart.fill").foregroundStyle(ChewbuuTheme.datePink) }
                }
                HStack {
                    Text(table.serverName).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                    Spacer()
                    Text(formatCurrency(table.billTotalCents)).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                }
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Ready to seat").font(.caption.bold()).foregroundStyle(ChewbuuTheme.mint)
                        Text(table.serverName).font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                    Spacer()
                    Button { onSeatTap() } label: {
                        Label("Seat", systemImage: "person.crop.circle.badge.plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.mint))
                }
            }
        }
        .padding(15)
        .syncCard(isSelected: isSelected, accent: table.isChewbuuDate ? ChewbuuTheme.datePink : ChewbuuTheme.blue)
        .overlay(alignment: .topTrailing) {
            if table.isChewbuuDate {
                Text("DATE")
                    .font(.caption2.weight(.heavy))
                    .tracking(0.7)
                    .foregroundStyle(ChewbuuTheme.datePink)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(ChewbuuTheme.datePink.opacity(0.13), in: Capsule())
                    .offset(x: -11, y: -11)
            }
        }
    }

    private func formatCurrency(_ cents: Int) -> String { String(format: "$%.2f", Double(cents) / 100) }
}
