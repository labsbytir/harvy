import Foundation
import Security

/// Keychain-backed secure credential storage.
/// Uses `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` to ensure tokens
/// never sync across iCloud Keychain and cannot be decrypted before device unlock.
/// Zero UserDefaults usage per security policy.
public final class KeychainStore: Sendable {
    public static let shared = KeychainStore()

    private let service: String
    private let defaultAccountKey = "harvy_api_key"
    private let organizationAccountKey = "harvy_org_id"

    public init(service: String = "dev.harvy.ios.credentials") {
        self.service = service
    }

    public enum KeychainError: LocalizedError, Sendable {
        case itemNotFound
        case duplicateItem
        case unexpectedStatus(OSStatus)
        case dataConversionFailed

        public var errorDescription: String? {
            switch self {
            case .itemNotFound:
                return "Keychain item not found."
            case .duplicateItem:
                return "Keychain item already exists."
            case .unexpectedStatus(let status):
                return "Keychain error status: \(status)"
            case .dataConversionFailed:
                return "Unable to convert string to/from UTF-8 data."
            }
        }
    }

    // MARK: - API Key Management

    /// Persists the API key securely.
    public func saveApiKey(_ apiKey: String) throws {
        try save(key: defaultAccountKey, value: apiKey)
    }

    /// Reads the active API key if present.
    public func readApiKey() -> String? {
        read(key: defaultAccountKey)
    }

    /// Removes the active API key.
    public func deleteApiKey() throws {
        try delete(key: defaultAccountKey)
    }

    // MARK: - Organization ID (Optional Scope)

    /// Persists optional organization ID header scope.
    public func saveOrganizationId(_ orgId: String) throws {
        try save(key: organizationAccountKey, value: orgId)
    }

    /// Reads optional organization ID.
    public func readOrganizationId() -> String? {
        read(key: organizationAccountKey)
    }

    /// Deletes optional organization ID.
    public func deleteOrganizationId() throws {
        try delete(key: organizationAccountKey)
    }

    // MARK: - Low-Level Keychain Operations

    private func save(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.dataConversionFailed
        }

        // Check if item already exists
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        if status == errSecSuccess {
            // Update existing entry
            let attributesToUpdate: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            ]
            let updateStatus = SecItemUpdate(query as CFDictionary, attributesToUpdate as CFDictionary)
            if updateStatus != errSecSuccess {
                throw KeychainError.unexpectedStatus(updateStatus)
            }
        } else if status == errSecItemNotFound {
            // Insert fresh entry
            let newItem: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: key,
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            ]
            let addStatus = SecItemAdd(newItem as CFDictionary, nil)
            if addStatus != errSecSuccess {
                throw KeychainError.unexpectedStatus(addStatus)
            }
        } else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    private func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Purges all Harvy credentials from Keychain upon sign-out.
    public func clearAll() throws {
        try? deleteApiKey()
        try? deleteOrganizationId()
    }
}
