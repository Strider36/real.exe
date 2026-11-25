# REALITY.EXE

AI-powered urban infrastructure decision-simulation MVP. REALITY.EXE lets city planners test infrastructure decisions in a synthetic virtual city before real-world action, producing three comparable futures: **Baseline**, **Disruption**, and **Optimized Alternative**.

> **Disclaimer**: Decision support only. All synthetic network data is illustrative (`SYNTHETIC MVP ASSUMPTION - not verified municipal data`).

## Stage 0 Structure

```text
REALITY.EXE/
  .gitignore
  README.md
  backend/
    requirements.txt
    app/
      __init__.py
      main.py
      database.py
      api/__init__.py
      core/__init__.py
      simulations/__init__.py
      agents/__init__.py
      models/__init__.py
      data/
        city_nodes.json
        roads.json
        water_network.json
        facilities.json
    tests/
      test_data_integrity.py
  frontend/
  docs/
    demo-script.md
```

## Quick Start (Windows PowerShell 5.1 / 7)

### 1. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```
If script activation is blocked by execution policy:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### 2. Run Backend API
From `backend/`:
```powershell
uvicorn app.main:app --reload --port 8000
```
Health check: `http://127.0.0.1:8000/api/health`

### 3. Run Data Integrity Tests
From `backend/`:
```powershell
python -m pytest tests -v
```

### 4. Run Frontend
From `frontend/`:
```powershell
npm run dev
```
Open `http://localhost:5173/`.
