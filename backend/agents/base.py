"""
Shared initialization for all ADK agents.
Call init_vertexai() once before creating any agent.
"""
import vertexai
from config import get_settings
import logging

logger = logging.getLogger(__name__)
_initialized = False


def init_vertexai():
    global _initialized
    if not _initialized:
        settings = get_settings()
        vertexai.init(
            project=settings.google_cloud_project,
            location=settings.google_cloud_region
        )
        _initialized = True
        logger.info(f"Vertex AI initialized — project={settings.google_cloud_project} model={settings.gemini_model}")
