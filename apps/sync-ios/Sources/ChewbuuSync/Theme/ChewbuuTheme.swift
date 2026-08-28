import SwiftUI

public enum ChewbuuTheme {
    // Chewbuu is burgundy ink on a warm yellow ground. Supporting colors are
    // reserved for operational states so the interface stays calm and legible.
    public static let background = Color(red: 0.97, green: 0.88, blue: 0.56)
    public static let surface = Color(red: 1.00, green: 0.95, blue: 0.73)
    public static let elevatedSurface = Color(red: 1.00, green: 0.98, blue: 0.86)
    public static let surfaceMuted = burgundy.opacity(0.09)
    public static let divider = burgundy.opacity(0.18)

    public static let burgundy = Color(red: 0.37, green: 0.08, blue: 0.16)
    public static let burgundyDark = Color(red: 0.25, green: 0.04, blue: 0.10)
    public static let yellow = Color(red: 0.98, green: 0.76, blue: 0.17)
    public static let gold = Color(red: 0.69, green: 0.40, blue: 0.07)
    public static let success = Color(red: 0.14, green: 0.39, blue: 0.26)
    public static let warning = Color(red: 0.72, green: 0.32, blue: 0.10)
    public static let coral = Color(red: 0.67, green: 0.16, blue: 0.19)

    // Compatibility names for existing views. They intentionally map back to
    // the restrained Chewbuu palette instead of introducing new neon accents.
    public static let amber = gold
    public static let blue = burgundy
    public static let mint = success
    public static let orange = warning
    public static let violet = burgundy
    public static let datePink = burgundy
    public static let datePurple = burgundyDark

    public static let primaryText = burgundyDark
    public static let secondaryText = Color(red: 0.34, green: 0.17, blue: 0.19)
    public static let warmWhite = Color(red: 1.00, green: 0.98, blue: 0.91)
}

public struct SyncCardModifier: ViewModifier {
    let isSelected: Bool
    let accent: Color

    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(isSelected ? accent.opacity(0.14) : ChewbuuTheme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isSelected ? accent : ChewbuuTheme.divider, lineWidth: isSelected ? 2 : 1)
            )
    }
}

public extension View {
    func syncCard(isSelected: Bool = false, accent: Color = ChewbuuTheme.burgundy) -> some View {
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
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(color.opacity(0.13), in: Capsule())
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
        VStack(alignment: .leading, spacing: 4) {
            Text(eyebrow.uppercased())
                .font(.caption2.weight(.heavy))
                .tracking(1.2)
                .foregroundStyle(ChewbuuTheme.burgundy)
            Text(title)
                .font(.system(size: 27, weight: .bold, design: .rounded))
                .foregroundStyle(ChewbuuTheme.primaryText)
            if let subtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
        }
    }
}

public struct SyncFilledButtonStyle: ButtonStyle {
    let color: Color

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.bold())
            .foregroundStyle(ChewbuuTheme.warmWhite)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(color.opacity(configuration.isPressed ? 0.75 : 1), in: Capsule())
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

public struct SyncOutlineButtonStyle: ButtonStyle {
    let color: Color

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.bold())
            .foregroundStyle(color)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(color.opacity(configuration.isPressed ? 0.16 : 0.08), in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.55), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

public struct SyncChipButtonStyle: ButtonStyle {
    let isSelected: Bool
    let color: Color

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.bold())
            .foregroundStyle(isSelected ? ChewbuuTheme.warmWhite : ChewbuuTheme.primaryText)
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(isSelected ? color : ChewbuuTheme.surfaceMuted, in: Capsule())
            .overlay(Capsule().stroke(isSelected ? color : ChewbuuTheme.divider, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}
