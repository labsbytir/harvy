import Foundation

/// Authenticated principal context returned by GET /api/v1/context.
/// Verifies tenant membership, permitted products, and role capabilities.
public struct HarvyContext: Codable, Sendable, Equatable {
    public let principalId: String
    public let tenantId: String
    public let workspaceId: String
    public let tenantName: String
    public let role: String
    public let allowedProducts: [String]
    public let capabilities: [String]
    public let featureRevision: String
    public let ontologySchemaRevision: String
    public let hqlVersion: Int
    public let serviceHealth: ServiceHealth?

    public struct ServiceHealth: Codable, Sendable, Equatable {
        public let api: String?
        public let automation: String?

        public init(api: String? = nil, automation: String? = nil) {
            self.api = api
            self.automation = automation
        }
    }

    public init(
        principalId: String,
        tenantId: String,
        workspaceId: String,
        tenantName: String,
        role: String,
        allowedProducts: [String],
        capabilities: [String],
        featureRevision: String,
        ontologySchemaRevision: String,
        hqlVersion: Int,
        serviceHealth: ServiceHealth? = nil
    ) {
        self.principalId = principalId
        self.tenantId = tenantId
        self.workspaceId = workspaceId
        self.tenantName = tenantName
        self.role = role
        self.allowedProducts = allowedProducts
        self.capabilities = capabilities
        self.featureRevision = featureRevision
        self.ontologySchemaRevision = ontologySchemaRevision
        self.hqlVersion = hqlVersion
        self.serviceHealth = serviceHealth
    }

    enum CodingKeys: String, CodingKey {
        case principalId
        case tenantId
        case workspaceId
        case tenantName
        case role
        case allowedProducts
        case capabilities
        case featureRevision
        case ontologySchemaRevision
        case hqlVersion
        case serviceHealth
    }

    /// Validates whether the tenant organization has entitlement for a given product.
    public func isProductAllowed(_ product: Product) -> Bool {
        allowedProducts.contains(product.rawValue)
    }

    /// Validates whether the authenticated principal has a required permission capability.
    public func hasCapability(_ capability: String) -> Bool {
        capabilities.contains(capability)
    }
}
