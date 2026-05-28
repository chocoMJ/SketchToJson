# FastAPI Backend

## Setup

```powershell
cd C:\Users\Kmj\Documents\SketchToJson\web\teammate_project
python -m venv backend\.venv
backend\.venv\Scripts\activate
python -m pip install -r backend\requirements.txt
```

## Run

```powershell
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Open these URLs:

- API health check: http://127.0.0.1:8000/api/health
- API docs: http://127.0.0.1:8000/docs

The Vite dev server proxies `/api` requests to `http://127.0.0.1:8000`.
