import SwiftUI

public struct ReservationsView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void
    @State private var filter: MockTableRequest.RequestStatus?

    private var reservations: [MockTableRequest] {
        syncService.reservationRequests.filter { reservation in
            filter.map { reservation.status == $0 } ?? true
        }
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(alignment: .top) {
                    SyncSectionHeader(
                        eyebrow: "Operations",
                        title: "Reservations",
                        subtitle: "A Chewbuu Date is a named table request, with optional pre-ordered items."
                    )
                    Spacer()
                    HStack(spacing: 7) {
                        ReservationBadge(title: "New", count: count(for: .new), color: ChewbuuTheme.gold)
                        ReservationBadge(title: "In service", count: count(for: .inProgress), color: ChewbuuTheme.burgundy)
                    }
                }

                HStack(spacing: 8) {
                    ReservationFilterButton(title: "All", isSelected: filter == nil) { filter = nil }
                    ForEach(MockTableRequest.RequestStatus.allCases, id: \.self) { status in
                        ReservationFilterButton(title: status.rawValue, isSelected: filter == status, color: status.color) {
                            filter = status
                        }
                    }
                }

                if reservations.isEmpty {
                    EmptyPanel(title: "No reservations in this view", detail: "Try another status filter.", icon: "calendar", color: ChewbuuTheme.secondaryText)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 285, maximum: 480), spacing: 12)], spacing: 12) {
                        ForEach(reservations) { reservation in
                            ReservationCard(request: reservation) {
                                onInspect(.request(reservation.id))
                            }
                        }
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
    }

    private func count(for status: MockTableRequest.RequestStatus) -> Int {
        syncService.reservationRequests.filter { $0.status == status }.count
    }
}

struct ReservationBadge: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Text("\(count)").font(.caption.bold())
            Text(title).font(.caption)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 6)
        .background(color.opacity(0.12), in: Capsule())
    }
}

struct ReservationFilterButton: View {
    let title: String
    let isSelected: Bool
    var color: Color = ChewbuuTheme.burgundy
    let action: () -> Void

    var body: some View {
        Button(title, action: action)
            .buttonStyle(SyncChipButtonStyle(isSelected: isSelected, color: color))
    }
}

struct ReservationCard: View {
    let request: MockTableRequest
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 13) {
                HStack {
                    Label("CHEWBUU DATE", systemImage: "heart.fill")
                        .font(.caption2.weight(.heavy))
                        .tracking(1)
                        .foregroundStyle(ChewbuuTheme.burgundy)
                    Spacer()
                    SyncStatusPill(title: request.status.rawValue, color: request.status.color)
                }
                Text(request.guestNames ?? request.title)
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                HStack(spacing: 12) {
                    Label(request.scheduledTime ?? "Time to confirm", systemImage: "clock")
                    Label(request.tableId == "t5" ? "Table to assign" : request.tableId.uppercased(), systemImage: "square.grid.2x2")
                }
                .font(.caption)
                .foregroundStyle(ChewbuuTheme.secondaryText)
                if !request.preorderedItems.isEmpty {
                    Text("Pre-order · \(request.preorderedItems.joined(separator: ", "))")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.burgundy)
                }
                Text(request.detail)
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .syncCard(accent: ChewbuuTheme.burgundy)
        }
        .buttonStyle(.plain)
    }
}
