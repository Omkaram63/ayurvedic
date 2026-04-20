import os
import sqlite3
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"
SESSION_DIR = BASE_DIR / ".flask_session"
DEFAULT_WEIGHTS_PATH = Path(r"C:\Users\chila\Downloads\best_diffpool.pt")

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "ayur-predict-secret-key")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_FILE_DIR"] = str(SESSION_DIR)
app.config["SESSION_PERMANENT"] = False
SESSION_DIR.mkdir(exist_ok=True)
Session(app)

_model_cache = {}


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                symptoms TEXT NOT NULL,
                disease TEXT NOT NULL,
                confidence REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        conn.commit()


init_db()


def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped_view


def create_user(username, password):
    username = username.strip()
    password_hash = generate_password_hash(password)
    with get_db_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, password_hash),
        )
        conn.commit()
        return cursor.lastrowid


def get_user_by_username(username):
    with get_db_connection() as conn:
        return conn.execute(
            "SELECT * FROM users WHERE username = ?",
            (username.strip(),),
        ).fetchone()


def save_history(user_id, symptoms, disease, confidence):
    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO predictions (user_id, symptoms, disease, confidence) VALUES (?, ?, ?, ?)",
            (user_id, symptoms, disease, confidence),
        )
        conn.commit()


def get_history(user_id):
    with get_db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM predictions WHERE user_id = ? ORDER BY timestamp DESC, id DESC LIMIT 50",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def get_model():
    if _model_cache:
        return _model_cache

    from model import load_model

    weights_path = os.environ.get("AYUR_MODEL_WEIGHTS")
    candidate_paths = [
        Path(weights_path) if weights_path else None,
        BASE_DIR / "best_diffpool.pt",
        DEFAULT_WEIGHTS_PATH,
    ]

    resolved_weights = next((path for path in candidate_paths if path and path.exists()), None)
    if not resolved_weights:
        searched = ", ".join(str(path) for path in candidate_paths if path)
        raise FileNotFoundError(
            f"Model weights not found. Checked: {searched}. "
            "Set AYUR_MODEL_WEIGHTS to your saved model file."
        )

    _model_cache.update(
        load_model(
            domain_path=str(BASE_DIR / "domain.json"),
            weights_path=str(resolved_weights),
        )
    )
    return _model_cache


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("index"))

    error = None
    success = None
    form_mode = "login"

    if request.method == "POST":
        form_mode = request.form.get("form_type", "login")
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        if not username or not password:
            error = "Enter both username and password."
        elif len(username) < 3:
            error = "Username must be at least 3 characters long."
        elif form_mode == "register":
            if len(password) < 6:
                error = "Password must be at least 6 characters long."
            elif get_user_by_username(username):
                error = "That username already exists."
            else:
                user_id = create_user(username, password)
                session["user_id"] = user_id
                session["username"] = username
                return redirect(url_for("index"))
        else:
            user = get_user_by_username(username)
            if not user or not check_password_hash(user["password_hash"], password):
                error = "Invalid username or password."
            else:
                session["user_id"] = user["id"]
                session["username"] = user["username"]
                return redirect(url_for("index"))

    if request.args.get("logged_out") == "1":
        success = "You have been logged out."

    return render_template(
        "login.html",
        error=error,
        success=success,
        form_mode=form_mode,
    )


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login", logged_out=1))


@app.route("/")
@login_required
def index():
    model_error = None
    symptoms = []

    try:
        cache = get_model()
        symptoms = sorted(cache["all_symptoms"], key=str.lower)
    except Exception as exc:
        model_error = str(exc)

    return render_template(
        "index.html",
        all_symptoms=symptoms,
        username=session.get("username"),
        model_error=model_error,
    )


@app.route("/predict", methods=["POST"])
@login_required
def predict():
    selected_symptoms = [item.strip() for item in request.form.getlist("symptoms") if item.strip()]
    if not selected_symptoms:
        return jsonify({"error": "Select at least one symptom."}), 400

    symptoms_text = ", ".join(selected_symptoms)

    try:
        cache = get_model()
        from model import get_ranked_predictions

        ranked_predictions = get_ranked_predictions(
            symptoms_text,
            cache.get("disease_symptom_map", {}),
            cache.get("symptom_lookup"),
        )
        if not ranked_predictions:
            return jsonify({"error": "No known symptoms detected."}), 400

        disease = ranked_predictions[0]["disease"]
        confidence = ranked_predictions[0]["confidence_raw"] / 100.0

        save_history(session["user_id"], symptoms_text, disease, confidence)

        return jsonify(
            {
                "disease": disease,
                "confidence": f"{confidence * 100:.2f}%",
                "confidence_raw": round(confidence * 100, 2),
                "matches": ranked_predictions,
                "selected_symptoms": selected_symptoms,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/history")
@login_required
def history():
    records = get_history(session["user_id"])
    return render_template(
        "history.html",
        records=records,
        username=session.get("username"),
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
