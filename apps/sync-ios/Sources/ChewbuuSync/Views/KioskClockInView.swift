import SwiftUI

public struct KioskClockInView: View {
    @ObservedObject var syncService: SyncService
    @State private var selectedStaffId: String?
    @State private var pinCode = ""
    @State private var toastMessage: String?
    @State private var showSuccess = false

    public var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 14) {
                SyncSectionHeader(eyebrow: "Terminal", title: "Clock in", subtitle: "Tap your name, then enter today’s code.")
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(syncService.staffList) { staff in
                            Button {
                                selectedStaffId = staff.id
                                pinCode = ""
                            } label: {
                                StaffKioskRow(staff: staff, isSelected: selectedStaffId == staff.id)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(22)
            .frame(maxWidth: 390)
            .background(ChewbuuTheme.surface)

            Divider().overlay(ChewbuuTheme.divider)

            VStack(spacing: 18) {
                Spacer()
                if let staffId = selectedStaffId,
                   let staff = syncService.staffList.first(where: { $0.id == staffId }) {
                    VStack(spacing: 5) {
                        Text(staff.name)
                            .font(.title.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        Text("\(staff.role) · \(staff.status.rawValue)")
                            .font(.subheadline)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                } else {
                    VStack(spacing: 5) {
                        Text("Terminal attendance")
                            .font(.title.bold())
                            .foregroundStyle(ChewbuuTheme.primaryText)
                        Text("Select a team member to begin.")
                            .font(.subheadline)
                            .foregroundStyle(ChewbuuTheme.secondaryText)
                    }
                }

                HStack(spacing: 15) {
                    PinCircle(filled: pinCode.count >= 1, digit: digitAt(0))
                    PinCircle(filled: pinCode.count >= 2, digit: digitAt(1))
                    PinCircle(filled: pinCode.count >= 3, digit: digitAt(2))
                }

                VStack(spacing: 10) {
                    ForEach([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["C", "0", "⌫"]], id: \.self) { row in
                        HStack(spacing: 10) {
                            ForEach(row, id: \.self) { number in
                                KeypadButton(num: number, isAction: number == "C" || number == "⌫") {
                                    if number == "C" {
                                        pinCode = ""
                                    } else if number == "⌫" {
                                        if !pinCode.isEmpty { pinCode.removeLast() }
                                    } else {
                                        appendPin(number)
                                    }
                                }
                            }
                        }
                    }
                }

                HStack(spacing: 8) {
                    ActionButton(title: "Clock In", icon: "arrow.right.circle", color: ChewbuuTheme.burgundy) { handleAttendance(action: "clock_in") }
                    ActionButton(title: "Break", icon: "cup.and.saucer", color: ChewbuuTheme.gold) { handleAttendance(action: "break") }
                    ActionButton(title: "Clock Out", icon: "arrow.left.circle", color: ChewbuuTheme.warning) { handleAttendance(action: "clock_out") }
                }
                .disabled(selectedStaffId == nil || pinCode.count < 3)
                .opacity(selectedStaffId != nil && pinCode.count >= 3 ? 1 : 0.45)

                if let toastMessage {
                    Text(toastMessage)
                        .font(.subheadline.bold())
                        .foregroundStyle(showSuccess ? ChewbuuTheme.success : ChewbuuTheme.coral)
                }
                Spacer()
            }
            .padding(28)
            .frame(maxWidth: .infinity)
            .background(ChewbuuTheme.background)
        }
    }

    private func digitAt(_ index: Int) -> String? {
        guard index < pinCode.count else { return nil }
        let stringIndex = pinCode.index(pinCode.startIndex, offsetBy: index)
        return String(pinCode[stringIndex])
    }

    private func appendPin(_ digit: String) {
        if pinCode.count < 3 { pinCode.append(digit) }
    }

    private func handleAttendance(action: String) {
        guard let staffId = selectedStaffId,
              let index = syncService.staffList.firstIndex(where: { $0.id == staffId }) else { return }
        guard pinCode == syncService.dailyAttendanceCode else {
            toastMessage = "That code does not match today’s venue code."
            showSuccess = false
            return
        }

        switch action {
        case "clock_in":
            syncService.staffList[index].status = .onFloor
            syncService.staffList[index].clockInTime = "Just now"
            toastMessage = "Welcome, \(syncService.staffList[index].name)."
        case "break":
            syncService.staffList[index].status = .onBreak
            toastMessage = "Break started."
        case "clock_out":
            syncService.staffList[index].status = .scheduled
            syncService.staffList[index].clockInTime = nil
            toastMessage = "Clocked out."
        default:
            return
        }
        showSuccess = true
        pinCode = ""
    }
}

struct StaffKioskRow: View {
    let staff: MockStaffMember
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(staff.status.color.opacity(0.14))
                .frame(width: 40, height: 40)
                .overlay(Text(String(staff.name.prefix(1))).font(.headline.bold()).foregroundStyle(staff.status.color))
            VStack(alignment: .leading, spacing: 2) {
                Text(staff.name).font(.headline).foregroundStyle(ChewbuuTheme.primaryText)
                Text("\(staff.role) · \(staff.status.rawValue)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
            }
            Spacer()
            if isSelected {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(ChewbuuTheme.burgundy)
            }
        }
        .padding(11)
        .syncCard(isSelected: isSelected, accent: ChewbuuTheme.burgundy)
    }
}

struct PinCircle: View {
    let filled: Bool
    let digit: String?

    var body: some View {
        ZStack {
            Circle()
                .stroke(filled ? ChewbuuTheme.burgundy : ChewbuuTheme.divider, lineWidth: 2)
                .frame(width: 50, height: 50)
            if let digit {
                Text(digit)
                    .font(.title2.bold())
                    .foregroundStyle(ChewbuuTheme.burgundy)
            }
        }
    }
}

struct KeypadButton: View {
    let num: String
    var isAction = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(num)
                .font(.title2.bold())
                .foregroundStyle(ChewbuuTheme.primaryText)
                .frame(width: 74, height: 56)
                .background(isAction ? ChewbuuTheme.surfaceMuted : ChewbuuTheme.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct ActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.subheadline.bold())
                .foregroundStyle(ChewbuuTheme.warmWhite)
                .padding(.horizontal, 13)
                .padding(.vertical, 10)
                .background(color, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}
