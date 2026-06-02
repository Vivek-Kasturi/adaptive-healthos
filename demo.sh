#!/bin/bash
# ============================================================
# Adaptive HealthOS — Auto Demo Script
# Usage: ./demo.sh
#
# 1. Start screen recording (QuickTime / Screenshot toolbar)
# 2. Run: bash demo.sh
# 3. Watch the demo play automatically (~75 seconds)
# 4. Script prints DONE and stops services
# 5. Stop screen recording and trim beginning/end
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DEMO_URL="http://localhost:5173?autodemo=1"
DEMO_DURATION=80  # seconds to wait before killing services

echo ""
echo "🧬 Adaptive HealthOS — Auto Demo Launcher"
echo "========================================="
echo ""

# ── Kill anything already on these ports ─────────────────────
echo "► Clearing ports 8000 and 5173..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# ── Start backend ─────────────────────────────────────────────
echo "► Starting backend (FastAPI)..."
cd "$BACKEND_DIR"
source venv311/bin/activate
uvicorn main:app --port 8000 --log-level warning &
BACKEND_PID=$!

# Wait until backend is healthy
echo "► Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✓ Backend ready"
    break
  fi
  sleep 1
done

# ── Start frontend ────────────────────────────────────────────
echo "► Starting frontend (Vite)..."
cd "$FRONTEND_DIR"
npm run dev --silent &
FRONTEND_PID=$!

# Wait until frontend responds
echo "► Waiting for frontend..."
for i in $(seq 1 20); do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✓ Frontend ready"
    break
  fi
  sleep 1
done

sleep 1

# ── Open browser in full screen demo mode ─────────────────────
echo ""
echo "🎬 Opening demo in browser..."
echo "   URL: $DEMO_URL"
echo ""

# Open in Chrome full screen (macOS)
open -a "Google Chrome" "$DEMO_URL" 2>/dev/null || \
open -a "Safari" "$DEMO_URL" 2>/dev/null || \
open "$DEMO_URL"

# Enter full screen after browser opens
sleep 3
osascript -e 'tell application "Google Chrome"
  activate
  tell application "System Events"
    keystroke "f" using {control down, command down}
  end tell
end tell' 2>/dev/null || true

# ── Wait for demo to complete ─────────────────────────────────
echo "⏱  Demo running for ${DEMO_DURATION}s..."
echo "   (Do not touch keyboard or mouse)"
echo ""

for i in $(seq $DEMO_DURATION -1 1); do
  printf "\r   Time remaining: %3d seconds" "$i"
  sleep 1
done

echo ""
echo ""

# ── Exit full screen and close ────────────────────────────────
echo "► Closing browser..."
osascript -e 'tell application "Google Chrome"
  tell application "System Events"
    keystroke "f" using {control down, command down}
  end tell
  delay 0.5
  close front window
end tell' 2>/dev/null || true

# ── Stop services ─────────────────────────────────────────────
echo "► Stopping services..."
kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo ""
echo "✅ Demo complete! Stop your screen recording now."
echo ""
echo "   Edit tips:"
echo "   - Trim first ~5s (terminal startup)"
echo "   - Trim last ~3s (terminal closing)"
echo "   - Add title card: 'Adaptive HealthOS — Google Cloud Hackathon 2026'"
echo "   - Add outro: GitHub URL + submission link"
echo ""
