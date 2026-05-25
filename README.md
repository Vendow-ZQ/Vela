# Vela

Vela is an AI fitness agent demo: a React/Vite mobile web app plus a FastAPI backend for training-plan generation, set-by-set adjustment, failure handling, replacements, and workout review.

## Project Structure

```text
.
├─ backend/                  # FastAPI app and LLM client
│  ├─ main.py
│  ├─ config.py
│  ├─ llm_client.py
│  ├─ models.py
│  └─ prompts/
├─ frontend/                 # React + Vite + Tailwind app
│  ├─ src/
│  ├─ package.json
│  └─ vite.config.ts
├─ requirements.txt          # Backend Python dependencies
├─ render.yaml               # Render blueprint for the API
├─ start-dev.ps1             # Windows local dev helper
└─ .env.example
```

## Local Development

Create your local environment file:

```bash
cp .env.example .env
```

Install and start the backend:

```bash
pip install -r requirements.txt
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

On Windows, you can also run `start-dev.bat`. The frontend is started with `--host 0.0.0.0`, so phones on the same network can open `http://<your-computer-ip>:5173`.

## Environment Variables

Backend variables:

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# Optional providers
OPENAI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Frontend production variable:

```bash
VITE_API_BASE_URL=https://your-backend-domain.example.com
```

Leave `VITE_API_BASE_URL` empty for local development. Vite will proxy `/api` to the local FastAPI server.

## Deploy

Recommended production setup:

1. Deploy the backend to Render with `render.yaml`.
2. Copy the Render service URL, for example `https://vela-api.onrender.com`.
3. Deploy `frontend/` to Vercel.
4. In Vercel, set `VITE_API_BASE_URL` to the Render backend URL.
5. Redeploy the Vercel project after setting the environment variable.

### Render Backend

Use this repository as a Render Blueprint, or create a Web Service manually:

- Build command: `pip install -r requirements.txt`
- Start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/`

Add the provider secrets in Render instead of committing them:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` if needed
- `OPENAI_API_KEY` if using OpenAI
- AWS credentials if using Bedrock

### Vercel Frontend

Create a Vercel project from the `frontend/` directory:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-render-api-url`

## Useful Commands

```bash
# Frontend build
cd frontend
npm run build

# Backend smoke test
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```
