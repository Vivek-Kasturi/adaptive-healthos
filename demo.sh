#!/bin/bash
# ============================================================
# Adaptive HealthOS — Auto Demo Script
# Usage: bash demo.sh
#
# 1. Start QuickTime screen recording
# 2. Run: bash demo.sh
# 3. Watch the full 3-minute demo play automatically
# 4. Stop screen recording when "Demo complete!" appears
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DEMO_URL="http://localhost:5173?autodemo=1"
DEMO_DURATION=220   # seconds — extra buffer for background seeding to complete

echo ""
echo "🧬 Adaptive HealthOS — Auto Demo Launcher"
echo "========================================="
echo ""

# ── Kill anything on these ports ─────────────────────────────
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

echo "► Waiting for backend..."
for i in $(seq 1 40); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✓ Backend ready"
    break
  fi
  sleep 1
done

# ── Seed demo profiles in background (non-blocking) ──────────
# Seeding takes 60-90s (3 profiles × multiple Gemini calls).
# Fire it off now; it completes while the intro plays in the browser.
echo "► Seeding demo profiles in background (Alex · Maya · Sam)..."
curl -s -X POST http://localhost:8000/api/demo/seed-profiles > /tmp/seed_result.json 2>&1 &
SEED_PID=$!
echo "  ✓ Seeding started (PID $SEED_PID) — profiles ready before profile-switch step"
sleep 2

# ── Start frontend ────────────────────────────────────────────
echo "► Starting frontend (Vite)..."
cd "$FRONTEND_DIR"
npm run dev --silent &
FRONTEND_PID=$!

echo "► Waiting for frontend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✓ Frontend ready"
    break
  fi
  sleep 1
done
sleep 1

# ── Open browser ──────────────────────────────────────────────
echo ""
echo "🎬 Opening demo in browser..."
echo "   URL: $DEMO_URL"
echo ""

open -a "Google Chrome" "$DEMO_URL" 2>/dev/null || \
open -a "Safari"        "$DEMO_URL" 2>/dev/null || \
open "$DEMO_URL"

# Give browser time to load, then enter full screen
sleep 4
osascript -e '
  tell application "Google Chrome"
    activate
    delay 0.5
    tell application "System Events"
      keystroke "f" using {control down, command down}
    end tell
  end tell' 2>/dev/null || true

# ── Run demo ──────────────────────────────────────────────────
echo "⏱  Demo running for ${DEMO_DURATION}s..."
echo "   (Do not touch keyboard or mouse)"
echo ""

for i in $(seq $DEMO_DURATION -1 1); do
  printf "\r   Time remaining: %3d seconds" "$i"
  sleep 1
done

echo ""
echo ""

# ── Exit full screen & close ──────────────────────────────────
echo "► Closing browser..."
osascript -e '
  tell application "Google Chrome"
    tell application "System Events"
      keystroke "f" using {control down, command down}
    end tell
    delay 0.5
    close front window
  end tell' 2>/dev/null || true

# ── Stop services ─────────────────────────────────────────────
echo "► Stopping services..."
kill $BACKEND_PID  2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo ""
echo "✅ Demo complete! Stop your screen recording now."
echo ""
echo "   Edit tips:"
echo "   - Trim first 5s (terminal) and last 2s (close)"
echo "   - Title card: 'Adaptive HealthOS — Google Cloud Rapid Agent Hackathon 2026'"
echo "   - Outro: GitHub URL + Devpost submission link"
echo ""
