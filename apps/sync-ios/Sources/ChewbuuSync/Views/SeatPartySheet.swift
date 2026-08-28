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
        return syncService.customers.filter {
            $0.name.localizedCaseInsensitiveContains(query) || $0.phone.contains(query)
        }
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Table \(table.label)")
                                .font(.title3.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                            Text("\(table.section) · up to \(table.seats) guests")
                                .font(.caption)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                        }
                        Spacer()
                        SyncStatusPill(title: "Available", color: ChewbuuTheme.success)
                    }
                }

                Section("Guest") {
                    HStack(spacing: 8) {
                        TextField("Search name or phone", text: $customerSearch)
                        Button {
                            showingNewCustomer = true
                        } label: {
                            Image(systemName: "plus")
                        }
                        .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.burgundy))
                        .help("Create a new guest")
                    }
                    ForEach(matchingCustomers) { customer in
                        Button {
                            selectedCustomerId = customer.id
                            partyName = customer.name
                            if customer.isChewbuuMember { isChewbuuDate = true }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(customer.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                    Text("\(customer.sourceLabel) · \(customer.phone)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                                }
                                Spacer()
                                if selectedCustomerId == customer.id {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(ChewbuuTheme.burgundy)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }

                Section("Visit") {
                    TextField("Party name", text: $partyName)
                    Stepper("Party size · \(guestCount)", value: $guestCount, in: 1...table.seats)
                    Picker("Assigned server", selection: $assignedServer) {
                        ForEach(activeServers, id: \.self) { Text($0).tag($0) }
                    }
                    Toggle("Chewbuu Date", isOn: $isChewbuuDate)
                        .tint(ChewbuuTheme.burgundy)
                    TextField("Special request or allergy", text: $specialNotes, axis: .vertical)
                }
            }
            .scrollContentBackground(.hidden)
            .background(ChewbuuTheme.background)
            .navigationTitle("Seat a party")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Seat") {
                        let cleanName = partyName.trimmingCharacters(in: .whitespacesAndNewlines)
                        let finalName = cleanName.isEmpty ? "Walk-in · \(guestCount)" : cleanName
                        syncService.seatParty(tableId: table.id, partyName: finalName, guestCount: guestCount, serverName: assignedServer, customerId: selectedCustomerId, isChewbuuDate: isChewbuuDate)
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingNewCustomer) {
                NewCustomerSheet(syncService: syncService) { customer in
                    selectedCustomerId = customer.id
                    partyName = customer.name
                }
            }
        }
        .frame(minWidth: 520, minHeight: 560)
    }
}
