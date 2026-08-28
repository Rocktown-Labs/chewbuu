import SwiftUI

struct SyncSheetScaffold<Content: View, Footer: View>: View {
    let title: String
    let subtitle: String?
    let content: Content
    let footer: Footer
    @Environment(\.dismiss) private var dismiss

    init(title: String, subtitle: String? = nil, @ViewBuilder content: () -> Content, @ViewBuilder footer: () -> Footer) {
        self.title = title
        self.subtitle = subtitle
        self.content = content()
        self.footer = footer()
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(.system(size: 23, weight: .bold, design: .rounded))
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                }
                Spacer()
                Button(action: dismiss.callAsFunction) {
                    Image(systemName: "xmark")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                        .frame(width: 30, height: 30)
                        .background(ChewbuuTheme.surfaceMuted, in: Circle())
                }
                .buttonStyle(.plain)
                .help("Close")
            }
            .padding(18)
            .background(ChewbuuTheme.surface)

            ScrollView {
                content
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
            }
            .background(ChewbuuTheme.background)

            Divider().overlay(ChewbuuTheme.divider)
            HStack {
                Spacer()
                footer
            }
            .padding(15)
            .background(ChewbuuTheme.surface)
        }
        .background(ChewbuuTheme.background)
    }
}

struct SyncFormSection<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption2.weight(.heavy))
                .tracking(1.1)
                .foregroundStyle(ChewbuuTheme.yellow)
            content
        }
        .padding(14)
        .background(ChewbuuTheme.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(ChewbuuTheme.divider))
    }
}

struct SyncLabeledField: View {
    let title: String
    let placeholder: String
    @Binding var text: String
    var axis: Axis = .horizontal

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(ChewbuuTheme.secondaryText)
            TextField(placeholder, text: $text, axis: axis)
                .textFieldStyle(.plain)
                .foregroundStyle(ChewbuuTheme.primaryText)
                .padding(10)
                .background(ChewbuuTheme.surfaceMuted, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 9, style: .continuous).stroke(ChewbuuTheme.divider))
        }
    }
}
