"""
Hospital Management System — AI Microservice
FastAPI server running on port 8000.

Provides AI-powered endpoints for:
  - Prescription scanning (OCR)
  - Diagnosis assistance
  - Patient triage scoring
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(
    title="Hospital AI Service",
    description="AI-powered microservice for the Hospital Management System",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ────────────────────────────────────────────────────────────────────

class PrescriptionScanRequest(BaseModel):
    image_base64: str
    language: Optional[str] = "en"


class DiagnosisRequest(BaseModel):
    symptoms: list[str]
    patient_age: int
    patient_gender: str
    medical_history: Optional[list[str]] = []


class TriageRequest(BaseModel):
    chief_complaint: str
    vital_signs: Optional[dict] = {}
    pain_level: Optional[int] = 0
    consciousness: Optional[str] = "alert"


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-service", "version": "1.0.0"}


@app.post("/api/prescription-scan")
async def scan_prescription(req: PrescriptionScanRequest):
    """
    Scans a prescription image and extracts medicine details.
    TODO: Integrate with a trained OCR model from models/trained/
    """
    # Placeholder response — replace with actual model inference
    return {
        "success": True,
        "data": {
            "medicines": [
                {"name": "Placeholder Medicine", "dosage": "500mg", "frequency": "Twice daily"}
            ],
            "notes": "AI prescription scanning is not yet connected to a trained model.",
        },
    }


@app.post("/api/diagnosis-assist")
async def assist_diagnosis(req: DiagnosisRequest):
    """
    Provides possible diagnoses based on symptoms.
    TODO: Load trained scikit-learn model from models/trained/
    """
    return {
        "success": True,
        "data": {
            "possible_diagnoses": [
                {"condition": "Placeholder Condition", "confidence": 0.0}
            ],
            "disclaimer": "AI suggestions are for reference only. Always consult a qualified physician.",
        },
    }


@app.post("/api/triage")
async def triage_patient(req: TriageRequest):
    """
    Assigns a triage priority score based on symptoms and vitals.
    TODO: Implement with trained triage model
    """
    return {
        "success": True,
        "data": {
            "priority": "MEDIUM",
            "score": 5,
            "recommendation": "Patient should be seen within 30 minutes.",
            "disclaimer": "AI triage is advisory. Clinical judgment takes priority.",
        },
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
