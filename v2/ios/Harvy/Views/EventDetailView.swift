import SwiftUI

/// Detailed event view displaying event metadata, status, geographic coordinates,
/// attached source-attributed evidence items, and revision history.
public struct EventDetailView: View {
    @Environment(SessionStore.self) private var sessionStore

    public let eventId: String
    public let product: Product

    @State private var detail: EventDetail?
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?

    private let apiClient = APIClient()

    public init(eventId: String, product: Product) {
        self.eventId = eventId
        self.product = product
    }

    public var body: some View {
        Group {
            if isLoading && detail == nil {
                ProgressView("Loading event details...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage, detail == nil {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                    Text("Failed to load event")
                        .font(.headline)
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                    Button("Retry") {
                        Task { await loadDetail() }
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
            } else if let detail {
                content(for: detail)
            }
        }
        .navigationTitle("Event Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadDetail()
        }
        .refreshable {
            await loadDetail()
        }
    }

    @ViewBuilder
    private func content(for detail: EventDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header: Status, Product, Revision
                HStack(spacing: 8) {
                    statusBadge(detail.status)

                    Text(detail.product)
                        .font(.caption.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.15))
                        .clipShape(Capsule())

                    Spacer()

                    Text("Rev \(detail.revision)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Title
                Text(detail.title)
                    .font(.title2.bold())
                    .fixedSize(horizontal: false, vertical: true)

                // Timestamps & Assignee
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Label("First seen", systemImage: "clock")
                        Spacer()
                        Text(detail.firstSeenDate.formatted(date: .abbreviated, time: .shortened))
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    HStack {
                        Label("Last seen", systemImage: "clock.arrow.circlepath")
                        Spacer()
                        Text(detail.lastSeenDate.formatted(date: .abbreviated, time: .shortened))
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    if let assignee = detail.assignedTo {
                        HStack {
                            Label("Assigned to", systemImage: "person.circle")
                            Spacer()
                            Text(assignee)
                        }
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    }

                    if let lat = detail.latitude, let lon = detail.longitude {
                        HStack {
                            Label("Coordinates", systemImage: "mappin.and.ellipse")
                            Spacer()
                            Text(String(format: "%.4f, %.4f", lat, lon))
                        }
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))

                // Summary
                VStack(alignment: .leading, spacing: 8) {
                    Text("Summary")
                        .font(.headline)

                    Text(detail.summary)
                        .font(.body)
                        .foregroundStyle(.primary)
                }

                Divider()

                // Evidence Section
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Attached Evidence")
                            .font(.headline)
                        Spacer()
                        Text("\(detail.evidence.count) items")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if detail.evidence.isEmpty {
                        Text("No source evidence items attached to this event.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .padding(.vertical, 8)
                    } else {
                        ForEach(detail.evidence) { item in
                            evidenceRow(item)
                        }
                    }
                }

                // Activity Log Section
                if !detail.activity.isEmpty {
                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Activity History")
                            .font(.headline)

                        ForEach(detail.activity) { act in
                            HStack(alignment: .top) {
                                Circle()
                                    .fill(Color.secondary.opacity(0.3))
                                    .frame(width: 8, height: 8)
                                    .padding(.top, 5)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Status changed to \(act.status.displayName)")
                                        .font(.subheadline.weight(.medium))

                                    HStack {
                                        Text("By \(act.changedBy)")
                                        Text("·")
                                        Text(act.changedDate.formatted(date: .omitted, time: .shortened))
                                    }
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private func evidenceRow(_ item: Evidence) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(item.publisher)
                    .font(.caption.bold())
                    .foregroundStyle(.tint)

                Spacer()

                Text(item.capturedDate.formatted(date: .abbreviated, time: .omitted))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text(item.headline)
                .font(.subheadline.weight(.semibold))

            if let excerpt = item.excerpt, !excerpt.isEmpty {
                Text(excerpt)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }

            if let urlString = item.sourceUrl, let url = URL(string: urlString) {
                Link(destination: url) {
                    Label("View Source", systemImage: "arrow.up.right.square")
                        .font(.caption2)
                }
                .padding(.top, 2)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    @ViewBuilder
    private func statusBadge(_ status: EventStatus) -> some View {
        Text(status.displayName)
            .font(.caption.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor(status).opacity(0.18))
            .foregroundStyle(statusColor(status))
            .clipShape(Capsule())
    }

    private func statusColor(_ status: EventStatus) -> Color {
        switch status {
        case .new: return .blue
        case .reviewing: return .orange
        case .saved: return .green
        case .closed: return .gray
        }
    }

    private func loadDetail() async {
        guard let key = sessionStore.apiKey else { return }
        isLoading = true
        errorMessage = nil

        let endpoint = Endpoints.eventDetail(id: eventId, product: product)
        guard let request = endpoint.makeRequest() else {
            errorMessage = "Invalid request URL."
            isLoading = false
            return
        }

        do {
            let result: EventDetail = try await apiClient.send(
                request,
                apiKey: key,
                product: product,
                organizationId: sessionStore.organizationId
            )
            self.detail = result
        } catch {
            self.errorMessage = error.localizedDescription
        }
        self.isLoading = false
    }
}
