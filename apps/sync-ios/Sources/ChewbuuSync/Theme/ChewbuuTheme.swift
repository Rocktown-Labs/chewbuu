import SwiftUI

public enum ChewbuuTheme {
    public static let background = Color(red: 0.055, green: 0.063, blue: 0.075)
    public static let surface = Color(red: 0.105, green: 0.118, blue: 0.137)
    public static let elevatedSurface = Color(red: 0.145, green: 0.157, blue: 0.18)
    public static let surfaceMuted = Color.white.opacity(0.07)
    public static let divider = Color.white.opacity(0.11)

    public static let amber = Color(red: 0.98, green: 0.67, blue: 0.18)
    public static let blue = Color(red: 0.20, green: 0.42, blue: 0.96)
    public static let mint = Color(red: 0.38, green: 0.82, blue: 0.42)
    public static let orange = Color(red: 0.98, green: 0.56, blue: 0.20)
    public static let coral = Color(red: 0.95, green: 0.31, blue: 0.32)
    public static let violet = Color(red: 0.69, green: 0.42, blue: 0.93)
    public static let datePink = Color(red: 0.96, green: 0.38, blue: 0.58)
    public static let datePurple = Color(red: 0.40, green: 0.26, blue: 0.82)

    public static let primaryText = Color(red: 0.96, green: 0.95, blue: 0.92)
    public static let secondaryText = Color(red: 0.67, green: 0.68, blue: 0.72)
}

public struct SyncCardModifier: ViewModifier {
    let isSelected: Bool
    let accent: Color

    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isSelected ? accent.opacity(0.16) : ChewbuuTheme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? accent : ChewbuuTheme.divider, lineWidth: isSelected ? 2 : 1)
            )
    }
}

public extension View {
    func syncCard(isSelected: Bool = false, accent: Color = ChewbuuTheme.blue) -> some View {
        modifier(SyncCardModifier(isSelected: isSelected, accent: accent))
    }
}

public struct SyncStatusPill: View {
    public let title: String
    public let color: Color

    public init(title: String, color: Color) {
        self.title = title
        self.color = color
    }

    public var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.16), in: Capsule())
    }
}

public struct SyncSectionHeader: View {
    public let eyebrow: String
    public let title: String
    public let subtitle: String?

    public init(eyebrow: String, title: String, subtitle: String? = nil) {
        self.eyebrow = eyebrow
        self.title = title
        self.subtitle = subtitle
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(eyebrow.uppercased())
                .font(.caption2.weight(.heavy))
                .tracking(1.4)
                .foregroundStyle(ChewbuuTheme.amber)
            Text(title)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(ChewbuuTheme.primaryText)
            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
        }
    }
}
