# ARCHITECTURE.md — PlanMigo

> **Diese Datei ist die verbindliche Quelle der Wahrheit für die Systemarchitektur.**
> Jede KI-Session und jeder Entwickler liest diese Datei **vor** der ersten Code-Änderung.
> Wird die Architektur geändert, **muss** diese Datei im selben Commit aktualisiert werden.

**Version:** 1.11.0 · **Stand:** 2026-07-15 · **Owner:** Marco Martins (CTO)

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
backend/
├── alembic.ini        # Alembic-Konfiguration (URL kommt aus Settings, nie hartcodiert)
├── alembic/           # env.py (async) + versions/ — Alembic besitzt das Schema
└── app/
    ├── main.py        # create_app(), CORS, Router-Include, Lifespan (führt Migrationen aus)
    ├── config.py      # class Settings(BaseSettings)
    ├── api/v1/
    │   ├── router.py  # APIRouter-Aggregat
    │   ├── auth.py    # POST /auth/register, POST /auth/login, GET /auth/me
    │   ├── chat.py    # POST /chat (optionale Auth)
    │   ├── images.py  # GET /images?query= (Unsplash-Proxy, Key nur serverseitig)
    │   ├── trips.py   # POST /trips/plan, POST /trips/proposals, POST /trips/{id}/revise,
    │   │              # GET /trips (Auth), GET /trips/{id}
    │   ├── search.py  # POST /search/{flights,stays,activities}
    │   └── health.py  # GET /health
    ├── services/
    │   ├── openrouter.py  # LLM-Client (einziger Ort mit OpenRouter-Wissen)
    │   ├── planner.py     # Dialogsteuerung + Vorschläge + Planaufbau + Revision
    │   ├── images.py      # Unsplash-Suche (einziger Ort mit Unsplash-Wissen, In-Memory-Cache)
    │   ├── travel_api.py  # Amadeus / Booking / GetYourGuide Adapter
    │   └── prompts/       # clarify / proposals / compose / revise als .md
    ├── models/            # SQLAlchemy: User, Conversation, TripPlan, TripItem
    ├── schemas/           # Pydantic: auth.py, chat.py, trip.py, search.py
    └── core/
        ├── deps.py        # get_db(), get_settings(), get_current_user(), get_optional_user()
        ├── security.py    # bcrypt-Hashing + JWT (HS256, SECRET_KEY aus .env)
        └── logging.py
```

### 3.1.1 Auth-Flow

- **Registrieren/Anmelden:** `POST /auth/register` (409 bei doppelter E-Mail) und
  `POST /auth/login` (401 bei falschen Daten, identische Meldung gegen Account-Enumeration)
  geben `{access_token, token_type, user}` zurück. Passwörter als bcrypt-Hash in
  `users.password_hash`; JWT (HS256, `SECRET_KEY`, 24 h) trägt die User-ID als `sub`.
- **Zwei Dependency-Stufen:** `CurrentUser` (401 ohne gültigen Token — `/auth/me`, `GET /trips`)
  und `OptionalUser` (Gast erlaubt — `/chat`, `/trips/plan`, `GET /trips/{id}`). Chat und
  Planung funktionieren weiterhin ohne Konto.
- **Ownership:** Neue Conversations erhalten die User-ID; eine Gast-Conversation wird beim
  nächsten Turn nach Login übernommen („geclaimt"). Fremde Conversations/Trips antworten 404
  (`ConversationAccessError` im Planner). `GET /trips` listet die Pläne des Users über den
  Join `trip_plans → conversations.user_id`.
- **Migrationen:** Alembic besitzt das Schema; der Lifespan führt `alembic upgrade head` beim
  Start aus (idempotent, in einem Worker-Thread, da `env.py` einen eigenen Event-Loop fährt).
  Baseline-Migration `0001` deckt frische **und** per `create_all` gebootstrappte DBs ab.

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
| `users` | id, email, password_hash (bcrypt, nullable für Alt-Zeilen), created_at |
| `conversations` | id, user_id (nullable — Gäste; wird nach Login geclaimt), keywords[], state (JSONB: history + proposals), created_at |
| `trip_plans` | id, conversation_id, destination, start_date, end_date, budget, summary, lat, lon |
| `trip_items` | id, trip_plan_id, type (flight/stay/activity/restaurant), payload (JSONB), day, order |

---

## 4. Frontend — React

### 4.1 Ordner
```
frontend/src/
├── components/   # Präsentational, zustandslos wo möglich (Sidebar, ChatWindow, TripCard)
│                 # Chat.tsx: geteilte Design-System-Primitives (Bubble, Chip, QuestionCard, Composer)
├── pages/        # Ein Screen pro Datei: StartPage, ChatPage, SearchPage, TripsPage,
│                 # ProfilePage, SettingsPage — geschaltet über App.tsx (kein Router im MVP)
├── hooks/        # useChat, useTripPlan, usePlannerSession, useSettings
├── api/client.ts # Axios-Instanz, baseURL = VITE_API_URL
├── assets/       # SVG/Bild-Assets (z.B. planmigo-logo.svg)
├── types/        # TS-Typen, gespiegelt aus Pydantic-Schemas (+ navigation.ts: Screen)
└── styles/tokens.css
```

### 4.2 Regeln
- Datenzugriff **nur** über `hooks/` → `api/`. Keine `fetch`-Calls in Komponenten.
- **Same-Origin-API:** `api/client.ts` nutzt standardmäßig `/api/v1`. Im Dev proxied Vite
  (`vite.config.ts`), im Docker-Build nginx (`nginx.conf`) auf das Backend. Dadurch keine
  CORS-/Host-Probleme (lokal, Docker, Codespaces).
- Server-State: TanStack Query. Kein Redux.
- Styling: Tailwind, Farben ausschließlich über Theme-Tokens (`bg-surface-card`, `text-accent-primary`, …).
- TypeScript strict. Kein `any`.
- **UI-Shell (Design-Export „Web-App"):** Helle Fläche (`--surface-page` = `--pm-cream`) plus
  **linke Sidebar** (sticky, weiß, 240 px / unter `lg` 76 px Icon-Rail) mit Logo (→ Start),
  Navigation (Suche, Gebuchte Reisen, Profil, Einstellungen; aktiv = Sage-Pill), einem
  **immer sichtbaren Konto-Status** (Avatar mit Initial/Gast-Icon + Status-Punkt +
  „Angemeldet"/„Nicht angemeldet", Klick → Profil) und „Chat starten"-CTA (Orange). Rechts
  davon je ein Screen aus `pages/`, geschaltet über lokalen State in `App.tsx` — **jeder
  Seitenaufruf startet auf dem Start-Screen** (bewusst keine Screen-Persistenz).
- **Screens:** `StartPage` (Hero mit Freitext-Promptbox + Vorschlags-Chips → startet Chat;
  darunter eine beim Scrollen einblendende **Inspirations-Sektion**: kuratierte Ziele mit
  Unsplash-Foto, redaktioneller ★-Bewertung und Klick-Start in den Chat — Reveal über
  `useInView`/IntersectionObserver),
  `ChatPage` (**Chat als Fenster**: Karte mit Kopfleiste [Migo-Logo, Online-Punkt, „＋ Neue
  Reise"], intern scrollendem Verlauf und Eingabeleiste unten, Höhe `100vh−48px`;
  Nutzer-Nachrichten mit Avatar rechts [Initial bzw. Gast-Icon]; `ProposalCard`s nach dem
  Clarify-Loop, `TripCard` auf-/zuklappbar („Buch"-Animation `pm-book-open`), Composer nach
  Plan-Erstellung als Änderungs-Eingabe; ab `xl` rechts ein sticky Weltkarten-Panel `TripMap`
  — **immer sichtbar**: startet in der Weltansicht und fliegt animiert (`flyTo`/`flyToBounds`)
  zu den Pins, sobald Vorschläge/Plan Koordinaten liefern (react-leaflet + OSM-Tiles, Pins
  als `divIcon` mit Token-Farben); ohne Session ein Empty-State mit Composer),
  `SearchPage` (Suchfeld + Multi-Select-`Chip`s → startet Chat mit Keywords), `TripsPage`
  (Pläne der Sitzung als Karten mit „Entwurf"-Badge, aufklappbare `TripCard`), `ProfilePage`
  (Gast-Platzhalter + Sitzungs-Statistiken, Auth folgt), `SettingsPage` (lokale Einstellungen,
  `localStorage["pm_settings"]` via `useSettings`).
- **Session-State:** `usePlannerSession` (Hook auf App-Ebene) hält genau eine aktive
  `ChatSession` (`types/chat.ts`) inkl. Pending-/Fehler-Flags und sammelt erstellte `TripPlan`s
  clientseitig; nach Plan-Erstellung wird die `["my-trips"]`-Query invalidiert.
- **Auth im Frontend:** `useAuth` (App-Ebene) hält `user`/`login`/`register`/`logout`; das JWT
  liegt in `localStorage["pm_token"]` und wird per Axios-Request-Interceptor
  (`api/client.ts`) als `Authorization: Bearer` mitgesendet. `ProfilePage` zeigt Gästen das
  Anmelde-/Registrierformular, Eingeloggten Konto + Statistiken + Abmelden. `TripsPage` mischt
  die server-seitige Liste (`GET /trips` via `useMyTrips`, überlebt Reloads) mit den
  Sitzungs-Plänen von Gästen. „Lokale Daten zurücksetzen" (Einstellungen) meldet auch ab.

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

Geteilte UI-Primitives (`components/Chat.tsx`): `Bubble`, `Chip`, `QuestionCard`, `Composer` —
nutzen ausschließlich die obigen Tokens. Nutzer-Bubbles, aktive Chips/Nav-Items und Send-Buttons
sind Sage (`--accent-secondary`), Primär-CTAs Orange (`--accent-primary`) — wie im Design-Export
„Web-App". (`Nav`, `TripPanel`, `ChatLayout` aus v1.3/1.4 sind mit der Sidebar-Shell entfallen.)

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
1. INPUT      Nutzer gibt Schlagwörter/Freitext ein
2. CLARIFY    planner.py generiert per LLM Rückfragen (Akinator-Stil)
              → Loop über POST /chat, State in conversations.state
3. PROPOSE    POST /trips/proposals: LLM liefert genau 3 kompakte Reisevorschläge
              (Ziel, Zeitraum, Budget-Schätzung, 3 Highlights, lat/lon, image_query)
              → in conversations.state["proposals"] gespeichert, als Karten gerendert
4. SEARCH     Bei Auswahl: travel_api.py sucht parallel Flüge · Unterkünfte · Aktivitäten
5. COMPOSE    POST /trips/plan mit proposal_index: LLM arbeitet GENAU den gewählten
              Vorschlag aus (JSON inkl. lat/lon auf Plan- und Item-Ebene)
6. PERSIST    trip_plans (mit lat/lon) + trip_items in Postgres
7. RENDER     Frontend rendert TripCard-Timeline (auf-/zuklappbar, „Buch"-Animation)
              + Weltkarte (Leaflet/OSM) rechts mit allen Zielen/Stationen
8. REVISE     Optionaler Loop: Freitext-Änderungswunsch → POST /trips/{id}/revise
              (prompts/revise.md: aktueller Plan als JSON + Dialog-Historie +
              Wunsch → vollständiger aktualisierter Plan; Items werden ersetzt,
              nie geleert; Wunsch+Bestätigung landen in conversations.state)
```

Im Frontend bleibt der Chat-Composer nach der Plan-Erstellung aktiv
(„Was soll Migo am Plan ändern?") — Änderungswünsche laufen über denselben Chat-Verlauf,
die `TripCard` und die Reisen-Liste aktualisieren sich in-place (Upsert per Plan-ID).

---

## 7. Deployment

`docker-compose.yml` — Services: `db` (postgres:16) · `backend` (uvicorn) · `frontend` (nginx/vite preview) · `openwebui`.
Ein gemeinsames Netzwerk `planmigo-net`. Secrets ausschließlich aus `.env`.

Das Schema wird beim Backend-Start per **Alembic** (`alembic upgrade head` im Lifespan)
aktuell gehalten; neue Schema-Änderungen bekommen eine neue Revision unter
`backend/alembic/versions/` (nie mehr `create_all` außerhalb der Baseline-Migration).

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
| 2026-07-15 | 1.11.0 | Dynamische Unsplash-Fotos überall, wo Reise-Beispiele auftauchen: `TripCard` mit Ziel-Foto-Banner, Beispiel-Karten (statt Chips) im Chat-Empty-State, Vorschau-Foto in der Such-Auswahl (Eingabe 500 ms debounced). Item-Ebene bewusst ohne Fotos (Unsplash-Demo-Limit 50 Req/h) | Team |
| 2026-07-15 | 1.10.0 | Karte im Chat immer sichtbar (Weltansicht → animiertes `flyToBounds` bei neuen Zielen, Marker memoisiert), Chat-Fenster mit kräftigerem Rahmen (`border-2 border-hairline`), `Footer`-Komponente (Impressum/Datenschutz als ehrliche Platzhalter-Modals, Kontakt-Mailto) auf allen Screens außer Chat | Team |
| 2026-07-15 | 1.9.0 | Chat als Fenster (Kopfleiste + interner Scroll + Eingabeleiste), User-Avatar an eigenen Nachrichten, Konto-Status permanent in der Sidebar, Start-Screen bei jedem Laden (Screen-Persistenz entfernt), Inspirations-Sektion auf der Startseite (Scroll-Reveal via `useInView`, Unsplash-Fotos, redaktionelle Bewertungen) | Team |
| 2026-07-15 | 1.8.0 | Vorschlags-Schritt PROPOSE (`POST /trips/proposals`, 3 kompakte Ideen in `conversations.state`), Compose mit `proposal_index` + Koordinaten (`trip_plans.lat/lon`, Migration 0002, Item-Koordinaten im Payload), Unsplash-Bilder-Proxy (`services/images.py`, `GET /images`, `UNSPLASH_ACCESS_KEY`), Frontend: Vorschlags-Karten mit Fotos, Weltkarten-Panel (Leaflet/OSM) rechts im Chat, „Buch"-Auf-/Zuklappen für Reisepläne | Team |
| 2026-07-15 | 1.7.0 | Plan-Revision per Dialog: `POST /trips/{id}/revise` + `prompts/revise.md` (voller Plan-Rewrite, Items-Ersetzung mit Leerlauf-Schutz, History-Fortschreibung), Flow-Schritt 7 REVISE, Frontend-Composer nach Plan aktiv (revise statt clarify), Plan-Upsert in Sitzungsliste | Team |
| 2026-07-15 | 1.6.0 | Auth-Flow: `/auth/register|login|me` (bcrypt + JWT), `CurrentUser`/`OptionalUser`-Dependencies, Conversation-Ownership inkl. Gast-Claim, `GET /trips`-Listing pro User, Alembic eingeführt (Lifespan migriert statt `create_all`, `users.password_hash`), Frontend: `useAuth` + Login/Registrierung in `ProfilePage`, Token-Interceptor, server-backed `TripsPage` | Team |
| 2026-07-15 | 1.5.0 | UI-Shell auf Design-Export „Web-App" umgebaut: linke Sidebar (Start/Suche/Reisen/Profil/Einstellungen + „Chat starten") statt Nav-Topbar, sechs Screens in `pages/` mit State-basiertem Switching, `usePlannerSession`/`useSettings`-Hooks, `Nav`/`TripPanel`/`ChatLayout`/`KeywordPills`/`useKeywords` entfernt, Nutzer-Bubbles & Send-Buttons auf Sage | Team |
| 2026-07-15 | 1.4.0 | UI-Shell strukturell auf den Design-Export umgebaut: `Nav`+`ChatLayout` statt Sidebar+Slide-Übergang, `ChatWindow` nur noch Bubble-Kette+Composer, `Sidebar.tsx` entfernt, Mehrfach-Chat-Verwaltung im UI entfällt. `--surface-page` von `--pm-orange` auf `--pm-cream` korrigiert (Original-Tokens-Export) | Team |
| 2026-07-14 | 1.3.0 | Design-System-Integration: `tokens.css`/`tailwind.config.js` auf 13-Ton-Basis-Palette + semantische Aliases erweitert, geteilte UI-Primitives `components/Chat.tsx` (Nav, Bubble, Chip, QuestionCard, Composer, TripPanel, ChatLayout), bestehende Komponenten (Sidebar, PlannerPage, ChatWindow, TripCard, KeywordPills) auf die neuen Tokens umgestellt (Funktionalität unverändert) | Team |
| 2026-07-14 | 1.2.0 | UI-Shell mit Sidebar + Slide-Übergang, clientseitige Chat-Sessions, `complete()`-Timeout-Parameter (Compose 300 s), nginx `proxy_read_timeout` 360 s | Team |
| 2026-07-14 | 1.1.0 | Chat-Vertrag (Start-Turn, READY_TO_PLAN-Handling), Same-Origin-API-Proxy, `conversations.user_id` nullable, Tabellen-Erstellung im Lifespan | Team |
| 2026-07-14 | 1.0.0 | Initiale Architektur festgeschrieben | Team |