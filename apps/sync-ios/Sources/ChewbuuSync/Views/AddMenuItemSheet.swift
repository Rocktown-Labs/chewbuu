import SwiftUI

public struct AddMenuItemSheet: View {
    @ObservedObject var syncService: SyncService
    let tableId: String
    @Environment(\.dismiss) private var dismiss

    @State private var selectedCategory: String = "All"
    @State private var selectedItem: CatalogItem?
    @State private var selectedModifiers: Set<String> = []
    @State private var quantity: Int = 1

    var categories: [String] {
        var cats = ["All"]
        cats.append(contentsOf: Set(syncService.menuCatalog.map { $0.category }).sorted())
        return cats
    }

    var filteredItems: [CatalogItem] {
        if selectedCategory == "All" {
            return syncService.menuCatalog.filter(\.isAvailable)
        }
        return syncService.menuCatalog.filter { $0.category == selectedCategory && $0.isAvailable }
    }

    public var body: some View {
        NavigationStack {
            HStack(spacing: 0) {
                // Left Column: Catalog Items
                VStack(spacing: 0) {
                    // Category Chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(categories, id: \.self) { cat in
                                Button {
                                    selectedCategory = cat
                                } label: {
                                    Text(cat)
                                        .font(.subheadline.bold())
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(selectedCategory == cat ? Color.accentColor : Color.secondary.opacity(0.12))
                                        .foregroundStyle(selectedCategory == cat ? .white : .primary)
                                        .clipShape(Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding()
                    }
                    .background(Color.secondary.opacity(0.04))

                    Divider()

                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 180, maximum: 240), spacing: 14)], spacing: 14) {
                            ForEach(filteredItems) { item in
                                Button {
                                    selectedItem = item
                                    selectedModifiers.removeAll()
                                    quantity = 1
                                } label: {
                                    VStack(alignment: .leading, spacing: 6) {
                                        HStack {
                                            Text(item.name)
                                                .font(.headline)
                                                .foregroundStyle(.primary)
                                                .multilineTextAlignment(.leading)
                                            Spacer()
                                            Text(formatCurrency(item.priceCents))
                                                .font(.subheadline.bold())
                                                .foregroundStyle(Color.accentColor)
                                        }
                                        Text(item.description)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(2)
                                            .multilineTextAlignment(.leading)
                                    }
                                    .padding(14)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(Color.secondary.opacity(selectedItem?.id == item.id ? 0.2 : 0.08))
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(selectedItem?.id == item.id ? Color.accentColor : Color.clear, lineWidth: 2)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding()
                    }
                }
                .frame(maxWidth: .infinity)

                Divider()

                // Right Column: Modifier & Quantity Builder
                VStack(alignment: .leading, spacing: 18) {
                    if let item = selectedItem {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.name)
                                .font(.title2.bold())
                            Text(item.description)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text(formatCurrency(item.priceCents * quantity))
                                .font(.title3.bold())
                                .foregroundStyle(Color.accentColor)
                                .padding(.top, 4)
                        }

                        Divider()

                        // Modifiers
                        if !item.modifiers.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Modifiers & Prep Notes")
                                    .font(.headline)

                                FlowLayout(spacing: 8) {
                                    ForEach(item.modifiers, id: \.self) { mod in
                                        Button {
                                            if selectedModifiers.contains(mod) {
                                                selectedModifiers.remove(mod)
                                            } else {
                                                selectedModifiers.insert(mod)
                                            }
                                        } label: {
                                            HStack(spacing: 6) {
                                                Image(systemName: selectedModifiers.contains(mod) ? "checkmark.circle.fill" : "circle")
                                                Text(mod)
                                            }
                                            .font(.caption.bold())
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 8)
                                            .background(selectedModifiers.contains(mod) ? Color.accentColor.opacity(0.18) : Color.secondary.opacity(0.08))
                                            .foregroundStyle(selectedModifiers.contains(mod) ? Color.accentColor : .primary)
                                            .clipShape(Capsule())
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }

                        Spacer()

                        // Quantity Stepper
                        HStack {
                            Text("Quantity:")
                                .font(.headline)
                            Spacer()
                            HStack(spacing: 14) {
                                Button {
                                    if quantity > 1 { quantity -= 1 }
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                        .font(.title2)
                                }
                                .buttonStyle(.plain)

                                Text("\(quantity)")
                                    .font(.title2.bold())
                                    .frame(minWidth: 32)

                                Button {
                                    quantity += 1
                                } label: {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.title2)
                                        .foregroundStyle(Color.accentColor)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding()
                        .background(Color.secondary.opacity(0.06))
                        .cornerRadius(12)

                        // Submit Button
                        Button {
                            syncService.addOrderItem(
                                tableId: tableId,
                                item: item,
                                selectedModifiers: Array(selectedModifiers),
                                quantity: quantity
                            )
                            dismiss()
                        } label: {
                            HStack {
                                Image(systemName: "paperplane.fill")
                                Text("Send to Kitchen • \(formatCurrency(item.priceCents * quantity))")
                                    .bold()
                            }
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.accentColor)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    } else {
                        VStack(spacing: 12) {
                            Spacer()
                            Image(systemName: "hand.tap")
                                .font(.system(size: 44))
                                .foregroundStyle(.tertiary)
                            Text("Select an item from the menu catalog to customize modifiers.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                            Spacer()
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(24)
                .frame(width: 380)
                .background(Color.secondary.opacity(0.03))
            }
            .navigationTitle("Add to Table Order")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .frame(minWidth: 780, minHeight: 540)
    }

    private func formatCurrency(_ cents: Int) -> String {
        let dollars = Double(cents) / 100.0
        return String(format: "$%.2f", dollars)
    }
}

// Lightweight flow layout for modifier pills
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 320
        var height: CGFloat = 0
        var rowX: CGFloat = 0
        var rowY: CGFloat = 0
        var maxRowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowX + size.width > width && rowX > 0 {
                rowX = 0
                rowY += maxRowHeight + spacing
                maxRowHeight = 0
            }
            rowX += size.width + spacing
            maxRowHeight = max(maxRowHeight, size.height)
        }
        height = rowY + maxRowHeight
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var rowX = bounds.minX
        var rowY = bounds.minY
        var maxRowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if rowX + size.width > bounds.maxX && rowX > bounds.minX {
                rowX = bounds.minX
                rowY += maxRowHeight + spacing
                maxRowHeight = 0
            }
            subview.place(at: CGPoint(x: rowX, y: rowY), proposal: ProposedViewSize(size))
            rowX += size.width + spacing
            maxRowHeight = max(maxRowHeight, size.height)
        }
    }
}
