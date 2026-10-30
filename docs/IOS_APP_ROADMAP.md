# Harvy iOS App & TestFlight Beta Plan

**Document Version:** 1.0.0  
**Target Platform:** iOS 17.0+ (iPhone)  
**Repository Path:** `docs/IOS_APP_ROADMAP.md`
**Status:** Planning Document (Architecture & Execution Roadmap)  

---

## 1. Build Strategy

### Recommendation
**Chosen Strategy: (a) Native SwiftUI client against the existing REST API.**

```
Native SwiftUI client interacting directly with Harvy's Cloudflare Worker REST API (/api/v1/*)
using Swift Concurrency, Keychain-backed Better Auth sessions, and native SwiftData caching.
```

### 3-Line Justification
1. Native SwiftUI delivers an uncompromising, responsive mobile triage tool with zero risk of rejection under App Store Review Guideline 4.2 (Minimum Functionality / web repackaging).
2. Direct integration with Apple frameworks (AuthenticationServices for Passkeys/Face ID, UserNotifications for APNs, Swift Charts, SwiftData) avoids complex multi-layer bridge bugs and cross-platform dependency drift.
3. Decoupling the mobile client from the desktop React/Vite SPA protects mobile performance from heavy desktop charting and webview memory overhead while reusing Harvy's exact tenant-scoped REST API contract.

### Honest Tradeoff Matrix

| Criterion | (a) Native SwiftUI (Chosen) | (b) React Native / Expo | (c) Capacitor SPA Wrapper | (d) PWA (TestFlight Incompatible) |
| :--- | :--- | :--- | :--- | :--- |
| **Time to 1st TestFlight Build** | **3–4 weeks** (native UI scaffolding from scratch) | **3–4 weeks** (no DOM reuse; must rewrite UI in RN components) | **1–2 weeks** (fastest initial wrapper around existing Vite bundle) | **N/A** (Cannot ship to TestFlight; web-only) |
| **Long-Term Maintenance** | **Low to Moderate** (standard Apple stack; zero bridge churn; pure Swift) | **High** (frequent React Native/Expo core upgrades, native bridge breakages) | **High** (constant WKWebView quirk workarounds, mobile CSS patches, plugin rot) | **Low** (single responsive web codebase) |
| **Offline Behaviour** | **Superior** (native SwiftData / SQLite with fine-grained local background sync) | **Good** (requires SQLite/WatermelonDB bridges and async serialization) | **Poor** (browser IndexedDB/LocalStorage inside volatile WKWebView container) | **Fair** (Service Worker Cache API, easily evicted by iOS Safari after 7 days) |
| **Push Notifications** | **Native APNs** (direct `UNUserNotificationCenter` & background wake) | **Good** (Expo Notifications / APNs bridge plugins) | **Fragile** (Capacitor push plugin bridge with WKWebView resume lag) | **Severely Limited** (requires Web Push on iOS 16.4+, must be added to Home Screen) |
| **App Store Review Risk** | **Lowest** (standard iOS native app; passes Guideline 4.2 effortlessly) | **Low** (fully compiled native views, low rejection risk) | **Severe** (high rejection rate under Guideline 4.2 as a repackaged website) | **N/A** (Apple does not permit PWAs on TestFlight or App Store) |

> **Why PWA cannot ship to TestFlight:**  
> TestFlight is strictly Apple's binary distribution system for compiled Mach-O executables wrapped in signed `.ipa` packages submitted through App Store Connect. A Progressive Web App (PWA) consists of HTML, JavaScript, CSS, and a Web App Manifest running inside WebKit/Safari. It does not produce an Xcode archive, binary signature, or IPA file, making TestFlight distribution technically impossible.

---

## 2. Prerequisites Checklist

All items required before a first TestFlight binary can be built and distributed:

| Prerequisite | Responsible Party | Estimated Cost / Lead Time | Verification Status | Details / Actions Required |
| :--- | :--- | :--- | :--- | :--- |
| **Apple Developer Program Enrolment** | **User Action** | **$99 / year** *(Apple standard developer fee estimate)*<br>Lead time: 24–48h (Individual) or 1–3 weeks (Organization requiring D-U-N-S) | **UNVERIFIED** *(no confirmed active Apple Developer team)* | Must enrol as Organization (TIR Labs / Harvy) to allow team member invites and TestFlight distribution. |
| **App Store Connect App Record** | **User / Agent Action** | $0<br>Lead time: 10 minutes | **UNVERIFIED** | Create app entry in App Store Connect under primary language English (US), SKU `harvy-ios`. |
| **App Bundle Identifier** | **Agent Action** | $0<br>Lead time: Immediate | Ready to register | Register `dev.harvy.ios` in Apple Developer Portal with Capabilities: Push Notifications, Associated Domains (WebAuthn). |
| **Signing Setup & Keys** | **User Action** | $0<br>Lead time: 15 minutes | **UNVERIFIED** | Generate an **App Store Connect API Key** (`.p8`, Key ID, Issuer ID) with "Admin" or "App Manager" role for headless CI builds. |
| **Distribution Certificate & Provisioning** | **Agent Action** (via fastlane) | $0<br>Lead time: Automated | Automated via CI | Managed automatically via `fastlane sigh` / App Store Connect API; eliminates manual provisioning profile downloads. |
| **Xcode Version & Build Environment** | **Agent Action** | $0 *(local)* / runner fee<br>Lead time: Immediate | Ready | Target **Xcode 16.2+** running on macOS 15+ (Sequoia) targeting the **iOS 18 SDK**. |
| **Minimum iOS Target** | **Agent Action** | $0 | Defined: **iOS 17.0** | Set `IPHONEOS_DEPLOYMENT_TARGET = 17.0`. Enables modern Swift Concurrency, SwiftData, `@Observable`, and Swift Charts. |

---

## 3. Architecture for Native SwiftUI Client

```
+-----------------------------------------------------------------------------------+
|                                Harvy iOS App                                      |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |     Views & Nav    |  |  Session & Auth    |  |      Local Storage          |  |
|  | (SwiftUI + Charts) |  | (Better Auth Token)|  | (SwiftData Cache + Keychain)|  |
|  +---------+----------+  +---------+----------+  +--------------+--------------+  |
|            |                       |                            |                 |
|  +---------v-----------------------v----------------------------v--------------+  |
|  |                             HarvyAPIClient                                  |  |
|  |       (URLSession, Bearer Auth, Dynamic Product Header: x-harvy-product)    |  |
|  +---------------------------------+-------------------------------------------+  |
+------------------------------------|----------------------------------------------+
                                     | HTTPS (TLS 1.3)
+------------------------------------v----------------------------------------------+
|                         https://harvy.dev/api/v1/                                 |
|                         (Cloudflare Workers + Hyperdrive)                         |
+-----------------------------------------------------------------------------------+
```

### 3.1 Authentication Flow (Better Auth Integration)
Harvy's backend uses Better Auth (`v2/auth`). For a native iOS application, the auth architecture avoids fragile webview cookie storage by utilizing token-based bearer sessions backed by the system Keychain:

1. **Authentication Mechanism:**
   - **Email / Password:** `POST https://harvy.dev/api/better-auth/sign-in/email` with body `{"email": "...", "password": "..."}`.
   - **Passkey / Biometrics:** Native WebAuthn via `AuthenticationServices` (`ASAuthorizationPlatformPublicKeyCredentialProvider`) targeting RP ID `harvy.dev`.
2. **API Key Handling (verified against code, 2026-10-30):**
   - `v2/auth/worker.ts:59-61` accepts only `x-api-key: <key>` or `Authorization: Bearer harvy_live_...`. A Better Auth **session token is rejected** — do not send it as a Bearer value.
   - `v2/auth/auth.ts:101-108` enables the `apiKey` plugin with `defaultPrefix: "harvy_live_"`, `defaultKeyLength: 64`, and `enableSessionForAPIKeys: true`, so an API key also carries a session.
   - The native app therefore authenticates with:
     ```http
     x-api-key: harvy_live_<64 chars>
     ```
   - Key issuance: the signed-in user creates a key once (web or a future in-app flow); the app stores it in the Keychain. Email/password sign-in is used only to mint that key.
3. **Secure Token Storage:**
   - The session token, refresh expiration timestamp, and active organization ID are stored in the **iOS Keychain Services** with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`.
   - Tokens never persist in `UserDefaults` or unencrypted local files.

### 3.2 API Base URL & Environment Configuration
- Default Production URL: `https://harvy.dev`
- API Prefix: `/api/v1`
- Configuration is loaded via a build-time `AppConfig.xcconfig` matrix:
  - `DEBUG`: Points to local or staging Cloudflare tunnel (`https://dev.harvy.dev`).
  - `RELEASE`: Hardcoded to `https://harvy.dev`.
- Custom HTTP Headers sent on every request:
  - `Authorization: Bearer <token>`
  - `x-harvy-product: <Tower | Ops | Civic | Newsk>` (sets tenant product scope)
  - `User-Agent: Harvy-iOS/<version> (<build>)`

### 3.3 Offline Cache Strategy (SwiftData)
Analysts frequently operate in intermittent connectivity environments. The app employs a **stale-while-revalidate** offline caching architecture:
1. **SwiftData Schema:**
   - `@Model class CachedEvent`: Mirrors `harvy_v2_events` fields (id, product, title, summary, status, last_seen_at, latitude, longitude, evidence_count).
   - `@Model class CachedEvidence`: Mirrors `harvy_v2_evidence` records for offline inspection.
   - `@Model class PendingAction`: Outbox queue for offline triage changes (e.g. status changes `reviewing -> saved`, notes).
2. **Read Path:**
   - Views query SwiftData `@Query` for instant rendering (< 16ms).
   - A background task fetches updated data from `/api/v1/events` using cursor pagination (`before=<last_seen_at>:<id>`).
   - Fresh records upsert into SwiftData; deleted or closed events synchronize accordingly.
3. **Write Path & Outbox:**
   - Offline actions (assigning events, triage state updates) are written immediately to `PendingAction` and reflected optimistically in the UI.
   - When network connectivity is restored (`NWPathMonitor`), the outbox flushes actions sequentially to `/api/v1/events/:id` with optimistic concurrency checks (`revision` matching).

### 3.4 Push Notification Path (APNs)
1. **Registration:**
   - App requests authorization via `UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])`.
   - Device registers with Apple Push Notification service (APNs); iOS provides a 64-character hex device token in `didRegisterForRemoteNotificationsWithDeviceToken`.
2. **Backend Storage:**
   - Client sends token to a new API endpoint: `POST /api/v1/devices/apns` with body `{"device_token": "...", "product": "Tower"}`.
   - Stored in a tenant-scoped table (`harvy_v2_device_registrations`).
3. **Dispatch Trigger:**
   - When Harvy's automation pipeline ingests a high-priority event or an action is handed off to Ops, the backend worker signs an APNs HTTP/2 payload using an Apple APNs Auth Key (`.p8`) and delivers the push directly to Apple's gateways.
4. **Deep Linking:**
   - Notification payload contains `{"aps": {"alert": ...}, "harvy": {"product": "Tower", "event_id": "..."}}`.
   - App delegates route immediately to the target event detail screen.

### 3.5 Product Entitlements & Screen Gating
Harvy enforces multi-product licensing across **Tower, Ops, Civic, and Newsk**:
1. On initial load, the app requests `GET /api/v1/context`.
2. The response yields `allowedProducts: ["Tower", "Ops"]` and `capabilities: [...]`.
3. The native root navigation utilizes a native SwiftUI `TabView` or sidebar:
   - Only products present in `allowedProducts` appear in the interface.
   - If an organization has access to only **Newsk**, the navigation completely hides Tower, Ops, and Civic.
   - Switching products immediately alters the outgoing `x-harvy-product` request header.

---

## 4. The Hard Dependency: API Deployment Required

### Clear Status Statement
> **No iOS build can function today.**  
> The `harvy.dev` Cloudflare zone exists, but **neither `harvy-api` nor `harvy-web` are deployed**. `harvy-auth` is stale from 2026-10-26, and no Hyperdrive database binding connects the API to PostgreSQL on UpCloud.  
> Attempting to build or distribute an iOS app prior to resolving this deployment leaves the app unable to sign in, fetch context, or load data. The plan does not assume or rely on mock/fake APIs.

### Blocking Deployment Checklist (Must Be Resolved First)

```
[ ] Step 1: UpCloud PostgreSQL Connectivity Verified
            Ensure UpCloud PostgreSQL 18.6 (85.9.196.97) accepts connections from Cloudflare IPs.
[ ] Step 2: Cloudflare Hyperdrive Configured
            Create Hyperdrive connection `HYPERDRIVE_PRIVATE` in Cloudflare pointing to UpCloud 5432.
[ ] Step 3: Run Database Migrations
            Apply schema migrations (0000–0005) to production PostgreSQL `harvy` database.
[ ] Step 4: Secrets Injected into Cloudflare Workers
            Inject BETTER_AUTH_SECRET, AUTOMATION_DISPATCH_TOKEN, and secrets into Harvy workers.
[ ] Step 5: Deploy harvy-auth & harvy-api Workers
            Deploy to Cloudflare under https://harvy.dev/api/better-auth and https://harvy.dev/api/v1.
[ ] Step 6: Public Verification
            Verify https://harvy.dev/health returns 200 OK and https://harvy.dev/api/v1/context returns 401 Unauthorized.
```

---

## 5. TestFlight Beta Plan

### 5.1 Internal vs External Testers

| Track | Max Testers | Review Requirement | Distribution Speed | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Internal Testing** | Up to **100** members | **None** (No Apple review required) | **Instant** upon CI binary processing (~15 min) | Harvy core engineering, product operators, founders. |
| **External Testing** | Up to **10,000** testers | **Apple Beta App Review** required for the first build of each version | **24–48 hours** for review; subsequent builds within same version are instant or expedited | Design partners, selected OSINT analysts, enterprise security teams. |

### 5.2 Build Versioning Strategy
- `CFBundleShortVersionString` (Marketing Version): Semantic versioning e.g. `1.0.0`. Incremented per release milestone.
- `CFBundleVersion` (Build Number): Monotonically increasing positive integer (e.g. `1`, `2`, `3`). Automatically assigned in CI from `github.run_number`.
- Format: `v1.0.0 (42)`.

### 5.3 Beta Description ("What to Test")
The TestFlight release notes submitted in App Store Connect must provide concrete instructions:
```markdown
Welcome to the Harvy Mobile Beta (v1.0.0).

What to Test:
- Sign-in via email/password or Passkey (WebAuthn).
- Real-time event stream filtering across Tower, Ops, Civic, and Newsk.
- Event detail inspection: verifying evidence attribution, timestamps, and geolocation.
- Offline event browsing and triage queuing (toggling airplane mode).
- Global workspace search responsiveness.

Known Limitations:
- Graph relationship visualization is currently view-only.
- Source configuration and Automation worker management remain desktop-only.

Feedback:
- Submit screenshots directly through TestFlight by taking a screenshot and tapping "Share Beta Feedback".
```

### 5.4 Tester Recruitment & Feedback Loop
1. **Recruitment:**
   - Internal group added via App Store Connect Users & Access (email invitation).
   - External group recruited via controlled public TestFlight link distributed to vetted threat intelligence and OSINT partners.
2. **Feedback Loop:**
   - **TestFlight Native Feedback:** Captures user annotations, OS version, device model, battery, and disk state directly to App Store Connect.
   - **Crash Diagnostics:** Symbolicated crash reports collected automatically via App Store Connect Crashlytics/Metrics API.
   - **In-App Issue Reporter:** Triple-tap gesture or settings button triggering a pre-filled email or issue payload with device logs (excluding tokens/private data).

---

## 6. Phased Delivery Roadmap

```
+------------------------------------------------------------------------------------+
|  PHASE 1: Read-Only Triage (Weeks 1-4)                                             |
|  - Auth (Better Auth) + Context + Entitlements                                      |
|  - Event Stream, Event Detail with Evidence & Timeline, Global Search              |
+------------------------------------------------------------------------------------+
                                         |
+----------------------------------------v-------------------------------------------+
|  PHASE 2: Investigations & Desktop Sync (Weeks 5-7)                               |
|  - Investigation Tree & Graph Inspector                                            |
|  - Story creation & Ops Action handoff                                             |
|  - Native Swift Charts for analytics metrics                                       |
+----------------------------------------+-------------------------------------------+
                                         |
+----------------------------------------v-------------------------------------------+
|  PHASE 3: Real-Time Alerts & Offline Outbox (Weeks 8-10)                           |
|  - APNs push notification delivery and background wake                             |
|  - Full SwiftData local cache with offline mutation outbox                         |
+------------------------------------------------------------------------------------+
```

### Phase 1: Read-Only Triage (MVP)
- **What Ships:**
  - Secure sign-in screen (Email/Password + Passkey/Face ID).
  - Context loader: verifies workspace, user identity, and licensed products.
  - Paginated event list (`/api/v1/events`) with search, status filters, and time window pickers.
  - Event detail screen displaying title, summary, source attribution, evidence cards (`/api/v1/evidence`), and revision activity.
  - Global search bar (`/api/v1/search`).
- **What Proves It Works:**
  - Tester signs in on an iPhone, selects their workspace, and sees active intelligence feeds.
  - Scrolling paginates smoothly at 60/120 fps; tapping an event opens attributed evidence.
- **Acceptance Check:**
  - Zero crashes on launch across iOS 17 and iOS 18 devices.
  - Keychain stores and restores session correctly across app restarts.
  - Invalid tokens or expired sessions trigger clean redirect to sign-in without unhandled exceptions.

### Phase 2: Investigations, Actions & Dashboards
- **What Ships:**
  - Investigation workspace browser (`/api/v1/investigations`).
  - Read/write Story creation and notes updating (`/api/v1/stories`) with revision conflict handling (HTTP 409).
  - Handoff to Ops action trigger (`POST /api/v1/events/:id/handoff`).
  - Native dashboard cards rendering metrics using Apple's `Swift Charts` framework (replaces web Drizzle Cube on mobile).
- **What Proves It Works:**
  - Analyst creates a story from a mobile event, updates notes, and verifies the update appears immediately on the desktop web interface.
  - Tapping "Handoff to Ops" transitions event state cleanly.
- **Acceptance Check:**
  - Revision conflict detection (409) prompts user to refresh without overwriting remote desktop changes.
  - Chart components resize seamlessly across all dynamic type and screen sizes.

### Phase 3: Real-Time Alerts & Offline Resilience
- **What Ships:**
  - APNs push notifications for critical threat alerts and team assignments.
  - Full SwiftData offline database with automatic background synchronization.
  - Outbox queue syncing offline triage actions when connectivity resumes.
- **What Proves It Works:**
  - Ingested event triggers push notification on locked device within 5 seconds; tapping notification opens the exact event.
  - Device placed in Airplane Mode allows full navigation of previously viewed events and searches against local store.
- **Acceptance Check:**
  - 100% offline browse capability for cached items.
  - Zero duplicate writes or state corruption upon network restoration.

---

## 7. CI/CD: Automated TestFlight Pipeline

### Pipeline Evaluation: fastlane on GitHub Actions vs Xcode Cloud

| Dimension | Option 1: GitHub Actions + fastlane (Recommended) | Option 2: Apple Xcode Cloud |
| :--- | :--- | :--- |
| **Build Infrastructure** | GitHub-hosted `macos-14` / `macos-15` runners | Apple-hosted cloud build infrastructure |
| **Estimated Cost** | **~$0.08 / minute** *(GitHub Actions macOS standard runner pricing assumption)*<br>Est. ~15 min build = **~$1.20 / build** *(estimate)* | **25 compute hours / month included** with Developer Program ($0).<br>Additional 100 hours = **$49.99 / month** *(Apple standard pricing estimate)* |
| **Flexibility & Control** | Full shell access, custom linting, monorepo path filters, direct notifications to Slack/Discord | Locked to Apple ecosystem; limited custom script execution |
| **Signing Setup** | Headless automated signing via App Store Connect API Key (`.p8`) | Seamless zero-configuration signing inside App Store Connect |
| **Recommendation** | **Chosen:** Fits repository GitHub workflows and allows unified linting, testing, and deployment. | Secondary fallback if dedicated macOS build budget is zero. |

### CI/CD Workflow Specification (`.github/workflows/ios-testflight.yml`)
1. **Trigger:** Push to `main` branch modifying `ios/**` or manual `workflow_dispatch`.
2. **Steps:**
   - Check out code.
   - Select Xcode version (`sudo xcode-select -s /Applications/Xcode_16.2.app`).
   - Cache CocoaPods / Swift Package Manager dependencies.
   - Run unit tests (`fastlane test`).
   - Increment build number using GitHub run number.
   - Build and archive `.ipa` using App Store Connect API Key.
   - Upload binary directly to TestFlight via `fastlane pilot`.

### Required Secrets in GitHub Repository Settings
1. `APP_STORE_CONNECT_API_KEY_ID`: Key ID from App Store Connect (e.g. `ABC1234XYZ`).
2. `APP_STORE_CONNECT_API_KEY_ISSUER_ID`: UUID of the issuer (e.g. `69a6de80-....`).
3. `APP_STORE_CONNECT_API_KEY_BASE64`: Base64-encoded `.p8` private key file.
4. `APPLE_CERTIFICATE_KEY_P12`: Base64-encoded iOS Distribution certificate.
5. `APPLE_CERTIFICATE_PASSWORD`: Password protecting the distribution `.p12`.

---

## 8. App Store Review Risks & Compliance for OSINT / Threat Intel

Operating an Open Source Intelligence (OSINT) and threat intelligence platform on the Apple App Store involves specific regulatory and policy boundaries:

```
+-----------------------------------------------------------------------------------+
|                           App Store Compliance Matrix                             |
|                                                                                   |
|  Guideline 5.1.1 (Privacy & OSINT)  ---> B2B positioning; no consumer PII lookup  |
|  Guideline 5.1.1(v) (Account Deletion) -> In-app delete trigger calling backend   |
|  Guideline 2.1 (Reviewer Access)    ---> Seeded demo tenant & credential notes    |
|  Guideline 4.2 (Minimum Quality)    ---> Pure native SwiftUI + charts + haptics   |
+-----------------------------------------------------------------------------------+
```

### Risk 1: Guideline 5.1.1 — Data Privacy & OSINT Aggregation
- **Risk:** Apple aggressively scrutinizes apps that aggregate personal information, public records, or social profiles, frequently rejecting them under rules prohibiting surveillance, doxxing, harassment, or unauthorized data scraping.
- **Mitigation:**
  - **Positioning:** Harvy must be positioned and described in App Store metadata strictly as an **Enterprise Threat Intelligence & Cyber Security Monitoring Platform** (serving corporate security, newsrooms, and civic infrastructure), NOT a "background check", "people search", or "person finder" app.
  - **Enforce Exclusions:** Enforce Harvy's platform policy: JudyRecords and Truth Social are permanently excluded; Telegram is approved (2026-10-30) but only for channels explicitly joined by the user's own approved Telegram app (configured channel list), with no discovery, member-list, or profile harvesting.
  - **Terms of Service:** Require all users to accept terms confirming institutional use and compliance with applicable data privacy laws upon first mobile launch.

### Risk 2: Guideline 5.1.1(v) — Mandatory In-App Account Deletion
- **Risk:** Apple strictly mandates: *"If your app supports account creation, you must also offer account deletion within the app."* Failing to provide this guarantees immediate rejection.
- **Mitigation:**
  - Include an explicit "Delete Account" button in the mobile Settings screen.
  - The button invokes `DELETE /api/better-auth/user` (or a dedicated compliance deletion workflow), revoking all sessions, deleting personal identification data, and confirming deletion via alert.

### Risk 3: Guideline 2.1 — App Completeness & Reviewer Test Credentials
- **Risk:** Reviewers cannot create random corporate accounts or execute complex external enterprise sign-ups. If a reviewer cannot immediately sign in and explore populated screens, they reject the build under Guideline 2.1.
- **Mitigation:**
  - In App Store Connect "App Review Information", supply a dedicated, permanent test account:
    - Username: `appreview@harvy.dev`
    - Password: `<SecureReviewerPassword>`
    - 2FA/Passkey Bypass: Enabled for this specific test tenant.
  - Seed the review tenant with realistic, non-classified threat events, evidence cards, and dashboard metrics across all four modes (Tower, Ops, Civic, Newsk) so the reviewer sees a populated, active workbench.

### Risk 4: Guideline 4.2 — Minimum Functionality
- **Risk:** If an app is perceived as an informational website inside a shell, Apple rejects under Guideline 4.2.
- **Mitigation:**
  - The chosen native SwiftUI architecture provides interactive touch interactions, native animations, haptic feedback on triage actions, native iOS sharing sheets for briefs, and system-standard navigation bars that conclusively demonstrate native application functionality.

---

## 9. Summary & Next Steps

1. **Immediate Pre-Development Action:** Stand up the backend API on `harvy.dev` (Hyperdrive connection, migrations, Worker deployment).
2. **Administrative Action:** Confirm or enrol in the Apple Developer Program and generate the App Store Connect API Key.
3. **Execution Kickoff:** Initialize the native Xcode project (`ios/Harvy.xcodeproj`) targeting iOS 17.0+ once the public health check at `https://harvy.dev/health` confirms operational status.
