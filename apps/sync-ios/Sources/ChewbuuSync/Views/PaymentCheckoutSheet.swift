import SwiftUI

public struct PaymentCheckoutSheet: View {
    @ObservedObject var syncService: SyncService
    let table: MockTable
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTipPercent = 20
    @State private var paymentMethod = "Apple Pay"
    @State private var isProcessing = false
    @State private var paymentComplete = false

    private let paymentMethods = ["Apple Pay", "Card", "Cash", "Split"]
    private let tipOptions = [15, 18, 20, 25, 0]

    private var taxCents: Int { Int(Double(table.billTotalCents) * 0.0825) }
    private var tipCents: Int { Int(Double(table.billTotalCents) * Double(selectedTipPercent) / 100) }
    private var totalCents: Int { table.billTotalCents + taxCents + tipCents }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if paymentComplete {
                    closeoutSuccess
                } else {
                    checkoutForm
                }
            }
            .background(ChewbuuTheme.background)
            .navigationTitle("Close Table \(table.label)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .frame(minWidth: 560, minHeight: 620)
    }

    private var checkoutForm: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 12) {
                        Image(systemName: table.isChewbuuDate ? "heart.circle.fill" : "receipt.fill")
                            .font(.title2)
                            .foregroundStyle(table.isChewbuuDate ? ChewbuuTheme.datePink : ChewbuuTheme.amber)
                        VStack(alignment: .leading, spacing: 4) {
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
                    .padding(17)
                    .syncCard(accent: table.isChewbuuDate ? ChewbuuTheme.datePink : ChewbuuTheme.amber)

                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "Tip", icon: "hand.thumbsup.fill", color: ChewbuuTheme.mint)
                        HStack(spacing: 8) {
                            ForEach(tipOptions, id: \.self) { tip in
                                Button {
                                    selectedTipPercent = tip
                                } label: {
                                    VStack(spacing: 3) {
                                        Text(tip == 0 ? "None" : "\(tip)%")
                                        if tip > 0 { Text(formatCurrency(Int(Double(table.billTotalCents) * Double(tip) / 100))).font(.caption2) }
                                    }
                                    .font(.subheadline.bold())
                                    .foregroundStyle(selectedTipPercent == tip ? ChewbuuTheme.primaryText : ChewbuuTheme.secondaryText)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(selectedTipPercent == tip ? ChewbuuTheme.mint.opacity(0.25) : ChewbuuTheme.surfaceMuted, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(selectedTipPercent == tip ? ChewbuuTheme.mint : ChewbuuTheme.divider, lineWidth: 1))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        SectionTitle(title: "How did they pay?", icon: "creditcard.fill", color: ChewbuuTheme.blue)
                        HStack(spacing: 8) {
                            ForEach(paymentMethods, id: \.self) { method in
                                Button(method) { paymentMethod = method }
                                    .buttonStyle(SyncChipButtonStyle(isSelected: paymentMethod == method, color: ChewbuuTheme.blue))
                            }
                        }
                    }

                    VStack(spacing: 9) {
                        SummaryRow(title: "Food & beverage", amount: formatCurrency(table.billTotalCents))
                        SummaryRow(title: "Sales tax", amount: formatCurrency(taxCents))
                        SummaryRow(title: "Tip (\(selectedTipPercent)%)", amount: formatCurrency(tipCents))
                        Divider().overlay(ChewbuuTheme.divider)
                        HStack {
                            Text("Guest total").font(.title3.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Spacer()
                            Text(formatCurrency(totalCents)).font(.title2.bold()).foregroundStyle(ChewbuuTheme.amber)
                        }
                    }
                    .padding(17)
                    .syncCard(accent: ChewbuuTheme.amber)

                    HStack(spacing: 8) {
                        Image(systemName: "info.circle.fill").foregroundStyle(ChewbuuTheme.blue)
                        Text("Demo close-out: no card is charged. This clears the table so you can run the full flow again.")
                            .font(.caption)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                }
                .padding(20)
            }

            Divider().overlay(ChewbuuTheme.divider)

            Button {
                isProcessing = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                    isProcessing = false
                    paymentComplete = true
                }
            } label: {
                HStack(spacing: 8) {
                    if isProcessing { ProgressView().tint(.white) }
                    Label(isProcessing ? "Closing check…" : "Close out \(formatCurrency(totalCents))", systemImage: "checkmark.seal.fill")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.mint))
            .disabled(isProcessing)
            .padding(18)
        }
    }

    private var closeoutSuccess: some View {
        VStack(spacing: 18) {
            Spacer()
            ZStack {
                Circle().fill(ChewbuuTheme.mint.opacity(0.18)).frame(width: 96, height: 96)
                Image(systemName: "checkmark.seal.fill").font(.system(size: 54)).foregroundStyle(ChewbuuTheme.mint)
            }
            Text("Check closed")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(ChewbuuTheme.primaryText)
            Text("Table \(table.label) is ready for the next guest.")
                .font(.subheadline)
                .foregroundStyle(ChewbuuTheme.secondaryText)
            Text("\(formatCurrency(totalCents)) · \(paymentMethod) · \(selectedTipPercent)% tip")
                .font(.headline)
                .foregroundStyle(ChewbuuTheme.amber)
            Spacer()
            Button {
                syncService.closeAndClearTable(tableId: table.id)
                dismiss()
            } label: {
                Label("Clear table and finish", systemImage: "arrow.right.circle.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
        }
        .padding(24)
    }

    private func formatCurrency(_ cents: Int) -> String { String(format: "$%.2f", Double(cents) / 100) }
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
