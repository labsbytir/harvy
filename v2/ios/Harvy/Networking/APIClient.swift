import Foundation

/// Strongly typed API errors returned by Harvy endpoints.
public enum APIError: LocalizedError, Sendable {
    case unauthorized(message: String?)
    case forbidden(message: String?)
    case notFound(message: String?)
    case invalidRequest(message: String?)
    case server(status: Int, code: String?, message: String?)
    case decoding(Error)
    case transport(Error)
    case unknown

    public var errorDescription: String? {
        switch self {
        case .unauthorized(let msg):
            return msg ?? "Invalid or missing API key (401 Unauthorized)."
        case .forbidden(let msg):
            return msg ?? "Access denied. Organization membership or product entitlement required (403 Forbidden)."
        case .notFound(let msg):
            return msg ?? "Requested resource was not found (404 Not Found)."
        case .invalidRequest(let msg):
            return msg ?? "Invalid request parameters (400 Bad Request)."
        case .server(let status, let code, let message):
            let codeInfo = code.map { " [\($0)]" } ?? ""
            return "\(message ?? "Server error") (\(status)\(codeInfo))."
        case .decoding(let err):
            return "Failed to decode server response: \(err.localizedDescription)"
        case .transport(let err):
            return "Network connection failed: \(err.localizedDescription)"
        case .unknown:
            return "An unexpected error occurred."
        }
    }
}

/// Server error payload structure matching `v2/api/worker.ts:25-27` and `v2/web/src/api.ts:148`.
public struct APIErrorEnvelope: Codable, Sendable {
    public struct Problem: Codable, Sendable {
        public let code: String?
        public let message: String?
        public let traceId: String?

        enum CodingKeys: String, CodingKey {
            case code
            case message
            case traceId = "trace_id"
        }
    }

    public let error: Problem?
    public let message: String?
}

/// Asynchronous HTTP client communicating with Harvy Cloudflare Worker API.
public actor APIClient {
    private let session: URLSession
    private let decoder: JSONDecoder

    public init(session: URLSession = .shared) {
        self.session = session
        self.decoder = JSONDecoder()
    }

    /// Sends a URLRequest with required Harvy headers and decodes the response body.
    /// Injects `x-api-key`, `x-harvy-product`, and optional `x-harvy-organization-id`.
    public func send<T: Decodable>(
        _ request: URLRequest,
        apiKey: String? = nil,
        product: Product? = nil,
        organizationId: String? = nil
    ) async throws -> T {
        var req = request

        // Standard JSON headers
        if req.value(forHTTPHeaderField: "Accept") == nil {
            req.setValue("application/json", forHTTPHeaderField: "Accept")
        }
        if req.httpBody != nil && req.value(forHTTPHeaderField: "Content-Type") == nil {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        req.setValue(AppConfig.userAgent, forHTTPHeaderField: "User-Agent")

        // Authentication & tenant headers per v2/auth/worker.ts:59-80
        if let apiKey, !apiKey.isEmpty {
            req.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        }
        if let product {
            req.setValue(product.rawValue, forHTTPHeaderField: "x-harvy-product")
        }
        if let organizationId, !organizationId.isEmpty {
            req.setValue(organizationId, forHTTPHeaderField: "x-harvy-organization-id")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        // Handle error status codes
        if httpResponse.statusCode < 200 || httpResponse.statusCode >= 300 {
            let errorBody = try? decoder.decode(APIErrorEnvelope.self, from: data)
            let errorMessage = errorBody?.error?.message ?? errorBody?.message
            let errorCode = errorBody?.error?.code

            switch httpResponse.statusCode {
            case 401:
                throw APIError.unauthorized(message: errorMessage)
            case 403:
                throw APIError.forbidden(message: errorMessage)
            case 404:
                throw APIError.notFound(message: errorMessage)
            case 400:
                throw APIError.invalidRequest(message: errorMessage)
            default:
                throw APIError.server(status: httpResponse.statusCode, code: errorCode, message: errorMessage)
            }
        }

        // Decode success payload
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}
