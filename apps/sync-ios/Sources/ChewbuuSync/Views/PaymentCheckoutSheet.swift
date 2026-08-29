import SwiftUI

public struct PaymentCheckoutSheet: View {
    @ObservedObject var syncService: SyncService
    let table: MockTable
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var selectedTipPercent = 20
    @State private var isProcessing = false
    @State private var showingCloseConfirmation = false
    private let tipOptions = [15, 18, 20, 25, 0]

    private var taxCents: Int { Int(Double(table.billTotalCents) * 0.0825) }
    private var tipCents: Int { Int(Double(table.billTotalCents) * Double(selectedTipPercent) / 100) }
    private var totalCents: Int { table.billTotalCents + taxCents + tipCents }

    public var body: some View {
        NavigationStack {
            checkoutForm
            .background(ChewbuuTheme.background)
            .navigationTitle("Close Table \(table.label)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .confirmationDialog("Confirm close-out", isPresented: $showingCloseConfirmation, titleVisibility: .visible) {
            Button("Open secure Stripe checkout") {
                processCloseout()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Open secure Stripe checkout for Table \(table.label) totaling \(formatCurrency(totalCents)) with a \(selectedTipPercent)% tip. The table closes after payment is confirmed.")
        }
        .frame(minWidth: 560, minHeight: 620)
    }

    private var checkoutForm: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 11) {
                        Image(systemName: table.isChewbuuDate ? "heart.fill" : "receipt")
                            .foregroundStyle(ChewbuuTheme.burgundy)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(table.partyName ?? "Walk-in guest")
                                .font(.title3.bold())
                                .foregroundStyle(ChewbuuTheme.primaryText)
                            Text("Table \(table.label)  ·  \(table.orders.count) items  ·  \(table.serverName)")
                                .font(.subheadline)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                        }
                        Spacer()
                        Text(formatCurrency(table.billTotalCents))
                            .font(.title2.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                    }
                    .padding(15)
                    .syncCard(accent: ChewbuuTheme.burgundy)

                    CheckoutSection(title: "Tip", icon: "hand.thumbsup", color: ChewbuuTheme.burgundy) {
                        HStack(spacing: 7) {
                            ForEach(tipOptions, id: \.self) { tip in
                                Button {
                                    selectedTipPercent = tip
                                } label: {
                                    Text(tip == 0 ? "None" : "\(tip)%")
                                        .font(.subheadline.bold())
                                        .foregroundStyle(selectedTipPercent == tip ? ChewbuuTheme.warmWhite : ChewbuuTheme.primaryText)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(selectedTipPercent == tip ? ChewbuuTheme.burgundy : ChewbuuTheme.surfaceMuted, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    VStack(spacing: 8) {
                        SummaryRow(title: "Food & beverage", amount: formatCurrency(table.billTotalCents))
                        SummaryRow(title: "Sales tax", amount: formatCurrency(taxCents))
                        SummaryRow(title: "Tip (\(selectedTipPercent)%)", amount: formatCurrency(tipCents))
                        Divider().overlay(ChewbuuTheme.divider)
                        HStack {
                            Text("Guest total").font(.title3.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Spacer()
                            Text(formatCurrency(totalCents)).font(.title2.bold()).foregroundStyle(ChewbuuTheme.burgundy)
                        }
                    }
                    .padding(15)
                    .syncCard(accent: ChewbuuTheme.burgundy)

                    Label("Stripe hosts card and Apple Pay checkout. Payment and transfers are confirmed by webhooks.", systemImage: "lock.shield")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .padding(20)
            }

            Divider().overlay(ChewbuuTheme.divider)

            Button {
                showingCloseConfirmation = true
            } label: {
                HStack(spacing: 8) {
                    if isProcessing { ProgressView() }
                    Label(isProcessing ? "Opening Stripe…" : "Pay securely · \(formatCurrency(totalCents))", systemImage: "lock.shield")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
            .disabled(isProcessing)
            .padding(18)
        }
    }

    private func processCloseout() {
        isProcessing = true
        Task {
            let checkoutURL = await syncService.startCheckout(tableId: table.id)
            isProcessing = false
            if let checkoutURL {
                openURL(checkoutURL)
            }
        }
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}

struct CheckoutSection<Content: View>: View {
    let title: String
    let icon: String
    let color: Color
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            SectionTitle(title: title, icon: icon, color: color)
            content
        }
    }
}

struct SummaryRow: View {
    let title: String
    let amount: String

    var body: some View {
        HStack {
            Text(title).foregroundStyle(ChewbuuTheme.secondaryText)
            Spacer()
            Text(amount).fontWeight(.semibold).foregroundStyle(ChewbuuTheme.primaryText)
        }
        .font(.subheadline)
    }
}
