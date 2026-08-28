import SwiftUI

public struct KioskClockInView: View {
    @ObservedObject var syncService: SyncService
    @State private var selectedStaffId: String?
    @State private var pinCode: String = ""
    @State private var toastMessage: String?
    @State private var showSuccess = false

    public var body: some View {
        HStack(spacing: 0) {
            // Left Column: Staff Roster
            VStack(alignment: .leading, spacing: 16) {
                Text("Select Your Name")
                    .font(.title2.bold())
                Text("Tap your profile, then enter today's 3-digit attendance code.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(syncService.staffList) { staff in
                            StaffKioskRow(
                                staff: staff,
                                isSelected: selectedStaffId == staff.id
                            )
                            .onTapGesture {
                                selectedStaffId = staff.id
                                pinCode = ""
                            }
                        }
                    }
                }
            }
            .padding(24)
            .frame(maxWidth: 380)
            .background(Color.secondary.opacity(0.04))

            Divider()

            // Right Column: Keypad
            VStack(spacing: 24) {
                Spacer()

                if let staffId = selectedStaffId,
                   let staff = syncService.staffList.first(where: { $0.id == staffId }) {
                    VStack(spacing: 8) {
                        Text(staff.name)
                            .font(.title.bold())
                        Text("\(staff.role) • Current: \(staff.status.rawValue)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    VStack(spacing: 8) {
                        Text("Terminal Attendance Kiosk")
                            .font(.title.bold())
                        Text("Select a staff member from the left to begin")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // 3-Digit Pin Indicator
                HStack(spacing: 20) {
                    PinCircle(filled: pinCode.count >= 1, digit: digitAt(0))
                    PinCircle(filled: pinCode.count >= 2, digit: digitAt(1))
                    PinCircle(filled: pinCode.count >= 3, digit: digitAt(2))
                }
                .padding(.vertical, 8)

                // Keypad 3x4 Grid
                VStack(spacing: 14) {
                    HStack(spacing: 14) {
                        KeypadButton(num: "1") { appendPin("1") }
                        KeypadButton(num: "2") { appendPin("2") }
                        KeypadButton(num: "3") { appendPin("3") }
                    }
                    HStack(spacing: 14) {
                        KeypadButton(num: "4") { appendPin("4") }
                        KeypadButton(num: "5") { appendPin("5") }
                        KeypadButton(num: "6") { appendPin("6") }
                    }
                    HStack(spacing: 14) {
                        KeypadButton(num: "7") { appendPin("7") }
                        KeypadButton(num: "8") { appendPin("8") }
                        KeypadButton(num: "9") { appendPin("9") }
                    }
                    HStack(spacing: 14) {
                        KeypadButton(num: "C", isAction: true) { pinCode = "" }
                        KeypadButton(num: "0") { appendPin("0") }
                        KeypadButton(num: "⌫", isAction: true) {
                            if !pinCode.isEmpty { pinCode.removeLast() }
                        }
                    }
                }

                // Action Buttons
                HStack(spacing: 12) {
                    ActionButton(title: "Clock In", icon: "arrow.right.circle.fill", color: .green) {
                        handleAttendance(action: "clock_in")
                    }
                    ActionButton(title: "Break", icon: "cup.and.saucer.fill", color: .yellow) {
                        handleAttendance(action: "break")
                    }
                    ActionButton(title: "Lunch", icon: "fork.knife", color: .orange) {
                        handleAttendance(action: "lunch")
                    }
                    ActionButton(title: "Clock Out", icon: "arrow.left.circle.fill", color: .red) {
                        handleAttendance(action: "clock_out")
                    }
                }
                .disabled(selectedStaffId == nil || pinCode.count < 3)
                .opacity(selectedStaffId != nil && pinCode.count >= 3 ? 1.0 : 0.45)

                if let toast = toastMessage {
                    Text(toast)
                        .font(.headline)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(showSuccess ? Color.green : Color.red)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                Spacer()
            }
            .padding(32)
        }
    }

    private func digitAt(_ index: Int) -> String? {
        guard index < pinCode.count else { return nil }
        let idx = pinCode.index(pinCode.startIndex, offsetBy: index)
        return String(pinCode[idx])
    }

    private func appendPin(_ digit: String) {
        if pinCode.count < 3 {
            pinCode.append(digit)
        }
    }

    private func handleAttendance(action: String) {
        guard let staffId = selectedStaffId,
              let idx = syncService.staffList.firstIndex(where: { $0.id == staffId }) else { return }

        if pinCode != syncService.dailyAttendanceCode {
            toastMessage = "Invalid Daily Code (Hint: \(syncService.dailyAttendanceCode))"
            showSuccess = false
            return
        }

        switch action {
        case "clock_in":
            syncService.staffList[idx].status = .onFloor
            syncService.staffList[idx].clockInTime = "Just now"
            toastMessage = "Welcome, \(syncService.staffList[idx].name)! Clocked in."
        case "break":
            syncService.staffList[idx].status = .onBreak
            toastMessage = "\(syncService.staffList[idx].name) is now on break."
        case "lunch":
            syncService.staffList[idx].status = .onBreak
            toastMessage = "\(syncService.staffList[idx].name) is now on lunch."
        case "clock_out":
            syncService.staffList[idx].status = .scheduled
            syncService.staffList[idx].clockInTime = nil
            toastMessage = "Goodbye, \(syncService.staffList[idx].name)! Clocked out."
        default:
            break
        }

        showSuccess = true
        pinCode = ""
    }
}

struct StaffKioskRow: View {
    let staff: MockStaffMember
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(staff.status.color.opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay(
                    Text(String(staff.name.prefix(1)))
                        .font(.headline.bold())
                        .foregroundStyle(staff.status.color)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(staff.name)
                    .font(.headline)
                Text("\(staff.role) • \(staff.status.rawValue)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.accentColor)
                    .font(.title3)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.secondary.opacity(isSelected ? 0.2 : 0.08))
        )
    }
}

struct PinCircle: View {
    let filled: Bool
    let digit: String?

    var body: some View {
        ZStack {
            Circle()
                .stroke(filled ? Color.accentColor : Color.secondary.opacity(0.3), lineWidth: 2)
                .frame(width: 54, height: 54)

            if filled {
                Circle()
                    .fill(Color.accentColor.opacity(0.2))
                    .frame(width: 48, height: 48)
                if let d = digit {
                    Text(d)
                        .font(.title2.bold())
                        .foregroundStyle(Color.accentColor)
                }
            }
        }
    }
}

struct KeypadButton: View {
    let num: String
    var isAction: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.secondary.opacity(isAction ? 0.18 : 0.09))
                    .frame(width: 76, height: 60)
                Text(num)
                    .font(.title2.bold())
                    .foregroundStyle(.primary)
            }
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
            HStack(spacing: 6) {
                Image(systemName: icon)
                Text(title)
                    .bold()
            }
            .font(.subheadline)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(color)
            .foregroundStyle(.white)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}
