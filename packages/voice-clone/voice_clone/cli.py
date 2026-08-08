"""
`voice` — record a reference clip and speak in that voice, from the terminal.

    voice devices                       list microphones
    voice record                        capture a 12s reference at 48 kHz
    voice check                         report whether a reference is any good
    voice say "text"                    synthesise to a wav
    voice batch script.json             synthesise many passages in one process

A profile is a reference wav plus its exact transcript, stored under
~/.voice-clone. Everything after `voice record` defaults to it, so ordinary use
is one flag or none.
"""
import argparse
import json
import sys

from .quiet import silence_imports

# Before anything heavy is imported: pydub and friends raise their warnings at
# import time, so a filter installed later never sees them.
silence_imports()
from pathlib import Path

HOME = Path.home() / ".voice-clone"
PROFILES = HOME / "profiles.json"



def _profiles():
    if PROFILES.exists():
        return json.loads(PROFILES.read_text())
    return {}


def _save_profiles(data):
    HOME.mkdir(parents=True, exist_ok=True)
    PROFILES.write_text(json.dumps(data, indent=2))


def _resolve(name):
    profiles = _profiles()
    if not profiles:
        sys.exit("No voice profile yet. Run:  voice record")
    name = name or profiles.get("_default")
    if name not in profiles:
        sys.exit(f"No profile named {name!r}. Have: {', '.join(k for k in profiles if k != '_default')}")
    return profiles[name]


# ── commands ────────────────────────────────────────────────────────────────

def cmd_devices(_):
    from .record import devices
    for index, name in devices():
        print(f"  [{index}] {name}")


def cmd_record(args):
    """Interactive: pick a style and length, read the script, listen, keep or retry."""
    import subprocess
    import questionary
    from . import templates, ui
    from .record import devices, check, SAMPLE_RATE, _require_ffmpeg

    _require_ffmpeg()
    ui.banner()

    def pick_style():
        if args.template:
            tpl = templates.get(args.template)
            if tpl is None:
                sys.exit(f"No template {args.template!r}. Have: {', '.join(templates.names())}")
            return args.template, tpl
        return ui.choose_template()

    key, tpl = pick_style()
    seconds = args.seconds or ui.choose_duration(tpl)
    device = args.device if args.device is not None else ui.choose_device(devices())

    HOME.mkdir(parents=True, exist_ok=True)
    out = HOME / f"{args.name}.wav"

    while True:
        ui.show_script(tpl, seconds)
        if not questionary.confirm("Ready?", default=True, style=ui.STYLE).ask():
            raise SystemExit(0)

        ui.countdown()
        # ffmpeg runs in the background so the progress bar can advance alongside
        # it — the bar is what paces the reader through the script.
        proc = subprocess.Popen([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "avfoundation", "-i", f":{device}",
            "-t", str(seconds), "-ar", str(SAMPLE_RATE), "-ac", "1", str(out),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        ui.recording_bar(seconds)
        proc.wait()

        if not out.exists():
            sys.exit("Recording failed — is the microphone permitted for your terminal?")

        rate, duration, issues = check(out)
        ui.report(out, rate, duration, issues, script=tpl["text"])

        # Loop on playback: the numbers only say the file is technically usable.
        # Whether the delivery is worth cloning is a judgement only listening
        # settles, and hearing a take twice before deciding is normal.
        while True:
            action = ui.after_record(bool(issues))
            if action == "play":
                ui.play(out)
                continue
            break

        if action == "keep" or action is None:
            break
        if action == "restart":
            key, tpl = pick_style()
            seconds = ui.choose_duration(tpl)

    profiles = _profiles()
    profiles[args.name] = {"audio": str(out), "text": tpl["text"], "template": key}
    profiles["_default"] = args.name
    _save_profiles(profiles)

    # Straight into synthesis rather than ending at a shell prompt: the take was
    # just approved, the model has to be loaded either way, and hearing the clone
    # is what tells you whether the reference was actually good.
    if ui.ask_synthesize():
        _synthesis_session(profiles[args.name], args)
    ui.next_steps(args.name)


def _synthesis_session(profile, args):
    """Generate as many passages as wanted, through one loaded model."""
    from . import ui
    from .synth import Voice

    voice = None
    while True:
        text = ui.choose_say_text()
        if not text:
            return
        out = ui.choose_output()

        speed = ui.choose_speed()
        with ui.SynthProgress() as bar:
            if voice is None:
                # Built lazily and kept: the model load and reference encode are
                # the expensive part, done once for the whole session.
                voice = Voice(profile["audio"], profile["text"], device=None,
                              status=bar.status)
            bar.status("generating")
            result = voice.say(text, out, nfe_step=getattr(args, 'nfe', 16),
                               speed=speed, on_chunk=bar.chunk)
        ui.stats_panel(result, memory_mb=ui.peak_memory_mb(),
                       model_load=voice.model_load_secs, ref_encode=voice.ref_encode_secs)

        while True:
            action = ui.after_say(out)
            if action == "play":
                ui.play(out)
                continue
            break
        if action != "again":
            return


def cmd_check(args):
    from .record import check
    profile = _resolve(args.name)
    path = args.audio or profile["audio"]
    rate, duration, issues = check(path)
    print(f"  {path}")
    print(f"  {rate} Hz · {duration:.1f}s")
    if issues:
        for issue in issues:
            print(f"  ⚠️  {issue}")
    else:
        print("  ✅ Good reference.")


def cmd_say(args):
    profile = _resolve(args.name)

    text = args.text
    if args.file:
        text = Path(args.file).read_text()
    if not text:
        sys.exit("Nothing to say. Pass text, or --file.")

    out = Path(args.output or "out.wav")
    from . import adapters, engines, ui

    key = args.engine or (engines.default().key if engines.default() else "f5")
    with ui.SynthProgress() as bar:
        result = adapters.synthesize(key, profile["audio"], profile["text"],
                                     text, out, speed=args.speed, status=bar.status)
    ui.stats_panel(result, memory_mb=ui.peak_memory_mb(), engine=result.get("engine"))


def cmd_batch(args):
    """
    Synthesise many passages through one loaded model.

    This is where the design pays off: the model load and reference encode
    happen once for the whole batch rather than once per passage.

    Input is JSON — either {"id": "text", ...} or [{"id":…, "text":…}, …].
    """
    from .synth import Voice
    profile = _resolve(args.name)

    raw = json.loads(Path(args.script).read_text())
    items = ([(k, v) for k, v in raw.items()] if isinstance(raw, dict)
             else [(d["id"], d["text"]) for d in raw])

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    voice = Voice(profile["audio"], profile["text"], device=args.device)
    total = 0.0
    for i, (item_id, text) in enumerate(items, 1):
        out = out_dir / f"{item_id}.wav"
        if out.exists() and not args.force:
            print(f"  ⏭  [{i}/{len(items)}] {item_id} (cached)")
            continue
        print(f"  🎙  [{i}/{len(items)}] {item_id}")
        result = voice.say(text, out, nfe_step=args.nfe, cfg_strength=args.cfg,
                           speed=args.speed, seed=args.seed)
        total += result["elapsed"]
    print(f"\n  {len(items)} passage(s) → {out_dir}  ({total:.0f}s total)")


def cmd_home(args):
    """Bare `voice`: a menu, so nothing has to be remembered."""
    from . import ui
    from pathlib import Path as _P

    while True:
        profiles = _profiles()
        action = ui.home(profiles)
        if action is None:
            return

        if action == "record":
            args.template = args.seconds = args.device = None
            args.name = "me" if "me" not in profiles else \
                (questionary_name(profiles) or "me")
            cmd_record(args)
            continue

        name = ui.choose_profile(profiles)
        if not name:
            continue
        profile = profiles[name]

        if action == "listen":
            ui.play(profile["audio"])
            continue

        if action == "switch":
            profiles["_default"] = name
            _save_profiles(profiles)
            ui.console.print(f"\n  [green]{name}[/] is now the default.\n")
            continue

        if action == "batch":
            import questionary
            path = questionary.path("Script JSON:", style=ui.STYLE).ask()
            if not path:
                continue
            args.script, args.name = path, name
            args.out_dir = questionary.text(
                "Output folder:", default="./voice-out", style=ui.STYLE).ask() or "./voice-out"
            args.force = False
            args.speed = ui.choose_speed()
            cmd_batch(args)
            continue

        text = _read_file(ui) if action == "file" else ui.write_text()
        if not text:
            continue
        out = ui.choose_output()
        speed = ui.choose_speed()
        _run_say(profile, text, out, speed, args)


def questionary_name(profiles):
    import questionary
    from . import ui
    return questionary.text("Name this voice:", default="me", style=ui.STYLE).ask()


def _read_file(ui):
    """
    Ask for a path and read it.

    People paste the script itself here — the prompt says "File:" and a long
    passage still looks like an answer to it. Treating that as a path produced
    `OSError: File name too long` and a traceback, which explains nothing. If
    the answer is plainly prose rather than a path, take it as the text.
    """
    import questionary
    from pathlib import Path

    answer = questionary.path("File (or paste the text itself):", style=ui.STYLE).ask()
    if not answer:
        return None

    answer = answer.strip()
    path = Path(answer).expanduser()
    try:
        if path.is_file():
            return path.read_text().strip()
    except OSError:
        pass

    # Not a file. Spaces and sentence punctuation mean it was the script.
    if len(answer) > 120 or (" " in answer and not path.suffix):
        ui.console.print("  [dim]That looks like the text itself — using it directly.[/]")
        return answer

    ui.console.print(f"  [red]No such file:[/] {answer}")
    return None


def _run_say(profile, text, out, speed, args, voice=None):
    """Synthesise once and report, reusing a loaded Voice when given one."""
    from . import ui
    from .synth import Voice

    with ui.SynthProgress() as bar:
        if voice is None:
            voice = Voice(profile["audio"], profile["text"], device=None,
                          status=bar.status)
        bar.status("generating")
        result = voice.say(text, out, nfe_step=getattr(args, "nfe", 16),
                           speed=speed, on_chunk=bar.chunk)
    ui.stats_panel(result, memory_mb=ui.peak_memory_mb(),
                   model_load=voice.model_load_secs, ref_encode=voice.ref_encode_secs)

    while True:
        action = ui.after_say(out)
        if action == "play":
            ui.play(out)
            continue
        break
    if action == "again":
        text = ui.write_text()
        if text:
            _run_say(profile, text, ui.choose_output(), ui.choose_speed(), args, voice)
    return voice


def _friendly_excepthook(exc_type, exc, tb):
    if exc_type is KeyboardInterrupt:
        print()
        return
    try:
        from . import ui
        ui.console.print(f"\n  [red]{exc_type.__name__}[/] {exc}")
        ui.console.print("  [dim]Re-run with VOICE_DEBUG=1 for the full traceback.[/]\n")
    except Exception:
        print(f"\n  {exc_type.__name__}: {exc}\n")


def main():
    p = argparse.ArgumentParser(prog="voice", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=False)

    sub.add_parser("devices", help="list microphones").set_defaults(fn=cmd_devices)
    sub.add_parser("doctor", help="check this environment can synthesise").set_defaults(fn=cmd_doctor)

    e = sub.add_parser("engines", help="list or install TTS engines")
    e.add_argument("--install", metavar="KEY", default=None,
                   help="f5 | chatterbox")
    e.set_defaults(fn=cmd_engines)

    r = sub.add_parser("record", help="capture a reference clip")
    r.add_argument("--name", default="me")
    r.add_argument("--seconds", type=int, default=None, help="skip the prompt")
    r.add_argument("--device", type=int, default=None)
    r.add_argument("--template", default=None,
                   help="explainer | hook | narrator | conversational | custom")
    r.add_argument("--nfe", type=int, default=16)
    r.set_defaults(fn=cmd_record)

    c = sub.add_parser("check", help="report a reference clip's quality")
    c.add_argument("--name", default=None)
    c.add_argument("--audio", default=None)
    c.set_defaults(fn=cmd_check)

    def tuning(sp):
        sp.add_argument("--name", default=None, help="voice profile")
        sp.add_argument("--device", default=None)
        sp.add_argument("--nfe", type=int, default=16,
                        help="flow-matching steps; the one direct quality/time "
                             "trade. Below 16 degrades audibly.")
        sp.add_argument("--cfg", type=float, default=2.5,
                        help="adherence to the reference timbre; above 3 goes stiff")
        sp.add_argument("--speed", type=float, default=1.0)
        sp.add_argument("--seed", type=int, default=1234)
        sp.add_argument("--engine", default=None,
                        help="f5 | chatterbox "
                             "(default: the first installed one whose weights "
                             "are commercially usable)")

    s = sub.add_parser("say", help="synthesise one passage")
    s.add_argument("text", nargs="?", default=None)
    s.add_argument("--file", default=None)
    s.add_argument("-o", "--output", default=None)
    tuning(s)
    s.set_defaults(fn=cmd_say)

    b = sub.add_parser("batch", help="synthesise many passages in one process")
    b.add_argument("script", help="JSON: {id: text} or [{id, text}]")
    b.add_argument("--out-dir", default="./voice-out")
    b.add_argument("--force", action="store_true")
    tuning(b)
    b.set_defaults(fn=cmd_batch)

    args = p.parse_args()

    # A finished CLI should not print tracebacks. Ctrl-C is a normal way to
    # leave a menu, and anything else gets one readable line plus a way to see
    # the detail if it is actually a bug.
    import os
    if os.environ.get("VOICE_DEBUG"):
        pass
    else:
        sys.excepthook = _friendly_excepthook

    if getattr(args, "fn", None) is None:
        for attr, default in (("nfe", 16), ("cfg", 2.5), ("speed", 0.75),
                              ("seed", 1234), ("device", None), ("name", None)):
            setattr(args, attr, getattr(args, attr, default))
        return cmd_home(args)
    args.fn(args)



def cmd_doctor(_):
    """Report whether this environment can actually synthesise."""
    import shutil
    from . import ui

    ui.banner()
    rows = []

    def probe(label, fn, fix):
        try:
            rows.append((label, fn(), None))
        except Exception as exc:
            rows.append((label, None, f"{type(exc).__name__}: {exc}" if not fix else fix))

    probe("ffmpeg", lambda: (shutil.which("ffmpeg") or _raise("not on PATH")) and "found",
          "brew install ffmpeg")

    def _torch():
        import torch
        dev = ("mps" if torch.backends.mps.is_available()
               else "cuda" if torch.cuda.is_available() else "cpu")
        return f"{torch.__version__} · {dev}"
    probe("torch", _torch, "pip install torch")

    def _f5():
        import f5_tts
        return getattr(f5_tts, "__version__", "installed")
    probe("f5-tts", _f5, "pip install f5-tts   (needs Python <3.14 in a fresh env)")

    from rich.table import Table
    t = Table.grid(padding=(0, 2))
    t.add_column(style="dim", justify="right")
    t.add_column()
    ok = True
    for label, value, fix in rows:
        if value:
            t.add_row(label, f"[green]✓[/] {value}")
        else:
            ok = False
            t.add_row(label, f"[red]✗[/] [dim]{fix}[/]")

    from rich.panel import Panel
    ui.console.print(Panel(t, title="[bold]environment[/]",
                           border_style="green" if ok else "red", padding=(1, 2)))
    if not ok:
        ui.console.print(
            "\n  [dim]Recording and profile management work without these.\n"
            "  Synthesis needs torch and f5-tts.[/]\n")


def _raise(msg):
    raise RuntimeError(msg)

if __name__ == "__main__":
    main()


def cmd_engines(args):
    """List engines, what they cost in licence terms, and what is installed."""
    from rich.panel import Panel
    from rich.table import Table
    from . import engines, ui

    if getattr(args, "install", None):
        engine = engines.get(args.install)
        ui.console.print(f"\n  Installing [bold]{engine.label}[/] into {engine.venv}\n")
        try:
            ok = engine.install(log=lambda m: ui.console.print(f"  [dim]{m}[/]"))
            ui.console.print(f"\n  {'[green]installed[/]' if ok else '[red]install finished but import failed[/]'}\n")
        except Exception as exc:
            ui.console.print(f"\n  [red]{type(exc).__name__}[/] {exc}\n")
        return

    ui.banner()
    t = Table.grid(padding=(0, 2))
    for style in ("bold", "dim", "", "", ""):
        t.add_column(style=style)
    t.add_row("", "licence", "commercial", "ref", "status")
    t.add_row("", "", "", "", "")
    for e in engines.REGISTRY.values():
        installed = e.installed()
        t.add_row(
            e.label,
            e.licence,
            "[green]yes[/]" if e.commercial else "[red]no[/]",
            f"{e.ref_seconds}s",
            "[green]● installed[/]" if installed else "[dim]○ not installed[/]",
        )
    ui.console.print(Panel(t, title="[bold]engines[/]", border_style="cyan", padding=(1, 2)))

    notes = [e for e in engines.REGISTRY.values() if e.notes]
    if notes:
        ui.console.print()
        for e in notes:
            ui.console.print(f"  [bold]{e.label}[/] [dim]{e.notes}[/]")

    missing = [e for e in engines.REGISTRY.values() if not e.installed()]
    if missing:
        ui.console.print()
        for e in missing:
            ui.console.print(f"  [cyan]voice engines --install {e.key}[/]")
    ui.console.print()
