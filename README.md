# DeathBed ML Classifier

Naive Bayes + TF‑IDF classifier for life decisions (8 categories). Fast, free, <50ms per request.

## Quick Start

```bash
pip install -r requirements.txt
python inference_server.py
```

API: http://localhost:8000

## Endpoints

| Method | Endpoint  | Body                           | Response                                                    |
|--------|-----------|--------------------------------|-------------------------------------------------------------|
| GET    | /health   | –                              | `{"status":"ok"}`                                           |
| POST   | /classify | `{"text":"Should I quit?"}`  | `{"category":"career","confidence":0.81,"requiresOverride":false}` |

## Response Fields

| Field           | Description                                                          |
|-----------------|----------------------------------------------------------------------|
| category        | `career`, `education`, `relationship`, `finance`, `relocation`, `family`, `health`, `lifestyle` |
| subCategory     | More specific label (e.g., `"Quit Job"`)                             |
| confidence      | Probability score (0.0 – 1.0)                                        |
| requiresOverride| `true` if confidence < 0.60                                          |

## Files

- `inference_server.py` – FastAPI server
- `train_from_csv_v2.py` – Training script
- `models/decision_classifier.pkl` – Trained model
- `models/labels.pkl` – Category labels

## Requirements

Python 3.8+ · scikit-learn · fastapi · uvicorn · pandas · joblib · pydantic
