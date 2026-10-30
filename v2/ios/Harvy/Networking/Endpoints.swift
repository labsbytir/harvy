import Foundation

/// Type-safe request descriptor for Harvy REST API calls.
public struct Endpoint<Response: Decodable>: Sendable {
    public let path: String
    public let method: String
    public let queryItems: [URLQueryItem]?
    public let body: Data?

    public init(
        path: String,
        method: String = "GET",
        queryItems: [URLQueryItem]? = nil,
        body: Data? = nil
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.body = body
    }

    /// Constructs a URLRequest targeting `AppConfig.apiBaseURL`.
    public func makeRequest(baseURL: URL = AppConfig.baseURL) -> URLRequest? {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: true) else {
            return nil
        }

        // Cleanly join path components without duplicate slashes
        let fullPath = path.hasPrefix("/") ? path : "/\(path)"
        components.path = fullPath
        if let queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            return nil
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        return request
    }
}

/// Factory functions for Harvy V2 API endpoints.
/// Derived directly from `v2/web/src/api.ts` and verified against `v2/api/worker.ts`.
public enum Endpoints {

    // MARK: - Context
    // Verified: v2/web/src/api.ts:168, v2/api/worker.ts:305-313

    /// Fetches the authenticated principal context, allowed products, and capabilities.
    public static func context() -> Endpoint<HarvyContext> {
        Endpoint(path: "/api/v1/context")
    }

    // MARK: - Events
    // Verified: v2/web/src/api.ts:178, v2/api/worker.ts:161-197, 469-476

    /// Fetches a paginated list of events scoped to a product mode.
    ///
    /// Query Parameters (matched to `v2/api/worker.ts:161-197`):
    /// - `product`: HarvyProduct string (required by worker.ts:471)
    /// - `limit`: Integer 1-100 (default 50)
    /// - `before`: Cursor string in format `<last_seen_at>:<id>` for keyset pagination
    /// - `status`: "new" | "reviewing" | "saved" | "closed"
    /// - `q`: Search substring filter (up to 200 chars)
    /// - `from`: Epoch millisecond start filter
    /// - `to`: Epoch millisecond end filter
    /// - `source_id`: Specific evidence source filter
    public static func events(
        product: Product,
        limit: Int = 50,
        before: String? = nil,
        status: EventStatus? = nil,
        searchQuery: String? = nil,
        from: Int64? = nil,
        to: Int64? = nil,
        sourceId: String? = nil
    ) -> Endpoint<PaginatedEventsResponse> {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "product", value: product.rawValue),
            URLQueryItem(name: "limit", value: String(min(100, max(1, limit))))
        ]

        if let before, !before.isEmpty {
            items.append(URLQueryItem(name: "before", value: before))
        }
        if let status {
            items.append(URLQueryItem(name: "status", value: status.rawValue))
        }
        if let query = searchQuery?.trimmingCharacters(in: .whitespacesAndNewlines), !query.isEmpty {
            items.append(URLQueryItem(name: "q", value: query))
        }
        if let from {
            items.append(URLQueryItem(name: "from", value: String(from)))
        }
        if let to {
            items.append(URLQueryItem(name: "to", value: String(to)))
        }
        if let sourceId, !sourceId.isEmpty {
            items.append(URLQueryItem(name: "source_id", value: sourceId))
        }

        return Endpoint(
            path: "/api/v1/events",
            method: "GET",
            queryItems: items
        )
    }

    // MARK: - Event Detail & Evidence
    // Verified: v2/web/src/api.ts:185, v2/api/worker.ts:147-158, 478-485

    /// Fetches full event details including attached evidence items and audit activity history.
    ///
    /// Query Parameters:
    /// - `product`: HarvyProduct string (required by worker.ts:481)
    public static func eventDetail(id: String, product: Product) -> Endpoint<EventDetail> {
        Endpoint(
            path: "/api/v1/events/\(id)",
            method: "GET",
            queryItems: [URLQueryItem(name: "product", value: product.rawValue)]
        )
    }

    // MARK: - Workspace Search
    // Verified: v2/web/src/api.ts:179-184, v2/api/worker.ts:413-467

    /// Searches events, evidence, dashboards, and actions across the workspace.
    ///
    /// Query Parameters (matched to `v2/api/worker.ts:417-431`):
    /// - `q`: Search string (2 to 120 chars)
    /// - `product`: Active HarvyProduct
    /// - `limit`: 1 to 20 results (default 12)
    /// - `from`: Optional ISO timestamp or epoch
    /// - `to`: Optional ISO timestamp or epoch
    public static func search(
        query: String,
        product: Product,
        limit: Int = 12,
        from: String? = nil,
        to: String? = nil
    ) -> Endpoint<SearchResponse> {
        var items: [URLQueryItem] = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "product", value: product.rawValue),
            URLQueryItem(name: "limit", value: String(min(20, max(1, limit))))
        ]

        if let from, !from.isEmpty {
            items.append(URLQueryItem(name: "from", value: from))
        }
        if let to, !to.isEmpty {
            items.append(URLQueryItem(name: "to", value: to))
        }

        return Endpoint(
            path: "/api/v1/search",
            method: "GET",
            queryItems: items
        )
    }

    // MARK: - Event Triage State Update
    // Verified: v2/web/src/api.ts:186-188, v2/api/worker.ts:486-522

    public struct EventUpdateRequest: Codable, Sendable {
        public let status: String?
        public let assignedTo: String?
        public let expectedRevision: Int

        enum CodingKeys: String, CodingKey {
            case status
            case assignedTo = "assigned_to"
            case expectedRevision = "expected_revision"
        }

        public init(status: EventStatus? = nil, assignedTo: String? = nil, expectedRevision: Int) {
            self.status = status?.rawValue
            self.assignedTo = assignedTo
            self.expectedRevision = expectedRevision
        }
    }

    /// Updates event status or assignee with optimistic concurrency revision checks.
    public static func updateEvent(
        id: String,
        product: Product,
        update: EventUpdateRequest
    ) -> Endpoint<EventDetail>? {
        guard let body = try? JSONEncoder().encode(update) else { return nil }
        return Endpoint(
            path: "/api/v1/events/\(id)",
            method: "PATCH",
            queryItems: [URLQueryItem(name: "product", value: product.rawValue)],
            body: body
        )
    }

    // MARK: - APNs Device Registration (UNIMPLEMENTED BACKEND STUB)
    //
    // TODO: Device token registration endpoint `POST /api/v1/devices/apns`
    // was planned in docs/IOS_APP_PLAN.md section 3.4, but does NOT currently exist
    // in `v2/api/worker.ts`. Do not call until the backend route is implemented.
    public struct DeviceRegistrationRequest: Codable, Sendable {
        public let deviceToken: String
        public let product: String

        enum CodingKeys: String, CodingKey {
            case deviceToken = "device_token"
            case product
        }
    }
}
