"""
Silencing third-party output.

F5-TTS and its dependency tree talk a lot: pydub emits SyntaxWarnings from its
own regexes on import, the model loader prints checkpoint paths, and inference
draws a tqdm bar. None of it is actionable, and all of it lands in the middle of
an interface that is otherwise trying to look composed.

Warnings are filtered at import time — they fire when the module is first
imported, so anything later is too late. Stream capture handles the rest.
"""
import contextlib
import io
import os
import sys
import warnings


def silence_imports():
    """Filter the warnings third-party modules raise as they import."""
    warnings.filterwarnings("ignore", category=SyntaxWarning)
    warnings.filterwarnings("ignore", category=UserWarning)
    warnings.filterwarnings("ignore", category=FutureWarning)
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    # tqdm has no public switch; this is the documented environment override.
    os.environ.setdefault("TQDM_DISABLE", "1")
    os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
    os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")


@contextlib.contextmanager
def captured():
    """
    Swallow stdout/stderr for the duration of a block.

    Used around model loading and inference. Anything written is kept, so a real
    failure can still be reported rather than vanishing — silence is for noise,
    not for errors.
    """
    buf_out, buf_err = io.StringIO(), io.StringIO()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            # Only stdout is redirected. The live progress display holds a
            # direct reference to the real stream (see ui.console), so it keeps
            # drawing while the library underneath is silenced.
            with contextlib.redirect_stdout(buf_out), contextlib.redirect_stderr(buf_err):
                yield buf_out, buf_err
        except Exception:
            # Surface what the library said before it failed.
            sys.stderr.write(buf_err.getvalue())
            raise
