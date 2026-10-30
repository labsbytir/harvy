import Foundation

/// Build and runtime configuration for Harvy iOS.
public enum AppEnvironment: String, Sendable {
    case development
    case production
}

public struct AppConfig: Sendable {
    /// Active build environment determined by compiler flags.
    public static var currentEnvironment: AppEnvironment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }

    /// Primary production domain as specified in architecture directives.
    public static let productionBaseURL = URL(string: "https://harvy.dev") ?? URL(fileURLWithPath: "/")

    /// Staging/dev tunnel domain as specified in docs/IOS_APP_ROADMAP.md section 3.2.
    public static let developmentBaseURL = URL(string: "https://dev.harvy.dev") ?? productionBaseURL

    /// Root base URL depending on current environment build setting.
    public static var baseURL: URL {
        switch currentEnvironment {
        case .development:
            return developmentBaseURL
        case .production:
            return productionBaseURL
        }
    }

    /// API prefix for Harvy V2 REST endpoints.
    public static let apiPrefix = "/api/v1"

    /// Full URL for API v1 root endpoint.
    public static var apiBaseURL: URL {
        baseURL.appendingPathComponent(apiPrefix)
    }

    /// Client user agent string sent with API requests.
    public static let userAgent = "Harvy-iOS/1.0.0 (Build 1)"
}
