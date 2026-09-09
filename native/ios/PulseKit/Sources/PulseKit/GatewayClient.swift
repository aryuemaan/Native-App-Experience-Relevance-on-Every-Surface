import Foundation

/// Connects to the Fortuna Pulse gateway: a resilient WebSocket for the
/// followed-only moment stream, plus the REST calls the app surfaces need.
///
/// On device, the Care Gate has already run server-side, so every `Moment`
/// delivered here is safe to render. The client re-checks nothing — it only
/// mirrors what the user already chose onto the appropriate surface.
public final class GatewayClient: NSObject, @unchecked Sendable {
    public struct Config: Sendable {
        public var baseURL: URL
        public init(baseURL: URL) { self.baseURL = baseURL }
    }

    private let config: Config
    private var task: URLSessionWebSocketTask?
    private lazy var session = URLSession(configuration: .default)

    public init(config: Config) { self.config = config }

    // MARK: streaming

    public func connect(userId: String, onMoment: @escaping @Sendable (Moment) -> Void) {
        var comps = URLComponents(url: config.baseURL, resolvingAgainstBaseURL: false)!
        comps.scheme = (comps.scheme == "https") ? "wss" : "ws"
        comps.path = "/stream"
        comps.queryItems = [URLQueryItem(name: "userId", value: userId)]
        guard let url = comps.url else { return }

        let task = session.webSocketTask(with: url)
        self.task = task
        task.resume()
        receive(on: task, onMoment: onMoment, userId: userId)
    }

    private func receive(on task: URLSessionWebSocketTask,
                         onMoment: @escaping @Sendable (Moment) -> Void,
                         userId: String) {
        task.receive { [weak self] result in
            switch result {
            case .failure:
                // Reconnect with a short backoff — surfaces should self-heal.
                DispatchQueue.global().asyncAfter(deadline: .now() + 1.2) {
                    self?.connect(userId: userId, onMoment: onMoment)
                }
            case .success(let message):
                if case .string(let text) = message,
                   let data = text.data(using: .utf8),
                   let env = try? JSONDecoder().decode(MomentEnvelope.self, from: data),
                   env.type == "moment", let moment = env.moment {
                    onMoment(moment)
                }
                self?.receive(on: task, onMoment: onMoment, userId: userId)
            }
        }
    }

    public func disconnect() { task?.cancel(with: .goingAway, reason: nil) }

    // MARK: REST

    public func startScenario(userId: String) async {
        _ = try? await post("/api/demo/\(userId)/scenario")
    }

    public func setConsent(userId: String, marketing: Bool) async {
        _ = try? await put("/api/users/\(userId)/consent", ["marketing": marketing])
    }

    private func post(_ path: String) async throws -> Data {
        var req = URLRequest(url: config.baseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        return try await session.data(for: req).0
    }

    private func put(_ path: String, _ body: [String: Any]) async throws -> Data {
        var req = URLRequest(url: config.baseURL.appendingPathComponent(path))
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await session.data(for: req).0
    }
}

// MARK: - Betting actions (called from surfaces / App Intents)

public extension GatewayClient {
    /// One-tap cash-out from a Live Activity, watch complication or App Intent.
    func cashout(userId: String, ticketId: String? = nil) async -> Bool {
        var body: [String: Any] = [:]
        if let ticketId { body["ticketId"] = ticketId }
        let data = try? await post("/api/users/\(userId)/cashout", body)
        return data != nil
    }

    /// Spoken slip status for the Siri / voice shortcut.
    func slipStatus(userId: String) async -> String {
        guard let data = try? await get("/api/users/\(userId)/slip"),
              let status = try? JSONDecoder().decode(SlipStatus.self, from: data)
        else { return "Your slip is unavailable right now." }
        return status.spoken
    }

    /// Repeat-bet convenience action — the gateway enforces the RG guardrail and
    /// returns 403 when the user is self-excluded / at-risk / limit-reached.
    func repeatBetAllowed(userId: String) async -> Bool {
        (try? await post("/api/users/\(userId)/repeat-bet", [:])) != nil
    }
}

extension GatewayClient {
    func get(_ path: String) async throws -> Data {
        try await session.data(from: config.baseURL.appendingPathComponent(path)).0
    }
    func post(_ path: String, _ body: [String: Any]) async throws -> Data {
        var req = URLRequest(url: config.baseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await session.data(for: req)
        if let http = resp as? HTTPURLResponse, http.statusCode >= 400 {
            throw URLError(.badServerResponse)
        }
        return data
    }
}
