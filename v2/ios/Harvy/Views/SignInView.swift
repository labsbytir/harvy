import SwiftUI

/// Sign-in interface requiring user's Harvy API key.
/// Labelled honestly: Harvy does not use interactive browser cookies on mobile;
/// it requires a valid `harvy_live_...` API key.
public struct SignInView: View {
    @Environment(SessionStore.self) private var sessionStore

    @State private var apiKeyInput: String = ""
    @State private var organizationIdInput: String = ""
    @State private var showOrgField: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // Header Branding
                    VStack(spacing: 8) {
                        Image(systemName: "shield.checkered")
                            .font(.system(size: 54))
                            .foregroundStyle(.tint)
                            .padding(.top, 24)

                        Text("Harvy")
                            .font(.largeTitle.bold())

                        Text("Intelligence & Operations Platform")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    // Instruction Banner
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Paste your Harvy API key")
                            .font(.headline)

                        Text("Mobile authentication connects using your organization's API key. Obtain your key from your workspace settings (prefixed with `harvy_live_`).")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Input Form
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("API Key")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)

                            SecureField("harvy_live_...", text: $apiKeyInput)
                                .textContentType(.password)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .padding(12)
                                .background(Color(.tertiarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(Color(.separator), lineWidth: 1)
                                )
                        }

                        // Optional Organization ID Toggle & Field
                        if showOrgField {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Organization ID (Optional)")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)

                                TextField("org_...", text: $organizationIdInput)
                                    .autocorrectionDisabled()
                                    .textInputAutocapitalization(.never)
                                    .padding(12)
                                    .background(Color(.tertiarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(Color(.separator), lineWidth: 1)
                                    )

                                Text("Required only if your account is associated with multiple tenants.")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        } else {
                            Button("Advanced: Specify Organization ID") {
                                withAnimation {
                                    showOrgField = true
                                }
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        // Error Banner
                        if case .error(let message) = sessionStore.state {
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(.red)
                                Text(message)
                                    .font(.footnote)
                                    .foregroundStyle(.red)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(Color.red.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        // Submit Button
                        Button {
                            Task {
                                await sessionStore.signIn(
                                    apiKey: apiKeyInput,
                                    organizationId: organizationIdInput
                                )
                            }
                        } label: {
                            HStack {
                                if case .validating = sessionStore.state {
                                    ProgressView()
                                        .tint(.white)
                                        .padding(.trailing, 4)
                                }
                                Text(sessionStore.state == .validating ? "Validating Key..." : "Authenticate")
                                    .font(.headline)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(apiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? Color.gray.opacity(0.4) : Color.accentColor)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                        .disabled(apiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sessionStore.state == .validating)
                    }

                    Spacer()
                }
                .padding(.horizontal, 20)
            }
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    SignInView()
        .environment(SessionStore())
}
