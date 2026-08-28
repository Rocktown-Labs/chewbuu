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
    @State private var selectedTableId: String?
    @State private var inspectorSelection: SyncInspectorSelection?
    @State private var showingOrderComposer = false

    var body: some View {
        Group {
            if let inspectorSelection {
                NavigationSplitView {
                    sidebar
                } content: {
                    contentColumn
                } detail: {
                    SyncInspectorView(
                        syncService: syncService,
                        selection: inspectorSelection,
                        onClose: closeInspector,
                        onOpenOrder: openOrder
                    )
                    .navigationSplitViewColumnWidth(min: 270, ideal: 320, max: 370)
                }
            } else {
                NavigationSplitView {
                    sidebar
                } detail: {
                    contentColumn
                }
            }
        }
        .tint(ChewbuuTheme.yellow)
        .preferredColorScheme(.dark)
        .onChange(of: selectedDestination) { _, _ in
            inspectorSelection = nil
        }
        .sheet(isPresented: $showingOrderComposer) {
            OrderComposerView(syncService: syncService)
        }
        .background(ChewbuuTheme.background.ignoresSafeArea())
    }

    private var sidebar: some View {
        SyncSidebar(
            selectedDestination: $selectedDestination,
            syncService: syncService
        )
    }

    private var contentColumn: some View {
        destinationView
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(ChewbuuTheme.background)
            .navigationSplitViewColumnWidth(min: 560, ideal: 920, max: 1300)
    }

    @ViewBuilder
    private var destinationView: some View {
        switch selectedDestination {
        case .overview:
            OverviewView(
                syncService: syncService,
                onNavigate: { destination in selectedDestination = destination },
                onInspect: { selection in inspect(selection) },
                onNewOrder: { showingOrderComposer = true }
            )
        case .tables:
            FloorMapView(syncService: syncService, selectedTableId: $selectedTableId) { selection in
                inspect(selection)
            }
        case .reservations:
            ReservationsView(syncService: syncService) { selection in
                inspect(selection)
            }
        case .orders:
            OrdersView(syncService: syncService, selectedTableId: $selectedTableId) { selection in
                inspect(selection)
            }
        case .kitchen:
            KitchenKDSView(syncService: syncService) { selection in
                inspect(selection)
            }
        case .team:
            StaffRosterView(syncService: syncService) { selection in
                inspect(selection)
            }
        case .schedules:
            ScheduleAttendanceView(syncService: syncService) { selection in
                inspect(selection)
            }
        case .chat:
            SyncChatView()
        case .menu:
            MenuManagementView(syncService: syncService) { selection in
                inspect(selection)
            }
        case .specials:
            SpecialsView(syncService: syncService)
        case .hiring:
            HiringView(syncService: syncService) { selection in
                inspect(selection)
            }
        case .analytics:
            AnalyticsView(syncService: syncService)
        case .business:
            BusinessSettingsView(syncService: syncService)
        case .customers:
            CustomersView(
                syncService: syncService,
                onInspect: { selection in inspect(selection) },
                onOpenOrder: openOrder
            )
        case .kiosk:
            KioskClockInView(syncService: syncService)
        }
    }

    private func inspect(_ selection: SyncInspectorSelection) {
        switch selection {
        case .table(let tableId):
            selectedTableId = tableId
        default:
            break
        }

        withAnimation(.easeInOut(duration: 0.18)) {
            if inspectorSelection == selection {
                inspectorSelection = nil
                if case .table = selection {
                    selectedTableId = nil
                }
            } else {
                inspectorSelection = selection
            }
        }
    }

    private func closeInspector() {
        withAnimation(.easeInOut(duration: 0.18)) {
            inspectorSelection = nil
        }
    }

    private func openOrder(tableId: String) {
        selectedTableId = tableId
        selectedDestination = .orders
        inspectorSelection = .table(tableId)
    }
}

struct SyncSidebar: View {
    @Binding var selectedDestination: SyncDestination
    @ObservedObject var syncService: SyncService

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(ChewbuuTheme.burgundy)
                        .frame(width: 38, height: 38)
                    Image(systemName: "fork.knife")
                        .font(.headline)
                        .foregroundStyle(ChewbuuTheme.yellow)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text("CHEWBUU SYNC")
                        .font(.caption.weight(.heavy))
                        .tracking(1.1)
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text("Venue operations")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)

            Divider().overlay(ChewbuuTheme.divider)

            List(selection: $selectedDestination) {
                SyncNavSection(title: "Operations", destinations: [.overview, .tables, .reservations, .orders, .kitchen], syncService: syncService)
                SyncNavSection(title: "People", destinations: [.team, .schedules, .chat], syncService: syncService)
                SyncNavSection(title: "Business", destinations: [.menu, .specials, .hiring, .analytics, .business, .customers], syncService: syncService)
                SyncNavSection(title: "Terminal", destinations: [.kiosk], syncService: syncService)
            }
            .listStyle(.sidebar)
            .scrollContentBackground(.hidden)

            Divider().overlay(ChewbuuTheme.divider)

            VStack(alignment: .leading, spacing: 9) {
                HStack(spacing: 7) {
                    Circle()
                        .fill(syncService.isConnected ? ChewbuuTheme.success : ChewbuuTheme.warning)
                        .frame(width: 8, height: 8)
                    Text(syncService.isConnected ? "Live with Sync" : "Offline demo mode")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                }
                Text(syncService.locationName)
                    .font(.caption2)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    Button("Refresh") {
                        Task { await syncService.fetchLiveBoard() }
                    }
                    .font(.caption2.bold())
                    .foregroundStyle(ChewbuuTheme.burgundy)
                    Spacer()
                    Menu {
                        Button("Reset demo service data", role: .destructive) {
                            syncService.loadInitialData()
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundStyle(ChewbuuTheme.burgundy)
                    }
                    .menuStyle(.borderlessButton)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(ChewbuuTheme.surface)
        }
        .background(ChewbuuTheme.background)
        .navigationSplitViewColumnWidth(min: 220, ideal: 245, max: 275)
    }
}

struct SyncNavSection: View {
    let title: String
    let destinations: [SyncDestination]
    @ObservedObject var syncService: SyncService

    var body: some View {
        Section {
            ForEach(destinations) { destination in
                NavigationLink(value: destination) {
                    HStack(spacing: 9) {
                        Label(destination.title, systemImage: destination.icon)
                            .font(.subheadline.weight(.semibold))
                        Spacer(minLength: 4)
                        if let badge = badge(for: destination), badge > 0 {
                            Text("\(badge)")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(ChewbuuTheme.warmWhite)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(ChewbuuTheme.burgundy, in: Capsule())
                        }
                    }
                }
            }
        } header: {
            Text(title.uppercased())
                .font(.caption2.weight(.heavy))
                .tracking(1.1)
                .foregroundStyle(ChewbuuTheme.secondaryText)
        }
    }

    private func badge(for destination: SyncDestination) -> Int? {
        switch destination {
        case .tables:
            return syncService.activeTableCount
        case .reservations:
            return syncService.reservationRequests.filter { $0.status != .resolved }.count
        case .orders:
            return syncService.openCheckCount
        case .kitchen:
            return syncService.activeOrderCount
        case .customers:
            return syncService.customers.count
        default:
            return nil
        }
    }
}
