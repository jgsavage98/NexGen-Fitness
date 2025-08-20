import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: Session
    var body: some View {
        Group {
            switch session.role {
            case .trainer: TrainerTabView()
            case .client: ClientTabView()
            case .none: Text("Signing in...")
            }
        }
    }
}
