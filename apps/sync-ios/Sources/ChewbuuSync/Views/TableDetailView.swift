import SwiftUI

public struct TableDetailView: View {
    @ObservedObject var syncService: SyncService
    let tableId: String?

    @State private var showingAddMenuSheet = false
    @State private var showingPaymentSheet = false
    @State private var showingSeatPartySheet = false
    @State private var editingItem: MockOrderItem?

    private var currentTable: MockTable? { syncService.table(for: tableId) }
    private var currentCustomer: MockCustomer? { syncService.customer(for: currentTable?.customerId) }

    public var body: some View {
        if let table = currentTable {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 9) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 8) {
                                Text(table.label)
                                    .font(.system(size: 27, weight: .bold, design: .rounded))
                                    .foregroundStyle(ChewbuuTheme.primaryText)
                                if table.isChewbuuDate {
                                    Label("Chewbuu Date", systemImage: "heart.fill")
                                        .font(.caption2.weight(.heavy))
                                        .foregroundStyle(ChewbuuTheme.datePink)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 5)
                                        .background(ChewbuuTheme.datePink.opacity(0.15), in: Capsule())
                                }
                            }
                            Text("\(table.section)  ·  \(table.seats) seats")
                                .font(.subheadline)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            Text(table.partyName ?? "Available for seating")
                                .font(.headline)
                                .foregroundStyle(table.status == .available ? ChewbuuTheme.secondaryText : ChewbuuTheme.primaryText)
                        }
                        Spacer()
                        SyncStatusPill(title: table.status.rawValue, color: table.status.color)
                    }

                    HStack(spacing: 12) {
                        Label(table.serverName, systemImage: "person.badge.shield.checkmark")
                        if let customer = currentCustomer {
                            Label(customer.sourceLabel, systemImage: customer.isChewbuuMember ? "heart.fill" : "person.fill")
                                .foregroundStyle(customer.isChewbuuMember ? ChewbuuTheme.datePink : ChewbuuTheme.secondaryText)
                        }
                        Spacer()
                        if table.status != .available {
                            Label("\(table.seatedTimeMinutes)m", systemImage: "clock")
                        }
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .padding(18)
                .background(ChewbuuTheme.surface)

                Divider().overlay(ChewbuuTheme.divider)

                if table.status == .available {
                    VStack(spacing: 15) {
                        Spacer()
                        Image(systemName: "person.2.slash.fill")
                            .font(.system(size: 42))
                            .foregroundStyle(ChewbuuTheme.secondaryText.opacity(0.55))
                        Text("Table \(table.label) is empty")
                            .font(.title3.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        Text("Seat a party, choose a guest profile, then start tapping in their order.")
                            .font(.subheadline)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 25)
                        Button {
                            showingSeatPartySheet = true
                        } label: {
                            Label("Seat a party", systemImage: "person.crop.circle.badge.plus")
                        }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 13) {
                            HStack {
                                Text("Current order")
                                    .font(.headline.bold())
                                    .foregroundStyle(ChewbuuTheme.primaryText)
                                Spacer()
                                Text("\(table.orders.count) items")
                                    .font(.caption)
                                    .foregroundStyle(ChewbuuTheme.secondaryText)
                            }

                            if table.orders.isEmpty {
                                EmptyPanel(title: "Ready for the first order", detail: "Add menu items, drinks, or let the guest request an add-on.", icon: "fork.knife.circle", color: ChewbuuTheme.amber)
                            } else {
                                ForEach(table.orders) { item in
                                    OrderItemRow(item: item) {
                                        editingItem = item
                                    }
                                }
                            }
                        }
                        .padding(18)
                    }

                    Divider().overlay(ChewbuuTheme.divider)

                    VStack(spacing: 12) {
                        HStack {
                            Text("Subtotal")
                                .font(.subheadline)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            Spacer()
                            Text(formatCurrency(table.billTotalCents))
                                .font(.title3.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                        }
                        HStack(spacing: 10) {
                            Button {
                                showingAddMenuSheet = true
                            } label: {
                                Label("Add items", systemImage: "plus.circle.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.amber))

                            Button {
                                showingPaymentSheet = true
                            } label: {
                                Label("Close check", systemImage: "checkmark.seal.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(SyncFilledButtonStyle(color: table.billTotalCents == 0 ? ChewbuuTheme.secondaryText : ChewbuuTheme.mint))
                            .disabled(table.billTotalCents == 0)
                            .opacity(table.billTotalCents == 0 ? 0.5 : 1)
                        }
                    }
                    .padding(18)
                    .background(ChewbuuTheme.surface)
                }
            }
            .sheet(isPresented: $showingAddMenuSheet) {
                AddMenuItemSheet(syncService: syncService, tableId: table.id)
            }
            .sheet(isPresented: $showingPaymentSheet) {
                PaymentCheckoutSheet(syncService: syncService, table: table)
            }
            .sheet(isPresented: $showingSeatPartySheet) {
                SeatPartySheet(syncService: syncService, table: table)
            }
            .sheet(item: $editingItem) { item in
                OrderItemEditorSheet(syncService: syncService, tableId: table.id, item: item)
            }
        } else {
            VStack(spacing: 12) {
                Image(systemName: "square.grid.2x2")
                    .font(.system(size: 45))
                    .foregroundStyle(ChewbuuTheme.amber)
                Text("Select a table")
                    .font(.title3.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Text("Choose a table from Tables or Orders to inspect its guests, order, and close-out.")
                    .font(.subheadline)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(ChewbuuTheme.background)
        }
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}

struct OrderItemRow: View {
    let item: MockOrderItem
    let edit: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 11) {
            Text("\(item.quantity)x")
                .font(.headline.bold())
                .foregroundStyle(ChewbuuTheme.blue)
                .frame(width: 28, alignment: .leading)
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                if !item.modifiers.isEmpty {
                    Text(item.modifiers.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.amber)
                }
                if !item.notes.isEmpty {
                    Text(item.notes)
                        .font(.caption2)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                SyncStatusPill(title: item.status.rawValue, color: item.status.color)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 7) {
                Text(String(format: "$%.2f", Double(item.unitPriceCents * item.quantity) / 100))
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                Button("Modify", action: edit)
                    .font(.caption.bold())
                    .foregroundStyle(ChewbuuTheme.blue)
            }
        }
        .padding(13)
        .syncCard()
    }
}

struct SyncOutlineButtonStyle: ButtonStyle {
    let color: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.bold())
            .foregroundStyle(color)
            .padding(.vertical, 11)
            .background(color.opacity(configuration.isPressed ? 0.26 : 0.12), in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.55), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}
