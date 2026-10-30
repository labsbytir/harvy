import Foundation

/// Unified search result item returned by GET /api/v1/search.
/// Schema mirrors `WorkspaceSearchResult` per `v2/web/src/api.ts:122-132` and `v2/api/worker.ts:457-466`.
public struct WorkspaceSearchResult: Identifiable, Codable, Sendable, Equatable {
    public let type: String
    public let id: String
    public let product: String
    public let title: String
    public let description: String
    public let updatedAt: Int64
    public let eventId: String?
    public let sourceProduct: String?

    public init(
        type: String,
        id: String,
        product: String,
        title: String,
        description: String,
        updatedAt: Int64,
        eventId: String? = nil,
        sourceProduct: String? = nil
    ) {
        self.type = type
        self.id = id
        self.product = product
        self.title = title
        self.description = description
        self.updatedAt = updatedAt
        self.eventId = eventId
        self.sourceProduct = sourceProduct
    }

    enum CodingKeys: String, CodingKey {
        case type
        case id
        case product
        case title
        case description
        case updatedAt = "updated_at"
        case eventId = "event_id"
        case sourceProduct = "source_product"
    }

    public var updatedDate: Date {
        Date(timeIntervalSince1970: TimeInterval(updatedAt) / 1000.0)
    }
}

/// Search response wrapper.
public struct SearchResponse: Codable, Sendable {
    public let items: [WorkspaceSearchResult]

    public init(items: [WorkspaceSearchResult]) {
        self.items = items
    }
}
