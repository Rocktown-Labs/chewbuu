import SwiftUI

public struct SeatPartySheet: View {
    @ObservedObject var syncService: SyncService
    let table: MockTable
    @Environment(\.dismiss) private var dismiss

    @State private var partyName = ""
    @State private var guestCount = 2
    @State private var assignedServer = "Marcus Vance"
    @State private var specialNotes = ""
    @State private var customerSearch = ""
    @State private var selectedCustomerId: String?
    @State private var isChewbuuDate = false

    private var activeServers: [String] {
        let servers = syncService.staffList.filter { $0.role.contains("Server") || $0.role.contains("Bartender") }.map(\.name)
        return servers.isEmpty ? ["Marcus Vance", "Chloe Bennett", "David Kim"] : servers
    }

    private var matchingCustomers: [MockCustomer] {
        let query = customerSearch.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return Array(syncService.customers.prefix(5)) }
        return syncService.customers.filter { $0.name.localizedCaseInsensitiveContains(query) || $0.email.localizedCaseInsensitiveContains(query) || $0.phone.contains(query) }
    }

    private var selectedCustomer: MockCustomer? { syncService.customer(for: selectedCustomerId) }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 12) {
                        Image(systemName: "square.grid.2x2.fill")
                            .font(.title2)
                            .foregroundStyle(ChewbuuTheme.blue)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Seat Table \(table.label)")
                                .font(.system(size: 27, weight: .bold, design: .rounded))
                                .foregroundStyle(ChewbuuTheme.primaryText)
                            Text("\(table.section)  ·  up to \(table.seats) guests")
                                .font(.subheadline)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                        }
                        Spacer()
                        Text("READY")
                            .font(.caption2.weight(.heavy))
                            .tracking(1)
                            .foregroundStyle(ChewbuuTheme.mint)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 6)
                            .background(ChewbuuTheme.mint.opacity(0.15), in: Capsule())
                    }
                    .padding(16)
                    .syncCard(accent: ChewbuuTheme.blue)

                    VStack(alignment: .leading, spacing: 11) {
                        SectionTitle(title: "Guest profile", icon: "person.crop.circle.fill", color: ChewbuuTheme.datePink)
                        Text("Find a venue guest or a Chewbuu member so the order follows the right profile.")
                            .font(.caption)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                        TextField("Search name, email, or phone", text: $customerSearch)
                            .textFieldStyle(.roundedBorder)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                Button {
                                    selectedCustomerId = nil
                                } label: {
                                    Label("Walk-in", systemImage: "figure.walk")
                                }
                                .buttonStyle(SyncChipButtonStyle(isSelected: selectedCustomerId == nil, color: ChewbuuTheme.blue))
                                ForEach(matchingCustomers) { customer in
                                    Button {
                                        selectedCustomerId = customer.id
                                        partyName = customer.name
                                        if customer.isChewbuuMember { isChewbuuDate = true }
                                    } label: {
                                        Label(customer.name, systemImage: customer.isChewbuuMember ? "heart.fill" : "person.fill")
                                    }
                                    .buttonStyle(SyncChipButtonStyle(isSelected: selectedCustomerId == customer.id, color: customer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.blue))
                                }
                            }
                        }
                        if let selectedCustomer {
                            HStack(spacing: 7) {
                                Image(systemName: selectedCustomer.isChewbuuMember ? "heart.fill" : "checkmark.circle.fill")
                                    .foregroundStyle(selectedCustomer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.mint)
                                Text("Using \(selectedCustomer.name) · \(selectedCustomer.sourceLabel)")
                                    .font(.caption.bold())
                                    .foregroundStyle(ChewbuuTheme.primaryText)
                            }
                        }
                    }
                    .padding(16)
                    .syncCard(accent: ChewbuuTheme.datePink)

                    VStack(alignment: .leading, spacing: 12) {
                        SectionTitle(title: "Party details", icon: "person.3.fill", color: ChewbuuTheme.amber)
                        TextField("Party name (optional)", text: $partyName)
                            .textFieldStyle(.roundedBorder)
                        HStack {
                            Text("Guests").font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Spacer()
                            Stepper("\(guestCount)", value: $guestCount, in: 1...table.seats)
                                .labelsHidden()
                            Text("\(guestCount)")
                                .font(.title3.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                                .frame(width: 28)
                        }
                        Picker("Assigned server", selection: $assignedServer) {
                            ForEach(activeServers, id: \.self) { server in Text(server).tag(server) }
                        }
                        .pickerStyle(.menu)
                        Toggle(isOn: $isChewbuuDate) {
                            Label("Chewbuu Date experience", systemImage: "heart.fill")
                                .foregroundStyle(ChewbuuTheme.datePink)
                        }
                        TextField("Special request (birthday, booster seat, allergy)", text: $specialNotes, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...4)
                    }
                    .padding(16)
                    .syncCard(accent: ChewbuuTheme.amber)

                    Button {
                        let finalName = partyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Walk-in (\(guestCount))" : partyName
                        syncService.seatParty(tableId: table.id, partyName: finalName, guestCount: guestCount, serverName: assignedServer, customerId: selectedCustomerId, isChewbuuDate: isChewbuuDate)
                        dismiss()
                    } label: {
                        Label("Seat party and start order", systemImage: "arrow.right.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                }
                .padding(22)
            }
            .background(ChewbuuTheme.background)
            .navigationTitle("New table visit")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
        .frame(minWidth: 560, minHeight: 680)
    }
}
