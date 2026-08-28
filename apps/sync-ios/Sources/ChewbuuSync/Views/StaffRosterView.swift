import SwiftUI

public struct StaffRosterView: View {
    @ObservedObject var syncService: SyncService

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    SyncSectionHeader(eyebrow: "People", title: "Team", subtitle: "Know who is here, what they own, and where they need help.")
                    Spacer()
                    Button {
                        syncService.lastActionMessage = "Invite staff flow opened."
                    } label: {
                        Label("Invite staff", systemImage: "person.badge.plus")
                    }
                    .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.blue))
                }

                HStack(spacing: 12) {
                    RosterStat(title: "On floor", count: syncService.staffList.filter { $0.status == .onFloor }.count, color: ChewbuuTheme.mint)
                    RosterStat(title: "On break", count: syncService.staffList.filter { $0.status == .onBreak }.count, color: ChewbuuTheme.amber)
                    RosterStat(title: "Scheduled", count: syncService.staffList.filter { $0.status == .scheduled }.count, color: ChewbuuTheme.secondaryText)
                    RosterStat(title: "Late", count: syncService.staffList.filter { $0.status == .late }.count, color: ChewbuuTheme.coral)
                }

                HStack(spacing: 8) {
                    Image(systemName: "key.fill").foregroundStyle(ChewbuuTheme.amber)
                    Text("Today’s attendance code")
                        .font(.subheadline.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                    Text(syncService.dailyAttendanceCode)
                        .font(.title3.bold())
                        .foregroundStyle(ChewbuuTheme.amber)
                    Spacer()
                    Text("Share at the venue — no continuous tracking")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .padding(14)
                .syncCard(accent: ChewbuuTheme.amber)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 480), spacing: 12)], spacing: 12) {
                    ForEach(syncService.staffList) { member in
                        StaffMemberCard(member: member)
                    }
                }
            }
            .padding(22)
        }
        .background(ChewbuuTheme.background)
    }
}

struct RosterStat: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(count)").font(.system(size: 25, weight: .bold, design: .rounded)).foregroundStyle(color)
            Text(title).font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .syncCard(accent: color)
    }
}

struct StaffMemberCard: View {
    let member: MockStaffMember

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(member.status.color.opacity(0.2))
                .frame(width: 48, height: 48)
                .overlay(Text(String(member.name.prefix(1))).font(.headline.bold()).foregroundStyle(member.status.color))
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(member.name).font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                    if member.role.contains("Lead") { Image(systemName: "star.fill").font(.caption2).foregroundStyle(ChewbuuTheme.amber) }
                }
                Text("\(member.role)  ·  \(member.section ?? "Floor")").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                if let clockInTime = member.clockInTime { Text("Clocked in \(clockInTime)").font(.caption2).foregroundStyle(ChewbuuTheme.secondaryText) }
            }
            Spacer()
            SyncStatusPill(title: member.status.rawValue, color: member.status.color)
        }
        .padding(14)
        .syncCard(accent: member.status.color)
    }
}
