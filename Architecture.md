# ARCHITECTURE.md — PlanMigo

> **Diese Datei ist die verbindliche Quelle der Wahrheit für die Systemarchitektur.**
> Jede KI-Session und jeder Entwickler liest diese Datei **vor** der ersten Code-Änderung.
> Wird die Architektur geändert, **muss** diese Datei im selben Commit aktualisiert werden.

**Version:** 1.2.0 · **Stand:** 2026-07-14 · **Owner:** Marco Martins (CTO)

---

## 1. Systemüberblick

```
┌──────────────┐        ┌──────────────┐
│  React SPA   │        │  Open WebUI  │
│  :5173       │        │  :3000       │
│  (Produkt-UI)│        │  (Chat-Host) │
└──────┬───────┘        └──────┬───────┘
       │ REST/JSON             │ Pipeline
       └───────────┬───────────┘
                   ▼
        ┌────────────────────────┐
        │   FastAPI Backend      │
        │   :8000  /api/v1       │
        ├────────────────────────┤
        │ api/     Router        │
        │ services/ Businesslogik│
        │ models/  ORM           │
        │ schemas/ Pydantic      │
        └───┬───────────┬────────┘
            │           │
            ▼           ▼
   ┌────────────┐  ┌──────────────┐
   │ OpenRouter │  │ Travel-APIs  │
   │ (LLM)      │  │ Amadeus/     │
   └────────────┘  │ Booking/GYG  │
                   └──────────────┘
            │
            ▼
      ┌───────────┐
      │ Postgres  │
      └───────────┘
```

---

## 2. Verbindliche Prinzipien

1. **Das Frontend spricht NIE direkt mit OpenRouter oder Travel-APIs.** Ausschließlich über FastAPI.
   API-Keys existieren nur serverseitig.
2. **Schichtentrennung im Backend:** `api/` (HTTP) → `services/` (Logik) → `models/` (Persistenz).
   Router enthalten keine Businesslogik. Services enthalten kein FastAPI-Objekt.
3. **Modellagnostik:** Alle LLM-Aufrufe laufen über `services/openrouter.py`. Kein Modellname
   irgendwo hartcodiert — nur `settings.OPENROUTER_MODEL`.
4. **Alle I/O ist async.** `async def` in Routern und Services, `asyncpg` in der DB, `httpx.AsyncClient`
   für externe Calls.
5. **Pydantic ist die Vertragsgrenze.** Jeder Endpoint hat ein `schemas/`-Request- und Response-Modell.
   Keine `dict`-Rückgaben.
6. **Farbpalette ist Gesetz.** Nur die fünf Tokens aus `tokens.css`. Keine Ad-hoc-Hex-Werte.
7. **Konfiguration nur über `.env` + `app/config.py` (Pydantic Settings).** Keine Secrets im Code.
8. **API-Versionierung:** Alles unter `/api/v1/`. Breaking Changes → `/api/v2/`.

---

## 3. Backend — FastAPI

### 3.1 Ordner
```
backend/app/
├── main.py            # create_app(), CORS, Router-Include, Lifespan
├── config.py          # class Settings(BaseSettings)
├── api/v1/
│   ├── router.py      # APIRouter-Aggregat
│   ├── chat.py        # POST /chat
│   ├── trips.py       # POST /trips/plan, GET /trips/{id}
│   ├── search.py      # POST /search/{flights,stays,activities}
│   └── health.py      # GET /health
├── services/
│   ├── openrouter.py  # LLM-Client (einziger Ort mit OpenRouter-Wissen)
│   ├── planner.py     # Dialogsteuerung + Planaufbau
│   ├── travel_api.py  # Amadeus / Booking / GetYourGuide Adapter
│   └── prompts/       # System-Prompts als .md/.txt
├── models/            # SQLAlchemy: User, Conversation, TripPlan, TripItem
├── schemas/           # Pydantic: chat.py, trip.py, search.py
└── core/
    ├── deps.py        # get_db(), get_settings(), get_current_user()
    ├── security.py
    └── logging.py
```

### 3.2 OpenRouter-Integration (`services/openrouter.py`)

Einziger erlaubter Ort für LLM-Calls. Vertrag:

```python
async def complete(
    messages: list[ChatMessage],
    model: str | None = None,      # default: settings.OPENROUTER_MODEL
    temperature: float = 0.7,
    max_tokens: int = 2000,
    response_format: dict | None = None,   # z.B. {"type": "json_object"}
    timeout_seconds: float = 60.0,         # Compose-Call nutzt 300 s (lange Plan-JSONs)
) -> LLMResponse: ...
```

- Endpoint: `POST {OPENROUTER_BASE_URL}/chat/completions`
- Pflicht-Header: `Authorization: Bearer {key}`, `HTTP-Referer: {OPENROUTER_SITE_URL}`,
  `X-Title: {OPENROUTER_APP_NAME}`
- Retry: 3× exponentiell bei 429/5xx. 4xx (falscher Key, unbekanntes Modell) → sofortiger Abbruch.
- Timeout: 60 s.
- Fehler → `LLMServiceError`, im Router als HTTP 503 gemappt.

### 3.2.1 Chat-Vertrag (`POST /api/v1/chat`)

- **Leere `message` startet eine Konversation:** Migo stellt die erste Rückfrage aus den Keywords.
- Der Clarify-Loop endet, wenn das LLM den internen Marker `READY_TO_PLAN` liefert **oder**
  `MAX_CLARIFY_TURNS` (aktuell 5) erreicht ist. Der Marker verlässt das Backend nie —
  die Response enthält stattdessen `ready_to_plan: true` + eine freundliche Abschlussnachricht.
- `build_trip_plan` lädt die Dialog-Historie aus `conversations.state` und gibt sie dem
  Compose-Prompt mit — der Plan basiert immer auf dem tatsächlichen Gespräch.

### 3.3 Datenmodell (Kern)

| Tabelle | Felder (Auszug) |
|---|---|
| `users` | id, email, created_at |
| `conversations` | id, user_id (nullable bis Auth-Flow), keywords[], state (JSONB), created_at |
| `trip_plans` | id, conversation_id, destination, start_date, end_date, budget, summary |
| `trip_items` | id, trip_plan_id, type (flight/stay/activity/restaurant), payload (JSONB), day, order |

---

## 4. Frontend — React

### 4.1 Ordner
```
frontend/src/
├── components/   # Präsentational, zustandslos wo möglich (Sidebar, ChatWindow, TripCard, …)
├── pages/        # Routen-Ebene
├── hooks/        # useChat, useTripPlan, useKeywords
├── api/client.ts # Axios-Instanz, baseURL = VITE_API_URL
├── types/        # TS-Typen, gespiegelt aus Pydantic-Schemas
└── styles/tokens.css
```

### 4.2 Regeln
- Datenzugriff **nur** über `hooks/` → `api/`. Keine `fetch`-Calls in Komponenten.
- **Same-Origin-API:** `api/client.ts` nutzt standardmäßig `/api/v1`. Im Dev proxied Vite
  (`vite.config.ts`), im Docker-Build nginx (`nginx.conf`) auf das Backend. Dadurch keine
  CORS-/Host-Probleme (lokal, Docker, Codespaces).
- Server-State: TanStack Query. Kein Redux.
- Styling: Tailwind, Farben ausschließlich über Theme-Tokens (`bg-pm-cream`, `text-pm-orange`, …).
- TypeScript strict. Kein `any`.
- **UI-Shell:** Orange Fläche (`--pm-orange`) als App-Hintergrund, linke Sidebar (Chat-Liste,
  Einstellungen/Profil-Platzhalter), Slide-Übergang Keyword-Panel → Chat-Panel. Chat-Sessions
  sind bis zum Auth-/Listing-Endpoint clientseitiger State (`types/chat.ts → ChatSession`).

### 4.3 Farb-Tokens (`styles/tokens.css`)
```css
:root {
  --pm-orange:     #C9603A;  /* CTAs, Logo-Icon, Labels */
  --pm-sage:       #7B9D6F;  /* Zweitfarbe "Migo", Akzente */
  --pm-green-dark: #5C7A52;  /* Häkchen, grüne Akzente */
  --pm-sand:       #D8C9A8;  /* Pills, Chips, Trennlinien */
  --pm-cream:      #FAF6F1;  /* Hintergrund, heller Text */
}
```
`tailwind.config.js` → `theme.extend.colors.pm = { orange, sage, greenDark, sand, cream }`

---

## 5. Open WebUI

- Rolle: **Host- und Chat-Oberfläche** für den konversationellen Flow.
- Kopplung über eine **Pipeline** (`openwebui/pipelines/planmigo_pipeline.py`), die Nutzer-Turns an
  `POST /api/v1/chat` des FastAPI-Backends weiterreicht.
- Open WebUI ruft **nicht** direkt OpenRouter auf — der LLM-Call passiert im Backend, damit
  Dialogsteuerung, Tool-Calls und Reiseplan-Persistenz an einer Stelle bleiben.
- Konfiguration über `docker-compose.yml`, Port `3000`.

---

## 6. Der Planungs-Flow (Kern-Use-Case)

```
1. INPUT      Nutzer gibt Schlagwörter ein         → POST /trips/plan (initial)
2. CLARIFY    planner.py generiert per LLM Rückfragen (Akinator-Stil)
              → Loop über POST /chat, State in conversations.state
3. SEARCH     Bei ausreichendem Kontext: travel_api.py sucht parallel
              Flüge · Unterkünfte · Aktivitäten
4. COMPOSE    LLM erhält Suchergebnisse und komponiert daraus einen
              strukturierten Plan (JSON, response_format=json_object)
5. PERSIST    trip_plans + trip_items in Postgres
6. RENDER     Frontend rendert TripCard-Timeline
```

---

## 7. Deployment

`docker-compose.yml` — Services: `db` (postgres:16) · `backend` (uvicorn) · `frontend` (nginx/vite preview) · `openwebui`.
Ein gemeinsames Netzwerk `planmigo-net`. Secrets ausschließlich aus `.env`.

Tabellen werden beim Backend-Start per `Base.metadata.create_all` angelegt (Lifespan in
`main.py`) — Alembic-Migrationen sind weiterhin ein offener Punkt (siehe `CLAUDE.md`).

---

## 8. Nicht-Ziele (bewusst ausgeschlossen)

- Kein eigenes Inventar / keine eigene Buchungsabwicklung — Partner-APIs.
- Kein Fine-Tuning eigener Modelle — OpenRouter reicht.
- Kein Microservice-Split im MVP — bewusst ein Monolith.
- Keine Mobile-Native-App vor H2 2027 — PWA reicht.

---

## 9. Änderungsprotokoll dieser Datei

| Datum | Version | Änderung | Autor |
|---|---|---|---|
| 2026-07-14 | 1.2.0 | UI-Shell mit Sidebar + Slide-Übergang, clientseitige Chat-Sessions, `complete()`-Timeout-Parameter (Compose 300 s), nginx `proxy_read_timeout` 360 s | Team |
| 2026-07-14 | 1.1.0 | Chat-Vertrag (Start-Turn, READY_TO_PLAN-Handling), Same-Origin-API-Proxy, `conversations.user_id` nullable, Tabellen-Erstellung im Lifespan | Team |
| 2026-07-14 | 1.0.0 | Initiale Architektur festgeschrieben | Team |