import Foundation
import SwiftUI

public enum SyncDestination: String, CaseIterable, Hashable, Identifiable {
    case overview
    case tables
    case orders
    case kitchen
    case team
    case schedules
    case customers
    case menu
    case specials
    case hiring
    case analytics
    case business
    case chat
    case kiosk

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .overview: return "Overview"
        case .tables: return "Tables & Floor"
        case .orders: return "Orders & Checks"
        case .kitchen: return "Kitchen KDS"
        case .team: return "Team"
        case .schedules: return "Schedules & Attendance"
        case .customers: return "Customers"
        case .menu: return "Menu"
        case .specials: return "Specials"
        case .hiring: return "Hiring"
        case .analytics: return "Analytics"
        case .business: return "Business Settings"
        case .chat: return "Staff Chat"
        case .kiosk: return "Kiosk Clock-In"
        }
    }

    public var icon: String {
        switch self {
        case .overview: return "sparkles.rectangle.stack.fill"
        case .tables: return "square.grid.2x2.fill"
        case .orders: return "list.bullet.rectangle.portrait.fill"
        case .kitchen: return "flame.fill"
        case .team: return "person.2.badge.gearshape.fill"
        case .schedules: return "calendar.badge.clock"
        case .customers: return "person.crop.circle"
        case .menu: return "menucard.fill"
        case .specials: return "tag.fill"
        case .hiring: return "person.badge.plus"
        case .analytics: return "chart.xyaxis.line"
        case .business: return "slider.horizontal.3"
        case .chat: return "bubble.left.and.bubble.right.fill"
        case .kiosk: return "clock.badge.checkmark.fill"
        }
    }
}

public struct MockTable: Identifiable, Equatable {
    public let id: String
    public var label: String
    public var section: String
    public var seats: Int
    public var occupiedSeats: Int
    public var status: TableStatus
    public var serverName: String
    public var seatedTimeMinutes: Int
    public var billTotalCents: Int
    public var partyName: String?
    public var customerId: String?
    public var orders: [MockOrderItem]
    public var isChewbuuDate: Bool

    public enum TableStatus: String, CaseIterable {
        case available = "Available"
        case seated = "Seated"
        case ordered = "Orders In"
        case paid = "Cheque Paid"

        public var color: Color {
            switch self {
            case .available: return ChewbuuTheme.mint
            case .seated: return ChewbuuTheme.orange
            case .ordered: return ChewbuuTheme.violet
            case .paid: return ChewbuuTheme.blue
            }
        }
    }
}

public struct MockOrderItem: Identifiable, Equatable {
    public let id: String
    public var name: String
    public var quantity: Int
    public var unitPriceCents: Int
    public var modifiers: [String]
    public var notes: String
    public var status: KdsStatus
    public var minutesAgo: Int

    public enum KdsStatus: String, CaseIterable {
        case pending = "Pending"
        case preparing = "Preparing"
        case ready = "Ready"
        case served = "Served"

        public var color: Color {
            switch self {
            case .pending: return ChewbuuTheme.orange
            case .preparing: return ChewbuuTheme.amber
            case .ready: return ChewbuuTheme.mint
            case .served: return ChewbuuTheme.blue
            }
        }
    }
}

public struct MockStaffMember: Identifiable, Equatable {
    public let id: String
    public var name: String
    public var role: String
    public var section: String?
    public var status: StaffStatus
    public var clockInTime: String?

    public enum StaffStatus: String, CaseIterable {
        case onFloor = "On Floor"
        case onBreak = "On Break"
        case scheduled = "Scheduled"
        case late = "Late (15m)"

        public var color: Color {
            switch self {
            case .onFloor: return ChewbuuTheme.mint
            case .onBreak: return Color.yellow
            case .scheduled: return ChewbuuTheme.secondaryText
            case .late: return ChewbuuTheme.coral
            }
        }
    }
}

public struct MockCustomer: Identifiable, Equatable {
    public let id: String
    public var name: String
    public var email: String
    public var phone: String
    public var favoriteOrder: String
    public var lastVisit: String
    public var isChewbuuMember: Bool
    public var visitCount: Int

    public var sourceLabel: String {
        isChewbuuMember ? "Chewbuu member" : "Venue guest"
    }
}

public struct MockTableRequest: Identifiable, Equatable {
    public let id: String
    public var tableId: String
    public var customerId: String?
    public var title: String
    public var detail: String
    public var ageMinutes: Int
    public var status: RequestStatus

    public enum RequestStatus: String, CaseIterable {
        case new = "New"
        case inProgress = "In progress"
        case resolved = "Resolved"

        public var color: Color {
            switch self {
            case .new: return ChewbuuTheme.amber
            case .inProgress: return ChewbuuTheme.blue
            case .resolved: return ChewbuuTheme.mint
            }
        }
    }
}

public struct MockDiningDate: Identifiable, Equatable {
    public let id: String
    public var title: String
    public var guests: String
    public var tableLabel: String
    public var detail: String
    public var status: String
}

public struct CatalogItem: Identifiable, Equatable {
    public let id: String
    public var category: String
    public var name: String
    public var priceCents: Int
    public var description: String
    public var modifiers: [String]
    public var isAvailable: Bool
}

public struct MockJobListing: Identifiable, Equatable {
    public let id: String
    public var title: String
    public var location: String
    public var schedule: String
    public var applicants: Int
    public var isPublished: Bool
}

public struct MockChatMessage: Identifiable, Equatable {
    public let id: String
    public var sender: String
    public var role: String
    public var text: String
    public var time: String
    public var isManager: Bool
}
