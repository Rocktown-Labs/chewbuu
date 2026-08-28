import SwiftUI

public struct StaffRosterView: View {
    @ObservedObject var syncService: SyncService
    let onInspect: (SyncInspectorSelection) -> Void

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    SyncSectionHeader(eyebrow: "People", title: "Team", subtitle: "Tap a person to open their details in the inspector.")
                    Spacer()
                    Button {
                        syncService.lastActionMessage = "Invite staff flow opened."
                    } label: {
                        Label("Invite staff", systemImage: "person.badge.plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                }

                HStack(spacing: 8) {
                    RosterStat(title: "On floor", count: syncService.staffList.filter { $0.status == .onFloor }.count, color: ChewbuuTheme.success)
                    RosterStat(title: "On break", count: syncService.staffList.filter { $0.status == .onBreak }.count, color: ChewbuuTheme.gold)
                    RosterStat(title: "Scheduled", count: syncService.staffList.filter { $0.status == .scheduled }.count, color: ChewbuuTheme.secondaryText)
                    RosterStat(title: "Late", count: syncService.staffList.filter { $0.status == .late }.count, color: ChewbuuTheme.coral)
                }

                HStack(spacing: 8) {
                    Image(systemName: "key.fill").foregroundStyle(ChewbuuTheme.burgundy)
                    Text("Today’s attendance code")
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text(syncService.dailyAttendanceCode)
                        .font(.title3.bold())
                        .foregroundStyle(ChewbuuTheme.burgundy)
                    Spacer()
                    Text("Share at the venue · no continuous tracking")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .padding(13)
                .syncCard(accent: ChewbuuTheme.gold)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 480), spacing: 10)], spacing: 10) {
                    ForEach(syncService.staffList) { member in
                        Button {
                            onInspect(.staff(member.id))
                        } label: {
                            StaffMemberCard(member: member)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(24)
        }
        .background(ChewbuuTheme.background)
    }
}

struct RosterStat: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        HStack(spacing: 7) {
            Text("\(count)").font(.system(size: 24, weight: .bold, design: .rounded)).foregroundStyle(color)
            Text(title).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
            Spacer()
        }
        .padding(13)
        .syncCard(accent: color)
    }
}

struct StaffMemberCard: View {
    let member: MockStaffMember

    var body: some View {
        HStack(spacing: 11) {
            Circle()
                .fill(member.status.color.opacity(0.14))
                .frame(width: 44, height: 44)
                .overlay(Text(String(member.name.prefix(1))).font(.headline.bold()).foregroundStyle(member.status.color))
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(member.name).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    if member.role.contains("Lead") { Image(systemName: "star.fill").font(.caption2).foregroundStyle(ChewbuuTheme.gold) }
                }
                Text("\(member.role) · \(member.section ?? "Floor")").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                if let clockInTime = member.clockInTime {
                    Text("Clocked in \(clockInTime)").font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText)
                }
            }
            Spacer()
            SyncStatusPill(title: member.status.rawValue, color: member.status.color)
        }
        .padding(13)
        .syncCard(accent: member.status.color)
    }
}
