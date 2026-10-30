import Foundation

/// Triage status for an event in Harvy.
public enum EventStatus: String, Codable, CaseIterable, Sendable {
    case new
    case reviewing
    case saved
    case closed

    public var displayName: String {
        switch self {
        case .new: return "New"
        case .reviewing: return "Reviewing"
        case .saved: return "Saved"
        case .closed: return "Closed"
        }
    }
}

/// Organization-scoped observed event record.
/// Schema mirrors `harvy_v2_events` per `v2/shared/cubes.ts` and `v2/api/worker.ts:189-192`.
public struct HarvyEvent: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let product: String
    public let title: String
    public let summary: String
    public let status: EventStatus
    public let assignedTo: String?
    public let revision: Int
    public let firstSeenAt: Int64
    public let lastSeenAt: Int64
    public let latitude: Double?
    public let longitude: Double?
    public let evidenceCount: Int?

    public init(
        id: String,
        product: String,
        title: String,
        summary: String,
        status: EventStatus,
        assignedTo: String? = nil,
        revision: Int,
        firstSeenAt: Int64,
        lastSeenAt: Int64,
        latitude: Double? = nil,
        longitude: Double? = nil,
        evidenceCount: Int? = nil
    ) {
        self.id = id
        self.product = product
        self.title = title
        self.summary = summary
        self.status = status
        self.assignedTo = assignedTo
        self.revision = revision
        self.firstSeenAt = firstSeenAt
        self.lastSeenAt = lastSeenAt
        self.latitude = latitude
        self.longitude = longitude
        self.evidenceCount = evidenceCount
    }

    enum CodingKeys: String, CodingKey {
        case id
        case product
        case title
        case summary
        case status
        case assignedTo = "assigned_to"
        case revision
        case firstSeenAt = "first_seen_at"
        case lastSeenAt = "last_seen_at"
        case latitude
        case longitude
        case evidenceCount = "evidence_count"
    }

    public var firstSeenDate: Date {
        Date(timeIntervalSince1970: TimeInterval(firstSeenAt) / 1000.0)
    }

    public var lastSeenDate: Date {
        Date(timeIntervalSince1970: TimeInterval(lastSeenAt) / 1000.0)
    }
}

/// Audit activity log entry for an event.
/// Schema mirrors `harvy_v2_event_activity` per `v2/api/worker.ts:156`.
public struct EventActivity: Codable, Sendable, Equatable, Identifiable {
    public var id: String { "\(revision)-\(changedAt)" }
    public let revision: Int
    public let status: EventStatus
    public let assignedTo: String?
    public let changedBy: String
    public let changedAt: Int64

    public init(
        revision: Int,
        status: EventStatus,
        assignedTo: String? = nil,
        changedBy: String,
        changedAt: Int64
    ) {
        self.revision = revision
        self.status = status
        self.assignedTo = assignedTo
        self.changedBy = changedBy
        self.changedAt = changedAt
    }

    enum CodingKeys: String, CodingKey {
        case revision
        case status
        case assignedTo = "assigned_to"
        case changedBy = "changed_by"
        case changedAt = "changed_at"
    }

    public var changedDate: Date {
        Date(timeIntervalSince1970: TimeInterval(changedAt) / 1000.0)
    }
}

/// Full event detail payload returned by GET /api/v1/events/:id.
/// Defined in `v2/api/worker.ts:158` (event fields + attached evidence + activity log).
public struct EventDetail: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let product: String
    public let title: String
    public let summary: String
    public let status: EventStatus
    public let assignedTo: String?
    public let revision: Int
    public let firstSeenAt: Int64
    public let lastSeenAt: Int64
    public let latitude: Double?
    public let longitude: Double?
    public let evidenceCount: Int?
    public let evidence: [Evidence]
    public let activity: [EventActivity]

    public init(
        id: String,
        product: String,
        title: String,
        summary: String,
        status: EventStatus,
        assignedTo: String? = nil,
        revision: Int,
        firstSeenAt: Int64,
        lastSeenAt: Int64,
        latitude: Double? = nil,
        longitude: Double? = nil,
        evidenceCount: Int? = nil,
        evidence: [Evidence] = [],
        activity: [EventActivity] = []
    ) {
        self.id = id
        self.product = product
        self.title = title
        self.summary = summary
        self.status = status
        self.assignedTo = assignedTo
        self.revision = revision
        self.firstSeenAt = firstSeenAt
        self.lastSeenAt = lastSeenAt
        self.latitude = latitude
        self.longitude = longitude
        self.evidenceCount = evidenceCount
        self.evidence = evidence
        self.activity = activity
    }

    enum CodingKeys: String, CodingKey {
        case id
        case product
        case title
        case summary
        case status
        case assignedTo = "assigned_to"
        case revision
        case firstSeenAt = "first_seen_at"
        case lastSeenAt = "last_seen_at"
        case latitude
        case longitude
        case evidenceCount = "evidence_count"
        case evidence
        case activity
    }

    public var asEvent: HarvyEvent {
        HarvyEvent(
            id: id,
            product: product,
            title: title,
            summary: summary,
            status: status,
            assignedTo: assignedTo,
            revision: revision,
            firstSeenAt: firstSeenAt,
            lastSeenAt: lastSeenAt,
            latitude: latitude,
            longitude: longitude,
            evidenceCount: evidenceCount ?? evidence.count
        )
    }

    public var firstSeenDate: Date {
        Date(timeIntervalSince1970: TimeInterval(firstSeenAt) / 1000.0)
    }

    public var lastSeenDate: Date {
        Date(timeIntervalSince1970: TimeInterval(lastSeenAt) / 1000.0)
    }
}

/// Paginated event response wrapper returned by GET /api/v1/events.
public struct PaginatedEventsResponse: Codable, Sendable {
    public let items: [HarvyEvent]
    public let nextCursor: String?

    enum CodingKeys: String, CodingKey {
        case items
        case nextCursor = "next_cursor"
    }
}
