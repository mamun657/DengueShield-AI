import os
import pickle
import sys
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from groq import Groq
from werkzeug.utils import secure_filename
from rag_setup import build_rag_data

load_dotenv()
print("GROQ KEY:", os.getenv("GROQ_API_KEY"))

app = Flask(__name__)
logger = app.logger

SERVICE_DIR = Path(__file__).resolve().parent / "src" / "services"
if str(SERVICE_DIR) not in sys.path:
    sys.path.append(str(SERVICE_DIR))

RASH_MODEL_ERROR = None
try:
    from src.services.rashModelService import load_model as load_rash_model, predict_rash
except Exception as exc:
    load_rash_model = None
    predict_rash = None
    RASH_MODEL_ERROR = f"Rash model import failed: {exc}"

def _parse_origins(value: str):
    return [origin.strip() for origin in (value or "").split(",") if origin.strip()]

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
env_origins = _parse_origins(os.getenv("CLIENT_URL"))

cors_origins = [*default_origins, *env_origins, r"http://localhost:5\d{3}", r"http://127.0.0.1:5\d{3}"]
CORS(app, resources={r"/*": {"origins": cors_origins}})

RAG_DATA_PATH = os.path.join(os.path.dirname(__file__), "rag_data.pkl")
RAG_MIN_SCORE = 0.2
RAG_EMBED_MODEL = "all-MiniLM-L6-v2"
RAG_CONTEXT_LIMIT = 1200

RASH_MAX_IMAGE_MB = 5
RASH_MAX_IMAGE_BYTES = RASH_MAX_IMAGE_MB * 1024 * 1024
RASH_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
RASH_ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}
RASH_UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
RASH_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

if load_rash_model:
    try:
        load_rash_model()
    except Exception as exc:
        RASH_MODEL_ERROR = f"Rash model load failed: {exc}"
        logger.warning("[RASH] %s", RASH_MODEL_ERROR)

FEATURE_FIELDS = [
    "day",
    "temp",
    "headache",
    "vomiting",
    "abdominal_pain",
    "bleeding",
    "fatigue",
    "rash",
    "eye_pain",
    "appetite_loss",
    "restlessness",
    "fluid",
    "pregnant",
    "days_high_fever",
]


def to_float(value, field):
    if value is None:
        raise ValueError(f"{field} is required")
    if isinstance(value, bool):
        return float(int(value))
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be numeric")


def to_bool(value, field):
    if value is None:
        raise ValueError(f"{field} is required")
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n"}:
            return False
    raise ValueError(f"{field} must be a boolean")


def classify_risk(score):
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MODERATE"
    return "LOW"


def _pick_reasons(reasons: List[str], max_items: int = 3) -> List[str]:
    if not reasons:
        return []
    return reasons[:max_items]


def _format_explanation(risk_level: str, reasons: List[str]) -> str:
    if not reasons:
        return "Low risk based on current inputs with limited warning signs."
    joined = ", ".join(reasons[:-1]) + f", and {reasons[-1]}" if len(reasons) > 1 else reasons[0]
    return f"{risk_level.title()} risk due to {joined}."


def _load_rag_data() -> Dict[str, List]:
    if not os.path.exists(RAG_DATA_PATH):
        payload = build_rag_data()
        with open(RAG_DATA_PATH, "wb") as handle:
            pickle.dump(payload, handle)
        return payload
    with open(RAG_DATA_PATH, "rb") as handle:
        payload = pickle.load(handle)
    if not payload.get("chunks") or not payload.get("embeddings"):
        raise ValueError("RAG data is missing chunks or embeddings.")
    return payload


def _load_embedder() -> SentenceTransformer:
    return SentenceTransformer(RAG_EMBED_MODEL)


def _tokenize(text: str) -> List[str]:
    return [token for token in "".join(ch if ch.isalnum() else " " for ch in text.lower()).split() if token]


def _is_allowed_rash_image(file_storage) -> bool:
    filename = secure_filename(file_storage.filename or "")
    extension = Path(filename).suffix.lower()
    if extension not in RASH_ALLOWED_EXTENSIONS:
        return False
    mimetype = (file_storage.mimetype or "").lower()
    if mimetype and mimetype not in RASH_ALLOWED_MIME_TYPES:
        return False
    return True


def _keyword_fallback(query: str, chunks: List[str], k: int = 3) -> Optional[Dict[str, object]]:
    tokens = set(_tokenize(query))
    if not tokens:
        return None
    scored = []
    for chunk in chunks:
        chunk_tokens = _tokenize(chunk)
        if not chunk_tokens:
            continue
        score = sum(1 for token in chunk_tokens if token in tokens)
        if score > 0:
            scored.append((score, chunk))
    if not scored:
        return None
    scored.sort(key=lambda item: item[0], reverse=True)
    top = scored[:k]
    return {
        "context": "\n\n---\n\n".join([chunk for _score, chunk in top]),
        "confidence": RAG_MIN_SCORE,
        "scores": [float(score) / 100 for score, _chunk in top],
    }


try:
    RAG_DATA = _load_rag_data()
    RAG_EMBEDDER = _load_embedder()
    RAG_ERROR = None
except Exception as exc:
    RAG_DATA = None
    RAG_EMBEDDER = None
    RAG_ERROR = str(exc)


def calculate_risk(data: Dict) -> Dict:
    scores = []
    reasons = []
    alerts = []

    temp = data["temp"]
    day = data["day"]
    days_high_fever = data["days_high_fever"]
    fluid = data["fluid"]

    symptom_weights = {
        "bleeding": 20,
        "abdominal_pain": 12,
        "vomiting": 10,
        "restlessness": 8,
        "fatigue": 6,
        "rash": 6,
        "eye_pain": 6,
        "headache": 5,
        "appetite_loss": 5,
    }

    for symptom, weight in symptom_weights.items():
        if data.get(symptom):
            scores.append(weight)
            reasons.append(symptom.replace("_", " "))

    if temp >= 39.5:
        scores.append(18)
        reasons.append("very high fever")
    elif temp >= 38.5:
        scores.append(12)
        reasons.append("high fever")
    elif temp >= 37.8:
        scores.append(6)
        reasons.append("fever")

    if days_high_fever >= 5:
        scores.append(14)
        reasons.append("persistent fever for 5+ days")
    elif days_high_fever >= 3:
        scores.append(10)
        reasons.append("persistent fever for 3+ days")

    if 3 <= day <= 7:
        scores.append(8)
        reasons.append("critical illness window (day 3-7)")
    elif day >= 8:
        scores.append(5)
        reasons.append("prolonged illness")

    symptom_count = sum(1 for key in symptom_weights if data.get(key))
    if symptom_count >= 5:
        scores.append(10)
        reasons.append("multiple symptoms")
    elif symptom_count >= 3:
        scores.append(6)
        reasons.append("several symptoms")

    if data.get("bleeding") and 3 <= day <= 7:
        scores.append(10)
        reasons.append("bleeding in critical window")
        alerts.append("CRITICAL: Possible dengue critical phase")

    if data.get("vomiting") and data.get("abdominal_pain"):
        scores.append(6)
        reasons.append("vomiting with abdominal pain")

    if fluid < 1:
        scores.append(6)
        reasons.append("low fluid intake")

    if temp >= 39.5:
        alerts.append("High fever detected")

    if data.get("bleeding"):
        alerts.append("Bleeding symptom reported")

    raw_score = max(0, sum(scores))
    risk_score = min(100, raw_score * 0.8)

    if data.get("pregnant") and risk_score > 40:
        risk_score = min(100, risk_score + 5)
        reasons.append("pregnancy risk factor")
    risk_level = classify_risk(risk_score)
    top_reasons = _pick_reasons(reasons)

    return {
        "risk_score": round(risk_score, 2),
        "risk_level": risk_level,
        "explanation": _format_explanation(risk_level, top_reasons),
        "alerts": alerts,
    }


def build_rag_query(data: Dict) -> str:
    symptoms = []
    for key in [
        "headache",
        "bleeding",
        "vomiting",
        "abdominal_pain",
        "rash",
        "eye_pain",
        "fatigue",
        "restlessness",
        "appetite_loss",
    ]:
        if data.get(key):
            symptoms.append(key.replace("_", " "))
    symptom_text = ", ".join(symptoms) if symptoms else "no major symptoms"
    return (
        f"{symptom_text} day {int(data['day'])} temp {data['temp']} "
        "bleeding abdominal pain dengue warning signs WHO. "
        f"high fever days {int(data['days_high_fever'])}."
    )


def search_rag(query: str, k: int = 3) -> Optional[Dict[str, object]]:
    if not RAG_DATA or not RAG_EMBEDDER:
        return None
    try:
        query_embedding = RAG_EMBEDDER.encode([query])
        similarities = cosine_similarity(query_embedding, RAG_DATA["embeddings"])[0]
    except Exception:
        return _keyword_fallback(query, RAG_DATA["chunks"], k)
    if similarities.size == 0:
        return _keyword_fallback(query, RAG_DATA["chunks"], k)
    top_idx = similarities.argsort()[-k:][::-1]
    results = [RAG_DATA["chunks"][int(i)] for i in top_idx]
    top_scores = [float(similarities[int(i)]) for i in top_idx]
    payload = {
        "context": "\n\n---\n\n".join(results),
        "confidence": float(similarities.max()),
        "scores": top_scores,
    }
    if payload["confidence"] < RAG_MIN_SCORE:
        fallback = _keyword_fallback(query, RAG_DATA["chunks"], k)
        return fallback or payload
    return payload


def truncate_text(text: str, max_len: int = 450) -> str:
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[: max_len - 3].rstrip() + "..."


def build_symptom_list(data: Dict) -> List[str]:
    labels = []
    for key in [
        "headache",
        "bleeding",
        "vomiting",
        "abdominal_pain",
        "rash",
        "eye_pain",
        "fatigue",
        "restlessness",
        "appetite_loss",
    ]:
        if data.get(key):
            labels.append(key.replace("_", " "))
    return labels


def generate_report(risk_score: float, risk_level: str, symptoms: List[str], context: str) -> str:
    level_label = risk_level.lower()
    symptom_text = ", ".join(symptoms) if symptoms else "None reported"

    if risk_level == "CRITICAL":
        advice = [
            "Seek emergency medical care immediately.",
            "Monitor for bleeding, severe pain, or signs of shock.",
        ]
    elif risk_level == "HIGH":
        advice = [
            "Consult a clinician promptly.",
            "Increase fluids and monitor symptoms closely.",
        ]
    elif risk_level == "MODERATE":
        advice = [
            "Rest, hydrate, and re-check symptoms within 24 hours.",
            "Seek care if warning signs appear.",
        ]
    else:
        advice = [
            "Maintain hydration and rest.",
            "Monitor for any new warning signs.",
        ]

    advice_text = "\n".join(f"- {item}" for item in advice)

    emergency_warning = ""
    if risk_level in {"HIGH", "CRITICAL"}:
        emergency_warning = (
            "\n\n🚨 Emergency Warning:\n"
            "- Seek immediate care if symptoms worsen or bleeding occurs."
        )

    return (
        "AI Doctor Report\n\n"
        f"Risk Score: {risk_score}/100\n"
        f"Risk Level: {level_label}\n\n"
        "Based on WHO Guideline:\n"
        f"{context}\n\n"
        "Detected Symptoms:\n"
        f"{symptom_text}\n\n"
        "Medical Advice:\n"
        f"{advice_text}"
        f"{emergency_warning}"
    )


def generate_ai_report(risk_score: float, risk_level: str, symptoms: List[str], context: str) -> str:
    symptom_text = ", ".join(symptoms) if symptoms else "None reported"
    prompt = (
        "You are a dengue medical assistant.\n\n"
        "STRICT RULES:\n"
        "- Use ONLY the provided WHO guideline context\n"
        "- Do NOT generate generic answers\n"
        "- If answer is not found say: 'Not found in WHO guideline'\n\n"
        f"WHO GUIDELINE:\n{context}\n\n"
        f"Patient Summary:\nSymptoms: {symptom_text}\nRisk score: {risk_score}\nRisk level: {risk_level}\n\n"
        "Return a clean structured report with these exact sections:\n"
        "Summary:\nRisk level:\nWarning signs:\nAdvice:\nEmergency signs:\n"
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=512,
        )
        content = response.choices[0].message.content
        return content.strip() if content else generate_report(risk_score, risk_level, symptoms, context)
    except Exception:
        return generate_report(risk_score, risk_level, symptoms, context)


def generate_chat_reply(user_message: str, patient_data: dict = None):
    try:
        rag_result = search_rag(user_message)
        rag_context = None
        rag_scores = []
        if rag_result and rag_result.get("context"):
            rag_context = rag_result["context"]
            rag_scores = rag_result.get("scores", [])

        confidence = rag_result.get("confidence", 0) if rag_result else 0
        if not rag_context or confidence < RAG_MIN_SCORE:
            return {
                "reply": build_local_chat_reply(user_message),
                "rag_context": "",
                "rag_scores": rag_scores,
            }

        p_risk = patient_data.get("risk_score", "N/A") if patient_data else "N/A"
        p_symptoms = patient_data.get("symptoms", "None") if patient_data else "None"
        p_day = patient_data.get("day", "N/A") if patient_data else "N/A"

        prompt = (
            "You are a dengue medical assistant.\n\n"
            "STRICT RULES:\n"
            "* Use ONLY WHO guideline context\n"
            "* DO NOT generate generic answers\n"
            "* If not found -> say 'Not found in guideline'\n\n"
            "WHO CONTEXT:\n"
            f"{rag_context}\n\n"
            "Patient Data:\n"
            f"Risk Score: {p_risk}, Symptoms: {p_symptoms}, Day: {p_day}\n\n"
            "User Question:\n"
            f"{user_message}\n"
        )

        print("[CHAT] Query:", user_message)
        print("[CHAT] RAG Scores:", rag_scores)
        print("[CHAT] RAG Context Preview:", rag_context[:160] if rag_context else "")

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=512,
        )

        reply = response.choices[0].message.content
        if not reply or not reply.strip():
            reply = "Not found in guideline"

        return {"reply": reply, "rag_context": rag_context, "rag_scores": rag_scores}

    except Exception as e:
        import traceback
        print("[CHAT ERROR] Exception type:", type(e).__name__)
        print("[CHAT ERROR] Message:", e)
        traceback.print_exc()
        # 8. ERROR HANDLING: If Python fails -> return fallback message
        return {"reply": "AI service error. Please try again.", "rag_context": "", "rag_scores": []}


def build_local_chat_reply(message: str) -> str:
    text = str(message or "").lower()

    if any(greet in text for greet in ["hi", "hello", "hey", "hola", "assalam", "salam", "good morning", "good afternoon"]):
        return "Hi! Tell me your symptoms or ask about dengue."

    if any(phrase in text for phrase in ["how are you", "how r you", "how are u", "thanks", "thank you", "ok", "okay"]):
        return "I am here to help. Tell me your symptoms, and I will guide you."

    if any(symptom in text for symptom in ["fever", "rash", "bleeding", "vomit", "vomiting", "headache", "dengue", "pain", "weakness", "nausea"]):
        return "If you have high fever, severe headache, rash, bleeding, or persistent vomiting, seek medical care promptly. Stay hydrated and rest."

    return "Please describe your symptoms, like fever, rash, headache, bleeding, or vomiting."


def build_advice(risk_level: str) -> str:
    if risk_level == "CRITICAL":
        return "Seek emergency care immediately and monitor for bleeding or shock signs."
    if risk_level == "HIGH":
        return "Consult a clinician promptly and monitor symptoms closely."
    if risk_level == "MODERATE":
        return "Increase fluids, rest, and re-check symptoms within 24 hours."
    return "Continue hydration and observe for any warning signs."


@app.route("/", methods=["GET"])
def health():
    return {"message": "Dengue AI API Running"}


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    print("Incoming data:", payload)

    missing = [field for field in FEATURE_FIELDS if field not in payload]
    if missing:
        return jsonify({"error": "Missing required fields", "missing": missing}), 400

    try:
        parsed = {
            "temp": to_float(payload["temp"], "temp"),
            "day": to_float(payload["day"], "day"),
            "days_high_fever": to_float(payload["days_high_fever"], "days_high_fever"),
            "fluid": to_float(payload["fluid"], "fluid"),
            "headache": to_bool(payload["headache"], "headache"),
            "vomiting": to_bool(payload["vomiting"], "vomiting"),
            "abdominal_pain": to_bool(payload["abdominal_pain"], "abdominal_pain"),
            "bleeding": to_bool(payload["bleeding"], "bleeding"),
            "fatigue": to_bool(payload["fatigue"], "fatigue"),
            "rash": to_bool(payload["rash"], "rash"),
            "eye_pain": to_bool(payload["eye_pain"], "eye_pain"),
            "appetite_loss": to_bool(payload["appetite_loss"], "appetite_loss"),
            "restlessness": to_bool(payload["restlessness"], "restlessness"),
            "pregnant": to_bool(payload["pregnant"], "pregnant"),
        }
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    result = calculate_risk(parsed)
    rag_query = build_rag_query(parsed)
    rag_result = search_rag(rag_query)

    if RAG_ERROR or rag_result is None:
        rag_note = "Not found in WHO guideline"
        confidence = None
        rag_scores = []
    else:
        confidence = rag_result["confidence"]
        rag_scores = rag_result.get("scores", [])
        if confidence < RAG_MIN_SCORE:
            rag_note = "Not found in WHO guideline"
        else:
            rag_note = rag_result["context"]

    rag_note = truncate_text(rag_note, RAG_CONTEXT_LIMIT)
    print("RAG RESULT:", rag_note)
    print("RAG Scores:", rag_scores)

    symptoms = build_symptom_list(parsed)
    report = generate_ai_report(result["risk_score"], result["risk_level"], symptoms, rag_note)

    return jsonify(
        {
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "rag_context": rag_note,
            "report": report,
            "rag_scores": rag_scores,
        }
    )


@app.route("/api/rash/predict", methods=["POST"])
def predict_rash_api():
    logger.info("[RASH] Request received")
    if RASH_MODEL_ERROR or predict_rash is None:
        logger.warning("[RASH] Model unavailable: %s", RASH_MODEL_ERROR)
        return jsonify({"success": False, "error": "Rash model unavailable"}), 503

    if "image" not in request.files:
        return jsonify({"success": False, "error": "Image file is required"}), 400

    uploaded = request.files["image"]
    if not uploaded or not uploaded.filename:
        return jsonify({"success": False, "error": "No image selected"}), 400

    if not _is_allowed_rash_image(uploaded):
        return jsonify({"success": False, "error": "Invalid image type. Use JPG or PNG."}), 400

    if request.content_length and request.content_length > RASH_MAX_IMAGE_BYTES:
        return jsonify(
            {
                "success": False,
                "error": f"Image exceeds {RASH_MAX_IMAGE_MB}MB limit",
            }
        ), 413

    saved_image_path = None
    try:
        safe_name = secure_filename(uploaded.filename)
        suffix = Path(safe_name).suffix.lower() or ".jpg"
        unique_prefix = f"rash_{int(time.time())}_{uuid.uuid4().hex[:10]}"
        saved_image_path = RASH_UPLOADS_DIR / f"{unique_prefix}{suffix}"
        uploaded.save(str(saved_image_path))
        logger.info("[RASH] File saved: %s", saved_image_path)

        if os.path.getsize(saved_image_path) > RASH_MAX_IMAGE_BYTES:
            return jsonify(
                {
                    "success": False,
                    "error": f"Image exceeds {RASH_MAX_IMAGE_MB}MB limit",
                }
            ), 413

        result = predict_rash(
            str(saved_image_path),
            output_dir=str(RASH_UPLOADS_DIR),
            output_prefix=saved_image_path.stem,
        )
        logger.info("[RASH] Prediction: %s (%.2f%%)", result["prediction"], result["confidence"])
        base_url = request.host_url.rstrip("/")
        original_image_url = f"{base_url}/uploads/{saved_image_path.name}"
        gradcam_filename = result.get("gradcam_filename")
        gradcam_url = f"{base_url}/uploads/{gradcam_filename}" if gradcam_filename else None
        return jsonify(
            {
                "success": True,
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "original_image_url": original_image_url,
                "gradcam_image_url": gradcam_url,
            }
        )
    except ValueError as exc:
        logger.info("[RASH] Validation error: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception as exc:
        logger.exception("[RASH] Prediction failed: %s", exc)
        return jsonify({"success": False, "error": "Rash prediction failed"}), 500


@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload_file(filename):
    return send_from_directory(str(RASH_UPLOADS_DIR), filename)


@app.route("/rag/refresh", methods=["POST"])
def refresh_rag():
    global RAG_DATA, RAG_ERROR
    try:
        payload = build_rag_data()
        with open(RAG_DATA_PATH, "wb") as handle:
            pickle.dump(payload, handle)
        RAG_DATA = payload
        RAG_ERROR = None
        return {"status": "RAG rebuilt", "chunks": len(payload["chunks"])}
    except Exception as exc:
        RAG_ERROR = str(exc)
        return {"error": "RAG rebuild failed", "details": RAG_ERROR}, 500


@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    user_msg = data.get("message")
    patient_data = data.get("patient_data")

    if not user_msg:
        return jsonify({"error": "message is required"}), 400

    result = generate_chat_reply(user_msg, patient_data)

    return jsonify(result)


@app.route("/report", methods=["POST"])
def generate_report():
    print("[PYTHON] Generating report...")
    data = request.json.get("data")
    if not data:
        return jsonify({"error": "No data"}), 400

    # Extract info for RAG
    symptoms = ", ".join(data.get("symptoms", []))
    day = data.get("dayOfIllness", 1)
    query = f"Dengue symptoms: {symptoms}, Day: {day}"

    # RAG retrieve
    rag_result = search_rag(query)
    chunks = rag_result.get("context", "No WHO guideline context found.")

    # LLM
    risk_score = data.get("computed", {}).get("riskScore", 0)
    risk_level = data.get("computed", {}).get("riskLevel", "Low")

    prompt = (
        "You are a medical assistant. Generate a professional Dengue AI Doctor Report.\n\n"
        "WHO GUIDELINES:\n"
        f"{chunks}\n\n"
        "PATIENT DATA:\n"
        f"Risk Score: {risk_score}\n"
        f"Risk Level: {risk_level}\n"
        f"Symptoms: {symptoms}\n"
        f"Day of Illness: {day}\n\n"
        "FORMAT: Return a structured medical report with Summary, Risk Assessment, and Advice."
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1024,
        )
        report_text = response.choices[0].message.content
        return jsonify({"report": report_text})
    except Exception as e:
        print(f"[PYTHON ERROR] {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True, use_reloader=False)