import SwiftUI

public enum ChewbuuTheme {
    // Chewbuu Sync is burgundy first: warm yellow is the brand signal and
    // supporting colors are reserved for operational states.
    public static let background = Color(red: 0.18, green: 0.025, blue: 0.075)
    public static let surface = Color(red: 0.27, green: 0.055, blue: 0.13)
    public static let elevatedSurface = Color(red: 0.36, green: 0.09, blue: 0.18)
    public static let surfaceMuted = yellow.opacity(0.13)
    public static let divider = yellow.opacity(0.22)

    public static let burgundy = Color(red: 0.48, green: 0.075, blue: 0.19)
    public static let burgundyDark = Color(red: 0.15, green: 0.018, blue: 0.06)
    public static let yellow = Color(red: 0.98, green: 0.78, blue: 0.23)
    public static let gold = Color(red: 0.91, green: 0.59, blue: 0.10)
    public static let success = Color(red: 0.39, green: 0.79, blue: 0.50)
    public static let warning = Color(red: 0.98, green: 0.55, blue: 0.19)
    public static let coral = Color(red: 0.98, green: 0.35, blue: 0.38)

    // Compatibility names keep existing screens on the same Chewbuu palette.
    public static let amber = yellow
    public static let blue = yellow
    public static let mint = success
    public static let orange = warning
    public static let violet = burgundy
    public static let datePink = yellow
    public static let datePurple = burgundy

    public static let primaryText = Color(red: 1.00, green: 0.93, blue: 0.65)
    public static let secondaryText = Color(red: 0.91, green: 0.72, blue: 0.55)
    public static let warmWhite = Color(red: 1.00, green: 0.98, blue: 0.91)
}

public struct SyncCardModifier: ViewModifier {
    let isSelected: Bool
    let accent: Color

    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(isSelected ? accent.opacity(0.22) : ChewbuuTheme.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isSelected ? accent : ChewbuuTheme.divider, lineWidth: isSelected ? 2 : 1)
            )
    }
}

public extension View {
    func syncCard(isSelected: Bool = false, accent: Color = ChewbuuTheme.yellow) -> some View {
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
            Circle().fill(color).frame(width: 7, height: 7)
            Text(title).font(.caption.bold()).foregroundStyle(color)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(color.opacity(0.14), in: Capsule())
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
                .foregroundStyle(ChewbuuTheme.yellow)
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
            .foregroundStyle(color == ChewbuuTheme.yellow ? ChewbuuTheme.burgundyDark : ChewbuuTheme.warmWhite)
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
            .background(color.opacity(configuration.isPressed ? 0.18 : 0.10), in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.65), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

public struct SyncChipButtonStyle: ButtonStyle {
    let isSelected: Bool
    let color: Color

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.bold())
            .foregroundStyle(isSelected ? ChewbuuTheme.burgundyDark : ChewbuuTheme.primaryText)
            .padding(.horizontal, 11)
            .padding(.vertical, 8)
            .background(isSelected ? color : ChewbuuTheme.surfaceMuted, in: Capsule())
            .overlay(Capsule().stroke(isSelected ? color : ChewbuuTheme.divider, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

public struct SyncStepperControl: View {
    public let title: String
    @Binding public var value: Int
    public let range: ClosedRange<Int>

    public init(title: String, value: Binding<Int>, range: ClosedRange<Int>) {
        self.title = title
        _value = value
        self.range = range
    }

    public var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                Text("Tap − or + to change")
                    .font(.caption2)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            Button {
                if value > range.lowerBound { value -= 1 }
            } label: {
                Image(systemName: "minus")
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
            Text("\(value)")
                .font(.title3.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
                .frame(minWidth: 28)
            Button {
                if value < range.upperBound { value += 1 }
            } label: {
                Image(systemName: "plus")
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.yellow))
        }
        .padding(11)
        .syncCard()
    }
}
