import SwiftUI

struct ClientTabView: View {
    var body: some View {
        TabView {
            Text("Today (stub)").tabItem { Label("Today", systemImage: "sun.max") }
            Text("Messages (stub)").tabItem { Label("Messages", systemImage: "bubble.left") }
            Text("Progress (stub)").tabItem { Label("Progress", systemImage: "chart.line.uptrend.xyaxis") }
            Text("Settings (stub)").tabItem { Label("Settings", systemImage: "gear") }
        }
    }
}
