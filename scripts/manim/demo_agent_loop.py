"""
Manim Demo: Agent Loop Concept
《一个人的事务所》— Agent 循环与 stop_reason 动画示例
Run: manim -pqh scripts/manim/demo_agent_loop.py AgentLoopScene
"""

from manim import *


class AgentLoopScene(Scene):
    def construct(self):
        # ── Background color
        self.camera.background_color = "#0f0f1a"

        # ── Title
        title = Text("One Agent, One Loop", font_size=48, color=WHITE, weight=BOLD)
        subtitle = Text("stop_reason is the brake — not a round counter", font_size=24, color="#a0a8c0")
        title_group = VGroup(title, subtitle).arrange(DOWN, buff=0.3).to_edge(UP, buff=0.6)
        self.play(FadeIn(title_group, shift=DOWN * 0.3))
        self.wait(0.5)

        # ── Agent circle (the stick-figure's brain)
        agent_circle = Circle(radius=0.8, color="#4f8ef7", fill_opacity=0.15, stroke_width=3)
        agent_label = Text("Agent", font_size=26, color="#4f8ef7", weight=BOLD)
        agent = VGroup(agent_circle, agent_label).move_to(LEFT * 4)

        # ── Tool box
        tool_rect = RoundedRectangle(corner_radius=0.2, width=2.2, height=1.0,
                                      color="#f7c94f", fill_opacity=0.15, stroke_width=3)
        tool_label = Text("Tool Call", font_size=22, color="#f7c94f", weight=BOLD)
        tool = VGroup(tool_rect, tool_label).move_to(ORIGIN)

        # ── Stop signal (end_turn)
        stop_rect = RoundedRectangle(corner_radius=0.2, width=2.5, height=1.0,
                                      color="#f74f4f", fill_opacity=0.15, stroke_width=3)
        stop_label = Text("stop_reason\n= end_turn", font_size=20, color="#f74f4f", weight=BOLD)
        stop = VGroup(stop_rect, stop_label).move_to(RIGHT * 4)

        self.play(
            FadeIn(agent, shift=RIGHT * 0.3),
            FadeIn(tool, shift=UP * 0.2),
            FadeIn(stop, shift=LEFT * 0.3),
        )
        self.wait(0.3)

        # ── Arrows: loop arrows
        arrow_agent_to_tool = Arrow(
            agent.get_right(), tool.get_left(),
            buff=0.15, color="#4f8ef7", stroke_width=4,
            max_tip_length_to_length_ratio=0.15
        )
        arrow_tool_to_agent = CurvedArrow(
            tool.get_top(), agent.get_top(),
            angle=-PI / 3, color="#f7c94f", stroke_width=3
        )
        arrow_agent_to_stop = Arrow(
            tool.get_right(), stop.get_left(),
            buff=0.15, color="#f74f4f", stroke_width=4,
            max_tip_length_to_length_ratio=0.15
        )

        self.play(GrowArrow(arrow_agent_to_tool))
        self.wait(0.2)
        self.play(Create(arrow_tool_to_agent))  # CurvedArrow: use Create() not GrowArrow
        self.wait(0.2)
        self.play(GrowArrow(arrow_agent_to_stop))
        self.wait(0.5)

        # ── Annotation: NOT round count
        wrong_label = Text("❌  NOT: after N rounds", font_size=22, color="#ff6b6b")
        right_label = Text("✅  YES: when end_turn fires", font_size=22, color="#6bff9e")
        annotations = VGroup(wrong_label, right_label).arrange(DOWN, buff=0.3).to_edge(DOWN, buff=1.2)

        self.play(
            Write(wrong_label),
        )
        self.wait(0.4)
        self.play(
            Write(right_label),
        )
        self.wait(1.5)

        # ── Pulse the stop signal
        self.play(
            stop_rect.animate.set_stroke(color="#ff2222", width=6),
            stop_label.animate.set_color("#ff6b6b"),
            run_time=0.5
        )
        self.play(
            stop_rect.animate.set_stroke(color="#f74f4f", width=3),
            stop_label.animate.set_color("#f74f4f"),
            run_time=0.5
        )
        self.wait(1.0)

        # ── Fade out
        self.play(FadeOut(Group(*self.mobjects), shift=UP * 0.3), run_time=0.8)
