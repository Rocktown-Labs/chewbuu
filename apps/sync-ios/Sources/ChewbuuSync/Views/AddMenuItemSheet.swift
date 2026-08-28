import SwiftUI

public struct AddMenuItemSheet: View {
    @ObservedObject var syncService: SyncService
    let tableId: String
    @Environment(\.dismiss) private var dismiss

    @State private var selectedCategory = "All"
    @State private var selectedItem: CatalogItem?
    @State private var selectedModifiers: Set<String> = []
    @State private var quantity = 1
    @State private var notes = ""

    private var categories: [String] {
        ["All"] + Array(Set(syncService.menuCatalog.map(\.category))).sorted()
    }

    private var filteredItems: [CatalogItem] {
        syncService.menuCatalog.filter { item in
            item.isAvailable && (selectedCategory == "All" || item.category == selectedCategory)
        }
    }

    public var body: some View {
        NavigationStack {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 11) {
                    Text("Choose an item")
                        .font(.headline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 7) {
                            ForEach(categories, id: \.self) { category in
                                Button(category) { selectedCategory = category }
                                    .buttonStyle(SyncChipButtonStyle(isSelected: selectedCategory == category, color: ChewbuuTheme.burgundy))
                            }
                        }
                    }
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 175, maximum: 250), spacing: 9)], spacing: 9) {
                            ForEach(filteredItems) { item in
                                Button {
                                    selectedItem = item
                                    selectedModifiers.removeAll()
                                    quantity = 1
                                    notes = ""
                                } label: {
                                    VStack(alignment: .leading, spacing: 5) {
                                        HStack(alignment: .top) {
                                            Text(item.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText).multilineTextAlignment(.leading)
                                            Spacer()
                                            Text(formatCurrency(item.priceCents)).font(.caption.bold()).foregroundStyle(ChewbuuTheme.burgundy)
                                        }
                                        Text(item.category).font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(12)
                                    .syncCard(isSelected: selectedItem?.id == item.id, accent: ChewbuuTheme.burgundy)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity)

                Divider().overlay(ChewbuuTheme.divider)

                VStack(alignment: .leading, spacing: 13) {
                    if let item = selectedItem {
                        Text(item.name)
                            .font(.title3.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        Text(formatCurrency(item.priceCents * quantity))
                            .font(.headline)
                            .foregroundStyle(ChewbuuTheme.burgundy)

                        if !item.modifiers.isEmpty {
                            Text("Modifiers")
                                .font(.caption.weight(.heavy))
                                .tracking(0.8)
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            FlowLayout(spacing: 6) {
                                ForEach(item.modifiers, id: \.self) { modifier in
                                    Button(modifier) {
                                        if selectedModifiers.contains(modifier) { selectedModifiers.remove(modifier) } else { selectedModifiers.insert(modifier) }
                                    }
                                    .buttonStyle(SyncChipButtonStyle(isSelected: selectedModifiers.contains(modifier), color: ChewbuuTheme.burgundy))
                                }
                            }
                        }

                        Stepper("Quantity · \(quantity)", value: $quantity, in: 1...20)
                            .padding(11)
                            .syncCard()
                        TextField("Kitchen note (optional)", text: $notes, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                        Spacer()
                        Button {
                            syncService.addOrderItem(tableId: tableId, item: item, selectedModifiers: Array(selectedModifiers).sorted(), quantity: quantity, notes: notes)
                            dismiss()
                        } label: {
                            Label("Send to kitchen", systemImage: "paperplane")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                    } else {
                        Spacer()
                        Text("Tap an item to add it to the check.")
                            .font(.subheadline)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                            .multilineTextAlignment(.center)
                        Spacer()
                    }
                }
                .padding(16)
                .frame(width: 300)
                .background(ChewbuuTheme.surface)
            }
            .background(ChewbuuTheme.background)
            .navigationTitle("Add to Table \(tableId)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
        }
        .frame(minWidth: 800, minHeight: 540)
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}
