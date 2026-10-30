import Foundation

/// Source-attributed observation record attached to an event.
/// Schema mirrors `harvy_v2_evidence` per `v2/shared/cubes.ts` and `v2/api/worker.ts:152-154`.
public struct Evidence: Identifiable, Codable, Sendable, Equatable {
    public let id: String
    public let eventId: String?
    public let sourceId: String
    public let sourceUrl: String?
    public let publisher: String
    public let headline: String
    public let excerpt: String?
    public let capturedAt: Int64
    public let artifactId: String?
    public let product: String?

    public init(
        id: String,
        eventId: String? = nil,
        sourceId: String,
        sourceUrl: String? = nil,
        publisher: String,
        headline: String,
        excerpt: String? = nil,
        capturedAt: Int64,
        artifactId: String? = nil,
        product: String? = nil
    ) {
        self.id = id
        self.eventId = eventId
        self.sourceId = sourceId
        self.sourceUrl = sourceUrl
        self.publisher = publisher
        self.headline = headline
        self.excerpt = excerpt
        self.capturedAt = capturedAt
        self.artifactId = artifactId
        self.product = product
    }

    enum CodingKeys: String, CodingKey {
        case id
        case eventId = "event_id"
        case sourceId = "source_id"
        case sourceUrl = "source_url"
        case publisher
        case headline
        case excerpt
        case capturedAt = "captured_at"
        case artifactId = "artifact_id"
        case product
    }

    /// Formatted capture date for presentation.
    public var capturedDate: Date {
        Date(timeIntervalSince1970: TimeInterval(capturedAt) / 1000.0)
    }
}
