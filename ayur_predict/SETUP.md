# AyurAI — Complete IDE Setup & Run Guide

## Prerequisites
- Python 3.10 or 3.11 (recommended)
- pip
- Your trained model file: `best_diffpool.pt`
- Your knowledge file: `domain.json`

---

## Step 1 — Project Structure

Create/verify the following layout:

```
ayur_predict/
├── app.py
├── model.py
├── requirements.txt
├── best_diffpool.pt        ← paste your trained model here
├── domain.json             ← paste your domain knowledge file here
├── database.db             ← auto-created on first run
├── templates/
│   ├── index.html
│   └── history.html
└── static/                 ← optional, for extra CSS/JS
    ├── css/
    └── js/
```

---

## Step 2 — Create a Virtual Environment

### Windows (Command Prompt / PowerShell)
```cmd
cd ayur_predict
python -m venv venv
venv\Scripts\activate
```

### macOS / Linux
```bash
cd ayur_predict
python3 -m venv venv
source venv/bin/activate
```

---

## Step 3 — Install PyTorch (CPU or GPU)

### CPU only (lighter, works on all machines)
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### GPU (CUDA 11.8)
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### GPU (CUDA 12.1)
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## Step 4 — Install PyTorch Geometric

After PyTorch is installed:

```bash
pip install torch-geometric
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv \
    -f https://data.pyg.org/whl/torch-2.1.0+cpu.html
```

> Replace `cpu` with `cu118` or `cu121` if you have a GPU.

---

## Step 5 — Install Remaining Requirements

```bash
pip install flask flask-session networkx numpy matplotlib scikit-learn
```

Or use the requirements file (after PyTorch + PyG are installed):
```bash
pip install -r requirements.txt
```

---

## Step 6 — Initialise the Database

```bash
python -c "from app import init_db; init_db()"
```

Or just run the app — it auto-initialises on startup.

---

## Step 7 — Run the Application

```bash
python app.py
```

Open your browser at:
```
http://127.0.0.1:5000
```

---

## IDE-Specific Setup

### VS Code
1. Open the `ayur_predict/` folder: **File → Open Folder**
2. Install the **Python** extension (Microsoft)
3. Press `Ctrl+Shift+P` → **Python: Select Interpreter** → pick your `venv`
4. Open the integrated terminal (`Ctrl+`` `) and run `python app.py`
5. Click the URL in the terminal output to open the app

### PyCharm
1. **File → Open** → select the `ayur_predict/` folder
2. Go to **Settings → Project → Python Interpreter → Add Interpreter → Existing**
   → navigate to `venv/Scripts/python.exe` (Windows) or `venv/bin/python` (Mac/Linux)
3. Open `app.py`, click the green **▶ Run** button (top right)
   or right-click → **Run 'app'**
4. The Run panel shows the local URL — Ctrl+click to open

---

## Environment Variables (Optional)

For production, set:
```bash
export FLASK_ENV=production
export SECRET_KEY=your-secret-key-here
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: torch_geometric` | Re-run Step 4 inside the venv |
| `FileNotFoundError: best_diffpool.pt` | Place the `.pt` file in the project root |
| `FileNotFoundError: domain.json` | Place `domain.json` in the project root |
| Port 5000 already in use | Change `port=5000` to `port=5001` in `app.py` |
| `weights_only=True` warning | Already handled in `model.py` |
| Slow first prediction | Normal — model loads on first request (cached after) |

---

## Quick Verification

After starting the server, test via curl:

```bash
curl -X POST http://127.0.0.1:5000/predict \
  -d "symptoms=headache,fatigue,joint pain"
```

Expected response:
```json
{"disease":"...", "confidence":"82.4%", "confidence_raw":82.4, "timestamp":"14:30:21"}
```
