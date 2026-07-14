# Multi-Document KYC Verification System

A secure, high-performance, and modular KYC (Know Your Customer) application that integrates **Aadhaar** and **PAN Card** verification. It is built using **FastAPI** for the backend (reorganized into a clean layered architecture) and **React (Vite)** for the frontend.

---

## Architecture Overview

The backend is refactored into a structured layered layout, separating routing, orchestration, data models, and business services:

```
Learning/
├── agents/                   # Orchestration Agents
│   ├── extraction_agent.py   # Coordinates Aadhaar/PAN extraction details
│   ├── verification_agent.py # Coordinates legacy profile lookups and validations
│   ├── address_proof_agent.py# Coordinates electricity bill fallback checks
│   └── trust_score_agent.py  # Coordinates trust score calculations
├── api/                      # FastAPI Route Controllers
│   ├── extraction.py         # POST /extract-document
│   ├── verification.py       # POST /verify & GET /user/{aadhaar}
│   ├── address.py            # POST /verify-address-proof
│   └── history.py            # APIRouter placeholder for history endpoints
├── models/                   # Database Schemas & Data Loaders
│   ├── database.py           # Database engine configuration
│   ├── models.py             # Reusable Pydantic input models
│   └── data_loader.py        # SQL queries for database records
├── services/                 # Core Processing Services
│   ├── ocr.py                # Tesseract OCR extraction logic
│   ├── document_parse.py     # Regex and OCR parsers
│   ├── llm_extractor.py      # LLM fallback extraction (via Groq/Llama)
│   ├── qr_extractor.py       # QR code locator & byte extraction
│   ├── secure_qr_decoder.py  # Aadhaar Secure QR decompressor
│   ├── validators.py         # Verhoeff (Aadhaar) and PAN validation
│   ├── verifier.py           # DB record matching logic
│   ├── trust_score.py        # Trust scoring calculations
│   ├── image_checks.py       # Resolution, blur, and metadata checks
│   ├── identity_comparator.py# Fuzzy name matching and DOB validation
│   ├── address_proof_comparator.py # Address proof comparison logic
│   └── comparator.py         # Aadhaar OCR vs QR field comparator
├── utils/                    # Shared Utilities
│   └── logger.py             # Centralised logging module
├── frontend/                 # React UI (Vite)
├── main.py                   # FastAPI Application Root Entrypoint
├── requirements.txt          # Python project dependencies
└── demo.py                   # Server connection test script
```

---

## Features

- **Dual-Document Upload:** Aadhaar and PAN documents are uploaded together before verification begins.
- **Advanced OCR & Fallbacks:** Employs Tesseract OCR for fast local text extraction with LLM fallback (Groq Llama 3.3) for unstructured document OCR verification.
- **Secure QR Extraction:** Automatically decodes UIDAI Aadhaar Secure QR code byte payloads to verify authentic demographics directly from signatures.
- **Cross-Document Identity Check:** Performs fuzzy name similarity matching (using RapidFuzz) and exact DOB validation between Aadhaar and PAN records.
- **Electricity Bill Fallback:** Automatically prompts the user for an electricity bill if the Aadhaar Secure QR is missing or undecodable, ensuring verification continues seamlessly.
- **Image Quality Checks:** Detects blurriness, assesses resolution limits, and reads EXIF metadata to flag high-risk uploads.

---

## Setup & Running Guide

### Prerequisites
- **Python 3.8+**
- **Tesseract OCR Engine** installed on the host system.
  - The path configuration is configured in `services/ocr.py`: `C:\Program Files\Tesseract-OCR\tesseract.exe`.
- **Node.js & npm** (for running the React UI).
- **PostgreSQL Database** running on `localhost:5432` with a database named `DOC_verifiction_db`.

---

### Backend Setup

1. **Activate Virtual Environment:**
   ```bash
   python -m venv venv
   venv\Scripts\activate   # On Windows
   source venv/bin/activate # On Unix/macOS
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Run the Backend:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

### Frontend Setup

1. **Navigate to the Frontend Directory:**
   ```bash
   cd frontend
   ```

2. **Install Packages:**
   ```bash
   npm install
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

---

## Testing & Verification

We include a simple verification script `demo.py` in the root workspace. You can run this when the FastAPI server is active to test connectivity:

```bash
python demo.py
```
**Expected Response:**
```json
{
  "status": "running",
  "message": "Document Verification API"
}
```

Temporary verification images (Aadhaar, PAN, and Electricity Bill uploads) are processed and saved in the `input/` folder (configured as `input/temp_<filename>`). These are ignored from Git commits via the `.gitignore` configuration.
