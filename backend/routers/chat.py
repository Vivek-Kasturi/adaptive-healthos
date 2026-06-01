"""
Chat routes — REST and WebSocket endpoints for agent conversations.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.schemas import ChatRequest
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("")
async def chat(request: ChatRequest):
    """REST chat endpoint — runs full orchestrator pipeline."""
    from agents.runner import run_orchestrator_pipeline
    result = await run_orchestrator_pipeline(user_id=request.user_id, message=request.message)
    return result


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """WebSocket chat — streams agent responses for real-time UI."""
    await websocket.accept()
    logger.info(f"WebSocket connected: user={user_id}")

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            message = payload.get("message", "")

            if not message:
                continue

            # Send "thinking" indicator
            await websocket.send_text(json.dumps({
                "type": "thinking",
                "agent_name": "OrchestratorAgent",
                "message": "Analyzing your message..."
            }))

            from agents.runner import run_orchestrator_pipeline
            result = await run_orchestrator_pipeline(user_id=user_id, message=message)

            # Send final response
            await websocket.send_text(json.dumps({
                "type": "response",
                "agent_name": result["agent_name"],
                "response": result["final_response"],
                "intent": result["intent"],
                "tools_used": result["tools_used"],
                "agent_activity": result["agent_activity"],
            }))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": "Agent encountered an error. Please try again."
            }))
        except Exception:
            pass
