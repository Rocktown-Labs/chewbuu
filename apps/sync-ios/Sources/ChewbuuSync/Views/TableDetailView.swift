import SwiftUI

public struct TableDetailView: View {
    @ObservedObject var syncService: SyncService
    let tableId: String?
    let onClose: () -> Void

    @State private var showingAddMenuSheet = false
    @State private var showingPaymentSheet = false
    @State private var showingSeatPartySheet = false
    @State private var showingCloseConfirmation = false
    @State private var editingItem: MockOrderItem?

    private var currentTable: MockTable? { syncService.table(for: tableId) }
    private var currentCustomer: MockCustomer? { syncService.customer(for: currentTable?.customerId) }

    public var body: some View {
        if let table = currentTable {
            VStack(alignment: .leading, spacing: 0) {
                InspectorHeader(
                    eyebrow: "Table",
                    title: table.label,
                    subtitle: table.section,
                    status: table.status.rawValue,
                    statusColor: table.status.color,
                    onClose: onClose
                )

                Divider().overlay(ChewbuuTheme.divider)

                if table.status == .available {
                    VStack(spacing: 14) {
                        Spacer()
                        Image(systemName: "person.2.slash")
                            .font(.system(size: 38))
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                        Text("Ready for a party")
                            .font(.title3.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        Text("Seat guests here, then start their order.")
                            .font(.subheadline)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                            .multilineTextAlignment(.center)
                        Button {
                            showingSeatPartySheet = true
                        } label: {
                            Label("Seat a party", systemImage: "person.badge.plus")
                        }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(20)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(table.partyName ?? "Walk-in guest")
                                        .font(.headline.bold())
                                        .foregroundStyle(ChewbuuTheme.primaryText)
                                    Text("\(table.occupiedSeats) guests  ·  \(table.serverName)")
                                        .font(.caption)
                                        .foregroundStyle(ChewbuuTheme.secondaryText)
                                }
                                Spacer()
                                if let currentCustomer {
                                    Text(currentCustomer.sourceLabel)
                                        .font(.caption.bold())
                                        .foregroundStyle(ChewbuuTheme.burgundy)
                                }
                            }
                            .padding(13)
                            .syncCard(accent: ChewbuuTheme.burgundy)

                            HStack {
                                Text("Current order")
                                    .font(.headline.bold())
                                    .foregroundStyle(ChewbuuTheme.primaryText)
                                Spacer()
                                Text("\(table.orders.count) lines")
                                    .font(.caption)
                                    .foregroundStyle(ChewbuuTheme.secondaryText)
                            }

                            if table.orders.isEmpty {
                                EmptyPanel(title: "Ready for the first order", detail: "Add food, drinks, or an add-on.", icon: "fork.knife", color: ChewbuuTheme.gold)
                            } else {
                                ForEach(table.orders) { item in
                                    OrderItemRow(item: item) {
                                        editingItem = item
                                    }
                                }
                            }
                        }
                        .padding(16)
                    }

                    Divider().overlay(ChewbuuTheme.divider)

                    VStack(spacing: 11) {
                        HStack {
                            Text("Subtotal")
                                .font(.subheadline)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            Spacer()
                            Text(formatCurrency(table.billTotalCents))
                                .font(.title3.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                        }
                        HStack(spacing: 8) {
                            Button {
                                showingAddMenuSheet = true
                            } label: {
                                Label("Add items", systemImage: "plus")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.burgundy))

                            Button {
                                showingCloseConfirmation = true
                            } label: {
                                Label("Close check", systemImage: "checkmark.seal")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                            .disabled(table.billTotalCents == 0)
                            .opacity(table.billTotalCents == 0 ? 0.45 : 1)
                        }
                    }
                    .padding(16)
                    .background(ChewbuuTheme.surface)
                }
            }
            .confirmationDialog(
                "Review before closing",
                isPresented: $showingCloseConfirmation,
                titleVisibility: .visible
            ) {
                Button("Continue to checkout") {
                    showingPaymentSheet = true
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This is a demo close-out for Table \(table.label) totaling \(formatCurrency(table.billTotalCents)). You can choose a tip and payment method next. No card will be charged.")
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
                InspectorHeader(eyebrow: "Table", title: "Nothing selected", subtitle: nil, status: nil, statusColor: nil, onClose: onClose)
                Spacer()
                Text("Select a table to inspect its guests, order, and close-out.")
                    .font(.subheadline)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .multilineTextAlignment(.center)
                    .padding(24)
                Spacer()
            }
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
        HStack(alignment: .top, spacing: 9) {
            Text("\(item.quantity)x")
                .font(.subheadline.bold())
                .foregroundStyle(ChewbuuTheme.burgundy)
                .frame(width: 28, alignment: .leading)
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                if !item.modifiers.isEmpty {
                    Text(item.modifiers.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
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
                    .foregroundStyle(ChewbuuTheme.burgundy)
            }
        }
        .padding(12)
        .syncCard()
    }
}
