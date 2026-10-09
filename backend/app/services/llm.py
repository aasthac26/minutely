import os
import traceback
import httpx
from dotenv import load_dotenv

load_dotenv()
URL = os.getenv("LLM_API_URL", "https://api.groq.com/openai/v1/chat/completions")
MODEL = os.getenv("LLM_MODEL", "openai/gpt-oss-20b")

SYSTEM = (
    "You answer questions about a meeting using ONLY the transcript excerpts provided. "
    "Be concise (at most 3 sentences) and name the speakers. "
    "If the excerpts do not answer the question, say so."
)


def llm_enabled() -> bool:
    return bool(os.getenv("LLM_API_KEY"))


def write_answer(title: str, question: str, sources: list[dict]) -> str | None:
    """Turn retrieved transcript lines into a written answer. Returns None on any failure."""
    context = "\n".join(f"[{s['timestamp']}] {s['speaker']}: {s['text']}" for s in sources)
    payload = {
        "model": MODEL,
        "temperature": 0.2,
        "max_tokens": 1000,  # reasoning models spend tokens on thinking first
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Meeting: {title}\n\nExcerpts:\n{context}\n\nQuestion: {question}"},
        ],
    }
    if "gpt-oss" in MODEL:
        payload["reasoning_effort"] = "low"  # faster and uses fewer tokens

    try:
        r = httpx.post(
            URL,
            headers={"Authorization": f"Bearer {os.environ['LLM_API_KEY']}"},
            json=payload,
            timeout=30,
        )
        if r.status_code >= 400:
            print(">>> LLM error body:", r.text)
        r.raise_for_status()
        text = (r.json()["choices"][0]["message"]["content"] or "").strip()
        return text or None  # empty answer -> fall back to retrieval answer
    except Exception:
        traceback.print_exc()
        return None