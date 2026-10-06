# ARCHITECTURE.md — PlanMigo

> **Diese Datei ist die verbindliche Quelle der Wahrheit für die Systemarchitektur.**
> Jede KI-Session und jeder Entwickler liest diese Datei **vor** der ersten Code-Änderung.
> Wird die Architektur geändert, **muss** diese Datei im selben Commit aktualisiert werden.

**Version:** 1.8.0 · **Stand:** 2026-10-05 · **Owner:** Marco Martins (CTO)

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
6. **Farbpalette ist Gesetz.** Nur die in `tokens.css` definierte Basis-Palette (13 Töne) und ihre
   semantischen Aliases (`surface-*`, `content-*`, `accent-*`, `border-*`). Keine Ad-hoc-Hex-Werte,
   keine Inline-`style`-Farben.
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
│   ├── auth.py        # POST /auth/register, POST /auth/login, GET /auth/me
│   ├── chat.py        # POST /chat (Auth optional — verknüpft die Conversation, falls angemeldet)
│   ├── trips.py       # POST /trips/plan, GET /trips/mine (Auth), GET /trips/{id}
│   ├── flights.py     # POST /flights/suggest
│   ├── destinations.py # POST /destinations/suggest
│   ├── search.py      # POST /search/{flights,stays,activities}
│   └── health.py      # GET /health
├── services/
│   ├── openrouter.py  # LLM-Client (einziger Ort mit OpenRouter-Wissen) + parse_json_object()
│   ├── planner.py     # Dialogsteuerung + Planaufbau
│   ├── flights.py     # LLM-geschätzte Flugvorschläge (kein echtes Flug-API vorhanden)
│   ├── destinations.py # LLM-geschätzte Zielvorschläge (Name+Land+Lat/Lng) aus dem Conversation-Verlauf
│   ├── auth.py         # register_user() / authenticate_user()
│   ├── travel_api.py  # Amadeus / Booking / GetYourGuide Adapter (Platzhalter)
│   └── prompts/       # System-Prompts als .md/.txt
├── models/            # SQLAlchemy: User, Conversation, TripPlan, TripItem
├── schemas/           # Pydantic: auth.py, chat.py, trip.py, flight.py, search.py
└── core/
    ├── deps.py        # get_db(), get_settings(), get_current_user()/get_current_user_optional()
    ├── security.py    # JWT (create/decode_access_token) + Passwort-Hashing (bcrypt via passlib)
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
| `users` | id, email, hashed_password, created_at |
| `conversations` | id, user_id (nullable — anonyme Nutzung weiterhin möglich), keywords[], state (JSONB), created_at |
| `trip_plans` | id, conversation_id, destination, start_date, end_date, budget, summary |
| `trip_items` | id, trip_plan_id, type (flight/stay/activity/restaurant), payload (JSONB), day, order |

Kein Alembic (offener Punkt, siehe Teil B von `CLAUDE.md`) — Tabellen werden per
`Base.metadata.create_all` beim Start angelegt; additive Spaltenänderungen an bereits
existierenden Tabellen (z. B. `hashed_password`) müssen manuell per `ALTER TABLE` auf
bestehenden Volumes nachgezogen werden.

### 3.4 Auth (`core/security.py`, `core/deps.py`, `api/v1/auth.py`)

- Passwort-Hashing: `bcrypt` via `passlib` (`passlib[bcrypt]==1.7.4` + gepinntes `bcrypt==4.0.1` —
  neuere bcrypt-Versionen brechen passlibs internen Self-Test, siehe `requirements.txt`-Kommentar).
- Tokens: JWT (`HS256`, `SECRET_KEY`), 24 h Gültigkeit, `sub` = User-ID. `Authorization: Bearer …`.
- `get_current_user_optional()` liefert `User | None` (kein Fehler ohne/mit ungültigem Token) —
  genutzt in `POST /chat`, damit die App weiterhin **ohne Login nutzbar** bleibt; ist ein Nutzer
  angemeldet, wird die neu angelegte `Conversation.user_id` gesetzt.
- `get_current_user()` (baut auf `get_current_user_optional()` auf) erzwingt Auth (401) — genutzt
  für `GET /trips/mine` und `GET /auth/me`.
- Kein `pydantic[email]`/`email-validator`-Dependency — einfache Regex-Validierung in
  `schemas/auth.py`, um keine zusätzliche Dependency für reine Formatprüfung einzuführen.

### 3.5 Flugvorschläge (`services/flights.py`, `POST /flights/suggest`)

- Es ist **keine echte Flug-API angebunden** (`travel_api.py` ist weiterhin ein Platzhalter,
  `AMADEUS_API_KEY/SECRET` sind leer). `flights.py` lässt stattdessen das LLM 4 realistische,
  nach Preis sortierte Flugvorschläge generieren (`reasoning: {"enabled": false}`, siehe
  CLAUDE.md-Eintrag zum Reasoning-Token-Fix) — exakt dasselbe Prinzip wie `compose.md`, wenn
  `travel_api.search_*()` leer zurückgibt: geschätzte, klar als "ca."-Preis gekennzeichnete
  Vorschläge statt eines Fakes einer echten Buchung.
- Wählt die Nutzerin/der Nutzer im Frontend einen Vorschlag aus, wird er als
  `answers.selected_flight` (JSON-String) an `POST /trips/plan` durchgereicht — `compose.md`
  übernimmt Airline/Preis dann unverändert für den Anreise-Flug an Tag 1, sofern das Ziel noch
  passt (sonst nur der Preis als Orientierung). Keine neue Spalte/Kein neuer Endpoint nötig, das
  bestehende `TripPlanRequest.answers: dict[str, str]`-Feld wird wiederverwendet.

### 3.6 Zielvorschläge für die Karte (`services/destinations.py`, `POST /destinations/suggest`)

- Request: `{conversation_id, keywords}`. Lädt `conversations.state.history` (derselbe Verlauf,
  den auch `planner.py` nutzt) und lässt das LLM 3–5 **real existierende** Ziele mit
  geografisch korrekten Dezimalgrad-Koordinaten vorschlagen (`reasoning: {"enabled": false}`,
  `response_format: json_object`, `prompts/destinations.md`). Keine Geocoding-API nötig — Städte-
  /Regionskoordinaten sind für gängige Reiseziele bereits zuverlässiges Modellwissen.
  Einträge ohne parsbare `lat`/`lng` werden verworfen (`_parse_float`).
- Wird vom Frontend nach **jeder** Chat-Antwort erneut aufgerufen (clientseitig über
  `conversation_id` + aktuelle `keywords`) und die Ergebnisse **client-seitig gemerged** (Dedup
  über `name`+`country`, Kleinschreibung) — der Endpoint selbst ist zustandslos und liefert bei
  jedem Aufruf nur die zum aktuellen Gesprächsstand passenden Vorschläge, das Akkumulieren über
  die Zeit passiert bewusst im Frontend-State, nicht in der DB (keine neue Tabelle nötig).

---

## 4. Frontend — React

### 4.1 Ordner
```
frontend/src/
├── components/   # Präsentational, zustandslos wo möglich (ChatWindow, KeywordPills, AuthModal, …)
│                 # AppBackdrop (persistenter Foto-Hintergrund), PhoneFrame (klar umrandeter
│                 # Content-Container, header/body/footer), TripPlanView (vollständiger Reiseplan,
│                 # genutzt von PlannerPage's Plan-Schritt UND TripResultPage), DestinationMap
│                 # (Leaflet/OSM-Karte mit Ziel-Markern, genutzt im Chat-Schritt)
│                 # Chat.tsx: geteilte Design-System-Primitives (Nav, Bubble, Chip, QuestionCard,
│                 # Composer, TripPanel) — Nav konsumiert useAuth() direkt
├── pages/        # Routen-Ebene: PlannerPage ("/"), MyTripsPage ("/trips"), TripResultPage ("/trip/:tripId")
├── hooks/        # useChat, useTripPlan (+ useMyTrips), useKeywords, useFlights, useDestinations, useAuth (Context-Provider)
├── api/client.ts # Axios-Instanz, baseURL = VITE_API_URL, Request-Interceptor hängt JWT aus localStorage an
├── assets/       # SVG/Bild-Assets (z.B. planmigo-logo.svg)
├── lib/images.ts # seededImage() — deterministische Platzhalter-Fotos (Picsum, kein API-Key)
├── types/        # TS-Typen, gespiegelt aus Pydantic-Schemas (inkl. auth.ts, flight.ts, destination.ts)
└── styles/tokens.css
```

### 4.2 Regeln
- Datenzugriff **nur** über `hooks/` → `api/`. Keine `fetch`-Calls in Komponenten.
- **Routing:** `react-router-dom` (`BrowserRouter`, `App.tsx`). Zwei Routen: `/` (`PlannerPage`)
  und `/trip/:tripId` (`TripResultPage`, lädt den Plan selbst per `useTripPlan`/`GET /trips/{id}`).
  nginx liefert für unbekannte Pfade `index.html` aus (`try_files … /index.html`), daher
  funktioniert Client-Side-Routing auch bei Direktaufruf/Reload.
- **Same-Origin-API:** `api/client.ts` nutzt standardmäßig `/api/v1`. Im Dev proxied Vite
  (`vite.config.ts`), im Docker-Build nginx (`nginx.conf`) auf das Backend. Dadurch keine
  CORS-/Host-Probleme (lokal, Docker, Codespaces).
- Server-State: TanStack Query. Kein Redux.
- Styling: Tailwind, Farben ausschließlich über Theme-Tokens (`bg-surface-card`, `text-accent-primary`, …).
- TypeScript strict. Kein `any`.
- **UI-Shell — "Phone-Frame" auf persistentem Foto-Hintergrund:**
  `components/AppBackdrop.tsx` wird **einmal** in `App.tsx` **außerhalb** von `<Routes>`
  gerendert (`position: fixed`, `-z-10`) — ein einziges Foto (`seededImage("travel-adventure-01", …)`)
  + dunkles Gradient-Overlay, das bei Routenwechseln nicht neu lädt/flackert und sich so optisch
  durch alle Seiten zieht. Jede Seite rendert ihren Inhalt in genau **eine**
  `components/PhoneFrame.tsx`-Instanz: eine zentrierte, klar umrandete Karte
  (`border-2 border-card`, `rounded-card`, feste Handy-ähnliche Proportionen
  `max-w-[440px] h-[85vh]`) mit `header`/`children`(scrollbarer Body)/`footer`-Slots als
  Flex-Column + `overflow-hidden` auf dem Frame selbst — ein `footer` (Composer, CTA-Buttons)
  kann dadurch nie optisch über den abgerundeten Rand hinausragen, er ist immer Teil des
  Layouts, nie `position: fixed` relativ zum Viewport.
  `PlannerPage` ist ein Drei-Schritte-Zustandsautomat **innerhalb** von `PhoneFrame`(s)
  (kein Routenwechsel dazwischen): `"keywords"` (ein `PhoneFrame`: Formular + Flugvorschläge,
  Footer = „Reise planen") → `"chat"` (**zwei** `PhoneFrame`s nebeneinander: links Chat
  (`ChatMessages` im Body, `Composer` im Footer), rechts ein zweiter Frame mit `DestinationMap`
  — siehe unten) → `"plan"` (sobald `POST /trips/plan` erfolgreich war: zurück auf **ein**
  `PhoneFrame`, **vollständiger** Reiseplan via `TripPlanView` direkt im Overlay, Footer =
  „Reise teilen"/„Neue Reise"). `TripResultPage` (`/trip/:tripId`, für Links aus „Meine
  Reisen"/Sharing) und `MyTripsPage` (`/trips`) nutzen denselben einzelnen `PhoneFrame` +
  `AppBackdrop` für optische Konsistenz; `TripResultPage` rendert dieselbe `TripPlanView` wie der
  eingebettete Plan-Schritt (eine Komponente, zwei Einsatzorte). `PlannerPage` hält genau eine
  aktive `ChatSession` (`types/chat.ts`); kein persistenter Verlauf mehrerer Reisen im UI
  (dafür jetzt `/trips`, siehe oben).
- **Ziel-Karte im Chat-Schritt (`components/DestinationMap.tsx`):** `react-leaflet` +
  OpenStreetMap-Tiles (kostenlos, kein API-Key — bewusste Wahl statt Google Maps/Mapbox, die
  einen Billing-Key bräuchten, siehe Regel „Keine Secrets im Code"). Nach **jeder** Chat-Antwort
  (Erfolg von `POST /chat`, außer wenn `ready_to_plan`) ruft `PlannerPage` zusätzlich
  `POST /destinations/suggest` auf und merged die Treffer additiv in lokalen State (Dedup über
  `name`+`country`) — die Karte füllt sich so über den Gesprächsverlauf, statt bei jeder Antwort
  neu zu starten. `FitBounds` (interne Helper-Komponente, nutzt `useMap()`) zoomt die Karte
  automatisch auf alle aktuell bekannten Marker. Vite löst Leaflets Standard-Marker-Icon-URLs
  nicht automatisch auf — `DestinationMap.tsx` importiert die PNGs explizit und setzt sie via
  `L.Icon.Default.mergeOptions(...)`.

### 4.3 Farb-Tokens (`styles/tokens.css`)

Basis-Palette (13 Töne, einzige Quelle für Hex-Werte im gesamten Repo):
```css
:root {
  --pm-terracotta:   #7C4232;  /* Überschriften, Primärtext, dunkle Flächen */
  --pm-orange:       #C9603A;  /* Logo-Icon, Eyebrow-Labels, CTAs */
  --pm-orange-deep:  #A04A2A;  /* Deko-Kreise, Tertiär-Akzent */
  --pm-sage:         #7B9D6F;  /* "Migo", Sekundär-Akzente, Sekundär-CTA */
  --pm-green-dark:   #5C7A52;  /* Häkchen, grüne Akzente */
  --pm-sand:         #D8C9A8;  /* Pills, Trennlinien, Chips */
  --pm-sand-light:   #E8C9A8;  /* Labels auf Braun */
  --pm-cream:        #FAF6F1;  /* App-Hintergrund (Fläche), heller Text */
  --pm-cream-warm:   #F0E4D8;  /* Sekundärtext auf Braun */
  --pm-paper:        #E5D9C8;  /* Logo-Schattenflügel, Hover-Flächen */
  --pm-espresso:     #3D2418;  /* Fließtext dunkel */
  --pm-taupe:        #8B7560;  /* Sekundärtext, Muted-Text */
  --pm-white:        #FFFFFF;
}
```

Semantische Aliases (das ist, worauf Komponenten tatsächlich zeigen sollen):
`--surface-page/card/inverse/chip/chip-active`, `--text-heading/body/muted/on-inverse/on-inverse-muted/eyebrow`,
`--accent-primary/secondary`, `--border-card/hairline`. Dazu Typo- (`--text-*-web`, `--font-serif`/`--font-sans`),
Spacing- (`--space-1…8`, `--card-pad`), Radius- (`--radius-card/chip/button/image`) und Shadow-Tokens
(`--shadow-card/soft`).

`tailwind.config.js` → `theme.extend.colors = { pm: {…13 Töne}, surface: {…}, content: {…}, accent: {…} }`,
plus `borderColor`, `fontFamily`, `fontSize`, `letterSpacing`, `borderRadius`, `boxShadow`, `spacing`,
`transitionTimingFunction`/`transitionDuration` — alle als `var(--token)`-Referenzen, nie als Hex-Literal.

Geteilte UI-Primitives (`components/Chat.tsx`): `Nav`, `Bubble`, `Chip`, `QuestionCard`, `Composer`,
`TripPanel`, `ChatLayout` — nutzen ausschließlich die obigen Tokens.

**Achtung Tailwind-Opacity-Modifier:** Da alle Farb-Utilities auf `var(--token)` (nicht auf Literal-Hex)
zeigen, funktionieren Klassen wie `bg-pm-cream/20` nicht (Tailwind kann aus einer CSS-Variable keinen
Alphakanal ableiten). Für Transparenz-Effekte stattdessen `opacity-*` auf das ganze Element oder einen
eigenen (soliden) Token verwenden.

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
6. RENDER     Frontend navigiert zu /trip/{id} und rendert die bebilderte
              TripResultPage-Timeline
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
| 2026-10-05 | 1.8.0 | Chat-Schritt zweispaltig: Chat links, neue `DestinationMap` (react-leaflet/OSM) rechts mit Ziel-Markern, die nach jeder Chat-Antwort per neuem `POST /destinations/suggest` (LLM-geschätzte Koordinaten) additiv ergänzt werden. Start- und Plan-Schritt unverändert (ein `PhoneFrame`) | Team |
| 2026-10-05 | 1.7.0 | UI-Shell auf "Phone-Frame"-Prinzip umgebaut: `AppBackdrop` (ein persistentes Foto außerhalb `<Routes>`) + `PhoneFrame` (klar umrandeter, Handy-proportionierter Container mit header/body/footer als Flex-Column — Footer kann nie über den Rand hinausragen) auf **jeder** Seite. `PlannerPage` ist jetzt ein Drei-Schritte-Zustand (Keywords → Chat → vollständiger Plan) in einem einzigen Frame statt Navigation zu `/trip/:id`; `ChatWindow` in `ChatMessages`(Body)/`Composer`(Footer) aufgeteilt; neue `TripPlanView` (voller Plan, von Plan-Schritt UND `TripResultPage` genutzt); `ChatLayout` entfernt | Team |
| 2026-10-05 | 1.6.0 | Auth-Flow verdrahtet (`POST /auth/{register,login}`, `GET /auth/me`, JWT via `core/security.py`, `users.hashed_password` neu) — Conversations/Trips werden bei angemeldeten Nutzern verknüpft (`GET /trips/mine`), Login bleibt optional. Neuer Flugvorschlags-Endpoint `POST /flights/suggest` (LLM-geschätzte Preise, kein echtes Flug-API). Frontend: `AuthModal` + `useAuth`-Context, Flugauswahl auf der Startseite (fließt in `compose.md` ein), neue Route `/trips` (`MyTripsPage`) | Team |
| 2026-10-05 | 1.5.0 | Reiseplan-Ergebnis auf eigener Route `/trip/:tripId` (`react-router-dom`, neue `TripResultPage` mit Hero-Bild/Galerie/bebilderter Timeline über `lib/images.ts`), `PlannerPage` navigiert nach Plan-Erstellung statt den Plan in der Sidebar zu zeigen, `TripCard.tsx` entfernt | Team |
| 2026-07-15 | 1.4.0 | UI-Shell strukturell auf den Design-Export umgebaut: `Nav`+`ChatLayout` statt Sidebar+Slide-Übergang, `ChatWindow` nur noch Bubble-Kette+Composer, `Sidebar.tsx` entfernt, Mehrfach-Chat-Verwaltung im UI entfällt. `--surface-page` von `--pm-orange` auf `--pm-cream` korrigiert (Original-Tokens-Export) | Team |
| 2026-07-14 | 1.3.0 | Design-System-Integration: `tokens.css`/`tailwind.config.js` auf 13-Ton-Basis-Palette + semantische Aliases erweitert, geteilte UI-Primitives `components/Chat.tsx` (Nav, Bubble, Chip, QuestionCard, Composer, TripPanel, ChatLayout), bestehende Komponenten (Sidebar, PlannerPage, ChatWindow, TripCard, KeywordPills) auf die neuen Tokens umgestellt (Funktionalität unverändert) | Team |
| 2026-07-14 | 1.2.0 | UI-Shell mit Sidebar + Slide-Übergang, clientseitige Chat-Sessions, `complete()`-Timeout-Parameter (Compose 300 s), nginx `proxy_read_timeout` 360 s | Team |
| 2026-07-14 | 1.1.0 | Chat-Vertrag (Start-Turn, READY_TO_PLAN-Handling), Same-Origin-API-Proxy, `conversations.user_id` nullable, Tabellen-Erstellung im Lifespan | Team |
| 2026-07-14 | 1.0.0 | Initiale Architektur festgeschrieben | Team |