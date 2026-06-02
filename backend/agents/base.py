"""
Shared initialization for all ADK agents.
Call init_vertexai() once before creating any agent.
Supports GOOGLE_APPLICATION_CREDENTIALS_JSON env var for cloud deployments
(Railway, Render, etc.) where file-based credentials are unavailable.
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
    """Load service account credentials from JSON env var if present."""
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if not creds_json:
        return  # Use default credentials (local gcloud)
    try:
        # Write JSON to a temp file and point the env var at it
        creds_data = json.loads(creds_json)
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(creds_data, tmp)
        tmp.flush()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp.name
        logger.info(f"Credentials loaded from GOOGLE_APPLICATION_CREDENTIALS_JSON "
                    f"(account: {creds_data.get('client_email', 'unknown')})")
    except Exception as e:
        logger.error(f"Failed to load GOOGLE_APPLICATION_CREDENTIALS_JSON: {e}")


def init_vertexai():
    global _initialized
    if not _initialized:
        _setup_credentials()
        settings = get_settings()
        location = getattr(settings, 'google_cloud_location', None) or getattr(settings, 'google_cloud_region', 'us-central1')
        vertexai.init(
            project=settings.google_cloud_project,
            location=location
        )
        _initialized = True
        logger.info(f"Vertex AI initialized — project={settings.google_cloud_project} model={settings.gemini_model}")
