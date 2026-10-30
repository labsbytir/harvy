import SwiftUI

/// Paginated stream of events for a specific Harvy product mode.
/// Handles loading, empty, and error states, cursor pagination, search filtering,
/// and triage status filtering.
public struct EventListView: View {
    @Environment(SessionStore.self) private var sessionStore

    public let product: Product

    @State private var events: [HarvyEvent] = []
    @State private var nextCursor: String?
    @State private var isLoading: Bool = false
    @State private var isLoadingMore: Bool = false
    @State private var errorMessage: String?
    @State private var selectedStatus: EventStatus?
    @State private var searchText: String = ""

    private let apiClient = APIClient()

    public init(product: Product) {
        self.product = product
    }

    public var body: some View {
        NavigationStack {
            Group {
                if isLoading && events.isEmpty {
                    VStack(spacing: 12) {
                        ProgressView()
                        Text("Loading \(product.displayName) events...")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage, events.isEmpty {
                    errorStateView(error)
                } else if events.isEmpty {
                    emptyStateView
                } else {
                    eventList
                }
            }
            .navigationTitle(product.displayName)
            .searchable(text: $searchText, prompt: "Filter events...")
            .onSubmit(of: .search) {
                Task { await fetchInitialEvents() }
            }
            .onChange(of: searchText) { _, newValue in
                if newValue.isEmpty {
                    Task { await fetchInitialEvents() }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    filterMenu
                }
            }
            .refreshable {
                await fetchInitialEvents()
            }
            .task(id: product) {
                await fetchInitialEvents()
            }
        }
    }

    // MARK: - Subviews

    @ViewBuilder
    private var eventList: some View {
        List {
            ForEach(events) { event in
                NavigationLink(destination: EventDetailView(eventId: event.id, product: product)) {
                    eventRow(event)
                }
                .onAppear {
                    if event.id == events.last?.id && nextCursor != nil && !isLoadingMore {
                        Task { await fetchMoreEvents() }
                    }
                }
            }

            if isLoadingMore {
                HStack {
                    Spacer()
                    ProgressView("Loading older events...")
                        .font(.caption)
                    Spacer()
                }
                .listRowSeparator(.hidden)
                .padding(.vertical, 8)
            }
        }
        .listStyle(.plain)
    }

    @ViewBuilder
    private func eventRow(_ event: HarvyEvent) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                statusBadge(event.status)

                Spacer()

                Text(event.lastSeenDate.formatted(.relative(presentation: .named)))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Text(event.title)
                .font(.headline)
                .lineLimit(2)

            Text(event.summary)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack(spacing: 12) {
                if let count = event.evidenceCount, count > 0 {
                    Label("\(count) evidence", systemImage: "doc.text.magnifyingglass")
                }

                if event.latitude != nil && event.longitude != nil {
                    Label("Geo", systemImage: "mappin")
                }

                if let assigned = event.assignedTo {
                    Label(assigned, systemImage: "person")
                }
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .padding(.top, 2)
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func statusBadge(_ status: EventStatus) -> some View {
        Text(status.displayName)
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
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

    @ViewBuilder
    private var emptyStateView: some View {
        ContentUnavailableView {
            Label("No Events Found", systemImage: "tray")
        } description: {
            Text("No \(product.displayName) events match the current filter or search criteria.")
        } actions: {
            Button("Clear Filters") {
                selectedStatus = nil
                searchText = ""
                Task { await fetchInitialEvents() }
            }
            .buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    private func errorStateView(_ message: String) -> some View {
        ContentUnavailableView {
            Label("Connection Failed", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Try Again") {
                Task { await fetchInitialEvents() }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    @ViewBuilder
    private var filterMenu: some View {
        Menu {
            Button {
                selectedStatus = nil
                Task { await fetchInitialEvents() }
            } label: {
                if selectedStatus == nil {
                    Label("All Statuses", systemImage: "checkmark")
                } else {
                    Text("All Statuses")
                }
            }

            Divider()

            ForEach(EventStatus.allCases, id: \.self) { status in
                Button {
                    selectedStatus = status
                    Task { await fetchInitialEvents() }
                } label: {
                    if selectedStatus == status {
                        Label(status.displayName, systemImage: "checkmark")
                    } else {
                        Text(status.displayName)
                    }
                }
            }
        } label: {
            Image(systemName: selectedStatus == nil ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
        }
    }

    // MARK: - Networking Actions

    private func fetchInitialEvents() async {
        guard let key = sessionStore.apiKey else { return }
        isLoading = true
        errorMessage = nil

        let endpoint = Endpoints.events(
            product: product,
            limit: 50,
            before: nil,
            status: selectedStatus,
            searchQuery: searchText.isEmpty ? nil : searchText
        )

        guard let request = endpoint.makeRequest() else {
            errorMessage = "Invalid request format."
            isLoading = false
            return
        }

        do {
            let response: PaginatedEventsResponse = try await apiClient.send(
                request,
                apiKey: key,
                product: product,
                organizationId: sessionStore.organizationId
            )
            self.events = response.items
            self.nextCursor = response.nextCursor
        } catch {
            self.errorMessage = error.localizedDescription
        }
        self.isLoading = false
    }

    private func fetchMoreEvents() async {
        guard let cursor = nextCursor, !cursor.isEmpty, !isLoadingMore else { return }
        guard let key = sessionStore.apiKey else { return }
        isLoadingMore = true

        let endpoint = Endpoints.events(
            product: product,
            limit: 50,
            before: cursor,
            status: selectedStatus,
            searchQuery: searchText.isEmpty ? nil : searchText
        )

        guard let request = endpoint.makeRequest() else {
            isLoadingMore = false
            return
        }

        do {
            let response: PaginatedEventsResponse = try await apiClient.send(
                request,
                apiKey: key,
                product: product,
                organizationId: sessionStore.organizationId
            )
            self.events.append(contentsOf: response.items)
            self.nextCursor = response.nextCursor
        } catch {
            // Keep existing loaded events on pagination error
        }
        self.isLoadingMore = false
    }
}
