#!/bin/bash
# ============================================================
# Adaptive HealthOS — Full 3-Minute Demo with TTS + Recording
# ============================================================
#
# USAGE
#   bash demo.sh                  → full demo: voice + auto recording
#   bash demo.sh --no-tts         → silent demo (no voiceover)
#   bash demo.sh --no-record      → voice only, skip recording setup
#   bash demo.sh --voice "Ava"    → use a specific macOS voice
#   bash demo.sh --rate 155       → slower/faster speech (default 165 wpm)
#
# RECORDING OPTIONS (auto-detected in priority order):
#   1. ffmpeg   — best quality, fully automated (brew install ffmpeg)
#   2. QuickTime — opens automatically, you click ● Record once
#   3. Manual   — instructions shown, you handle recording yourself
#
# VOICES (macOS built-in, no internet needed):
#   say -v ? | grep en_US          # list all installed US English voices
#   Recommended: Samantha (default) · Ava (Enhanced) · Alex · Zoe
#   To install enhanced voices: System Settings → Accessibility → Spoken Content
#
# WHAT THE DEMO COVERS (24 steps, ~185 seconds):
#   Login · Onboarding (3 steps) · Agents generating plans ·
#   Dashboard · Agent Activity Panel · Chat food log ·
#   Chat sleep log (cross-agent) · Chat workout log ·
#   Plans: Nutrition / Workout / Recovery ·
#   Progress + ForecastingAgent · Achievements + XP ·
#   3 isolated user profiles · Maya's dashboard ·
#   System / judging criteria page · Outro
# ============================================================

set -eo pipefail   # -e exits on error; -o pipefail catches pipe failures
                   # NOTE: -u (unbound var check) intentionally omitted — PIDs
                   # may be unset if startup fails early, which is fine.

# ── Config & argument parsing ────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DEMO_URL="http://localhost:5173?autodemo=1&voice=${VOICE// /%20}&rate=${RATE}"
OUTPUT_DIR="$HOME/Desktop"
OUTPUT_FILE="$OUTPUT_DIR/HealthOS_Demo_$(date +%Y%m%d_%H%M%S).mov"

USE_TTS=true
USE_RECORD=true
VOICE="Samantha"
RATE=165
RECORDER=""      # filled in: "ffmpeg" | "quicktime" | "manual"
# Total time to wait for the browser demo to complete (AutoDemoRunner ~210s)
DEMO_WAIT=220

# Pre-initialise all PIDs so the cleanup trap never hits "unbound variable"
BACKEND_PID=""
FRONTEND_PID=""
SEED_PID=""
FFMPEG_PID=""

for arg in "$@"; do
  case "$arg" in
    --no-tts)       USE_TTS=false ;;
    --no-record)    USE_RECORD=false ;;
    --voice=*)      VOICE="${arg#*=}" ;;
    --voice)        ;;   # handled by next arg — not implemented; use --voice=X
    --rate=*)       RATE="${arg#*=}" ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────

# Print a coloured section header
section() { echo ""; echo "  $1"; }

# Speak text in background. Kills any still-running `say` from the previous
# segment first so voices never overlap. The calling code sleeps long enough
# for the speech to finish before starting the next segment.
SAY_PID=""
narrate() {
  local text="$1"
  if [[ "$USE_TTS" == "true" ]]; then
    # Kill the previous segment if it somehow ran long
    [[ -n "${SAY_PID:-}" ]] && kill "${SAY_PID}" 2>/dev/null || true
    say -v "$VOICE" -r "$RATE" "$text" &
    SAY_PID=$!
  fi
}

# Kill background jobs on exit (use ${VAR:-} so unset vars don't abort with -e)
cleanup() {
  [[ -n "${BACKEND_PID:-}"  ]] && kill "${BACKEND_PID}"  2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "${FRONTEND_PID}" 2>/dev/null || true
  [[ -n "${SEED_PID:-}"     ]] && kill "${SEED_PID}"     2>/dev/null || true
  [[ -n "${FFMPEG_PID:-}"   ]] && kill "${FFMPEG_PID}"   2>/dev/null || true
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  lsof -ti:5173 | xargs kill -9 2>/dev/null || true
}
trap cleanup EXIT

# ── Banner ───────────────────────────────────────────────────────────────────
clear
echo ""
echo "  ╔═══════════════════════════════════════════════════════╗"
echo "  ║   🧬  Adaptive HealthOS — Demo Launcher               ║"
echo "  ║   Google Cloud Rapid Agent Hackathon 2026             ║"
echo "  ╚═══════════════════════════════════════════════════════╝"
echo ""
echo "  Voice  : $(if $USE_TTS; then echo "$VOICE @ ${RATE} wpm"; else echo "disabled (--no-tts)"; fi)"
echo "  Record : $(if $USE_RECORD; then echo "enabled (auto-detect)"; else echo "disabled (--no-record)"; fi)"
echo "  Output : $OUTPUT_FILE"
echo ""

# ── Voice sanity check ───────────────────────────────────────────────────────
if [[ "$USE_TTS" == "true" ]]; then
  if ! say -v "$VOICE" "" 2>/dev/null; then
    echo "  ⚠️  Voice '$VOICE' not found — falling back to Samantha"
    echo "     Install voices: System Settings → Accessibility → Spoken Content"
    VOICE="Samantha"
  else
    echo "  ✓ Voice '$VOICE' available"
  fi
fi

# ── Port cleanup ─────────────────────────────────────────────────────────────
section "► Clearing ports 8000 and 5173..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# ── Backend ──────────────────────────────────────────────────────────────────
section "► Starting FastAPI backend..."
cd "$BACKEND_DIR"

# Try every venv variant that might exist in the repo
VENV_ACTIVATED=false
for venv_path in venv311 venv .venv venv310 venv39; do
  if [[ -f "$venv_path/bin/activate" ]]; then
    # shellcheck disable=SC1090
    source "$venv_path/bin/activate"
    echo "  ✓ Activated virtualenv: $venv_path"
    VENV_ACTIVATED=true
    break
  fi
done
if [[ "$VENV_ACTIVATED" == "false" ]]; then
  echo "  ⚠️  No virtualenv found — trying system Python"
fi

# ── Diagnose the environment before starting ──────────────────────────────────
PYTHON_BIN="$(which python 2>/dev/null || which python3)"
UVICORN_BIN="$(which uvicorn 2>/dev/null || true)"
echo "  Python  : $PYTHON_BIN"
echo "  Uvicorn : ${UVICORN_BIN:-NOT FOUND IN PATH}"
if [[ -z "$UVICORN_BIN" ]]; then
  echo ""
  echo "  ✗ uvicorn not found. Install it:"
  echo "    cd backend && source venv311/bin/activate && pip install uvicorn fastapi"
  exit 1
fi

# ── Start uvicorn — same command that works manually ──────────────────────────
# PYTHONUNBUFFERED=1  forces Python to flush all output immediately (no buffering)
# --host 0.0.0.0      binds to all interfaces (curl via localhost works on both)
# --log-level info    captures startup/shutdown messages
rm -f /tmp/healthos_backend.log
PYTHONUNBUFFERED=1 "$UVICORN_BIN" main:app \
  --host 0.0.0.0 --port 8000 --log-level info \
  >> /tmp/healthos_backend.log 2>&1 &
BACKEND_PID=$!
sleep 1  # give the process a moment to start writing

echo "  Waiting for /health (PID $BACKEND_PID, up to 90s)..."
READY=false
for i in $(seq 1 90); do
  # Process died → show log immediately
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo ""; echo "  ✗ uvicorn process died at ${i}s"
    break
  fi
  # Use 127.0.0.1 explicitly — avoids macOS resolving 'localhost' as ::1 (IPv6)
  if curl -sf http://127.0.0.1:8000/health > /dev/null 2>&1; then
    echo "  ✓ Backend ready (${i}s)"
    READY=true
    break
  fi
  # Every 10s print any new log lines so we can see what's happening
  if (( i % 10 == 0 )); then
    echo ""
    echo "  [${i}s] Last log lines:"
    tail -5 /tmp/healthos_backend.log 2>/dev/null | sed 's/^/    /'
    echo ""
  fi
  printf "."
  sleep 1
done

if [[ "$READY" == "false" ]]; then
  echo ""
  echo "  ── Full backend log (/tmp/healthos_backend.log) ────────────"
  cat /tmp/healthos_backend.log 2>/dev/null || echo "  (empty — uvicorn produced no output at all)"
  echo "  ────────────────────────────────────────────────────────────"
  echo ""
  echo "  Debugging steps:"
  echo "   1. Open a NEW terminal and run this exact command:"
  echo "      cd \"$BACKEND_DIR\" && source venv311/bin/activate && uvicorn main:app --port 8000"
  echo "   2. If that works, the issue is an env var not exported to subshells."
  echo "      Add to backend/.env:  MONGO_URI=... and GEMINI_API_KEY=..."
  echo "   3. Or export them in ~/.zshrc / ~/.bash_profile and re-open this terminal."
  exit 1
fi

# ── Seed demo profiles — MUST complete before browser opens ──────────────────
# The AutoDemoRunner logs in with Alex's profile at t≈25s. If profiles aren't
# ready, the demo stays stuck on the login page for the entire recording.
section "► Checking demo profiles (Alex · Maya · Sam)..."

PROFILE_COUNT=$(curl -sf http://127.0.0.1:8000/api/users/demo-profiles 2>/dev/null \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('profiles', [])))" 2>/dev/null || echo "0")

if [[ "$PROFILE_COUNT" -ge "3" ]]; then
  echo "  ✓ Profiles already seeded ($PROFILE_COUNT users found) — skipping"
else
  echo "  Seeding 3 profiles now (one-time, ~60–90s)..."
  echo "  ─────────────────────────────────────────────────────────────"
  # Run seed in background, show a spinner while waiting
  curl -s -X POST http://127.0.0.1:8000/api/demo/seed-profiles \
    > /tmp/seed_result.json 2>&1 & SEED_PID=$!
  SPINNER='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  i=0
  while kill -0 "${SEED_PID}" 2>/dev/null; do
    si=$(( i % 10 ))
    printf "\r  ${SPINNER:$si:1}  Seeding profiles... (~60s — Gemini generating plans for 3 users)"
    i=$(( i + 1 ))
    sleep 0.2
  done
  echo ""
  # Verify it worked
  PROFILE_COUNT=$(curl -sf http://127.0.0.1:8000/api/users/demo-profiles 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('profiles', [])))" 2>/dev/null || echo "0")
  if [[ "$PROFILE_COUNT" -ge "1" ]]; then
    echo "  ✓ Profiles ready ($PROFILE_COUNT users)"
  else
    echo "  ⚠️  Seeding may not have finished — demo will use fallback demo user"
  fi
fi
sleep 1

# ── Frontend ─────────────────────────────────────────────────────────────────
section "► Starting Vite frontend..."
cd "$FRONTEND_DIR"

# Verify vite can actually load (catches missing native binaries like
# @rollup/rollup-darwin-arm64 — a known npm optional-dep bug).
# If broken, wipe node_modules + package-lock and do a clean install.
if [[ ! -d "node_modules" ]] || \
   ! node node_modules/.bin/vite --version > /dev/null 2>&1; then
  echo "  node_modules missing or broken native binaries — clean reinstall..."
  rm -rf node_modules package-lock.json
  npm install
  echo "  ✓ npm install complete"
fi

# Start Vite with --host so it binds 0.0.0.0 (both IPv4 + IPv6).
# Without --host, Vite on some macOS/Node combos only binds ::1 (IPv6),
# which makes curl http://127.0.0.1:5173 fail even though Vite is running.
rm -f /tmp/healthos_frontend.log
npm run dev -- --host >> /tmp/healthos_frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 1  # let vite initialise before polling

READY=false
for i in $(seq 1 50); do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo ""; echo "  ✗ Vite process died at ${i}s"
    break
  fi
  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo "  ✓ Frontend ready (${i}s)"
    READY=true
    break
  fi
  printf "."
  sleep 1
done

if [[ "$READY" == "false" ]]; then
  echo ""
  echo "  ── /tmp/healthos_frontend.log ───────────────────────────────"
  cat /tmp/healthos_frontend.log 2>/dev/null || echo "  (empty)"
  echo "  ─────────────────────────────────────────────────────────────"
  echo ""
  echo "  Fix: cd frontend && npm install && npm run dev"
  exit 1
fi
sleep 1

# ── Recording setup ──────────────────────────────────────────────────────────
if [[ "$USE_RECORD" == "true" ]]; then
  section "► Setting up screen recording..."

  if command -v ffmpeg &>/dev/null; then
    # ── ffmpeg path (fully automated) ──────────────────────────────────────
    RECORDER="ffmpeg"
    echo "  ✓ ffmpeg found — will record automatically to:"
    echo "    $OUTPUT_FILE"
    echo ""
    echo "  ┌──────────────────────────────────────────────────────────────┐"
    echo "  │  ffmpeg captures the screen but NOT system audio by default. │"
    echo "  │  The TTS voice will play through your speakers — for audio   │"
    echo "  │  in the video, use a microphone or add --no-record and use   │"
    echo "  │  QuickTime (which can capture system audio natively).        │"
    echo "  └──────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  Press RETURN when ready to start..."
    read -r
  else
    # ── QuickTime path ─────────────────────────────────────────────────────
    RECORDER="quicktime"
    echo "  ffmpeg not found → using QuickTime Player"
    echo ""
    echo "  ┌──────────────────────────────────────────────────────────────┐"
    echo "  │  IMPORTANT — QuickTime Audio Setup (do this ONCE):           │"
    echo "  │                                                              │"
    echo "  │  1. QuickTime will open in a moment                         │"
    echo "  │  2. Click the ▼ arrow next to the ● button                  │"
    echo "  │  3. Set Microphone to 'None'                                 │"
    echo "  │  4. Check ✓ 'Record System Audio' (captures TTS voice)       │"
    echo "  │  5. Click the ● record button                                │"
    echo "  │  6. Click 'Record Entire Screen' in the overlay              │"
    echo "  │  7. Press RETURN here to start the demo                      │"
    echo "  └──────────────────────────────────────────────────────────────┘"
    echo ""
    # Open QuickTime screen recording
    osascript <<'APPLESCRIPT' 2>/dev/null || true
tell application "QuickTime Player"
  activate
  delay 0.8
  new screen recording
end tell
APPLESCRIPT
    echo "  Waiting for you to click ● Record in QuickTime..."
    echo "  Press RETURN when the recording has started → "
    read -r
  fi
fi

# ── Open browser ─────────────────────────────────────────────────────────────
section "► Opening demo in browser..."
echo "  URL: $DEMO_URL"

open -a "Google Chrome" "$DEMO_URL" 2>/dev/null || \
open -a "Safari"        "$DEMO_URL" 2>/dev/null || \
open "$DEMO_URL"

sleep 5  # give browser time to load

# Full-screen the browser
osascript <<'APPLESCRIPT' 2>/dev/null || true
tell application "Google Chrome"
  activate
  delay 0.5
  tell application "System Events"
    keystroke "f" using {control down, command down}
  end tell
end tell
APPLESCRIPT
sleep 1

# ── Start ffmpeg recording (after browser is full-screen) ────────────────────
FFMPEG_PID=""
if [[ "$USE_RECORD" == "true" && "$RECORDER" == "ffmpeg" ]]; then
  echo "  ● Starting ffmpeg screen capture..."
  # "Capture screen 0" = main display on macOS AVFoundation
  ffmpeg -loglevel error \
         -f avfoundation -capture_cursor 1 \
         -i "Capture screen 0" \
         -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
         -vcodec libx264 -preset ultrafast -crf 20 -pix_fmt yuv420p \
         -r 30 \
         "$OUTPUT_FILE" &
  FFMPEG_PID=$!
  sleep 1
  echo "  ✓ Recording started → $OUTPUT_FILE"
fi

# ── DEMO RUNNING ─────────────────────────────────────────────────────────────
#
# TTS is now browser-driven: AutoDemoRunner calls POST /api/demo/tts at each
# step, which fires macOS `say` via the backend — perfectly synced because the
# browser triggers speech exactly when content appears on screen.
#
# This script just plays the INTRO (before browser opens) and then waits the
# full demo duration with a live countdown.
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "  ╔═══════════════════════════════════════════════════════╗"
echo "  ║   🎬  DEMO RUNNING — DO NOT TOUCH KEYBOARD OR MOUSE   ║"
echo "  ║   TTS is browser-driven — perfectly synced per step   ║"
echo "  ╚═══════════════════════════════════════════════════════╝"
echo ""

DEMO_START=$(date +%s)

# ── Speak intro immediately (plays while browser opens + login loads) ─────────
if [[ "$USE_TTS" == "true" ]]; then
  say -v "$VOICE" -r "$RATE" \
    "Welcome to Adaptive HealthOS. 6 specialized AI agents, Google Cloud ADK, and MongoDB Atlas. Unlike chatbots, our agents plan, execute real tool calls, and act autonomously." &
  SAY_PID=$!
fi

# ── Countdown while AutoDemoRunner runs (browser handles all other TTS) ───────
for i in $(seq "$DEMO_WAIT" -1 1); do
  elapsed=$(( $(date +%s) - DEMO_START ))
  mins=$(( elapsed / 60 ))
  secs=$(( elapsed % 60 ))
  printf "\r  [%02d:%02d] Remaining: %3ds  " "$mins" "$secs" "$i"
  sleep 1
done

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
ELAPSED=$(( $(date +%s) - DEMO_START ))
echo "  ✅ Demo complete! (${ELAPSED}s elapsed)"
echo ""

# ── Stop ffmpeg recording ─────────────────────────────────────────────────────
if [[ -n "${FFMPEG_PID:-}" ]]; then
  sleep 1
  kill -INT "$FFMPEG_PID" 2>/dev/null || kill "$FFMPEG_PID" 2>/dev/null || true
  wait "$FFMPEG_PID" 2>/dev/null || true
  echo "  ● Recording saved → $OUTPUT_FILE"
  sleep 1
  open "$OUTPUT_FILE" 2>/dev/null || true
fi

# ── Stop QuickTime recording ──────────────────────────────────────────────────
if [[ "$USE_RECORD" == "true" && "$RECORDER" == "quicktime" ]]; then
  echo ""
  echo "  ► Stopping QuickTime recording..."
  osascript <<'APPLESCRIPT' 2>/dev/null || true
tell application "QuickTime Player"
  activate
  delay 0.5
  tell document 1
    stop
  end tell
  delay 0.5
  -- Trigger Save
  tell application "System Events"
    keystroke "s" using command down
  end tell
end tell
APPLESCRIPT
  echo "  ● QuickTime stopped — save the file in the dialog that appears."
fi

# ── Exit full-screen ──────────────────────────────────────────────────────────
sleep 1
osascript <<'APPLESCRIPT' 2>/dev/null || true
tell application "Google Chrome"
  activate
  tell application "System Events"
    keystroke "f" using {control down, command down}
  end tell
end tell
APPLESCRIPT

# ── Print next steps ──────────────────────────────────────────────────────────
echo ""
echo "  ╔═══════════════════════════════════════════════════════╗"
echo "  ║   🎬  POST-PRODUCTION CHECKLIST                       ║"
echo "  ╠═══════════════════════════════════════════════════════╣"
echo "  ║                                                       ║"
echo "  ║  TRIM (iMovie / QuickTime / ScreenFlow):              ║"
echo "  ║   • Trim first ~5s (terminal countdown)               ║"
echo "  ║   • Trim last ~3s (closing animation)                 ║"
echo "  ║   • Target: exactly 3:00 or under                     ║"
echo "  ║                                                       ║"
echo "  ║  ADD TITLE CARDS (optional):                          ║"
echo "  ║   • 0:00 — 'Adaptive HealthOS'                        ║"
echo "  ║   • 0:02 — 'Google Cloud Rapid Agent Hackathon 2026'  ║"
echo "  ║                                                       ║"
echo "  ║  ADD OUTRO CARD:                                      ║"
echo "  ║   • GitHub: github.com/Vivek-Kasturi/adaptive-healthos║"
echo "  ║   • Stack: Gemini 2.5 Flash · ADK · MongoDB Atlas     ║"
echo "  ║                                                       ║"
echo "  ║  UPLOAD:                                              ║"
echo "  ║   • YouTube (unlisted or public)                      ║"
echo "  ║   • Paste URL into Devpost submission                 ║"
echo "  ║                                                       ║"
echo "  ╚═══════════════════════════════════════════════════════╝"
echo ""
echo "  💡 Re-record tips:"
echo "     Faster voice:  bash demo.sh --rate 180"
echo "     Different voice: bash demo.sh --voice 'Ava (Enhanced)'"
echo "     Silent run:    bash demo.sh --no-tts"
echo "     No recording:  bash demo.sh --no-record"
echo ""
echo "  📋 Best macOS voices for demos:"
echo "     say -v 'Ava (Enhanced)' 'test'    # premium US female"
echo "     say -v 'Samantha' 'test'           # default US female"
echo "     say -v 'Alex' 'test'               # US male"
echo "     say -v 'Karen' 'test'              # Australian female"
echo "     say -v ? | grep '(en_'             # list all English voices"
echo ""
