"""
The interactive recording flow.

Recording a reference is the one step where the human has to perform, so the
terminal has to do more than accept flags: pick a style, pick a length, see the
script large enough to read from three feet away, get a countdown so the first
word is not clipped, and get told immediately whether what was captured is
usable.

`rich` renders it; `questionary` handles the choices.
"""
import sys
import time
from pathlib import Path

import questionary
from rich.align import Align
from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import BarColumn, Progress, TextColumn, TimeRemainingColumn
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from . import templates

# Bound to the real stdout at import, before anything can redirect it.
#
# `captured()` swaps sys.stdout while the model loads and while each chunk is
# inferred, to swallow the library's prints and tqdm bars. A Console created
# without an explicit stream looks sys.stdout up on every write, so it would be
# swallowed too — the spinner freezes on its first frame and the bar never
# advances, which is exactly what a hang looks like.
console = Console(file=sys.stdout)

STYLE = questionary.Style([
    ("qmark", "fg:#7dd3fc bold"),
    ("question", "bold"),
    ("pointer", "fg:#fbbf24 bold"),
    ("highlighted", "fg:#fbbf24 bold"),
    ("selected", "fg:#34d399"),
])


def banner():
    console.print()
    console.print(Panel(
        Align.center(Text.from_markup(
            "[bold white]voice[/]  [dim]·[/]  [cyan]clone your voice from the terminal[/]")),
        border_style="cyan", padding=(0, 2)))


def choose_template():
    choices = [
        questionary.Choice(title=f"{t['label']}", value=key)
        for key, t in templates.TEMPLATES.items()
    ]
    key = questionary.select(
        "What should this voice sound like?", choices=choices, style=STYLE).ask()
    if key is None:
        raise SystemExit(0)

    tpl = templates.get(key)
    if key == "custom":
        text = questionary.text(
            "Type the passage you'll read:", style=STYLE).ask()
        if not text:
            raise SystemExit(0)
        tpl = {**tpl, "text": text.strip()}
    return key, tpl


def choose_duration(tpl):
    """
    Offer a window sized to the script, not a number picked in a vacuum.

    Offering "10s / 12s / 15s" next to a passage that takes 19 seconds to read
    properly is a trap: the progress bar becomes a countdown and the reader
    races it. F5-TTS clones pace, so a rushed reference makes every future line
    sound rushed — the fault shows up minutes of finished narration later, far
    from its cause.
    """
    natural = templates.natural_seconds(tpl["text"])
    comfortable = int(natural + 3)      # room to breathe and not clip the last word
    unhurried = int(natural + 7)

    choices = [
        questionary.Choice(
            title=f"{comfortable}s — matches this script at a natural pace  (recommended)",
            value=comfortable),
        questionary.Choice(
            title=f"{unhurried}s — slower, with pauses; best for narration",
            value=unhurried),
        questionary.Choice(title="Custom…", value=None),
    ]
    console.print(
        f"  [dim]This script is {len(tpl['text'].split())} words — "
        f"about {natural:.0f}s read without hurrying.[/]")
    secs = questionary.select("How long a window?", choices=choices, style=STYLE).ask()
    if secs is None:
        raw = questionary.text("Seconds:", default=str(comfortable), style=STYLE).ask()
        secs = int(raw or comfortable)
    return secs


def choose_device(devices):
    if len(devices) == 1:
        return devices[0][0]
    # Virtual devices (Zoom, Loopback) install at index 0 and capture silence,
    # so surface the real microphone first rather than trusting the order.
    ordered = sorted(devices, key=lambda d: "microphone" not in d[1].lower())
    choices = [questionary.Choice(title=name, value=idx) for idx, name in ordered]
    return questionary.select("Which microphone?", choices=choices, style=STYLE).ask()


def show_script(tpl, seconds):
    """The passage, large and centred, with the delivery note above it."""
    lines = [s.strip() for s in tpl["text"].replace(" — ", " — \n").split(". ")]
    body = Text()
    for i, line in enumerate(lines):
        if not line:
            continue
        body.append(line.rstrip(".") + ("." if not line.endswith(("!", "?", ".")) else ""),
                    style="bold white")
        if i < len(lines) - 1:
            body.append("\n\n")

    console.print()
    console.print(Panel(
        Group(
            Text(tpl["hint"], style="italic yellow"),
            Text(""),
            body,
        ),
        title=f"[bold]{tpl['label']}[/]",
        subtitle=f"[dim]{seconds}s · read at your normal pace[/]",
        border_style="yellow", padding=(1, 3)))


def countdown(n=3):
    console.print()
    for i in range(n, 0, -1):
        console.print(Align.center(Text(str(i), style="bold cyan on black")), end="\r")
        time.sleep(1)
    console.print(Align.center(Text("● RECORDING — speak now", style="bold white on red")))


def recording_bar(seconds):
    with Progress(
        TextColumn("[bold red]●[/]"),
        BarColumn(bar_width=48, complete_style="red", finished_style="red"),
        TextColumn("[dim]{task.percentage:>3.0f}%[/]"),
        TimeRemainingColumn(),
        console=console, transient=True,
    ) as bar:
        task = bar.add_task("rec", total=seconds)
        for _ in range(seconds * 10):
            time.sleep(0.1)
            bar.advance(task, 0.1)


def report(path, rate, duration, issues, script=None):
    t = Table.grid(padding=(0, 2))
    t.add_column(style="dim", justify="right")
    t.add_column()
    t.add_row("file", str(path))
    t.add_row("rate", f"{rate} Hz" + ("  [green]✓[/]" if rate >= 24000 else "  [red]✗[/]"))
    t.add_row("length", f"{duration:.1f}s" + ("  [green]✓[/]" if 10 <= duration <= 25 else "  [yellow]![/]"))

    # Pace is the property that actually transfers. A technically perfect file
    # read at four words a second clones into four words a second, forever.
    if script:
        wps, label, colour = templates.pace_of(script, duration)
        mark = "[green]✓[/]" if colour == "green" else ("[yellow]![/]" if colour == "yellow" else "[red]✗[/]")
        t.add_row("pace", f"{wps:.1f} words/sec  [{colour}]{label}[/]  {mark}")

    body = [t]
    if script:
        wps, label, colour = templates.pace_of(script, duration)
        if colour != "green":
            direction = "slower" if wps > 2.8 else "a little faster"
            body.append(Text(""))
            body.append(Text.from_markup(
                f"[{colour}]Pace is {label}.[/] F5-TTS clones pace, so everything you "
                f"generate will sound this way. Re-record {direction} — it matters "
                f"more than the sample rate."))
    if issues:
        body.append(Text(""))
        for issue in issues:
            body.append(Text.from_markup(f"[yellow]![/] {issue}"))
    else:
        body.append(Text(""))
        body.append(Text.from_markup("[green]Good reference.[/] Nothing here is holding the clone back."))

    console.print()
    console.print(Panel(Group(*body), title="[bold]captured[/]",
                        border_style="green" if not issues else "yellow", padding=(1, 2)))


def next_steps(profile_name):
    console.print()
    console.print(Rule("[dim]next[/]", style="dim"))
    t = Table.grid(padding=(0, 3))
    t.add_column(style="cyan bold")
    t.add_column(style="dim")
    t.add_row('voice say "Hello, this is my cloned voice."', "try it")
    t.add_row("voice batch script.json --out-dir ./out", "many passages, one model load")
    t.add_row("voice record --name other", "record another style")
    console.print(t)
    console.print()
    console.print(f"  [dim]profile[/] [bold]{profile_name}[/] [dim]is now the default.[/]")
    console.print()


def synth_panel(result):
    t = Table.grid(padding=(0, 2))
    t.add_column(style="dim", justify="right")
    t.add_column()
    t.add_row("output", result["path"])
    t.add_row("audio", f"{result['duration']:.1f}s in {result['chunks']} chunk(s)")
    t.add_row("took", f"{result['elapsed']:.1f}s  [dim]({result['realtime']:.2f}x realtime)[/]")
    console.print()
    console.print(Panel(t, border_style="cyan", padding=(1, 2)))
    console.print()


def play(path):
    """Play back through the system player. macOS ships afplay; Linux may not."""
    import shutil
    import subprocess
    for player in ("afplay", "aplay", "ffplay"):
        if shutil.which(player):
            cmd = [player, str(path)]
            if player == "ffplay":
                cmd = ["ffplay", "-nodisp", "-autoexit", "-loglevel", "error", str(path)]
            console.print("  [dim]playing…[/]")
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
    console.print("  [yellow]No audio player found.[/] Install ffmpeg for ffplay.")
    return False


def after_record(has_issues):
    """
    What to do with the take just captured.

    Listening is the only way to judge a reference — the numbers say whether the
    file is technically adequate, not whether the delivery is any good, and
    delivery is what gets cloned. So playback leads, and it loops: hearing it
    twice is normal and re-recording is one keypress, not a re-run of the whole
    command.
    """
    choices = [
        questionary.Choice(title="Listen to it", value="play"),
        questionary.Choice(title="Keep this take", value="keep"),
        questionary.Choice(title="Record again", value="retry"),
        questionary.Choice(title="Record again — different style or length", value="restart"),
    ]
    if has_issues:
        # Lead with the fix when the take is measurably weak.
        choices.insert(0, choices.pop(2))
    return questionary.select("", choices=choices, style=STYLE).ask()


# ── after keeping a take: straight into synthesis ───────────────────────────

SAY_TEMPLATES = {
    "test": ("Quick test — one sentence",
             "This is my cloned voice. If this sounds like me, the reference worked."),
    "intro": ("Video intro — hook the viewer",
              "Serving a seventy billion parameter model to ten thousand users "
              "sounds impossible. In the next three minutes, I'll show you exactly "
              "how the top labs actually do it."),
    "outro": ("Video outro — call to action",
              "That's the whole idea. If you want to practise this properly — draw "
              "it, get it marked, and be asked the follow-ups — the full course is "
              "linked below. See you in the next one."),
    "paste": ("Type or paste your own text", None),
    "file":  ("Read from a file", None),
}


def ask_synthesize():
    return questionary.confirm(
        "Generate speech with this voice now?", default=True, style=STYLE).ask()


def choose_say_text():
    """Pick what to say. Returns text, or None to stop."""
    choices = [questionary.Choice(title=label, value=key)
               for key, (label, _) in SAY_TEMPLATES.items()]
    choices.append(questionary.Choice(title="Done for now", value=None))
    key = questionary.select("What should it say?", choices=choices, style=STYLE).ask()
    if key is None:
        return None

    if key == "paste":
        text = questionary.text("Text:", style=STYLE, multiline=True).ask()
        return (text or "").strip() or None
    if key == "file":
        path = questionary.path("File:", style=STYLE).ask()
        if not path:
            return None
        return Path(path).expanduser().read_text().strip()
    return SAY_TEMPLATES[key][1]


def choose_output(default="out.wav"):
    path = questionary.text("Save to:", default=default, style=STYLE).ask()
    return path or default


def peak_memory_mb():
    """
    Peak resident set size for this process.

    `ru_maxrss` is bytes on macOS and kilobytes on Linux — the same field, two
    different units, and getting it wrong reports a 1000x error rather than
    failing.
    """
    import resource
    import sys as _sys
    raw = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return raw / (1024 * 1024) if _sys.platform == "darwin" else raw / 1024


def stats_panel(result, memory_mb=None, model_load=None, ref_encode=None, engine=None):
    t = Table.grid(padding=(0, 2))
    t.add_column(style="dim", justify="right")
    t.add_column()

    if engine:
        t.add_row("engine", f"[bold cyan]{engine}[/]")
    t.add_row("output", f"[bold]{result['path']}[/]")
    t.add_row("audio", f"{result['duration']:.1f}s  [dim]· {result['chunks']} chunk(s)[/]")
    t.add_row("", "")
    t.add_row("synthesis", f"{result['elapsed']:.1f}s")
    if model_load is not None:
        t.add_row("model load", f"{model_load:.1f}s  [dim]once per session[/]")
    if ref_encode is not None:
        t.add_row("reference", f"{ref_encode:.1f}s  [dim]once, reused per chunk[/]")
    t.add_row("speed", f"[bold]{result['realtime']:.2f}x[/] realtime"
                       f"  [dim]({result['duration'] / result['elapsed']:.2f}s audio per second)[/]")
    if memory_mb is not None:
        t.add_row("peak memory", f"{memory_mb:,.0f} MB")

    console.print()
    console.print(Panel(t, title="[bold green]done[/]", border_style="green", padding=(1, 2)))


def after_say(path):
    choices = [
        questionary.Choice(title="Listen to it", value="play"),
        questionary.Choice(title="Generate something else", value="again"),
        questionary.Choice(title="Done", value="done"),
    ]
    return questionary.select("", choices=choices, style=STYLE).ask()


# ── home menu ───────────────────────────────────────────────────────────────

def profile_summary(profiles):
    """A compact table of saved voices, or None if there are none."""
    import soundfile as sf
    from . import templates as _t

    names = [k for k in profiles if not k.startswith("_")]
    if not names:
        return None

    t = Table.grid(padding=(0, 3))
    t.add_column(style="bold")
    t.add_column(style="dim")
    t.add_column()
    for name in names:
        p = profiles[name]
        marker = "[green]●[/]" if name == profiles.get("_default") else " "
        try:
            info = sf.info(p["audio"])
            wps, label, colour = _t.pace_of(p.get("text", ""), info.duration)
            detail = f"{info.samplerate // 1000} kHz · {info.duration:.0f}s · [{colour}]{label}[/]"
        except Exception:
            detail = "[red]file missing[/]"
        t.add_row(f"{marker} {name}", p.get("template", ""), detail)
    return t


def home(profiles):
    """
    The entry point when `voice` is run bare.

    Most sessions are one of three things — record a voice, say something with
    the voice you already have, or check what you have — and none of them should
    require remembering a subcommand.
    """
    banner()

    table = profile_summary(profiles)
    if table is not None:
        console.print(Panel(table, title="[bold]your voices[/]",
                            border_style="cyan", padding=(1, 2)))
    else:
        console.print(Panel(
            Text("No voices yet. Record one — it takes about thirty seconds.",
                 style="dim"),
            border_style="dim", padding=(1, 2)))
    console.print()

    has_voice = table is not None
    choices = []
    if has_voice:
        choices += [
            questionary.Choice(title="Write text and generate audio", value="say"),
            questionary.Choice(title="Read a file and generate audio", value="file"),
            questionary.Choice(title="Generate many passages from a script", value="batch"),
        ]
    choices += [questionary.Choice(title="Record a new voice", value="record")]
    if has_voice:
        choices += [
            questionary.Choice(title="Switch which voice is the default", value="switch"),
            questionary.Choice(title="Listen to a saved reference", value="listen"),
        ]
    choices += [questionary.Choice(title="Quit", value=None)]

    return questionary.select("What would you like to do?", choices=choices, style=STYLE).ask()


def choose_profile(profiles, prompt="Which voice?"):
    names = [k for k in profiles if not k.startswith("_")]
    if len(names) == 1:
        return names[0]
    choices = [questionary.Choice(
        title=f"{n}  ({profiles[n].get('template', '—')})", value=n) for n in names]
    return questionary.select(prompt, choices=choices, style=STYLE).ask()


def write_text():
    """Free text entry. Esc-then-Enter submits, which questionary shows inline."""
    console.print("  [dim]Type your script. Multi-line is fine.[/]")
    text = questionary.text("", style=STYLE, multiline=True).ask()
    return (text or "").strip() or None


def choose_speed(default=0.75):
    """
    Playback pace for synthesis.

    Exposed because it is the fastest correction for a reference that was read
    too quickly: F5-TTS clones the reference's pace, and this scales it after
    the fact without re-recording.
    """
    choices = [
        questionary.Choice(title="0.75 — natural explaining pace  (recommended)", value=0.75),
        questionary.Choice(title="0.65 — unhurried, for narration", value=0.65),
        questionary.Choice(title="0.85 — brisk", value=0.85),
        questionary.Choice(title="1.00 — match the reference exactly", value=1.0),
    ]
    return questionary.select("Speaking pace?", choices=choices, style=STYLE).ask() or default


# ── progress while synthesising ─────────────────────────────────────────────

class SynthProgress:
    """
    What the terminal shows while a passage is being generated.

    Two phases with different shapes. Setup — loading the model, encoding the
    reference — has no measurable progress, so it gets a spinner and a label.
    Synthesis has a known number of chunks, so it gets a bar that advances as
    each lands, with the audio produced so far next to it. The distinction
    matters: a bar that sits at zero for twenty seconds reads as a hang.
    """

    def __init__(self, total_hint=None):
        from rich.progress import (BarColumn, Progress, SpinnerColumn,
                                   TextColumn, TimeElapsedColumn)
        self._Progress = Progress
        self._cols = (
            SpinnerColumn(style="cyan"),
            TextColumn("[bold]{task.description}"),
            BarColumn(bar_width=30, complete_style="cyan", finished_style="green"),
            TextColumn("{task.fields[note]}"),
            TimeElapsedColumn(),
        )
        self.progress = None
        self.task = None
        self.audio_so_far = 0.0

    def __enter__(self):
        self.progress = self._Progress(*self._cols, console=console, transient=True)
        self.progress.start()
        self.task = self.progress.add_task("preparing", total=None, note="")
        return self

    def __exit__(self, *exc):
        self.progress.stop()
        return False

    def status(self, label):
        """Setup phase: no total, so the bar renders as an indeterminate pulse."""
        self.progress.update(self.task, description=label, total=None, note="")

    def chunk(self, index, total, chars, audio_secs, elapsed):
        self.audio_so_far += audio_secs
        self.progress.update(
            self.task,
            description="generating",
            total=total,
            completed=index,
            note=f"[dim]{index}/{total} · {self.audio_so_far:.1f}s audio[/]",
        )
