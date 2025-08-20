import SwiftUI

struct TrainerTabView: View {
    var body: some View {
        TabView {
            Text("Roster (stub)").tabItem { Label("Roster", systemImage: "person.3") }
            Text("Chats (stub)").tabItem { Label("Chats", systemImage: "bubble.left.and.bubble.right") }
            Text("Automation (stub)").tabItem { Label("Automation", systemImage: "alarm") }
            Text("AI (stub)").tabItem { Label("AI", systemImage: "wand.and.stars") }
        }
    }
}
