"""
Reading prompts, one per delivery style.

F5-TTS clones prosody, not just timbre. Whatever intonation, pace and energy are
in the reference come back in everything it generates — read a flat paragraph
and every video you narrate for the next year will be flat. So the reference is
not "some speech", it is a performance of the voice you actually want.

Each template is written to elicit its own style rather than describe it: the
explainer prompt has a question, a fact and an aside because that is the shape
of explaining; the hook prompt is short clauses with rising ends because that is
what urgency sounds like. Read them the way the punctuation asks.

Roughly 12 seconds at a normal pace, which is where F5-TTS clones best.
"""

TEMPLATES = {
    "explainer": {
        "label": "Explainer — calm, clear, teaching",
        "hint": "Steady pace. Land the full stops. This is the workhorse for course narration.",
        "text": (
            "Hey, how are you doing today? I'm doing great, thanks for asking. "
            "My name is Evan, and I build AI products for a living. "
            "The thing I find most interesting is how quickly this field moves — "
            "what worked last year is already out of date."
        ),
    },
    "hook": {
        "label": "Hook — energetic, punchy, short-form",
        "hint": "Faster, brighter, lift the ends. For openings and social clips.",
        "text": (
            "Okay, here's the thing nobody tells you. "
            "Ninety percent of engineers get this completely backwards! "
            "And it costs them the offer. "
            "So let me show you exactly what the good answer looks like — "
            "it takes about two minutes."
        ),
    },
    "narrator": {
        "label": "Narrator — warm, documentary, unhurried",
        "hint": "Slower. Let the pauses sit. For story-led pieces.",
        "text": (
            "It was eleven fifty-nine on a Friday night, and it was pouring rain. "
            "A hundred thousand people were all staring at the same screen, waiting. "
            "Nobody had planned for what happened next. "
            "The whole thing came down in under a second."
        ),
    },
    "conversational": {
        "label": "Conversational — relaxed, like talking to a friend",
        "hint": "Loose. Contractions, small stumbles are fine — they help.",
        "text": (
            "So I've been messing around with this for a couple of weeks now, "
            "and honestly? It's way better than I expected. "
            "I mean, it's not perfect — there's a few rough edges. "
            "But for what it does, yeah, I'm pretty impressed."
        ),
    },
    "custom": {
        "label": "Custom — write your own",
        "hint": "Anything you like. Match the delivery you want back.",
        "text": "",
    },
}

# Words per second at an unhurried explaining pace. Measured against the target
# most narration wants; podcasts run ~2.8 and hard-sell reads 3.5+.
NATURAL_WPS = 2.4

# The pace bands used to grade a finished recording.
PACE_BANDS = [
    (0.0, 1.8, "very slow", "red"),
    (1.8, 2.1, "slow", "yellow"),
    (2.1, 2.8, "natural", "green"),
    (2.8, 3.3, "brisk", "yellow"),
    (3.3, 99.0, "rushed", "red"),
]


def natural_seconds(text, wps=NATURAL_WPS):
    """How long this passage takes to read without hurrying."""
    return len(text.split()) / wps


def pace_of(text, seconds):
    """(words_per_second, label, colour) for a recording that was actually made."""
    wps = len(text.split()) / max(seconds, 0.1)
    for lo, hi, label, colour in PACE_BANDS:
        if lo <= wps < hi:
            return wps, label, colour
    return wps, "rushed", "red"


def get(name):
    return TEMPLATES.get(name)


def names():
    return list(TEMPLATES.keys())
