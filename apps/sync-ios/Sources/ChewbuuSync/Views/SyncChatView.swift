import SwiftUI

public struct SyncChatView: View {
    @State private var messages: [MockChatMessage] = [
        MockChatMessage(id: "1", sender: "Chef Mario", role: "Kitchen Lead", text: "8oz Ribeyes running low (4 remaining for service).", time: "18:24", isManager: false),
        MockChatMessage(id: "2", sender: "Sarah Jenkins", role: "Manager", text: "Table 12 is celebrating their 5th anniversary, comped dessert champagne ready.", time: "18:31", isManager: true),
        MockChatMessage(id: "3", sender: "Alex Rivera", role: "Host", text: "Waitlist is 25 minutes for patio, dining room ready for walk-ins.", time: "18:42", isManager: false),
    ]
    @State private var inputText: String = ""

    public var body: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("#sync-staff • Main Dining Room")
                        .font(.headline)
                    Text("Real-time venue coordination channel")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .foregroundStyle(.green)
            }
            .padding()
            .background(Color.secondary.opacity(0.05))

            ScrollView {
                VStack(spacing: 12) {
                    ForEach(messages) { msg in
                        HStack(alignment: .top, spacing: 10) {
                            Circle()
                                .fill(msg.isManager ? Color.purple.opacity(0.2) : Color.accentColor.opacity(0.2))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Text(String(msg.sender.prefix(1)))
                                        .font(.caption.bold())
                                        .foregroundStyle(msg.isManager ? .purple : Color.accentColor)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(msg.sender)
                                        .font(.subheadline.bold())
                                    Text(msg.role)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Text(msg.time)
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }
                                Text(msg.text)
                                    .font(.subheadline)
                            }
                        }
                        .padding(12)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.secondary.opacity(0.06))
                        )
                    }
                }
                .padding()
            }

            Divider()

            HStack(spacing: 12) {
                TextField("Message #sync-staff...", text: $inputText)
                    .textFieldStyle(.plain)
                    .padding(10)
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(10)

                Button {
                    sendMessage()
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.title3)
                        .foregroundStyle(Color.accentColor)
                }
                .buttonStyle(.plain)
                .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding()
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        let newMsg = MockChatMessage(
            id: UUID().uuidString,
            sender: "Floor Manager",
            role: "Manager",
            text: text,
            time: "Now",
            isManager: true
        )
        messages.append(newMsg)
        inputText = ""
    }
}
