# PlanMigo 🧭

**Dein KI-Reisebegleiter — vom Schlagwort zum perfekten Urlaub, in Minuten statt Wochen.**

PlanMigo ist eine konversationelle Reiseplanungs-App. Nutzer geben ein paar Schlagwörter ein
("Berge, ruhig, September"), die KI fragt gezielt nach, durchsucht Reise-APIs und baut daraus einen
kompletten, buchbaren Reiseplan — Ort, Anreise, Unterkunft, Sehenswürdigkeiten, Restaurants.

| | |
|---|---|
| **Team** | Kevin Schaulis (CEO) · Marco Martins (CTO) · Patrick Lenzen (CMO) |
| **Zielgruppe** | Berufstätige 25–45, technikaffin, Premium-Erlebnisse |
| **Status** | MVP-Entwicklung (H1 2027 · Beta) |

---

## 🎨 Design-System

Alle UI-Komponenten verwenden ausschließlich diese Farben. Sie liegen als CSS-Variablen in
`frontend/src/styles/tokens.css` und als Tailwind-Theme in `tailwind.config.js`.

| Token | Hex | RGB | Einsatz |
|---|---|---|---|
| `--pm-orange` | `#C9603A` | 201, 96, 58 | Logo-Icon, Labels, CTAs |
| `--pm-sage` | `#7B9D6F` | 123, 157, 111 | Zweitfarbe „Migo", Akzente |
| `--pm-green-dark` | `#5C7A52` | 92, 122, 82 | Grüne Akzente, Häkchen |
| `--pm-sand` | `#D8C9A8` | 216, 201, 168 | Pills, Trennlinien, Chips |
| `--pm-cream` | `#FAF6F1` | 250, 246, 241 | Hintergrund, heller Text |

---

## 🏗️ Tech-Stack

| Layer | Technologie |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript + Tailwind CSS |
| **Backend** | FastAPI (Python 3.11+), Pydantic v2, Uvicorn |
| **KI-Modell** | OpenRouter (LLM-Gateway, modellagnostisch) |
| **Host / Chat-Oberfläche** | Open WebUI |
| **Datenbank** | PostgreSQL + SQLAlchemy (async) |
| **Deployment** | Docker Compose |

> **Details:** siehe [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> **Änderungshistorie:** siehe [`CLAUDE.md`](./CLAUDE.md)

---

## 📁 Projektstruktur

```
planmigo/
├── README.md                # Diese Datei
├── ARCHITECTURE.md          # Verbindliche Architektur — IMMER lesen vor Code-Änderung
├── CLAUDE.md                # Changelog + Arbeitsanweisungen für die KI
├── docker-compose.yml
├── .env.example
│
├── backend/                 # FastAPI
│   ├── app/
│   │   ├── main.py          # App-Factory, CORS, Router-Registrierung
│   │   ├── config.py        # Pydantic Settings (.env)
│   │   ├── api/v1/          # Router: chat, trips, search, health
│   │   ├── services/        # openrouter.py, travel_api.py, planner.py
│   │   ├── models/          # SQLAlchemy ORM
│   │   ├── schemas/         # Pydantic Request/Response
│   │   └── core/            # deps.py, security.py, logging.py
│   ├── tests/
│   └── requirements.txt
│
├── frontend/                # React
│   ├── src/
│   │   ├── components/      # ChatWindow, TripCard, KeywordPills, …
│   │   ├── pages/
│   │   ├── hooks/           # useChat, useTripPlan
│   │   ├── api/             # Axios-Client → FastAPI
│   │   ├── styles/tokens.css
│   │   └── App.tsx
│   ├── tailwind.config.js
│   └── package.json
│
└── openwebui/               # Open WebUI Konfiguration & Pipeline
    └── pipelines/planmigo_pipeline.py
```

---

## 🚀 Setup

### Voraussetzungen
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- OpenRouter API-Key → https://openrouter.ai/keys

### 1. Repository klonen
```bash
git clone https://github.com/<org>/planmigo.git
cd planmigo
cp .env.example .env
```

### 2. `.env` befüllen
```env
# --- OpenRouter ---
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
OPENROUTER_APP_NAME=PlanMigo
OPENROUTER_SITE_URL=https://planmigo.app

# --- Backend ---
DATABASE_URL=postgresql+asyncpg://planmigo:planmigo@db:5432/planmigo
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
SECRET_KEY=change-me

# --- Open WebUI ---
OPENWEBUI_PORT=3000
WEBUI_SECRET_KEY=change-me
```

### 3. Backend starten
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
→ API-Docs: http://localhost:8000/docs

### 4. Frontend starten
```bash
cd frontend
npm install
npm run dev
```
→ http://localhost:5173

### 5. Alles per Docker
```bash
docker compose up --build
```
| Dienst | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| Open WebUI | http://localhost:3000 |

---

## 🔌 API (v1)

| Methode | Endpoint | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/health` | Healthcheck |
| `POST` | `/api/v1/chat` | Dialogturn → nächste Rückfrage der KI (leere `message` startet die Konversation) |
| `POST` | `/api/v1/trips/plan` | Schlagwörter + Antworten → Reiseplan |
| `GET` | `/api/v1/trips/{id}` | Reiseplan abrufen |
| `POST` | `/api/v1/search/flights` | Flugsuche (Amadeus) |
| `POST` | `/api/v1/search/stays` | Unterkünfte (Booking Affiliate) |
| `POST` | `/api/v1/search/activities` | Aktivitäten (GetYourGuide) |

---

## 🤖 Arbeiten mit der KI (Claude / Copilot)

Diese drei Dateien sind das Gedächtnis des Projekts:

| Datei | Zweck |
|---|---|
| `README.md` | Überblick, Setup, Stack |
| `ARCHITECTURE.md` | **Verbindliche** Architekturregeln — Quelle der Wahrheit |
| `CLAUDE.md` | Chronologisches Änderungsprotokoll + Regeln für die KI |

**Standard-Prompt für jede Session:**

> Lies zuerst `ARCHITECTURE.md` und `CLAUDE.md`. Halte dich an die dort definierte Architektur,
> Ordnerstruktur und Farbpalette. Führe folgende Aufgabe aus: `<AUFGABE>`.
> Aktualisiere danach `ARCHITECTURE.md` (falls sich die Architektur geändert hat) und trage die
> Änderung mit Datum in `CLAUDE.md` ein.

---

## 🗺️ Roadmap

| Phase | Zeitraum | Inhalt |
|---|---|---|
| MVP & Beta | H1 2027 | Konversationelle KI-Eingabe, geschlossene Beta |
| Buchung live | H2 2027 | Flug- & Hotel-APIs, öffentlicher Launch DE |
| Wachstum | H1 2028 | Premium-Erlebnisse, Marketing-Skalierung |
| Skalierung | H2 2028 | Sponsoring & B2B, DACH + weitere Märkte |

---

© 2026 PlanMigo — Kevin Schaulis · Marco Martins · Patrick Lenzen

