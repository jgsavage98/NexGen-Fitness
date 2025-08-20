import SwiftUI

@main
struct NexGenApp: App {
    @StateObject var session = Session()
    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(session)
        }
    }
}

final class Session: ObservableObject {
    @Published var role: UserRole? = .trainer // change to .client to preview
}

enum UserRole { case trainer, client }
