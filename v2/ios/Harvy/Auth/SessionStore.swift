import Foundation
import Observation

/// Represents the session authorization status.
public enum SessionState: Sendable, Equatable {
    case signedOut
    case validating
    case signedIn(HarvyContext)
    case error(String)

    public var isAuthenticated: Bool {
        if case .signedIn = self { return true }
        return false
    }

    public var context: HarvyContext? {
        if case .signedIn(let ctx) = self { return ctx }
        return nil
    }
}

/// Central session and authentication manager.
/// Manages Keychain persistence, validates API keys against `/api/v1/context`,
/// and tracks active product selection.
@Observable
public final class SessionStore {
    public private(set) var state: SessionState = .signedOut
    public private(set) var activeProduct: Product = .tower
    public private(set) var apiKey: String?
    public private(set) var organizationId: String?

    private let keychain: KeychainStore
    private let apiClient: APIClient

    public init(
        keychain: KeychainStore = .shared,
        apiClient: APIClient = APIClient()
    ) {
        self.keychain = keychain
        self.apiClient = apiClient

        // Restore stored credentials on app launch
        Task { @MainActor in
            await self.restoreSession()
        }
    }

    /// Attempts to restore session from Keychain credentials.
    @MainActor
    public func restoreSession() async {
        guard let storedKey = keychain.readApiKey(), !storedKey.isEmpty else {
            self.state = .signedOut
            return
        }

        self.apiKey = storedKey
        self.organizationId = keychain.readOrganizationId()
        await validateCredentials(key: storedKey, orgId: self.organizationId)
    }

    /// Signs in by validating the API key against GET /api/v1/context and persisting to Keychain.
    @MainActor
    public func signIn(apiKey: String, organizationId: String? = nil) async {
        let trimmedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedOrg = organizationId?.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedKey.isEmpty else {
            self.state = .error("API key cannot be empty.")
            return
        }

        self.apiKey = trimmedKey
        self.organizationId = trimmedOrg?.isEmpty == true ? nil : trimmedOrg

        await validateCredentials(key: trimmedKey, orgId: self.organizationId, saveToKeychain: true)
    }

    /// Purges credentials and signs out.
    @MainActor
    public func signOut() {
        try? keychain.clearAll()
        self.apiKey = nil
        self.organizationId = nil
        self.state = .signedOut
    }

    /// Selects an active product if allowed by the tenant's entitlements.
    @MainActor
    public func selectProduct(_ product: Product) {
        if let context = state.context, context.isProductAllowed(product) {
            self.activeProduct = product
        }
    }

    /// Re-evaluates permissions and context against the backend.
    @MainActor
    public func refreshContext() async {
        guard let key = apiKey else {
            self.state = .signedOut
            return
        }
        await validateCredentials(key: key, orgId: organizationId, saveToKeychain: false)
    }

    @MainActor
    private func validateCredentials(key: String, orgId: String?, saveToKeychain: Bool = false) async {
        self.state = .validating

        let endpoint = Endpoints.context()
        guard let request = endpoint.makeRequest() else {
            self.state = .error("Could not build context request.")
            return
        }

        do {
            let context: HarvyContext = try await apiClient.send(
                request,
                apiKey: key,
                organizationId: orgId
            )

            // Save only once validated
            if saveToKeychain {
                try? keychain.saveApiKey(key)
                if let orgId, !orgId.isEmpty {
                    try? keychain.saveOrganizationId(orgId)
                } else {
                    try? keychain.deleteOrganizationId()
                }
            }

            // Align active product with allowed products
            if !context.isProductAllowed(self.activeProduct) {
                if let firstAllowedName = context.allowedProducts.first,
                   let firstAllowedProduct = Product(rawValue: firstAllowedName) {
                    self.activeProduct = firstAllowedProduct
                }
            }

            self.state = .signedIn(context)
        } catch let apiError as APIError {
            self.state = .error(apiError.localizedDescription)
        } catch {
            self.state = .error(error.localizedDescription)
        }
    }
}
