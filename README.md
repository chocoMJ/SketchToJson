# SketchToJson

Sketch image segments are classified with a PyTorch model and converted into JSON form data.

## Setup

```sh
uv sync
```

## Run

### Server
```sh
uv run uvicorn api:app --reload --host 127.0.0.1 --port 8000
```

### Script

```sh
uv run python main.py
```
