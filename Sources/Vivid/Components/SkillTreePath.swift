import SwiftUI

/// Skill tree with a single curved path drawn with `.trim` on appear,
/// nodes that spring-unlock, and tight spacing (the current layout spends
/// two screens on four locked nodes).
struct SkillNode: Identifiable {
    enum State { case done, active, locked }
    let id: String
    let title: String
    let icon: String
    let tint: Color
    let state: State
}

struct SkillTreePath: View {
    let nodes: [SkillNode]
    let onTap: (SkillNode) -> Void

    private let rowHeight: CGFloat = 128   // tight: node + label + connector

    var body: some View {
        ZStack(alignment: .top) {
            // One continuous serpentine path behind all nodes
            PathShape(count: nodes.count, rowHeight: rowHeight)
                .stroke(Color.primary.opacity(0.08), style: StrokeStyle(lineWidth: 4, lineCap: .round))
            AnimatedProgressPath(nodes: nodes, rowHeight: rowHeight)

            // Nodes
            VStack(spacing: 0) {
                ForEach(Array(nodes.enumerated()), id: \.element.id) { index, node in
                    HStack {
                        if index.isMultiple(of: 2) {
                            nodeView(node, index: index); Spacer()
                        } else {
                            Spacer(); nodeView(node, index: index)
                        }
                    }
                    .padding(.horizontal, 36)
                    .frame(height: rowHeight)
                }
            }
        }
    }

    @ViewBuilder
    private func nodeView(_ node: SkillNode, index: Int) -> some View {
        Button { onTap(node) } label: {
            VStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(node.state == .locked ? node.tint.opacity(0.12) : node.tint)
                        .frame(width: node.state == .active ? 74 : 60,
                               height: node.state == .active ? 74 : 60)
                        .shadow(color: node.state == .locked ? .clear : node.tint.opacity(0.35),
                                radius: 14, y: 6)
                    Image(systemName: node.state == .locked ? "lock.fill"
                          : node.state == .done ? "checkmark" : node.icon)
                        .font(.system(size: node.state == .active ? 26 : 20, weight: .bold))
                        .foregroundStyle(node.state == .locked ? node.tint.opacity(0.6) : .white)
                        .contentTransition(.symbolEffect(.replace))
                }
                Text(node.title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(node.state == .locked ? .secondary : .primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 150)
                if node.state == .active {
                    Text("Start challenge")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(node.tint)
                }
            }
        }
        .buttonStyle(.plain)
        .pressable(scale: 0.94)
        .disabled(node.state == .locked)
        .opacity(node.state == .locked ? 0.75 : 1)
        .transition(.scale.combined(with: .opacity))
        .vividAnimation(Motion.stagger(index, base: Motion.standard), value: node.state)
        .accessibilityLabel("\(node.title), \(accessibilityState(node.state))")
    }

    private func accessibilityState(_ s: SkillNode.State) -> String {
        switch s {
        case .done: "completed"
        case .active: "current challenge"
        case .locked: "locked"
        }
    }
}

/// The serpentine connector as one Shape — alternating left/right nodes.
private struct PathShape: Shape {
    let count: Int
    let rowHeight: CGFloat

    func path(in rect: CGRect) -> Path {
        var p = Path()
        guard count > 1 else { return p }
        let leftX = rect.minX + 66 + 36
        let rightX = rect.maxX - 66 - 36
        func x(_ i: Int) -> CGFloat { i.isMultiple(of: 2) ? leftX : rightX }
        func y(_ i: Int) -> CGFloat { rect.minY + CGFloat(i) * rowHeight + 37 }

        p.move(to: CGPoint(x: x(0), y: y(0)))
        for i in 1..<count {
            let from = CGPoint(x: x(i - 1), y: y(i - 1))
            let to = CGPoint(x: x(i), y: y(i))
            let midY = (from.y + to.y) / 2
            p.addCurve(
                to: to,
                control1: CGPoint(x: from.x, y: midY),
                control2: CGPoint(x: to.x, y: midY)
            )
        }
        return p
    }
}

/// The colored portion of the path up to the active node, drawn with a trim
/// animation on appear — progress you can literally watch travel.
private struct AnimatedProgressPath: View {
    let nodes: [SkillNode]
    let rowHeight: CGFloat
    @State private var trimEnd: CGFloat = 0

    private var progressFraction: CGFloat {
        guard nodes.count > 1 else { return 0 }
        let reached = nodes.lastIndex(where: { $0.state != .locked }) ?? 0
        return CGFloat(reached) / CGFloat(nodes.count - 1)
    }

    var body: some View {
        PathShape(count: nodes.count, rowHeight: rowHeight)
            .trim(from: 0, to: trimEnd)
            .stroke(
                LinearGradient(colors: [VividTheme.purple, VividTheme.orange],
                               startPoint: .top, endPoint: .bottom),
                style: StrokeStyle(lineWidth: 4, lineCap: .round)
            )
            .onAppear {
                withAnimation(Motion.gentle.delay(0.25)) { trimEnd = progressFraction }
            }
    }
}
