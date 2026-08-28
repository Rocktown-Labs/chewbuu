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

    private var categories: [String] { ["All"] + Array(Set(syncService.menuCatalog.map(\.category))).sorted() }
    private var filteredItems: [CatalogItem] {
        syncService.menuCatalog.filter { $0.isAvailable && (selectedCategory == "All" || $0.category == selectedCategory) }
    }

    public var body: some View {
        SyncSheetScaffold(title: "Add items", subtitle: "Table \(tableId) · tap an item, then send it to the kitchen.") {
            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 11) {
                    Text("Menu")
                        .font(.headline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 7) {
                            ForEach(categories, id: \.self) { category in
                                Button(category) { selectedCategory = category }
                                    .buttonStyle(SyncChipButtonStyle(isSelected: selectedCategory == category, color: ChewbuuTheme.yellow))
                            }
                        }
                    }
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
                                        Text(item.name)
                                            .font(.subheadline.bold())
                                            .foregroundStyle(ChewbuuTheme.primaryText)
                                            .multilineTextAlignment(.leading)
                                        Spacer()
                                        Text(formatCurrency(item.priceCents))
                                            .font(.caption.bold())
                                            .foregroundStyle(ChewbuuTheme.yellow)
                                    }
                                    Text(item.category)
                                        .font(.caption)
                                        .foregroundStyle(ChewbuuTheme.secondaryText)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(11)
                                .syncCard(isSelected: selectedItem?.id == item.id, accent: ChewbuuTheme.yellow)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 12) {
                    if let item = selectedItem {
                        Text(item.name)
                            .font(.title3.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        Text(formatCurrency(item.priceCents * quantity))
                            .font(.headline)
                            .foregroundStyle(ChewbuuTheme.yellow)
                        if !item.modifiers.isEmpty {
                            Text("Modifiers · tap to toggle")
                                .font(.caption.weight(.heavy))
                                .foregroundStyle(ChewbuuTheme.secondaryText)
                            FlowLayout(spacing: 6) {
                                ForEach(item.modifiers, id: \.self) { modifier in
                                    Button(modifier) {
                                        if selectedModifiers.contains(modifier) { selectedModifiers.remove(modifier) } else { selectedModifiers.insert(modifier) }
                                    }
                                    .buttonStyle(SyncChipButtonStyle(isSelected: selectedModifiers.contains(modifier), color: ChewbuuTheme.yellow))
                                }
                            }
                        }
                        SyncStepperControl(title: "Quantity", value: $quantity, range: 1...20)
                        SyncLabeledField(title: "Kitchen note", placeholder: "Optional", text: $notes, axis: .vertical)
                    } else {
                        Text("Select a menu item to choose modifiers and quantity.")
                            .font(.subheadline)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                            .multilineTextAlignment(.leading)
                    }
                }
                .frame(width: 290, alignment: .leading)
                .padding(14)
                .background(ChewbuuTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        } footer: {
            HStack(spacing: 8) {
                Button("Cancel") { dismiss() }
                    .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
                Button("Send to kitchen") {
                    guard let item = selectedItem else { return }
                    syncService.addOrderItem(tableId: tableId, item: item, selectedModifiers: Array(selectedModifiers).sorted(), quantity: quantity, notes: notes)
                    dismiss()
                }
                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.yellow))
                .disabled(selectedItem == nil)
                .opacity(selectedItem == nil ? 0.5 : 1)
            }
        }
        .frame(minWidth: 850, minHeight: 570)
    }

    private func formatCurrency(_ cents: Int) -> String {
        String(format: "$%.2f", Double(cents) / 100)
    }
}
