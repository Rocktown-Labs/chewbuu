import SwiftUI
import BlocksRuntime

#if os(macOS)
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}
#endif

@main
struct ChewbuuSyncApp: App {
    #if os(macOS)
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    #endif

    var body: some Scene {
        WindowGroup {
            SyncRootView()
                .frame(minWidth: 1180, minHeight: 760)
        }
    }
}

struct SyncRootView: View {
    @StateObject private var syncService = SyncService.shared
    @State private var selectedDestination: SyncDestination = .overview
    @State private var selectedTableId: String? = "t2"

    var body: some View {
        NavigationSplitView {
            SyncSidebar(selectedDestination: $selectedDestination, syncService: syncService)
        } content: {
            VStack(spacing: 0) {
                SyncTopBar(syncService: syncService, selectedDestination: selectedDestination)
                Divider().overlay(ChewbuuTheme.divider)
                destinationView
            }
            .background(ChewbuuTheme.background)
        } detail: {
            detailView
                .background(ChewbuuTheme.background)
        }
        .tint(ChewbuuTheme.blue)
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var destinationView: some View {
        switch selectedDestination {
        case .overview:
            OverviewView(syncService: syncService, selectedTableId: $selectedTableId) { destination in
                selectedDestination = destination
            }
        case .tables:
            FloorMapView(syncService: syncService, selectedTableId: $selectedTableId)
        case .orders:
            OrdersView(syncService: syncService, selectedTableId: $selectedTableId)
        case .kitchen:
            KitchenKDSView(syncService: syncService)
        case .team:
            StaffRosterView(syncService: syncService)
        case .schedules:
            ScheduleAttendanceView(syncService: syncService)
        case .customers:
            CustomersView(syncService: syncService, selectedTableId: $selectedTableId) {
                selectedDestination = .orders
            }
        case .menu:
            MenuManagementView(syncService: syncService)
        case .specials:
            SpecialsView()
        case .hiring:
            HiringView(syncService: syncService)
        case .analytics:
            AnalyticsView(syncService: syncService)
        case .business:
            BusinessSettingsView(syncService: syncService)
        case .chat:
            SyncChatView()
        case .kiosk:
            KioskClockInView(syncService: syncService)
        }
    }

    @ViewBuilder
    private var detailView: some View {
        switch selectedDestination {
        case .overview, .tables, .orders, .kitchen:
            TableDetailView(syncService: syncService, tableId: selectedTableId)
        default:
            SyncDetailPlaceholder(destination: selectedDestination)
        }
    }
}

struct SyncSidebar: View {
    @Binding var selectedDestination: SyncDestination
    @ObservedObject var syncService: SyncService

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 11) {
                ZStack {
                    Circle()
                        .fill(ChewbuuTheme.amber.opacity(0.18))
                        .frame(width: 38, height: 38)
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.title3)
                        .foregroundStyle(ChewbuuTheme.amber)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("SYNC BY CHEWBUU")
                        .font(.caption.weight(.heavy))
                        .tracking(1.2)
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("Venue operations cockpit")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
            }
            .padding(.horizontal, 17)
            .padding(.vertical, 17)

            Divider().overlay(ChewbuuTheme.divider)

            List(selection: $selectedDestination) {
                SyncNavSection(title: "At a glance", destinations: [.overview])
                SyncNavSection(title: "Operations", destinations: [.tables, .orders, .kitchen])
                SyncNavSection(title: "People", destinations: [.team, .schedules, .customers, .chat])
                SyncNavSection(title: "Business", destinations: [.menu, .specials, .hiring, .analytics, .business])
                SyncNavSection(title: "Terminal", destinations: [.kiosk])
            }
            .listStyle(.sidebar)
            .scrollContentBackground(.hidden)

            Divider().overlay(ChewbuuTheme.divider)

            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 7) {
                    Circle()
                        .fill(syncService.isConnected ? ChewbuuTheme.mint : ChewbuuTheme.orange)
                        .frame(width: 8, height: 8)
                    Text(syncService.isConnected ? "Live with Sync" : "Offline demo mode")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                }
                Text(syncService.locationName)
                    .font(.caption2)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(1)
                Text("Manager workspace")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(ChewbuuTheme.amber)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(15)
            .background(ChewbuuTheme.surface.opacity(0.7))
        }
        .background(ChewbuuTheme.background)
        .navigationSplitViewColumnWidth(min: 230, ideal: 258, max: 290)
    }
}

struct SyncNavSection: View {
    let title: String
    let destinations: [SyncDestination]

    var body: some View {
        Section {
            ForEach(destinations) { destination in
                NavigationLink(value: destination) {
                    Label(destination.title, systemImage: destination.icon)
                        .font(.subheadline.weight(.semibold))
                }
            }
        } header: {
            Text(title.uppercased())
                .font(.caption2.weight(.heavy))
                .tracking(1.1)
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
    }
}

struct SyncTopBar: View {
    @ObservedObject var syncService: SyncService
    let selectedDestination: SyncDestination

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 9) {
                    Text(selectedDestination.title)
                        .font(.system(size: 23, weight: .bold, design: .rounded))
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    SyncStatusPill(title: syncService.serviceMode, color: ChewbuuTheme.mint)
                }
                Text("Sync by Chewbuu  ·  \(syncService.locationName)")
                    .font(.caption)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
            }

            Spacer()

            HStack(spacing: 12) {
                Label("\(syncService.activeTableCount) active tables", systemImage: "square.grid.2x2")
                Label("\(syncService.activeOrderCount) kitchen items", systemImage: "flame")
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(ChewbuuTheme.secondaryText)

            Button {
                Task { await syncService.fetchLiveBoard() }
            } label: {
                Image(systemName: syncService.isLoading ? "arrow.triangle.2.circlepath" : "arrow.clockwise")
                    .font(.headline)
                    .frame(width: 34, height: 34)
                    .background(ChewbuuTheme.surfaceMuted, in: Circle())
            }
            .buttonStyle(.plain)
            .help("Refresh live service data")

            Menu {
                Button("Reset demo service data", role: .destructive) {
                    syncService.loadInitialData()
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.headline)
                    .frame(width: 34, height: 34)
                    .background(ChewbuuTheme.surfaceMuted, in: Circle())
            }
            .menuStyle(.borderlessButton)
            .help("Demo controls")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(ChewbuuTheme.background)
    }
}

struct SyncDetailPlaceholder: View {
    let destination: SyncDestination

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: destination.icon)
                .font(.system(size: 42))
                .foregroundStyle(ChewbuuTheme.amber)
            Text(destination.title)
                .font(.title3.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
            Text("Select an item to inspect its details.")
                .font(.subheadline)
                .foregroundStyle(ChewbuuTheme.secondaryText)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }
}
