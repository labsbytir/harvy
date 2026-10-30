import Foundation

/// Core Harvy platform products.
/// Harvy is the foundation; Tower, Ops, Civic, and Newsk share HarvyDex, auth, and permissions.
public enum Product: String, Codable, CaseIterable, Identifiable, Sendable {
    case newsk = "Newsk"
    case tower = "Tower"
    case ops = "Ops"
    case civic = "Civic"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .newsk: return "Newsk"
        case .tower: return "Tower"
        case .ops: return "Ops"
        case .civic: return "Civic"
        }
    }

    public var subtitle: String {
        switch self {
        case .newsk: return "Newsroom intelligence"
        case .tower: return "Global & business intelligence"
        case .ops: return "Operations & actions"
        case .civic: return "Civic intelligence"
        }
    }

    public var systemImageName: String {
        switch self {
        case .newsk: return "newspaper"
        case .tower: return "chart.bar.xaxis"
        case .ops: return "checkmark.shield"
        case .civic: return "building.columns"
        }
    }
}
