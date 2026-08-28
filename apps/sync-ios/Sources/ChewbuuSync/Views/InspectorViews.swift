import SwiftUI

struct InspectorHeader: View {
    let eyebrow: String
    let title: String
    let subtitle: String?
    let status: String?
    let statusColor: Color?
    let onClose: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(eyebrow.uppercased())
                    .font(.caption2.weight(.heavy))
                    .tracking(1.1)
                    .foregroundStyle(ChewbuuTheme.burgundy)
                Text(title)
                    .font(.system(size: 25, weight: .bold, design: .rounded))
                    .foregroundStyle(ChewbuuTheme.primaryText)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 8) {
                Button(action: onClose) {
                    Image(systemName: "xmark")
                        .font(.caption.bold())
                        .foregroundStyle(ChewbuuTheme.primaryText)
                        .frame(width: 28, height: 28)
                        .background(ChewbuuTheme.surfaceMuted, in: Circle())
                }
                .buttonStyle(.plain)
                if let status, let statusColor {
                    SyncStatusPill(title: status, color: statusColor)
                }
            }
        }
        .padding(16)
        .background(ChewbuuTheme.surface)
    }
}

struct SyncInspectorView: View {
    @ObservedObject var syncService: SyncService
    let selection: SyncInspectorSelection
    let onClose: () -> Void
    let onOpenOrder: (String) -> Void

    var body: some View {
        switch selection {
        case .table:
            TableDetailView(syncService: syncService, tableId: tableId, onClose: onClose)
        case .request(let requestId):
            RequestInspectorView(syncService: syncService, requestId: requestId, onClose: onClose)
        case .customer(let customerId):
            CustomerInspectorView(syncService: syncService, customerId: customerId, onClose: onClose, onOpenOrder: onOpenOrder)
        case .menuItem(let itemId):
            MenuItemInspectorView(syncService: syncService, itemId: itemId, onClose: onClose)
        case .staff(let staffId):
            StaffInspectorView(syncService: syncService, staffId: staffId, onClose: onClose)
        case .job(let jobId):
            JobInspectorView(syncService: syncService, jobId: jobId, onClose: onClose)
        }
    }

    private var tableId: String? {
        if case .table(let tableId) = selection { return tableId }
        return nil
    }
}

struct RequestInspectorView: View {
    @ObservedObject var syncService: SyncService
    let requestId: String
    let onClose: () -> Void

    private var request: MockTableRequest? { syncService.tableRequests.first(where: { $0.id == requestId }) }

    var body: some View {
        if let request {
            VStack(alignment: .leading, spacing: 0) {
                InspectorHeader(
                    eyebrow: request.kind.rawValue,
                    title: request.guestNames ?? request.title,
                    subtitle: request.scheduledTime == nil ? "Table \(request.tableId)" : "Table request · \(request.scheduledTime ?? "")",
                    status: request.status.rawValue,
                    statusColor: request.status.color,
                    onClose: onClose
                )
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        InspectorValue(title: "Request", value: request.detail, icon: "text.bubble")
                        if !request.preorderedItems.isEmpty {
                            InspectorValue(title: "Pre-ordered", value: request.preorderedItems.joined(separator: ", "), icon: "bag")
                        }
                        if let customer = syncService.customer(for: request.customerId) {
                            InspectorValue(title: "Guest record", value: "\(customer.name) · \(customer.phone)", icon: "person.crop.circle")
                        }
                        HStack(spacing: 8) {
                            if request.status == .new {
                                Button("Open request") {
                                    syncService.acceptTableRequest(request.id)
                                }
                                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                            }
                            if request.status != .resolved {
                                Button("Resolve") {
                                    syncService.resolveTableRequest(request.id)
                                }
                                .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.burgundy))
                            }
                        }
                    }
                    .padding(16)
                }
            }
        } else {
            EmptyInspector(onClose: onClose)
        }
    }
}

struct CustomerInspectorView: View {
    @ObservedObject var syncService: SyncService
    let customerId: String
    let onClose: () -> Void
    let onOpenOrder: (String) -> Void

    private var customer: MockCustomer? { syncService.customer(for: customerId) }
    private var currentTable: MockTable? { syncService.tables.first(where: { $0.customerId == customerId }) }

    var body: some View {
        if let customer {
            VStack(alignment: .leading, spacing: 0) {
                InspectorHeader(eyebrow: customer.sourceLabel, title: customer.name, subtitle: "Customer profile", status: nil, statusColor: nil, onClose: onClose)
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 10) {
                            Circle()
                                .fill(ChewbuuTheme.burgundy.opacity(0.12))
                                .frame(width: 54, height: 54)
                                .overlay(Text(String(customer.name.prefix(1))).font(.title3.bold()).foregroundStyle(ChewbuuTheme.burgundy))
                            VStack(alignment: .leading, spacing: 3) {
                                Text(customer.isChewbuuMember ? "Chewbuu member" : "Venue guest")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(ChewbuuTheme.burgundy)
                                Text("\(customer.visitCount) visits · \(customer.lastVisit)")
                                    .font(.caption)
                                    .foregroundStyle(ChewbuuTheme.secondaryText)
                            }
                        }
                        .padding(13)
                        .syncCard(accent: ChewbuuTheme.burgundy)

                        InspectorValue(title: "Phone", value: customer.phone.isEmpty ? "Not provided" : customer.phone, icon: "phone")
                        InspectorValue(title: "Party size", value: "Usually \(customer.partySize)", icon: "person.2")
                        InspectorValue(title: "Favorite", value: customer.favoriteOrder, icon: "heart")

                        if let currentTable {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Dining now")
                                    .font(.caption.weight(.heavy))
                                    .tracking(0.9)
                                    .foregroundStyle(ChewbuuTheme.burgundy)
                                HStack {
                                    Text("Table \(currentTable.label)")
                                        .font(.headline.bold())
                                        .foregroundStyle(ChewbuuTheme.primaryText)
                                    Spacer()
                                    Text(String(format: "$%.2f", Double(currentTable.billTotalCents) / 100))
                                        .font(.headline.bold())
                                        .foregroundStyle(ChewbuuTheme.primaryText)
                                }
                                Button("Open order") {
                                    onOpenOrder(currentTable.id)
                                }
                                .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                            }
                            .padding(13)
                            .syncCard(accent: ChewbuuTheme.burgundy)
                        }
                    }
                    .padding(16)
                }
            }
        } else {
            EmptyInspector(onClose: onClose)
        }
    }
}

struct MenuItemInspectorView: View {
    @ObservedObject var syncService: SyncService
    let itemId: String
    let onClose: () -> Void
    @State private var name: String
    @State private var price: String
    @State private var description: String
    @State private var dealName: String
    @State private var availabilityNote: String
    @State private var comboItems: Set<String>
    @State private var substitutions: Set<String>
    @State private var photoName: String?

    init(syncService: SyncService, itemId: String, onClose: @escaping () -> Void) {
        self.syncService = syncService
        self.itemId = itemId
        self.onClose = onClose
        let item = syncService.menuCatalog.first(where: { $0.id == itemId })
        _name = State(initialValue: item?.name ?? "")
        _price = State(initialValue: item.map { String(format: "%.2f", Double($0.priceCents) / 100) } ?? "")
        _description = State(initialValue: item?.description ?? "")
        _dealName = State(initialValue: item?.dealName ?? "")
        _availabilityNote = State(initialValue: item?.availabilityNote ?? "")
        _comboItems = State(initialValue: Set(item?.comboItems ?? []))
        _substitutions = State(initialValue: Set(item?.substitutions ?? []))
        _photoName = State(initialValue: item?.photoName)
    }

    private var item: CatalogItem? { syncService.menuCatalog.first(where: { $0.id == itemId }) }
    private var otherItemNames: [String] { syncService.menuCatalog.filter { $0.id != itemId }.map(\.name).sorted() }
    private var priceCents: Int { Int((Double(price) ?? 0) * 100) }

    var body: some View {
        if let item {
            VStack(alignment: .leading, spacing: 0) {
                InspectorHeader(eyebrow: item.category, title: item.name, subtitle: "Menu item", status: item.isAvailable ? "Available" : "Unavailable", statusColor: item.isAvailable ? ChewbuuTheme.success : ChewbuuTheme.coral, onClose: onClose)
                ScrollView {
                    VStack(alignment: .leading, spacing: 13) {
                        Toggle("Available for ordering", isOn: Binding(
                            get: { item.isAvailable },
                            set: { _ in syncService.toggleMenuAvailability(itemId: item.id) }
                        ))
                        .tint(ChewbuuTheme.burgundy)

                        InspectorEditorField(title: "Name", text: $name)
                        InspectorEditorField(title: "Price", text: $price)
                        InspectorEditorField(title: "Description", text: $description)
                        InspectorEditorField(title: "Deal or menu label", text: $dealName)
                        InspectorEditorField(title: "Availability note", text: $availabilityNote)

                        InspectorChoiceGroup(title: "Combo includes", choices: otherItemNames, selected: $comboItems)
                        InspectorChoiceGroup(title: "Substitute with", choices: otherItemNames, selected: $substitutions)

                        Button {
                            photoName = photoName == nil ? "menu-photo" : nil
                        } label: {
                            Label(photoName == nil ? "Add item photo" : "Remove item photo", systemImage: photoName == nil ? "photo" : "checkmark.circle")
                        }
                        .buttonStyle(SyncOutlineButtonStyle(color: ChewbuuTheme.burgundy))

                        Button("Save changes") {
                            syncService.updateMenuItem(
                                itemId: item.id,
                                name: name,
                                priceCents: priceCents,
                                description: description,
                                dealName: dealName,
                                comboItems: Array(comboItems).sorted(),
                                substitutions: Array(substitutions).sorted(),
                                availabilityNote: availabilityNote,
                                photoName: photoName
                            )
                        }
                        .buttonStyle(SyncFilledButtonStyle(color: ChewbuuTheme.burgundy))
                    }
                    .padding(16)
                }
            }
        } else {
            EmptyInspector(onClose: onClose)
        }
    }
}

struct InspectorChoiceGroup: View {
    let title: String
    let choices: [String]
    @Binding var selected: Set<String>

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(title)
                .font(.caption.weight(.heavy))
                .tracking(0.8)
                .foregroundStyle(ChewbuuTheme.secondaryText)
            FlowLayout(spacing: 6) {
                ForEach(choices, id: \.self) { choice in
                    Button(choice) {
                        if selected.contains(choice) { selected.remove(choice) } else { selected.insert(choice) }
                    }
                    .buttonStyle(SyncChipButtonStyle(isSelected: selected.contains(choice), color: ChewbuuTheme.burgundy))
                }
            }
        }
    }
}

struct InspectorEditorField: View {
    let title: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.caption.weight(.heavy))
                .foregroundStyle(ChewbuuTheme.secondaryText)
            TextField(title, text: $text, axis: .vertical)
                .textFieldStyle(.roundedBorder)
        }
    }
}

struct JobInspectorView: View {
    @ObservedObject var syncService: SyncService
    let jobId: String
    let onClose: () -> Void
    @State private var selectedApplicantId: String?

    private var job: MockJobListing? { syncService.jobListings.first(where: { $0.id == jobId }) }
    private var selectedApplicant: MockApplicant? { job?.applicantList.first(where: { $0.id == selectedApplicantId }) }

    var body: some View {
        if let job {
            VStack(alignment: .leading, spacing: 0) {
                InspectorHeader(eyebrow: "Hiring", title: job.title, subtitle: "\(job.location) · \(job.schedule)", status: job.isPublished ? "Published" : "Draft", statusColor: job.isPublished ? ChewbuuTheme.success : ChewbuuTheme.secondaryText, onClose: onClose)
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Applicants").font(.headline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                            Spacer()
                            Text("\(job.applicantList.count)").font(.title3.bold()).foregroundStyle(ChewbuuTheme.yellow)
                        }
                        if job.applicantList.isEmpty {
                            EmptyPanel(title: "No applicants yet", detail: "Applications will appear here.", icon: "person", color: ChewbuuTheme.secondaryText)
                        } else {
                            ForEach(job.applicantList) { applicant in
                                Button {
                                    selectedApplicantId = selectedApplicantId == applicant.id ? nil : applicant.id
                                } label: {
                                    HStack(spacing: 9) {
                                        Circle()
                                            .fill(ChewbuuTheme.yellow.opacity(0.16))
                                            .frame(width: 34, height: 34)
                                            .overlay(Text(String(applicant.name.prefix(1))).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.yellow))
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(applicant.name).font(.subheadline.bold()).foregroundStyle(ChewbuuTheme.primaryText)
                                            Text("\(applicant.status) · \(applicant.availability)").font(.caption).foregroundStyle(ChewbuuTheme.secondaryText)
                                        }
                                        Spacer()
                                        Image(systemName: selectedApplicantId == applicant.id ? "chevron.up" : "chevron.down")
                                            .font(.caption.bold())
                                            .foregroundStyle(ChewbuuTheme.secondaryText)
                                    }
                                    .padding(10)
                                    .syncCard(isSelected: selectedApplicantId == applicant.id, accent: ChewbuuTheme.yellow)
                                }
                                .buttonStyle(.plain)
                                if let selectedApplicant, selectedApplicant.id == applicant.id {
                                    VStack(alignment: .leading, spacing: 8) {
                                        InspectorValue(title: "Contact", value: "\(selectedApplicant.phone) · \(selectedApplicant.email)", icon: "phone")
                                        InspectorValue(title: "Experience", value: selectedApplicant.experience, icon: "briefcase")
                                        InspectorValue(title: "Application note", value: selectedApplicant.note, icon: "text.bubble")
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                }
            }
        } else {
            EmptyInspector(onClose: onClose)
        }
    }
}

struct StaffInspectorView: View {
    @ObservedObject var syncService: SyncService
    let staffId: String
    let onClose: () -> Void

    private var member: MockStaffMember? { syncService.staffList.first(where: { $0.id == staffId }) }

    var body: some View {
        if let member {
            VStack(alignment: .leading, spacing: 0) {
                InspectorHeader(eyebrow: "Team", title: member.name, subtitle: member.role, status: member.status.rawValue, statusColor: member.status.color, onClose: onClose)
                VStack(alignment: .leading, spacing: 12) {
                    InspectorValue(title: "Section", value: member.section ?? "Floor", icon: "mappin")
                    InspectorValue(title: "Shift", value: member.clockInTime == nil ? "Scheduled · not clocked in" : "Clocked in \(member.clockInTime ?? "")", icon: "clock")
                    Text("Tap the status controls in Schedules & Attendance to update the shift.")
                        .font(.caption)
                        .foregroundStyle(ChewbuuTheme.secondaryText)
                }
                .padding(16)
                Spacer()
            }
        } else {
            EmptyInspector(onClose: onClose)
        }
    }
}

struct InspectorValue: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        HStack(alignment: .top, spacing: 9) {
            Image(systemName: icon)
                .foregroundStyle(ChewbuuTheme.burgundy)
                .frame(width: 18)
            VStack(alignment: .leading, spacing: 3) {
                Text(title.uppercased())
                    .font(.caption2.weight(.heavy))
                    .tracking(0.8)
                    .foregroundStyle(ChewbuuTheme.secondaryText)
                Text(value)
                    .font(.subheadline.bold())
                    .foregroundStyle(ChewbuuTheme.primaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
        .padding(12)
        .syncCard()
    }
}

struct EmptyInspector: View {
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            InspectorHeader(eyebrow: "Inspector", title: "Nothing selected", subtitle: "Tap an item to see its details here.", status: nil, statusColor: nil, onClose: onClose)
            Spacer()
            Image(systemName: "sidebar.right")
                .font(.system(size: 32))
                .foregroundStyle(ChewbuuTheme.secondaryText)
            Text("Select an item to inspect it.")
                .font(.subheadline)
                .foregroundStyle(ChewbuuTheme.secondaryText)
                .padding(.top, 8)
            Spacer()
        }
    }
}
