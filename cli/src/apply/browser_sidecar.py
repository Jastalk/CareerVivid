#!/usr/bin/env python3
"""
browser_sidecar.py — browser-use agent sidecar for cv jobs apply

This script is called by the TypeScript harness (apply.ts) as a subprocess.
It receives a task + context via stdin as JSON, executes the task using
browser-use + Gemini, and streams progress + final result to stdout as JSON lines.

Usage (called by TypeScript, not directly):
  python3 browser_sidecar.py < input.json

Input JSON (stdin):
  {
    "url":            "https://jobs.ashbyhq.com/...",
    "api_key":        "AIza...",
    "model":          "gemini-3-flash-preview",
    "resume_pdf_path": "/Users/.../.careervivid/resume.pdf",
    "profile": {
      "firstName": "Jiawen", "lastName": "Zhu",
      "email": "zhujiawen519@gmail.com",
      "phone": "(408) 599-4164",
      "linkedin": "https://www.linkedin.com/in/jiawenzhu/",
      "github": "https://github.com/JiawenZhu",
      "portfolio": "https://jiawenzhu.github.io/profile/"
    },
    "profile_dir": "/Users/.../.careervivid/browser-session"
  }

Output (stdout, JSON lines):
  {"type": "step",  "message": "Navigating to application page..."}
  {"type": "done",  "result": "Successfully filled form. Browser is open for review."}
  {"type": "error", "message": "Could not find submit button."}
"""

import asyncio
import json
import os
import sys
import aiohttp
import requests
from pathlib import Path


def emit(msg_type: str, message: str) -> None:
    """Write a JSON line to stdout for the TypeScript parent to read."""
    print(json.dumps({"type": msg_type, "message": message}), flush=True)


def build_task(url: str, profile: dict, resume_pdf_path: str) -> str:
    """Build the full task prompt with user info embedded."""
    user_info_lines = []
    field_map = {
        "firstName":  "First Name",
        "lastName":   "Last Name",
        "email":      "Email",
        "phone":      "Phone",
        "linkedin":   "LinkedIn",
        "github":     "GitHub",
        "portfolio":  "Website/Portfolio",
        "city":       "City",
        "state":      "State",
        "country":    "Country",
        "currentTitle":       "Current Title",
        "currentCompany":     "Current Company",
        "yearsOfExperience":  "Years of Experience",
        "workAuthorization":  "Work Authorization",
    }
    for key, label in field_map.items():
        val = profile.get(key, "")
        if val:
            user_info_lines.append(f"{label}: {val}")

    user_info = "\n".join(user_info_lines) if user_info_lines else "(no profile data provided)"
    has_pdf = resume_pdf_path and Path(resume_pdf_path).exists()

    return f"""
1. Navigate to {url}
2. Wait for the application form to fully load before taking any action.
3. The ATS platform may attempt to auto-fill fields when you upload a resume, and it frequently
   gets emails and links WRONG. You must explicitly verify all visible text input fields.
   If they are incorrect or empty, CLEAR the field completely and type precisely this data:

{user_info}

4. IMPORTANT: Email and LinkedIn URLs must be exactly correct — these are most commonly
   corrupted by ATS auto-fill. Clear and retype them precisely.
{"5. Upload the resume document from this exact path: " + resume_pdf_path if has_pdf else "5. (No resume PDF provided — skip file upload)"}
6. If there are standard screening questions (Visa status, voluntary EEO disclosures,
   work authorization), answer them logically based on standard software engineering norms.
7. IMPORTANT: DO NOT click "Submit Application", "Submit", or any final submission button.
   Once you have populated all visible fields, use the `done` action. The user will review
   and submit manually.
""".strip()


class ChatCareerVivid:
    """
    A lightweight LangChain-compatible wrapper for the CareerVivid LLM Proxy.
    Allows use of account credits instead of local API keys.
    """
    def __init__(self, model: str, cv_api_key: str):
        self.model = model
        self.model_name = model          # browser-use cloud_events.py reads .model_name
        self.cv_api_key = cv_api_key
        self.proxy_url = "https://us-west1-jastalk-firebase.cloudfunctions.net/agentProxy"
        self.provider = "google"

    def _convert_messages(self, messages):
        """Convert LangChain messages to CareerVivid/Gemini Content format."""
        contents = []
        for msg in messages:
            role = "user" if getattr(msg, "type", "human") in ["human", "system"] else "model"
            # Handle both string content and list content (multimodal)
            text = msg.content if isinstance(msg.content, str) else str(msg.content)
            contents.append({"role": role, "parts": [{"text": text}]})
        return contents

    def invoke(self, messages, *args, **kwargs):
        """Synchronous call to the proxy.
        *args absorbs extra positional args (e.g. config) that browser-use may pass.
        """
        payload = {
            "apiKey": self.cv_api_key,
            "model": self.model,
            "contents": self._convert_messages(messages)
        }
        resp = requests.post(self.proxy_url, json=payload, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        from langchain_core.messages import AIMessage
        return AIMessage(content=text)

    async def ainvoke(self, messages, *args, **kwargs):
        """Asynchronous call to the proxy.
        *args absorbs extra positional args (e.g. config) that browser-use may pass.
        """
        payload = {
            "apiKey": self.cv_api_key,
            "model": self.model,
            "contents": self._convert_messages(messages)
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.proxy_url, json=payload) as resp:
                resp.raise_for_status()
                data = await resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                from langchain_core.messages import AIMessage
                return AIMessage(content=text)


def get_llm(llm_config: dict):
    """Factory to initialize the correct LangChain LLM based on provider."""
    provider = llm_config.get("provider", "gemini")
    model = llm_config.get("model", "")
    api_key = llm_config.get("apiKey", "")
    base_url = llm_config.get("baseUrl", "")

    if provider == "careervivid":
        return ChatCareerVivid(model=model, cv_api_key=api_key)

    if provider == "anthropic":
        from browser_use.llm.anthropic import ChatAnthropic
        return ChatAnthropic(model=model, api_key=api_key)

    if provider == "gemini" or provider == "google":
        try:
            from browser_use.llm.google import ChatGoogle
            return ChatGoogle(model=model, api_key=api_key)
        except ImportError:
            # Fallback: google-genai via openai-compatible shim
            from browser_use.llm.openai import ChatOpenAI
            return ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )

    if provider == "openrouter":
        # OpenRouter is OpenAI-compatible — use ChatOpenAI with the OpenRouter base URL.
        # browser_use.llm.openrouter does NOT exist as a separate module.
        try:
            from browser_use.llm.openai import ChatOpenAI
            return ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url or "https://openrouter.ai/api/v1",
            )
        except ImportError:
            raise ImportError(
                "browser_use.llm.openai not found. "
                "Install: pip install 'browser-use[openai]'"
            )

    if provider == "openai" or provider == "custom":
        from browser_use.llm.openai import ChatOpenAI
        kwargs = dict(model=model, api_key=api_key)
        if base_url:
            kwargs["base_url"] = base_url
        return ChatOpenAI(**kwargs)

    # Last-resort fallback: treat as OpenAI-compatible
    try:
        from browser_use.llm.openai import ChatOpenAI
        kwargs = dict(model=model, api_key=api_key)
        if base_url:
            kwargs["base_url"] = base_url
        return ChatOpenAI(**kwargs)
    except ImportError:
        raise ValueError(f"Unsupported LLM provider: {provider}")


async def run_agent(
    url: str,
    llm_config: dict,
    resume_pdf_path: str,
    profile: dict,
    profile_dir: str,
    task_override: str | None = None,
) -> str:
    """Run browser-use agent with the given task and selected LLM."""
    from browser_use import Agent, Browser
    from browser_use.browser.profile import BrowserProfile

    emit("step", f"Initializing LLM: {llm_config.get('model')} via {llm_config.get('provider')}")
    llm = get_llm(llm_config)

    emit("step", "Setting up browser profile...")
    Path(profile_dir).mkdir(parents=True, exist_ok=True)

    chrome_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    chrome_binary = next((p for p in chrome_paths if Path(p).exists()), None)

    browser_profile = BrowserProfile(
        user_data_dir=profile_dir,
        executable_path=chrome_binary,
        headless=False,
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--start-maximized",
            "--no-first-run",
            "--no-default-browser-check",
        ],
        ignore_https_errors=True,
    )

    browser = Browser(browser_profile=browser_profile)
    task = task_override if task_override else build_task(url, profile, resume_pdf_path)
    emit("step", f"Starting agent — filling form at: {url if url != 'about:blank' else '(URL embedded in task)'}")

    available_paths = []
    if resume_pdf_path and Path(resume_pdf_path).exists():
        available_paths = [resume_pdf_path]
        emit("step", f"Resume PDF ready: {resume_pdf_path}")
    else:
        emit("step", "No resume PDF found — skipping file upload")

    async def on_step(step_info):
        try:
            thought = getattr(step_info, "model_output", None)
            if thought and hasattr(thought, "current_state"):
                state = thought.current_state
                next_goal = getattr(state, "next_goal", "") or ""
                if next_goal:
                    emit("step", f"🤖 {next_goal}")
        except Exception:
            pass

    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        available_file_paths=available_paths if available_paths else None,
        max_actions_per_step=5,
    )

    try:
        result = await agent.run(max_steps=30, on_step_start=on_step)
        final = str(result.final_result() if hasattr(result, "final_result") else result)
        return final
    except Exception as e:
        if browser:
            await browser.close()
        raise


def main() -> None:
    """Entry point: read JSON from stdin, run agent, emit results."""
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            raise ValueError("No input received on stdin")
        payload = json.loads(raw)
    except Exception as e:
        emit("error", f"Failed to parse input: {e}")
        sys.exit(1)

    url           = payload.get("url", "")
    llm_config    = payload.get("llm_config", {})
    resume_pdf    = payload.get("resume_pdf_path", "")
    profile       = payload.get("profile", {})
    profile_dir   = payload.get("profile_dir") or os.path.expanduser("~/.careervivid/browser-session")
    task_override = payload.get("task_override", "")  # from cv agent --jobs tools

    # task_override mode: the calling tool provides a full task string
    # In this mode url may be empty — the task already includes the URL.
    if not url and not task_override:
        emit("error", "No job URL provided")
        sys.exit(1)

    if not llm_config:
        emit("error", "No LLM configuration provided. Run: cv agent config")
        sys.exit(1)

    try:
        result = asyncio.run(run_agent(
            url or "about:blank",  # task_override mode: url is embedded in task
            llm_config,
            resume_pdf,
            profile,
            profile_dir,
            task_override=task_override or None,
        ))
        emit("done", result)
    except KeyboardInterrupt:
        emit("error", "Agent interrupted by user")
        sys.exit(1)
    except Exception as e:
        emit("error", str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
