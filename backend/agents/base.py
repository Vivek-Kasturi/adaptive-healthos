"""
Shared initialization for all ADK agents.
Call init_vertexai() once before creating any agent.

Auth priority (first match wins):
1. GEMINI_API_KEY  → uses Gemini API directly (no gcloud needed, great for local dev)
2. GOOGLE_APPLICATION_CREDENTIALS_JSON  → service account JSON blob (cloud deployments)
3. GOOGLE_APPLICATION_CREDENTIALS  → path to service account file
4. Application Default Credentials  → gcloud auth application-default login
"""
import vertexai
from config import get_settings
import logging
import os
import json
import tempfile

logger = logging.getLogger(__name__)
_initialized = False


def _setup_credentials():
    """Configure auth. Gemini API key takes priority over Vertex AI credentials."""

    # ── Option 1: Gemini API key (simplest for local dev) ──────────────────────
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gemini_key:
        # Tell the ADK to use the Gemini API backend instead of Vertex AI
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "0"
        os.environ["GOOGLE_API_KEY"] = gemini_key
        logger.info("Auth: using Gemini API key (GOOGLE_GENAI_USE_VERTEXAI=0)")
        return

    # ── Option 2: Service account JSON blob (cloud deployments) ────────────────
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if creds_json:
        try:
            creds_data = json.loads(creds_json)
            tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
            json.dump(creds_data, tmp)
            tmp.flush()
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp.name
            os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
            logger.info(f"Auth: service account JSON "
                        f"(account: {creds_data.get('client_email', 'unknown')})")
        except Exception as e:
            logger.error(f"Failed to load GOOGLE_APPLICATION_CREDENTIALS_JSON: {e}")
        return

    # ── Option 3: ADC / gcloud (fallback) ─────────────────────────────────────
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "1"
    logger.info("Auth: using Application Default Credentials (gcloud)")


def init_vertexai():
    global _initialized
    if not _initialized:
        _setup_credentials()
        settings = get_settings()

        # Only call vertexai.init() when using Vertex AI backend
        if os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "1") == "1":
            location = (getattr(settings, 'google_cloud_location', None)
                        or getattr(settings, 'google_cloud_region', 'us-central1'))
            vertexai.init(project=settings.google_cloud_project, location=location)
            logger.info(f"Vertex AI initialized — project={settings.google_cloud_project} "
                        f"model={settings.gemini_model}")
        else:
            logger.info(f"Gemini API initialized — model={settings.gemini_model}")

        _initialized = True
