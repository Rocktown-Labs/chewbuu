import SwiftUI

public struct SyncChatView: View {
    @State private var messages: [MockChatMessage] = [
        MockChatMessage(id: "1", sender: "Chef Mario", role: "Kitchen Lead", text: "8oz Ribeyes running low (4 remaining for service).", time: "18:24", isManager: false),
        MockChatMessage(id: "2", sender: "Sarah Jenkins", role: "Manager", text: "Table 12 is celebrating their 5th anniversary. Comped dessert champagne ready.", time: "18:31", isManager: true),
        MockChatMessage(id: "3", sender: "Alex Rivera", role: "Host", text: "Waitlist is 25 minutes for patio. Dining room ready for walk-ins.", time: "18:42", isManager: false),
    ]
    @State private var inputText = ""

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("#sync-staff")
                        .font(.headline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("Main Dining Room · real-time coordination")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
                SyncStatusPill(title: "Live", color: ChewbuuTheme.success)
            }
            .padding(16)
            .background(ChewbuuTheme.surface)

            ScrollView {
                LazyVStack(spacing: 9) {
                    ForEach(messages) { message in
                        HStack(alignment: .top, spacing: 9) {
                            Circle()
                                .fill(message.isManager ? ChewbuuTheme.burgundy.opacity(0.12) : ChewbuuTheme.gold.opacity(0.18))
                                .frame(width: 36, height: 36)
                                .overlay(Text(String(message.sender.prefix(1))).font(.caption.bold()).foregroundStyle(ChewbuuTheme.burgundy))
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(message.sender).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                    Text(message.role).font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                                    Spacer()
                                    Text(message.time).font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                                }
                                Text(message.text).font(.subheadline).foregroundStyle(ChewbuuTheme.primaryText)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(12)
                        .syncCard(accent: message.isManager ? ChewbuuTheme.burgundy : ChewbuuTheme.gold)
                    }
                }
                .padding(16)
            }

            Divider().overlay(ChewbuuTheme.divider)
            HStack(spacing: 9) {
                TextField("Message #sync-staff…", text: $inputText)
                    .textFieldStyle(.roundedBorder)
                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                        .foregroundStyle(ChewbuuTheme.warmWhite)
                        .frame(width: 34, height: 34)
                        .background(ChewbuuTheme.burgundy, in: Circle())
                }
                .buttonStyle(.plain)
                .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty)
                .opacity(inputText.trimmingCharacters(in: .whitespaces).isEmpty ? 0.45 : 1)
            }
            .padding(14)
            .background(ChewbuuTheme.surface)
        }
        .background(ChewbuuTheme.background)
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        messages.append(MockChatMessage(id: UUID().uuidString, sender: "Floor Manager", role: "Manager", text: text, time: "Now", isManager: true))
        inputText = ""
    }
}
