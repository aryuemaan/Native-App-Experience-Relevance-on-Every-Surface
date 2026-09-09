import XCTest
@testable import PulseKit

final class DecodingTests: XCTestCase {
    func testDecodesMomentEnvelope() throws {
        let json = """
        {"type":"moment","moment":{"id":"m1","userId":"marek","kind":"score_update",
        "contentClass":"informational","surface":"live_activity","title":"GOAL",
        "body":"1:0","reasons":[{"code":"ALLOWED_INFORMATIONAL","message":"ok"}],
        "createdAt":"2026-06-01T12:00:00Z"}}
        """.data(using: .utf8)!
        let env = try JSONDecoder().decode(MomentEnvelope.self, from: json)
        XCTAssertEqual(env.moment?.surface, .live_activity)
        XCTAssertEqual(env.moment?.contentClass, .informational)
    }
}
