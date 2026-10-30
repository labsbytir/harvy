import SwiftUI

/// Main application entry point for Harvy iOS.
/// Wires the application session and injects dependencies via SwiftUI environment.
@main
struct HarvyApp: App {
    @State private var sessionStore = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(sessionStore)
        }
    }
}
