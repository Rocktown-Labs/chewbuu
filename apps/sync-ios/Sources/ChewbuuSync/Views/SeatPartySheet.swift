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
    @State private var showingNewCustomer = false

    private var activeServers: [String] {
        let servers = syncService.staffList.filter { $0.role.contains("Server") || $0.role.contains("Bartender") }.map(\.name)
        return servers.isEmpty ? ["Marcus Vance", "Chloe Bennett", "David Kim"] : servers
    }

    private var matchingCustomers: [MockCustomer] {
        let query = customerSearch.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return Array(syncService.customers.prefix(5)) }
        return syncService.customers.filter { $0.name.localizedCaseInsensitiveContains(query) || $0.phone.contains(query) }
    }

    public var body: some View {
        SyncSheetScaffold(title: "Seat a party", subtitle: "Table \(table.label) · \(table.section) · up to \(table.seats) guests") {
            VStack(alignment: .leading, spacing: 14) {
                SyncFormSection(title: "Guest") {
                    HStack(spacing: 8) {
                        SyncLabeledField(title: "Search", placeholder: "Name or phone", text: $customerSearch)
                        Button {
                            showingNewCustomer = true
                        } label: {
                            Image(systemName: "plus")
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                        .padding(.top, 17)
                        .help("Create a new guest")
                    }
                    VStack(spacing: 6) {
                        ForEach(matchingCustomers) { customer in
                            Button {
                                selectedCustomerId = customer.id
                                partyName = customer.name
                                if customer.isChewbuuMember { isChewbuuDate = true }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(customer.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                        Text("\(customer.sourceLabel) · \(customer.phone.isEmpty ? "No phone" : customer.phone)")
                                            .font(.caption)
                                            .foregroundStyle(ChewbuuTheme.secondaryText)
                                    }
                                    Spacer()
                                    if selectedCustomerId == customer.id {
                                        Image(systemName: "checkmark.circle.fill").foregroundStyle(ChewbuuTheme.yellow)
                                    }
                                }
                                .padding(9)
                                .syncCard(isSelected: selectedCustomerId == customer.id, accent: ChewbuuTheme.yellow)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                SyncFormSection(title: "Visit") {
                    VStack(spacing: 11) {
                        SyncLabeledField(title: "Party name", placeholder: "Optional label for the table", text: $partyName)
                        SyncStepperControl(title: "Party size", value: $guestCount, range: 1...table.seats)
                        Picker("Assigned server", selection: $assignedServer) {
                            ForEach(activeServers, id: \.self) { Text($0).tag($0) }
                        }
                        .tint(ChewbuuTheme.yellow)
                        Toggle("Chewbuu Date", isOn: $isChewbuuDate)
                            .tint(ChewbuuTheme.yellow)
                        SyncLabeledField(title: "Special request", placeholder: "Optional allergy or celebration note", text: $specialNotes, axis: .vertical)
                    }
                }
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }
                    .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Seat party") {
                    let cleanName = partyName.trimmingCharacters(in: .whitespacesAndNewlines)
                    let finalName = cleanName.isEmpty ? "Walk-in · \(guestCount)" : cleanName
                    syncService.seatParty(tableId: table.id, partyName: finalName, guestCount: guestCount, serverName: assignedServer, customerId: selectedCustomerId, isChewbuuDate: isChewbuuDate)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
            }
        }
        .frame(minWidth: 560, minHeight: 620)
        .sheet(isPresented: $showingNewCustomer) {
            NewCustomerSheet(syncService: syncService) { customer in
                selectedCustomerId = customer.id
                partyName = customer.name
            }
        }
    }
}
