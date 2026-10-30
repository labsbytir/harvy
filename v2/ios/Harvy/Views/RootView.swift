import SwiftUI

/// Root navigation router.
/// Directs to `SignInView` when unauthenticated, and builds a native `TabView`
/// dynamically containing only the products entitled to the organization per `Context.allowedProducts`.
public struct RootView: View {
    @Environment(SessionStore.self) private var sessionStore

    public init() {}

    private enum NavigationTab: Hashable {
        case product(Product)
        case settings
    }

    @State private var selectedTab: NavigationTab = .product(.tower)

    public var body: some View {
        Group {
            switch sessionStore.state {
            case .signedOut, .error:
                SignInView()
            case .validating:
                if sessionStore.apiKey == nil {
                    SignInView()
                } else {
                    VStack(spacing: 16) {
                        ProgressView()
                        Text("Verifying Harvy session...")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            case .signedIn(let context):
                authenticatedNavigation(context: context)
            }
        }
    }

    @ViewBuilder
    private func authenticatedNavigation(context: HarvyContext) -> some View {
        let entitledProducts = Product.allCases.filter { context.isProductAllowed($0) }

        if entitledProducts.isEmpty {
            noEntitlementsView(context: context)
        } else {
            TabView(selection: $selectedTab) {
                ForEach(entitledProducts) { product in
                    EventListView(product: product)
                        .tabItem {
                            Label(product.displayName, systemImage: product.systemImageName)
                        }
                        .tag(NavigationTab.product(product))
                }

                SettingsView(context: context)
                    .tabItem {
                        Label("Settings", systemImage: "gearshape")
                    }
                    .tag(NavigationTab.settings)
            }
            .onChange(of: selectedTab) { _, newTab in
                if case .product(let prod) = newTab {
                    sessionStore.selectProduct(prod)
                }
            }
            .onAppear {
                if case .product(let current) = selectedTab, !context.isProductAllowed(current) {
                    if let first = entitledProducts.first {
                        selectedTab = .product(first)
                        sessionStore.selectProduct(first)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func noEntitlementsView(context: HarvyContext) -> some View {
        NavigationStack {
            ContentUnavailableView {
                Label("No Product Entitlements", systemImage: "lock.shield")
            } description: {
                Text("Organization '\(context.tenantName)' has no active product entitlements. Request access to Tower, Ops, Civic, or Newsk from your platform administrator.")
            } actions: {
                Button("Sign Out", role: .destructive) {
                    sessionStore.signOut()
                }
                .buttonStyle(.bordered)
            }
            .navigationTitle("Harvy")
        }
    }
}

/// Settings & Workspace profile inspection view.
struct SettingsView: View {
    @Environment(SessionStore.self) private var sessionStore
    let context: HarvyContext

    var body: some View {
        NavigationStack {
            List {
                Section("Organization") {
                    LabeledContent("Tenant Name", value: context.tenantName)
                    LabeledContent("Role", value: context.role.capitalized)
                    LabeledContent("Tenant ID", value: context.tenantId)
                }

                Section("Product Entitlements") {
                    ForEach(Product.allCases) { product in
                        HStack {
                            Label(product.displayName, systemImage: product.systemImageName)
                            Spacer()
                            if context.isProductAllowed(product) {
                                Text("Enabled")
                                    .font(.caption.bold())
                                    .foregroundStyle(.green)
                            } else {
                                Text("Disabled")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section("Capabilities") {
                    ForEach(context.capabilities, id: \.self) { cap in
                        Text(cap)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Environment") {
                    LabeledContent("Base URL", value: AppConfig.baseURL.absoluteString)
                    LabeledContent("API Prefix", value: AppConfig.apiPrefix)
                    LabeledContent("Build Target", value: AppConfig.currentEnvironment.rawValue.capitalized)
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        sessionStore.signOut()
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    RootView()
        .environment(SessionStore())
}
