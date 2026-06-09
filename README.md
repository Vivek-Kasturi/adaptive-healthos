# 🧬 Adaptive HealthOS

**The AI health operating system that adapts your fitness plan in real time — powered by 6 Gemini agents.**

> Built for the [Google Cloud Rapid Agent Hackathon 2026](https://rapid-agent.devpost.com/) — MongoDB Track

[![Live Demo](https://img.shields.io/badge/Live%20Demo-adaptive--healthos.vercel.app-emerald)](https://adaptive-healthos.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What it does

Most fitness apps are passive trackers. You log. They store. Nothing changes.

Adaptive HealthOS is a multi-agent AI system where **6 specialized Gemini agents autonomously manage your health** — rewriting nutrition plans, updating goal forecasts, and keeping you accountable without manual intervention.

Log a meal → **4 agents fire in sequence**: NutritionAgent recalculates macros and updates your plan, ForecastingAgent revises your goal date, ProgressAnalysisAgent checks for plateau trends, AccountabilityAgent awards XP and maintains your streak. Every action is persisted to MongoDB Atlas — refresh the page and your entire health OS is exactly where you left it.

---

## Live Demo

**[adaptive-healthos.vercel.app](https://adaptive-healthos.vercel.app)**

Click **"Load Demo Account"** to see all 6 agents with 14 days of pre-loaded health data — no signup required.

---

## Agent Architecture

```
User Input (natural language or log)
        │
        ▼
┌─────────────────────┐
│  OrchestratorAgent  │  ← classifies intent, routes to specialists
│  gemini-2.5-flash   │
└──────────┬──────────┘
           │
    ┌──────┴──────────────────────────────────┐
    ▼          ▼           ▼          ▼        ▼
NutritionAgent  WorkoutAgent  RecoveryAgent  ProgressAgent  ForecastingAgent
    │               │              │               │               │
    └───────────────┴──────────────┴───────────────┴───────────────┘
                                   │
                         AccountabilityAgent
                         (XP, streaks, achievements)
                                   │
                                   ▼
                          MongoDB Atlas (all state)
```

| Agent | Responsibility |
|---|---|
| **OrchestratorAgent** | Intent classification, routing, response assembly |
| **NutritionAgent** | Food logging, macro recalculation, meal plan adaptation |
| **WorkoutAgent** | Exercise logging, schedule management, volume adjustment |
| **RecoveryAgent** | Sleep monitoring, overtraining detection, rest recommendations |
| **ProgressAnalysisAgent** | Weight trend detection, plateau identification, weekly summaries |
| **ForecastingAgent** | Goal date projection across optimistic/realistic/pessimistic scenarios |
| **AccountabilityAgent** | XP awards, streak tracking, achievement unlocks |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI Model** | Gemini 2.5 Flash (`gemini-2.5-flash`) |
| **Agent Framework** | Google Cloud ADK (`google-adk`) |
| **Database** | MongoDB Atlas (primary data layer for all agent state) |
| **Backend** | Python 3.12, FastAPI, uvicorn |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Recharts |
| **Real-time** | WebSockets (FastAPI) — streaming agent responses |
| **Deployment** | Vercel (frontend + backend) |

---

## Key Features

- **Agent Activity Panel** — always-visible panel showing which agent fired, what tool it called, and why. No black box.
- **Plan versioning** — every plan update shows version number, agent author, and reason ("NutritionAgent: 3-day calorie surplus detected")
- **Forecast chart** — animated goal projection with three scenarios, updates after every weight log
- **Gamification** — XP, levels, streaks, and achievements wired to every agent action
- **Persistent memory** — all agent decisions stored in MongoDB; data survives page refresh and session restart
- **Auto-demo mode** — append `?autodemo=1` to URL for a fully scripted walkthrough

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node 18+
- MongoDB Atlas cluster (free M0 tier works)
- Google Cloud project with Vertex AI enabled

### Backend

```bash
cd backend
python -m venv venv311
source venv311/bin/activate
pip install -r requirements.txt

# Copy and fill in your credentials
cp ../.env.example .env

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Set backend URL
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
```

### Seed demo data

```bash
curl -X POST http://localhost:8000/api/demo/seed-profiles
```

Then open http://localhost:5173 and click "Load Demo Account".

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1
GEMINI_MODEL=gemini-2.5-flash
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=healthos
SECRET_KEY=your-secret-key
```

---

## Project Structure

```
adaptive-healthos/
├── backend/
│   ├── agents/          # 7 ADK LlmAgent definitions
│   │   ├── orchestrator.py
│   │   ├── nutrition_agent.py
│   │   ├── workout_agent.py
│   │   ├── recovery_agent.py
│   │   ├── progress_agent.py
│   │   ├── forecasting_agent.py
│   │   ├── accountability_agent.py
│   │   └── runner.py    # ADK Runner + session management
│   ├── routers/         # FastAPI endpoints
│   ├── tools/           # MongoDB tool functions (called by agents)
│   ├── models/          # Pydantic schemas
│   └── main.py
└── frontend/
    ├── src/
    │   ├── pages/       # Dashboard, Chat, Plans, Progress, Achievements
    │   └── components/  # AgentActivityPanel, AutoDemoRunner, etc.
    └── package.json
```

---

## License

MIT — see [LICENSE](LICENSE)
