import Foundation
import BlocksRuntime

public struct SyncEnvironment {
    public static var apiBaseURL: URL {
        #if DEBUG
        if let envUrl = ProcessInfo.processInfo.environment["BLOCKS_API_URL"],
           let url = URL(string: envUrl) {
            return url
        }
        return URL(string: "http://localhost:3000")!
        #else
        return URL(string: "https://api.chewbuu.com")!
        #endif
    }

    public static func defaultServer() -> BlocksServer {
        BlocksServer(
            name: "production",
            url: apiBaseURL.absoluteString
        )
    }
}
