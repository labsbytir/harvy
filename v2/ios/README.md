# Harvy iOS Client (SwiftUI)

Native iOS client for Harvy, providing multi-product intelligence and operational triage across **Tower, Ops, Civic, and Newsk**.

---

## 1. Environment & Verification Status

> **CRITICAL NOTICE: UNCOMPILED & UNVERIFIED AGAINST LIVE BACKEND**
> 
> 1. **Xcode is NOT installed on this machine** (only macOS Command Line Tools are present). Neither `xcodebuild`, `swift build`, nor compiler type-checking have been run on this source tree.
> 2. **Harvy API is NOT deployed**. `harvy.dev` currently serves no live backend worker; `harvy-api` and Hyperdrive are undeployed. All network contracts are derived statically from source code.
> 3. **No `.xcodeproj` or `.xcworkspace` exists** in this repository. Project files cannot be generated or validated without an active Xcode installation.

---

## 2. Directory Structure

```
v2/ios/
├── README.md                          # Architecture, setup guide, and verification status
└── Harvy/
    ├── App/
    │   └── HarvyApp.swift             # @main SwiftUI entrypoint, environment wiring
    ├── Config/
    │   └── AppConfig.swift            # Base URL (https://harvy.dev), API prefix /api/v1, DEBUG/RELEASE switch
    ├── Models/
    │   ├── Product.swift              # HarvyProduct enum (Newsk, Tower, Ops, Civic)
    │   ├── HarvyContext.swift         # Principal context, tenant, allowedProducts, capabilities
    │   ├── HarvyEvent.swift           # EventStatus, HarvyEvent, EventActivity, EventDetail, PaginatedEventsResponse
    │   ├── Evidence.swift             # Evidence record, publisher, capture timestamp, source URL
    │   └── WorkspaceSearchResult.swift# Workspace search result item and response envelope
    ├── Networking/
    │   ├── APIClient.swift            # Actor-isolated URLSession async/await client with typed errors
    │   └── Endpoints.swift            # Type-safe request builders with query parameters
    ├── Auth/
    │   ├── KeychainStore.swift        # iOS Keychain Services (kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly)
    │   └── SessionStore.swift         # @Observable session state, Keychain loader, context validator
    └── Views/
        ├── SignInView.swift           # Honest API key entry (harvy_live_...) & context validator
        ├── EventListView.swift        # Paginated event stream, loading/empty/error states, search & status filters
        ├── EventDetailView.swift      # Event fields, coordinates, attached evidence, activity history
        └── RootView.swift             # Router between SignInView and TabView gated by allowedProducts
```

---

## 3. How to Open in Xcode (Once Xcode is Installed)

When Xcode 16+ is installed on macOS:

1. Launch Xcode and select **File > New > Project...**
2. Choose **iOS > App** and click **Next**.
3. Configure the project:
   - **Product Name:** `Harvy`
   - **Organization Identifier:** `dev.harvy` (Bundle ID: `dev.harvy.ios`)
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Storage:** None
4. Save the project inside `v2/ios/` (or drag the `v2/ios/Harvy/` folder into the newly generated Xcode project navigator, ensuring **Copy items if needed** is unchecked and **Create groups** is selected).
5. Set the **Minimum Deployments target** to **iOS 17.0** (`IPHONEOS_DEPLOYMENT_TARGET = 17.0`).
6. Under **Signing & Capabilities**:
   - Add **Keychain Sharing** capability if entitlements are needed.
   - Add **Push Notifications** and **Background Modes (Remote notifications)** when APNs is provisioned.
7. Select an iOS Simulator (e.g. iPhone 16) and build (`Cmd+B`) or run (`Cmd+R`).

---

## 4. API Endpoints Wired & Verification Sources

All endpoints, query parameters, and payload structures match the existing code:

| Endpoint | Method | Swift Request Builder | Verified Source File |
| :--- | :--- | :--- | :--- |
| `/api/v1/context` | `GET` | `Endpoints.context()` | `v2/web/src/api.ts:168`, `v2/api/worker.ts:305-313` |
| `/api/v1/events` | `GET` | `Endpoints.events(product:limit:before:status:searchQuery:from:to:sourceId:)` | `v2/web/src/api.ts:178`, `v2/api/worker.ts:161-197, 469-476` |
| `/api/v1/events/:id` | `GET` | `Endpoints.eventDetail(id:product:)` | `v2/web/src/api.ts:185`, `v2/api/worker.ts:147-158, 478-485` |
| `/api/v1/events/:id` | `PATCH` | `Endpoints.updateEvent(id:product:update:)` | `v2/web/src/api.ts:186-188`, `v2/api/worker.ts:486-522` |
| `/api/v1/search` | `GET` | `Endpoints.search(query:product:limit:from:to:)` | `v2/web/src/api.ts:179-184`, `v2/api/worker.ts:413-467` |

### Authentication & Tenant Scoping
- **Header:** `x-api-key: harvy_live_<64 chars>`  
  Verified against `v2/auth/worker.ts:59-61` and `v2/auth/auth.ts:101-108`.
- **Header:** `x-harvy-product: <Newsk | Tower | Ops | Civic>`  
  Verified against `v2/api/worker.ts:415, 471, 481`.
- **Header:** `x-harvy-organization-id: <org_id>` (optional tenant override)  
  Verified against `v2/auth/worker.ts:78`.

---

## 5. What is Stubbed

1. **APNs Device Registration (`POST /api/v1/devices/apns`)**:
   - Planned in `docs/IOS_APP_PLAN.md` Section 3.4 for remote push notification registration.
   - **Backend Status:** Route does NOT exist in `v2/api/worker.ts`.
   - **Client Status:** Staged in `Endpoints.swift` with a `// TODO` annotation. The client does not call it to avoid 404 runtime errors.
2. **Offline Outbox Mutation Sync (SwiftData)**:
   - Planned in `docs/IOS_APP_PLAN.md` Section 3.3 for queuing offline status changes.
   - Currently, the app performs live async updates via `Endpoints.updateEvent`. SwiftData model persistence is deferred until the production backend deployment is live.

---

## 6. What Cannot Be Verified Until Xcode is Installed

1. **Swift compilation & syntax validation:** Verifying that the Swift compiler accepts all Observation macros (`@Observable`), Sendable conformance, and SwiftUI view structures without warning or error.
2. **Simulator runtime execution:** Launching the app on an iOS 17.0+ Simulator to verify view hierarchies, navigation transitions, and keyboard handling.
3. **Keychain persistence on device:** Testing `SecItemAdd` and `SecItemCopyMatching` with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` in a real sandboxed iOS environment.
4. **Live network communication:** Testing URLSession handling of HTTP 401, 403, 404, and JSON decoding against live endpoints once `harvy.dev` is deployed.
