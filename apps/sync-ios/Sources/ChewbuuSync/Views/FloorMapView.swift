import SwiftUI

public struct FloorMapView: View {
    @ObservedObject var syncService: SyncService
    @Binding var selectedTableId: String?
    let onInspect: (SyncInspectorSelection) -> Void
    @State private var selectedFilter: TableFilter = .all
    @State private var selectedSection = "All"
    @State private var tableToSeat: MockTable?

    private let sections = ["Main Dining", "Patio", "Bar & High Tops"]

    private var filteredTables: [MockTable] {
        syncService.tables.filter { table in
            let matchesStatus = selectedFilter.tableStatus.map { table.status == $0 } ?? true
            let matchesSection = selectedSection == "All" || table.section == selectedSection
            return matchesStatus && matchesSection
        }
    }

    private var sectionsToShow: [String] {
        selectedSection == "All" ? sections : [selectedSection]
    }

    public var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                ForEach(TableFilter.allCases) { filter in
                    Button {
                        selectedFilter = filter
                    } label: {
                        HStack(spacing: 5) {
                            Text(filter.rawValue)
                            Text("\(tableCount(for: filter))")
                                .font(.caption2.weight(.heavy))
                                .opacity(0.7)
                        }
                    }
                    .buttonStyle(SyncChipButtonStyle(isSelected: selectedFilter == filter, color: ChewbuuTheme.burgundy))
                }
                Spacer(minLength: 12)
                Picker("Section", selection: $selectedSection) {
                    Text("All sections").tag("All")
                    ForEach(sections, id: \.self) { section in
                        Text(section).tag(section)
                    }
                }
                .pickerStyle(.menu)
                .tint(ChewbuuTheme.burgundy)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(ChewbuuTheme.surface)

            Divider().overlay(ChewbuuTheme.divider)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 22) {
                    if filteredTables.isEmpty {
                        EmptyPanel(title: "No tables in this view", detail: "Try another service state or section.", icon: "square.grid.2x2", color: ChewbuuTheme.secondaryText)
                            .frame(maxWidth: .infinity)
                    } else {
                        ForEach(sectionsToShow, id: \.self) { section in
                            let sectionTables = filteredTables.filter { $0.section == section }
                            if !sectionTables.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack(spacing: 8) {
                                        Text(section)
                                            .font(.headline.bold())
                                            .foregroundStyle(ChewbuuTheme.primaryText)
                                        Text("\(sectionTables.count)")
                                            .font(.caption.bold())
                                            .foregroundStyle(ChewbuuTheme.secondaryText)
                                            .padding(.horizontal, 7)
                                            .padding(.vertical, 3)
                                            .background(ChewbuuTheme.surfaceMuted, in: Capsule())
                                    }
                                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 210, maximum: 310), spacing: 12)], spacing: 12) {
                                        ForEach(sectionTables) { table in
                                            TableCardView(
                                                table: table,
                                                isSelected: selectedTableId == table.id,
                                                onSelect: { onInspect(.table(table.id)) },
                                                onSeatTap: { tableToSeat = table }
                                            )
                                        }
                                    }
                                }
                            }
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

    private func tableCount(for filter: TableFilter) -> Int {
        guard let status = filter.tableStatus else { return syncService.tables.count }
        return syncService.tables.filter { $0.status == status }.count
    }
}

struct TableCardView: View {
    let table: MockTable
    let isSelected: Bool
    let onSelect: () -> Void
    let onSeatTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 7) {
                        Text(table.label)
                            .font(.system(size: 23, weight: .bold, design: .rounded))
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        if table.isChewbuuDate {
                            Image(systemName: "heart.fill")
                                .font(.caption)
                                .foregroundStyle(ChewbuuTheme.burgundy)
                        }
                    }
                    Text(table.section)
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
                SyncStatusPill(title: table.status.rawValue, color: table.status.color)
            }

            HStack {
                Label("\(table.occupiedSeats)/\(table.seats)", systemImage: "person.2")
                Spacer()
                if table.status != .available {
                    Label("\(table.seatedTimeMinutes)m", systemImage: "clock")
                }
            }
            .font(.caption.bold())
            .foregroundStyle(ChewbuuTheme.secondaryText)

            Divider().overlay(ChewbuuTheme.divider)

            if let partyName = table.partyName, table.status != .available {
                Text(partyName)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                    .lineLimit(1)
                HStack {
                    Text(table.serverName)
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                    Spacer()
                    Text(formatCurrency(table.billTotalCents))
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                }
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Ready to seat")
                            .font(.caption.bold())
                            .foregroundStyle(ChewbuuTheme.success)
                        Text(table.serverName)
                            .font(.caption2)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                    Spacer()
                    Button("Seat", action: onSeatTap)
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }
            }
        }
        .padding(15)
        .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .syncCard(isSelected: isSelected, accent: ChewbuuTheme.burgundy)
        .onTapGesture {
            onSelect()
        }
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}
