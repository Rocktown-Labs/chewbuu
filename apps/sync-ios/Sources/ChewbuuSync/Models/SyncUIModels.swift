import Foundation
import SwiftUI

public enum SyncDestination: String, CaseIterable, Hashable, Identifiable {
    case overview
    case tables
    case reservations
    case orders
    case kitchen
    case team
    case schedules
    case chat
    case menu
    case specials
    case hiring
    case analytics
    case business
    case customers
    case kiosk

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .overview: return "Overview"
        case .tables: return "Tables & Floor"
        case .reservations: return "Reservations"
        case .orders: return "Orders & Checks"
        case .kitchen: return "Kitchen KDS"
        case .team: return "Team"
        case .schedules: return "Schedules & Attendance"
        case .chat: return "Staff Chat"
        case .menu: return "Menu"
        case .specials: return "Specials"
        case .hiring: return "Hiring"
        case .analytics: return "Analytics"
        case .business: return "Business Settings"
        case .customers: return "Customers"
        case .kiosk: return "Kiosk Clock-In"
        }
    }

    public var icon: String {
        switch self {
        case .overview: return "square.grid.2x2"
        case .tables: return "square.grid.2x2.fill"
        case .reservations: return "calendar.badge.clock"
        case .orders: return "receipt"
        case .kitchen: return "flame.fill"
        case .team: return "person.2"
        case .schedules: return "calendar.badge.clock"
        case .chat: return "bubble.left.and.bubble.right"
        case .menu: return "menucard"
        case .specials: return "tag"
        case .hiring: return "person.badge.plus"
        case .analytics: return "chart.xyaxis.line"
        case .business: return "slider.horizontal.3"
        case .customers: return "person.crop.circle"
        case .kiosk: return "clock.badge.checkmark"
        }
    }
}

public enum SyncInspectorSelection: Hashable {
    case table(String)
    case request(String)
    case customer(String)
    case menuItem(String)
    case staff(String)
    case job(String)
}

public enum TableFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case available = "Available"
    case seated = "Seated"
    case orders = "Orders"
    case paid = "Paid"

    public var id: String { rawValue }

    public var tableStatus: MockTable.TableStatus? {
        switch self {
        case .all: return nil
        case .available: return .available
        case .seated: return .seated
        case .orders: return .ordered
        case .paid: return .paid
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
    public var partyGuestNames: [String] = []

    public enum TableStatus: String, CaseIterable {
        case available = "Available"
        case seated = "Seated"
        case ordered = "Orders In"
        case paid = "Paid"

        public var color: Color {
            switch self {
            case .available: return ChewbuuTheme.success
            case .seated: return ChewbuuTheme.gold
            case .ordered: return ChewbuuTheme.yellow
            case .paid: return ChewbuuTheme.secondaryText
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
            case .pending: return ChewbuuTheme.warning
            case .preparing: return ChewbuuTheme.gold
            case .ready: return ChewbuuTheme.success
            case .served: return ChewbuuTheme.secondaryText
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
            case .onFloor: return ChewbuuTheme.success
            case .onBreak: return ChewbuuTheme.gold
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
    public var partySize: Int
    public var favoriteOrder: String
    public var lastVisit: String
    public var isChewbuuMember: Bool
    public var visitCount: Int

    public var sourceLabel: String {
        isChewbuuMember ? "Chewbuu member" : "Venue guest"
    }
}

public struct PartyGuest: Identifiable, Equatable {
    public let id: String
    public var name: String
    public var phone: String
    public var customerId: String?

    public init(id: String = UUID().uuidString, name: String, phone: String, customerId: String?) {
        self.id = id
        self.name = name
        self.phone = phone
        self.customerId = customerId
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
    public var kind: RequestKind = .service
    public var guestNames: String? = nil
    public var scheduledTime: String? = nil
    public var preorderedItems: [String] = []

    public enum RequestKind: String, CaseIterable {
        case service = "Table request"
        case reservation = "Chewbuu Date"
    }

    public enum RequestStatus: String, CaseIterable {
        case new = "New"
        case inProgress = "In progress"
        case resolved = "Resolved"

        public var color: Color {
            switch self {
            case .new: return ChewbuuTheme.gold
            case .inProgress: return ChewbuuTheme.yellow
            case .resolved: return ChewbuuTheme.success
            }
        }
    }
}

public struct CatalogItem: Identifiable, Equatable {
    public let id: String
    public var category: String
    public var name: String
    public var priceCents: Int
    public var description: String
    public var modifiers: [String]
    public var isAvailable: Bool
    public var photoName: String? = nil
    public var dealName: String? = nil
    public var comboItems: [String] = []
    public var substitutions: [String] = []
    public var availabilityNote: String = ""
}

public struct MockSpecial: Identifiable, Equatable {
    public let id: String
    public var title: String
    public var detail: String
    public var discount: String
    public var menuItemIds: [String]
    public var isPublished: Bool
}

public struct MockApplicant: Identifiable, Equatable {
    public let id: String
    public var name: String
    public var phone: String
    public var email: String
    public var availability: String
    public var experience: String
    public var note: String
    public var status: String
}

public struct MockJobListing: Identifiable, Equatable {
    public let id: String
    public var title: String
    public var location: String
    public var schedule: String
    public var applicants: Int
    public var isPublished: Bool
    public var applicantList: [MockApplicant] = []
}

public struct MockChatMessage: Identifiable, Equatable {
    public let id: String
    public var sender: String
    public var role: String
    public var text: String
    public var time: String
    public var isManager: Bool
}
