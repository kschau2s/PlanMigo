# CLAUDE.md — Arbeitsanweisungen & Änderungsprotokoll

> Diese Datei ist das **Gedächtnis** des Projekts. Sie enthält (A) die Regeln, an die sich jede
> KI-Session hält, und (B) das chronologische Protokoll aller Änderungen.

---

# TEIL A — Regeln für die KI

## A.1 Pflicht bei JEDER Session

1. **Lies zuerst `ARCHITECTURE.md`.** Sie ist die Quelle der Wahrheit. Weiche nicht davon ab.
2. **Lies dann `CLAUDE.md` (diese Datei), Abschnitt „Teil B".** Sie zeigt, was zuletzt passiert ist.
3. **Arbeite die Aufgabe ab** — innerhalb der dort definierten Struktur, Schichten und Farben.
4. **Aktualisiere danach beide Dateien:**
   - `ARCHITECTURE.md` → nur wenn sich Struktur, Verträge, Abhängigkeiten oder Prinzipien geändert
     haben. Dann auch die Versionsnummer und die Tabelle in Abschnitt 9 erhöhen.
   - `CLAUDE.md` → **immer**. Neuer Eintrag oben in Teil B.

## A.2 Harte Regeln

| # | Regel |
|---|---|
| 1 | **Farben:** nur die 13 Basis-Töne aus `frontend/src/styles/tokens.css` (`#7C4232`, `#C9603A`, `#A04A2A`, `#7B9D6F`, `#5C7A52`, `#D8C9A8`, `#E8C9A8`, `#FAF6F1`, `#F0E4D8`, `#E5D9C8`, `#3D2418`, `#8B7560`, `#FFFFFF`) und ihre semantischen Aliases (`surface-*`, `content-*`, `accent-*`, `border-*`). Immer über Tokens, nie hartcodiert, kein Inline-`style` für Farben. |
| 2 | **Backend = FastAPI.** Kein Flask, kein Django, kein Express. |
| 3 | **Frontend = React + TypeScript + Tailwind.** Kein Vue, kein Next.js im MVP. |
| 4 | **LLM = OpenRouter.** Alle Calls ausschließlich über `services/openrouter.py`. Kein direkter Anbieter-SDK-Import. |
| 5 | **Host = Open WebUI.** Kopplung über Pipeline → FastAPI, nie direkt zu OpenRouter. |
| 6 | **Keine Secrets im Code.** Nur `.env` + `config.py`. |
| 7 | **Keine neue Dependency ohne Eintrag in Teil B** mit Begründung. |
| 8 | **Alles async.** Keine blockierenden Calls im Request-Path. |
| 9 | **Jeder Endpoint** braucht Pydantic-Schema + Test in `backend/tests/`. |
| 10 | **Sprache:** Code & Kommentare Englisch, UI-Texte & Doku Deutsch. |

## A.3 Standard-Prompt (in jede Session kopieren)

```
Lies zuerst ARCHITECTURE.md und CLAUDE.md.
Halte dich strikt an die dort definierte Architektur, Ordnerstruktur und Farbpalette.

AUFGABE:
<hier die Aufgabe>

Danach:
1. Aktualisiere ARCHITECTURE.md, falls sich die Architektur geändert hat (inkl. Version + Tabelle Abschnitt 9).
2. Trage die Änderung in CLAUDE.md Teil B ein (neuester Eintrag oben, Format siehe unten).
```

## A.4 Eintragsformat für Teil B

```markdown
## [YYYY-MM-DD] — Kurztitel

**Typ:** Feature | Fix | Refactor | Docs | Chore | Breaking
**Betroffen:** backend/… , frontend/… , openwebui/…
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.x.x) | nein

### Was
- …

### Warum
- …

### Auswirkungen
- Neue Dependencies: …
- Neue Env-Vars: …
- Migrationen: …
- Breaking: …
```

---

# TEIL B — Änderungsprotokoll

> Neueste Einträge oben.

## [2026-10-05] — Chat zweispaltig: Zielkarte rechts, wächst mit jeder Antwort

**Typ:** Feature
**Betroffen:** `backend/app/{schemas/destination.py,services/destinations.py,services/prompts/destinations.md,api/v1/destinations.py,api/v1/router.py}`,
`backend/tests/test_destinations.py`,
`frontend/src/{pages/PlannerPage.tsx,components/DestinationMap.tsx,hooks/useDestinations.ts,api/destinations.ts,types/destination.ts}`,
`frontend/package.json`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.8.0)

### Was
- Neuer Endpoint `POST /destinations/suggest` (`{conversation_id, keywords}` →
  `{destinations: [{id, name, country, lat, lng, reason}]}`). `services/destinations.py` lädt den
  Conversation-Verlauf (denselben, den `planner.py` nutzt) und lässt das LLM 3–5 real
  existierende Ziele mit geografisch korrekten Koordinaten vorschlagen
  (`reasoning: {"enabled": false}`, `response_format: json_object` — dasselbe Muster wie
  `flights.py`). Keine Geocoding-API nötig, Koordinaten gängiger Reiseziele sind zuverlässiges
  Modellwissen; Einträge ohne parsbare `lat`/`lng` werden verworfen.
- Frontend: neue Dependency `react-leaflet` + `leaflet` (OpenStreetMap-Tiles, **kein API-Key**
  nötig — bewusst statt Google Maps/Mapbox, um keinen Billing-Key im Code/`.env` zu brauchen,
  siehe Regel „Keine Secrets im Code"). `components/DestinationMap.tsx` rendert die Marker und
  zoomt die Karte per `FitBounds`-Helper automatisch auf alle aktuell bekannten Ziele.
  Leaflets Standard-Marker-Icon-URLs werden von Vite nicht automatisch aufgelöst — die PNGs
  werden explizit importiert und via `L.Icon.Default.mergeOptions(...)` gesetzt (ohne `any`,
  siehe Typ-Workaround in der Datei).
- `PlannerPage.tsx`: Der Chat-Schritt zeigt jetzt **zwei** `PhoneFrame`s nebeneinander — links
  unverändert der Chat, rechts ein neuer Frame mit der Karte. Nach **jeder** erfolgreichen
  `POST /chat`-Antwort (außer bei `ready_to_plan`) wird zusätzlich `POST /destinations/suggest`
  aufgerufen und das Ergebnis **additiv** in den lokalen State gemerged (Dedup über
  `name`+`country`, klein geschrieben) — bestehende Marker bleiben erhalten, neue kommen hinzu.
  Start-Schritt (Keywords) und Plan-Schritt (vollständiger Reiseplan) bleiben unverändert bei
  einem einzelnen `PhoneFrame`.

### Warum
- Nutzerwunsch: „der start soll so bleiben. nach der ersten eingabe soll das chat fenster auf
  der linken seite sein, rechts soll eine map gezeigt werden mit möglichen zielen die nach jeder
  eingabe auf mögliche ziele ergänzt wird."

### Auswirkungen
- Neue Dependencies: `leaflet`, `react-leaflet`, `@types/leaflet` (Dev) — Lockfile per
  Einweg-`node:20-slim`-Container regeneriert.
- Neue Env-Vars: keine (OpenStreetMap-Tiles sind öffentlich, kein Key). Migrationen: keine.
- Breaking: nein.

### Verifiziert
- `pytest` im `backend`-Container: 26/26 grün (neu: `test_destinations.py`).
- `tsc -b && vite build`: fehlerfrei.
- Direkt per `curl` gegen Backend/OpenRouter geprüft: `POST /destinations/suggest` liefert
  geografisch korrekte Koordinaten (z. B. Zermatt 46.0207/7.7491).
- End-to-End per Playwright (Chromium-Container im `planmigo-net`): Chat-Schritt zeigt Chat
  links + Karte rechts, Kartenkacheln laden; über drei aufeinanderfolgende Chat-Antworten wuchs
  die Marker-Anzahl nachweislich additiv (5 → 7 → 11), Karte zoomte automatisch nach, als sich
  das Gespräch auf eine Region (Tirol) konzentrierte. (Erster Testlauf zeigte fälschlich 0 Marker
  — Ursache war eine zu kurze Wartezeit im Test-Skript, nicht die Anwendung: der
  Zielvorschlags-Call braucht ca. 10–15 s; mit `page.waitForResponse(...)` statt festem Timeout
  bestätigt.)

## [2026-10-05] — UI-Shell: durchgehender Foto-Hintergrund + "Handy-Rahmen" auf allen Seiten

**Typ:** Refactor (Layout)
**Betroffen:** `frontend/src/{App.tsx,components/{AppBackdrop,PhoneFrame,TripPlanView,ChatWindow,Chat}.tsx,pages/{PlannerPage,TripResultPage,MyTripsPage}.tsx}`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.7.0)

### Was
- Neue `components/AppBackdrop.tsx`: das Foto+Gradient-Overlay aus dem bisherigen Start-Hero wird
  jetzt **einmal** in `App.tsx` außerhalb von `<Routes>` gerendert (`position: fixed`) — dasselbe
  Bild bleibt bei jedem Seitenwechsel stehen, statt dass jede Seite ihr eigenes Hero-Bild neu lädt.
- Neue `components/PhoneFrame.tsx`: klar umrandete (`border-2`), abgerundete, Handy-proportionierte
  Karte (`max-w-[440px] h-[85vh]`) mit `header`/`children`(scrollbarer Body)/`footer` als
  Flex-Column + `overflow-hidden` auf dem Frame — ein Footer (Composer, CTA-Button) ist dadurch
  immer **Teil des Layouts**, kann also nie optisch über den Rahmen-Rand hinausragen (vorher:
  `position: fixed`-Leisten relativ zum Browser-Viewport, unabhängig vom Karten-Rahmen).
- `ChatWindow.tsx`: `ChatWindow` in `ChatMessages` (Body, scrollbar) umbenannt/aufgeteilt —
  `Composer` wandert separat in den `PhoneFrame`-Footer, damit die Eingabeleiste fest im Rahmen
  verankert ist statt mit dem Seiteninhalt mitzuscrollen oder darüber hinauszuragen.
- Neue `components/TripPlanView.tsx`: der volle Reiseplan (Hero-Bild, Galerie, Tabs
  Plan/Unterkunft/Erlebnisse/Infos, Tages-Timeline) — extrahiert aus der bisherigen
  `TripResultPage`, kompakter für die schmale Rahmenbreite. Wird jetzt an **zwei** Stellen genutzt:
  direkt im Plan-Schritt von `PlannerPage` **und** auf `TripResultPage`.
- `PlannerPage.tsx` komplett umgebaut: **ein einziger** `PhoneFrame` statt Keyword-Hero +
  zweispaltigem `ChatLayout`. Drei interne Schritte ohne Navigation dazwischen: `"keywords"`
  (Formular + Flugvorschläge, Footer „Reise planen") → `"chat"` (`ChatMessages` + `Composer` im
  Footer) → `"plan"`. Sobald `POST /trips/plan` erfolgreich ist, wird **nicht mehr** zu
  `/trip/{id}` navigiert — stattdessen zeigt derselbe Frame sofort den **vollständigen** Plan via
  `TripPlanView` (Footer: „Reise teilen" kopiert trotzdem den `/trip/{id}`-Link, „Neue Reise").
- `TripResultPage.tsx` und `MyTripsPage.tsx` auf `PhoneFrame` umgestellt (kein eigenständiges
  Breitbild-Layout mehr) — optisch identisch zum eingebetteten Plan-Schritt.
- `Nav` (`components/Chat.tsx`) verschlankt für die schmale Rahmenbreite (kein `max-w-[1200px]`,
  kleineres Logo, „Meine Reisen" → „Reisen", E-Mail-Anzeige durch Tooltip ersetzt, da auf 440px
  kein Platz für die volle Adresse ist). `ChatLayout` entfernt (nach dem Umbau ungenutzt).

### Warum
- Nutzerfeedback: „das overlay aus dem anfangslayout soll sich durch alle seiten ziehen" (→
  `AppBackdrop` einmal global statt pro Seite), „das text overlay soll eher aussehen wie ein
  handy bzw. mit klaren rahmen" (→ `PhoneFrame`), „der balken in dem geschrieben wurde soll nicht
  nach unten gehen aus dem rahmen heraus" (→ Composer/Footer als Teil des Flex-Layouts statt
  `position: fixed`), „im reise overlay soll ein vollständiger plan stehen" (→ `TripPlanView`
  direkt im Plan-Schritt statt Weiterleitung auf eine separate Seite).

### Auswirkungen
- Neue Dependencies: keine. Neue Env-Vars: keine. Migrationen: keine.
- Breaking: Der Reiseplan erscheint nicht mehr auf einer eigenen Breitbild-Seite als primärer
  Pfad — `/trip/:tripId` existiert weiterhin (für „Meine Reisen"-Links und „Reise teilen"), zeigt
  aber jetzt dieselbe kompakte `PhoneFrame`-Ansicht statt eines Desktop-Layouts.

### Verifiziert
- `tsc -b && vite build`: fehlerfrei.
- End-to-End per Playwright (Chromium-Container im `planmigo-net`) gegen den laufenden Stack:
  Keywords-Schritt (Foto-Hintergrund durchgehend, Footer-Button sauber im Rahmen) → Flugauswahl
  (Klassenwechsel bei Auswahl per DOM-Check bestätigt) → Chat-Schritt (Composer fest im
  Rahmen-Footer, kein Überlauf) → Plan-Schritt zeigt vollständigen Plan mit Tabs direkt im Overlay
  → `/trip/{id}` mit echten Plan-Daten und `/trips` (eingeloggt/ausgeloggt) zeigen denselben
  Rahmen auf demselben Hintergrund — visuell konsistent über alle vier Seiten.

## [2026-10-05] — Account-Login + Flugvorschläge mit Preisen

**Typ:** Feature
**Betroffen:** `backend/app/{models/user.py,core/security.py,core/deps.py,services/{auth,flights,openrouter,planner}.py,schemas/{auth,flight}.py,api/v1/{auth,flights,chat,trips}.py,services/prompts/{flights.md,compose.md}}`,
`backend/requirements.txt`, `backend/tests/{test_auth,test_flights,test_trips,test_chat}.py`,
`frontend/src/{App.tsx,main.tsx,components/{Chat,AuthModal}.tsx,hooks/{useAuth,useFlights,useTripPlan}.ts(x),api/{auth,flights,client,trips}.ts,pages/{PlannerPage,MyTripsPage}.tsx,types/{auth,flight}.ts}`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.6.0)

### Was
- **Auth (echtes Login/Registrierung, nicht nur UI-Attrappe):** `users.hashed_password` neu
  (Spalte manuell per `ALTER TABLE` auf dem bestehenden Dev-Volume nachgezogen, da kein Alembic
  existiert und `create_all` nur fehlende Tabellen anlegt). `core/security.py` um
  `hash_password()`/`verify_password()` (bcrypt via passlib) ergänzt — `create_access_token()`/
  `decode_access_token()` (JWT) waren schon als Stubs vorhanden. Neue Endpoints
  `POST /auth/register`, `POST /auth/login` (beide liefern ein JWT), `GET /auth/me`.
  `core/deps.py`: `get_current_user_optional()` (liest `Authorization: Bearer …`, liefert `None`
  statt Fehler ohne/mit ungültigem Token) und `get_current_user()` (erzwingt 401).
  `POST /chat` nutzt `get_current_user_optional` — ist ein Nutzer angemeldet, wird die neu
  angelegte `Conversation.user_id` gesetzt; **Login bleibt optional**, anonyme Nutzung weiterhin
  möglich. Neuer Endpoint `GET /trips/mine` (Auth erzwungen) listet Trips über
  `Conversation.user_id`, registriert **vor** `GET /trips/{trip_id}` im Router (sonst hätte die
  dynamische Route `/trips/mine` als `trip_id="mine"` abgefangen).
  Frontend: `hooks/useAuth.tsx` (React-Context, JWT in `localStorage`, hydratisiert
  `GET /auth/me` beim Laden), `api/client.ts`-Interceptor hängt den Token an jeden Request,
  `components/AuthModal.tsx` (Login-/Registrieren-Tabs), `Nav` (`components/Chat.tsx`) zeigt
  rechts oben „Anmelden" bzw. E-Mail + „Abmelden" + „Meine Reisen"-Link. Neue Route `/trips`
  (`pages/MyTripsPage.tsx`) listet die verknüpften Reisen als Karten.
- **Flugvorschläge mit Preisen, auswählbar vor dem Chat:** Es ist weiterhin **keine echte
  Flug-API** angebunden (`travel_api.py` bleibt Platzhalter, `AMADEUS_API_KEY/SECRET` leer) —
  neuer Endpoint `POST /flights/suggest` lässt stattdessen das LLM 4 realistische, nach Preis
  sortierte Flugvorschläge generieren (`services/flights.py`, neuer Prompt
  `prompts/flights.md`, `reasoning: {"enabled": false}` wie beim Compose-Fix unten, damit das
  Reasoning-Modell nicht wieder sein Token-Budget verbrennt). Preise klar als Schätzung markiert
  ("ca."), keine erfundenen Buchungscodes — gleiches Prinzip wie `compose.md` bei leeren
  `travel_api`-Resultaten. `services/openrouter.py` bekam einen gemeinsamen Helper
  `parse_json_object()` (Markdown-Fence-Stripping + JSON-Parsing), den `planner._parse_plan_json`
  jetzt auch nutzt (Duplikation entfernt, bestehende Tests unverändert grün).
  Frontend: Auf der Start-Seite (`PlannerPage.tsx`) ein „Flugpreise anzeigen (ca.)"-Button
  innerhalb der Keyword-Karte (`hooks/useFlights.ts`); Ergebnisse als auswählbare Preis-Zeilen.
  Die Auswahl wird beim Start der Planung als `answers.selected_flight` (JSON-String) an
  `POST /trips/plan` durchgereicht — **kein neues Feld, kein neuer Endpoint**, das bestehende
  `TripPlanRequest.answers: dict[str,str]` wird wiederverwendet. `compose.md` wurde um eine Regel
  ergänzt: Passt das gewählte Flugziel zum finalen Reiseziel, übernimmt der Compose-Prompt
  Airline/Preis unverändert für den Anreise-Flug an Tag 1; passt es nicht mehr, dient der Preis
  nur als Orientierung.

### Warum
- Nutzerwunsch: „ergänze mir ein Feld, in dem auch mögliche Flüge angezeigt werden mit
  Flugpreisen, die du dir zu Beginn aussuchen kannst" + „oben rechts ein Anmelden-Button …,
  sodass die Reisen zu meinem Account verbunden werden können".
- Bewusst **kein** Fake: Da keine Flug-Buchungs-API existiert (ARCHITECTURE.md §8 Nicht-Ziele:
  „Kein eigenes Inventar/keine eigene Buchungsabwicklung"), wurden die Preise klar als
  LLM-Schätzung gekennzeichnet statt eine echte Buchungsmöglichkeit vorzutäuschen — konsistent
  mit dem bereits bestehenden Verhalten von `compose.md` bei leeren Suchergebnissen.

### Auswirkungen
- Neue Dependencies: `passlib[bcrypt]==1.7.4` + gepinnt `bcrypt==4.0.1` (neuere bcrypt-Versionen
  brechen passlibs internen Self-Test — `ValueError: password cannot be longer than 72 bytes` bei
  jedem `hash_password()`-Aufruf; mit `bcrypt==4.0.1` verifiziert behoben).
- Neue Env-Vars: keine (nutzt bestehendes `SECRET_KEY`).
- Migrationen: `ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255) NOT NULL DEFAULT ''`
  manuell auf dem lokalen Dev-Volume ausgeführt (Tabelle war leer, keine Daten betroffen). Auf
  einem frischen `docker compose up` legt `create_all` die Spalte korrekt neu an — nur bereits
  existierende Volumes brauchen den manuellen Schritt. Alembic ist weiterhin offen.
  `conversations.user_id` war bereits nullable vorbereitet (siehe Eintrag „Chatbot-Flow lauffähig
  gemacht").
- Breaking: nein. `POST /chat` funktioniert unverändert ohne Token; bestehende Tests in
  `test_chat.py` mussten nur die Fake-Mock-Signatur um das neue `user_id`-Kwarg ergänzen.

### Verifiziert
- `pytest` im `backend`-Container: 23/23 grün (neu: `test_auth.py`, `test_flights.py`,
  `test_trips.py`).
- `tsc -b && vite build`: fehlerfrei.
- End-to-End per Playwright (Chromium-Container im `planmigo-net`) gegen den laufenden Stack:
  Registrierung → Nav zeigt E-Mail + „Meine Reisen"/„Abmelden" → Keywords → „Flugpreise
  anzeigen" → 4 Vorschläge (sortiert 99/149/199/229 €) → Flug ausgewählt → Chat → Plan erstellt →
  Tag 1 im Ergebnis zeigt exakt „Hinflug mit easyJet nach Innsbruck … ca. 99 € p.P.“ (und der
  Rückflug an Tag 8 ebenfalls mit easyJet) → `/trips` zeigt die verknüpfte Reise → Abmelden →
  erneutes Anmelden stellt die Session wieder her → Session übersteht Seiten-Reload
  (JWT aus `localStorage`). Auch direkt per `curl` gegen Backend/Postgres/OpenRouter geprüft
  (Register/Duplicate-409/Login/Wrong-Password-401/Me/trips-mine/flights-suggest).

## [2026-10-05] — Mobile-App-Design-Vorlage auf die Web-UI übertragen (Start-Hero + Ergebnis-Tabs)

**Typ:** Feature
**Betroffen:** `frontend/src/pages/{PlannerPage,TripResultPage}.tsx`
**Architektur geändert:** nein (nur Layout/Styling innerhalb der bestehenden 4.2/4.3-Regeln, keine
neuen Dependencies, keine neuen Routen/Datenflüsse)

### Was
- Nutzer gab einen Screenshot einer iOS-App-Designvorlage (4 Screens: Foto-Hero-Startseite,
  Chat mit Quick-Reply-Chips, Reisevorschlag-Karte, Ergebnis-Seite mit Tab-Leiste
  Reiseplan/Unterkunft/Erlebnisse/Infos + "Jetzt buchen") als Vorbild für die Web-App vor.
- `PlannerPage.tsx` (Start-Screen): Keyword-Eingabe läuft jetzt über einen ganzseitigen Foto-Hero
  (`seededImage`, fester Seed `travel-adventure-01` — laternenbeleuchtete Gasse, warmer Farbton
  passend zur Terrakotta-Palette) mit Verlauf-Overlay, zweizeiliger Serif-Headline
  („Dein Urlaub. **Einfach** geplant.") und dem Eingabe-Card frei auf dem Foto schwebend —
  Funktion/Hooks unverändert, nur die Hülle neu.
- `TripResultPage.tsx`: Tab-Leiste `Reiseplan | Unterkunft | Erlebnisse | Infos` (lucide-react-
  Icons statt Emoji) über den bestehenden `items`, rein clientseitig gefiltert (`stay` /
  `activity`+`restaurant` / alle) — keine Backend-Änderung nötig. Neuer "Infos"-Tab mit
  Statistik-Kacheln (Anzahl Anreisen/Nächte/Aktivitäten/Restaurants, aus echten Items berechnet)
  und einer Eckdaten-Liste (Ziel, Zeitraum, Budget). Hero bekam ein "✓ Geplant"-Badge und
  „X Tage · Y Nächte" (aus `start_date`/`end_date` berechnet, Fallback: Anzahl Tage aus Items).
  Sticky Bottom-Bar mit „← Neue Reise planen" + **„Reise teilen"** (kopiert `window.location.href`
  via Clipboard-API, Erfolgsfeedback 2s).

### Warum
- Nutzerwunsch, die Mobile-App-Designsprache „gewissermaßen" auf die Web-Anwendung zu übertragen.
- Bewusst **nicht** 1:1 übernommen: kein natives Bottom-Tab-Nav (Start/Inspiration/Trips/Profil —
  ergibt für eine Single-Flow-Web-App ohne Mehrfach-Reisen-Verwaltung/Profilsystem keinen Sinn),
  kein „Jetzt buchen"-Button (keine Booking-API vorhanden, siehe ARCHITECTURE.md §8 Nicht-Ziele —
  ein funktionsloser Buchen-Button wäre irreführend) → stattdessen „Reise teilen" mit echter
  Funktion (die Seite ist über `/trip/{id}` ohnehin dauerhaft erreichbar). Kein strukturiertes
  Multiple-Choice-Quick-Reply-System im Chat übernommen, da `clarify.md` offene Fragen generiert
  und keine strukturierten Optionen liefert — ein hartcodiertes Chip-Set hätte an der eigentlichen
  Frage vorbeigehen können.

### Auswirkungen
- Neue Dependencies: keine (lucide-react war bereits vorhanden).
- Neue Env-Vars: keine. Migrationen: keine. Breaking: nein (reines Frontend-Styling, Props/Hooks
  unverändert).
- Bildquelle weiterhin Picsum (`lib/images.ts`, siehe Eintrag „Reiseplan-Ergebnis auf eigener
  Seite mit Bildern") — rein optisch, nicht inhaltlich an Destination/Aktivität gebunden.

### Verifiziert
- `tsc -b && vite build`: fehlerfrei (`node:20-slim`-Container).
- End-to-End per Playwright (Chromium-Container im `planmigo-net`): Start-Hero → Keywords →
  Chat → `ready_to_plan` → `/trip/{id}` mit allen vier Tabs einzeln geprüft (Reiseplan gefiltert
  nach Tag, Unterkunft zeigt nur `stay`-Items, Erlebnisse nur `activity`+`restaurant`, Infos zeigt
  korrekte Statistik-Zahlen); Sticky-Bottom-Bar per Scroll-Screenshot als tatsächlich
  `position: fixed` am Viewport-Boden bestätigt (im `fullPage`-Screenshot zunächst fälschlich
  mittig wirkend — Playwright-Stitching-Artefakt, kein echter Bug).

## [2026-10-05] — Reiseplan-Ergebnis auf eigener Seite mit Bildern

**Typ:** Feature
**Betroffen:** `frontend/src/App.tsx`, `frontend/src/pages/{PlannerPage,TripResultPage}.tsx`,
`frontend/src/components/TripCard.tsx` (gelöscht), `frontend/src/lib/images.ts` (neu),
`frontend/src/types/chat.ts`, `frontend/package.json`, `frontend/package-lock.json`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.5.0)

### Was
- `react-router-dom` ergänzt; `App.tsx` wrapped jetzt in `BrowserRouter` mit zwei Routen:
  `/` (`PlannerPage`, unverändert: Keyword-Eingabe + Chat mit Migo) und `/trip/:tripId`
  (neu: `TripResultPage`). nginx liefert für unbekannte Pfade bereits `index.html` aus
  (`try_files … /index.html` in `nginx.conf`), daher funktioniert Client-Side-Routing auch bei
  Direktaufruf/Reload von `/trip/:id` ohne weitere Server-Änderung.
- `PlannerPage.tsx`: Sobald `POST /trips/plan` erfolgreich ist, navigiert die Seite jetzt direkt
  zu `/trip/{plan.id}` (`useNavigate`), statt den Plan in der rechten Sidebar-Karte anzuzeigen.
  Das sticky Panel zeigt während des Chats nur noch einen Platzhalter/Pending-Hinweis.
- Neue Seite `pages/TripResultPage.tsx`: lädt den Plan selbstständig per `useTripPlan(tripId)`
  (bestehender Query-Hook, `GET /trips/{id}`) — Lade- und Fehlerzustand inklusive. Ganzseitiges
  Hero-Bild (Zielort) mit Farbverlauf-Overlay, Titel/Datum/Budget-Chips, eine 4er-Bildergalerie
  und pro Tag/Item ein zusätzliches Foto-Thumbnail in der Timeline (vorher: nur Emoji-Icon).
- `components/TripCard.tsx` gelöscht (vollständig durch `TripResultPage` abgelöst, keine weiteren
  Verwender mehr); ungenutztes `plan`-Feld aus `ChatSession` (`types/chat.ts`) entfernt.
- `lib/images.ts` (neu): `seededImage(seed, w, h)` liefert eine deterministische Bild-URL über
  Picsum Photos (`https://picsum.photos/seed/…`). Kein API-Key nötig, kein Bild-Provider im
  Backend vorhanden (`travel_api.py` liefert keine Foto-URLs) — Picsum reicht als visueller
  MVP-Platzhalter, bis ein echter Foto-Provider (z. B. Unsplash/Pexels API) angebunden wird.

### Warum
- Nutzerwunsch: „mach mir das Ergebnis auf einer neuen Seite. dazu sollen mehr Bilder verwendet
  werden." Der bisherige Reiseplan war eine reine Text-/Icon-Timeline in der Chat-Sidebar.

### Auswirkungen
- Neue Dependencies: `react-router-dom` (`package.json` **und** `package-lock.json` — Lockfile
  per Einweg-`node:20-slim`-Container mit `npm install --package-lock-only` regeneriert, da in
  dieser Umgebung kein Node.js installiert ist).
- Neue Env-Vars: keine.
- Migrationen: keine.
- Breaking: Der Reiseplan erscheint nicht mehr neben dem Chat, sondern auf einer eigenen Route
  (`/trip/:tripId`); bestehende Komponente `TripCard` wurde entfernt.
- Bildquelle (Picsum) liefert thematisch zufällige, nicht reiseinhaltlich passende Fotos (kein
  echter Bild-Suchdienst angebunden) — optisch stimmig als Platzhalter, inhaltlich aber nicht an
  Destination/Aktivität geknüpft. Für echte, zum Ort passende Fotos wäre eine Anbindung an
  Unsplash/Pexels (eigener API-Key, neue Env-Var) ein offener Folgeschritt.

### Verifiziert
- `tsc -b && vite build`: fehlerfrei (`node:20-slim`-Container).
- `docker compose up -d --build backend frontend`: beide Container `Up`/healthy.
- End-to-End per Playwright (Chromium-Container im `planmigo-net`, `http://frontend:5173`):
  Keyword-Eingabe → Chat mit Migo (4 Rückfragen, `ready_to_plan`) → automatische Weiterleitung zu
  `/trip/{id}` → vollständige Ergebnisseite gerendert (Hero-Bild „Tirol, Österreich" mit
  Datum-/Budget-Chips, 4-teilige Galerie, 7 Tage mit je 2–4 bebilderten Items) → keine
  Console-/Page-Errors.

## [2026-10-05] — Fix: Reiseplan-Erstellung schlug wegen Reasoning-Tokens fehl

**Typ:** Fix
**Betroffen:** `backend/app/services/openrouter.py`, `backend/app/services/planner.py`
**Architektur geändert:** nein

### Was
- `POST /trips/plan` endete zuverlässig mit 500 (ungefangene `pydantic.ValidationError`) bzw.
  503. Ursache: `OPENROUTER_MODEL=deepseek/deepseek-v4-flash` ist ein Reasoning-Modell und hat
  beim Compose-Call (JSON mit bis zu 14 Items, `max_tokens=4000`) das komplette Token-Budget für
  verstecktes Reasoning verbraucht (`reasoning_tokens: 4000`, `finish_reason: "length"`) — die
  API lieferte `choices[0].message.content: null` zurück, bevor überhaupt JSON geschrieben wurde.
- `services/openrouter.py`: `complete()` bekommt einen neuen optionalen `reasoning`-Parameter
  (wird 1:1 als `reasoning`-Feld an OpenRouter durchgereicht). Zusätzlich: leerer/`None`-Content
  in der Antwort wird jetzt als sauberer `LLMServiceError` (inkl. `finish_reason`) geworfen statt
  eine ungefangene Pydantic-`ValidationError` zu verursachen.
- `services/planner.py`: `build_trip_plan()` ruft `openrouter.complete()` jetzt mit
  `reasoning={"enabled": False}` auf — verifiziert per Direktaufruf gegen die OpenRouter-API:
  ohne Reasoning liefert das Modell zuverlässig vollständiges JSON (`finish_reason: "stop"`,
  `reasoning_tokens: 0`).

### Warum
- Nutzer meldete: „es erstellt keinen Reiseplan". Reproduziert über Backend-Logs
  (`docker compose logs backend`) → `pydantic_core._pydantic_core.ValidationError: content …
  Input should be a valid string [type=string_type, input_value=None]`.

### Auswirkungen
- Neue Dependencies: keine.
- Neue Env-Vars: keine.
- Migrationen: keine.
- Breaking: nein (`reasoning` ist optional, Default weiterhin ohne das Feld — betrifft nur den
  Compose-Call in `planner.py`; der Clarify-Call bleibt unverändert, da dort bisher kein Problem
  auftrat).

### Verifiziert
- `pytest` im `backend`-Container: 10/10 grün.
- End-to-End gegen den laufenden Docker-Stack (echter OpenRouter-Key): Start-Turn → 2 Rückfragen
  → `ready_to_plan: true` → `POST /trips/plan` → 200 mit vollständigem Plan („Tirol, Österreich",
  07.–13.09.2026, Budget 1500 €, 17 Items).

## [2026-07-15] — Design-System: Struktur-Umbau auf Nav/ChatLayout + Farbkorrektur

**Typ:** Feature | Fix
**Betroffen:** `frontend/src/styles/tokens.css`, `frontend/src/pages/PlannerPage.tsx`,
`frontend/src/components/{ChatWindow,Sidebar→gelöscht}.tsx`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.4.0)

### Was
- Der vorherige Design-System-Eintrag hatte nur **Tokens/Farben** auf die neuen Komponenten
  umgestellt, aber die **Struktur** der alten App (linke Sidebar mit Chat-Liste, orange
  Vollflächen-Hintergrund, Slide-Übergang Keyword-Panel → Chat-Panel, `ChatWindow` als umrahmte
  Box mit eigenem Header/Input) beibehalten. Nutzer-Feedback: Das sieht dem hochgeladenen
  Design-Export („Web-Dialog") strukturell nicht ähnlich genug.
- `PlannerPage.tsx` komplett umgebaut auf die tatsächlichen Primitives aus `components/Chat.tsx`:
  `Nav` (fixe Topbar) statt Sidebar, `ChatLayout` (zweispaltig: Chat links, `panel` rechts sticky)
  statt Slide-Transition. Mehrfach-Chat-Verwaltung (Sidebar-Liste mehrerer Sessions) entfernt —
  `PlannerPage` hält jetzt genau eine aktive `ChatSession` statt eines Arrays; Reset über einen
  „← Neue Reise"-Link statt Sidebar-Button. `components/Sidebar.tsx` gelöscht (unbenutzt).
- `ChatWindow.tsx` rendert nur noch die `Bubble`-Kette + Typing-Indicator + `Composer` (kein
  umrahmter Container, kein eigener Header/Input mehr) — Autoscroll über `scrollIntoView` auf einen
  Bottom-Anchor statt fixer Box-Höhe mit `overflow-y-auto`.
- Rechte Spalte (`ChatLayout`-`panel`): solange kein Plan existiert, ein Platzhalter-Card
  („Dein Vorschlag … erscheint hier"); sobald `session.plan` gesetzt ist, die bestehende
  `TripCard` (volle Tages-Timeline, nicht die generische `TripPanel`-Komponente aus dem
  Design-Export, da deren `stops`-Datenmodell die reale Timeline mit mehreren Items/Tag und
  Typ-Icons nicht abbilden kann — `TripCard` übernimmt aber `TripPanel`s Karten-Optik
  (`rounded-card`/`border-card`/`shadow-card`).
- **Farbkorrektur:** `--surface-page` stand fälschlich auf `var(--pm-orange)` (Rest der alten
  App-Optik aus dem vorherigen Eintrag) statt auf `var(--pm-cream)` wie im Original-Tokens-Export
  vorgegeben. Dadurch wirkte z.B. das Nav-Wortmark kontrastarm. Zurückgestellt auf `--pm-cream`;
  globale Body-Textfarbe von `--text-on-inverse` auf `--text-body` korrigiert; alle Textfarben in
  `PlannerPage.tsx`, die von einem dunklen Seitenhintergrund ausgingen (`text-content-onInverse*`),
  auf helle-Fläche-Varianten (`text-content-heading`/`text-content-muted`) umgestellt; „Planung
  starten"-Button von `bg-surface-card` (auf hellem Grund unsichtbar) auf `bg-accent-primary`
  geändert.

### Warum
- Der vorherige Eintrag hat Tokens/Komponenten technisch korrekt integriert, aber die Aufgabe
  „an mein Design anpassen" nur halb erfüllt, solange das alte App-Gerüst weiterbestand. Auf
  explizite Nutzerrückmeldung („sieht immer noch scheiße aus") strukturell nachgezogen.

### Auswirkungen
- Neue Dependencies: keine.
- Neue Env-Vars: keine.
- Migrationen: keine.
- Breaking: Chat-Historie mehrerer parallel offener Reisen (Sidebar-Feature aus dem
  „UI-Redesign"-Eintrag vom 2026-07-14) ist **nicht mehr verfügbar** — pro Browser-Tab existiert
  nur noch eine aktive Planung gleichzeitig. Kann bei Bedarf als Dropdown/Popover im `Nav`
  nachgerüstet werden.

### Verifiziert
- `tsc -b && vite build`: fehlerfrei (`node:20-slim`-Container).
- `docker compose up -d --build frontend`: Container healthy.
- End-to-End per Playwright (Chromium-Container, `planmigo-net`): Startbildschirm (helle Cream-
  Fläche, Nav mit Logo/Wortmarke, weiße Karte) → Keyword → Chat-Slide (Nav bleibt oben, zweispaltig:
  Bubble-Kette links, Platzhalter-Panel „Dein Vorschlag" rechts) → echte Migo-Antwort vom
  Backend/OpenRouter als `Bubble` gerendert → keine Console-Errors.

### Offen
- [ ] Mehrfach-Chat-Verwaltung (mehrere Reisen parallel) ist weggefallen; falls gewünscht, als
  Dropdown/Popover im `Nav` nachrüsten.

## [2026-07-14] — Design-System-Integration (erweiterte Palette + geteilte UI-Primitives)

**Typ:** Feature
**Betroffen:** `frontend/src/styles/tokens.css`, `frontend/tailwind.config.js`,
`frontend/src/components/Chat.tsx`, `frontend/src/assets/planmigo-logo.svg`,
`frontend/src/components/{Sidebar,ChatWindow,TripCard,KeywordPills}.tsx`,
`frontend/src/pages/PlannerPage.tsx`, `frontend/src/styles/index.css`, `frontend/package.json`,
`frontend/package-lock.json`, `frontend/.dockerignore`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.3.0)

### Was
- `tokens.css`/`tailwind.config.js` von der bisherigen 5-Farben-Palette auf einen vollständigen
  Design-Export umgestellt: 13-Ton-Basis-Palette (u.a. `--pm-terracotta`, `--pm-orange-deep`,
  `--pm-sand-light`, `--pm-cream-warm`, `--pm-paper`, `--pm-espresso`, `--pm-taupe`, `--pm-white`)
  plus semantische Aliases (`surface-page/card/inverse/chip/chip-active`,
  `text-heading/body/muted/on-inverse/on-inverse-muted/eyebrow`, `accent-primary/secondary`,
  `border-card/hairline`), Typo-Scale (Georgia/Helvetica, `font-serif`/`font-sans`,
  `text-display/h1/h2/cardTitle/body/caption/eyebrow`), Spacing-/Radius-/Shadow-/Motion-Tokens.
  `--surface-page` zeigt weiterhin auf `--pm-orange` (App-Hintergrund bleibt wie zuvor).
- Neue geteilte Komponenten-Bibliothek `components/Chat.tsx`: `Nav`, `Bubble`, `Chip`,
  `QuestionCard`, `Composer`, `TripPanel`, `ChatLayout` — 1:1 aus dem Design-Export übernommen.
- `frontend/src/assets/planmigo-logo.svg` ergänzt.
- Bestehende, funktionale Komponenten (`Sidebar`, `ChatWindow`, `TripCard`, `KeywordPills`,
  `PlannerPage`) auf die neuen Tokens umgestellt — Backend-Anbindung, State und Handler
  unverändert; `ChatWindow` nutzt jetzt `Bubble` für die Nachrichtenliste. Verbliebenes
  Inline-`style` (Typing-Indicator-Animation-Delay) durch Tailwind-Arbitrary-Value-Klassen ersetzt.
- `lucide-react` als Dependency ergänzt (Send-Icon in `Composer`/`ChatWindow`).

### Warum
- Integration des vom Design-Team bereitgestellten vollständigen Tokens-/Komponenten-Exports,
  ohne die bereits lauffähige Chat-/Planungs-Anwendung (siehe Eintrag „UI-Redesign" unten) durch
  eine statische Demo zu ersetzen.

### Auswirkungen
- Neue Dependencies: `lucide-react` (in `package.json` **und** `package-lock.json` — Lockfile per
  Einweg-`node:20-slim`-Container regeneriert, da in dieser Umgebung kein Node.js installiert ist).
- Neue Env-Vars: keine.
- Migrationen: keine.
- Breaking: **Farbpalette erweitert** (Regel #1 in Teil A geändert, war zuvor exakt 5 Hex-Werte).
  Tailwind-Opacity-Modifier (`bg-pm-cream/20` o.ä.) funktionieren mit den neuen `var()`-basierten
  Farb-Tokens nicht mehr — siehe ARCHITECTURE.md §4.3. Alle Vorkommen im Code auf `opacity-*`
  (ganzes Element) bzw. solide Tokens umgestellt.
- `frontend/.dockerignore` (neu, `node_modules`/`dist`/`.git`): fehlte bisher und ließ den
  `frontend`-Docker-Build mit `invalid file request node_modules/.bin/acorn` abbrechen, sobald
  lokal ein `node_modules` existiert (Windows-Symlink im Build-Kontext).

### Verifiziert
- `tsc -b && vite build`: fehlerfrei (in `node:20-slim`-Container, kein Node.js lokal installiert).
- `docker compose up -d db backend frontend`: alle drei Container `healthy`/`Up`; `curl` auf
  Frontend (`:5173`) und Backend-Health (`:8000/api/v1/health`) → beide `200`.
- End-to-End per Playwright (Chromium-Container im `planmigo-net`): Startbildschirm (orange Fläche,
  weiße Karte, Sidebar) → Keyword „Berge" hinzugefügt/entfernbar → „Planung starten" → Slide in den
  Chat → echte Migo-Antwort vom Backend/OpenRouter in `Bubble`-Komponente gerendert, Sidebar zeigt
  „In Planung …" → keine Console-Errors. (Testartefakt: `crypto.randomUUID` ist nur in sicheren
  Kontexten verfügbar; der Playwright-Container erreichte die App über den internen Docker-Hostnamen
  `frontend` statt `localhost` — mit `page.addInitScript`-Polyfill umgangen. Bei echtem Zugriff über
  `localhost:5173` oder HTTPS tritt das nicht auf, betrifft nicht den Code.)
- grep-Audit: keine Hex-Werte außerhalb `tokens.css`/Logo-SVG, keine Inline-`style`-Attribute, keine
  `/`-Opacity-Modifier auf `pm-*`/`surface-*`/`content-*`/`accent-*`-Farben.

## [2026-07-14] — UI-Redesign: Sidebar, Orange-Fläche, Slide-Übergang in den Chat

**Typ:** Feature
**Betroffen:** `frontend/src/`, `frontend/nginx.conf`, `backend/app/services/`, `ARCHITECTURE.md`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.2.0)

### Was
- **Neue UI-Shell:** App-Hintergrund in `--pm-orange`; linke Sidebar (`components/Sidebar.tsx`)
  mit Logo, „＋ Neue Reise planen", Liste der geöffneten Chats (Titel = Keywords, Status =
  „Neu" / „In Planung …" / „✓ Reiseziel") sowie Einstellungen/Profil als „bald"-Platzhalter
  (Auth kommt später). Mobil als Overlay mit Hamburger-Button.
- **Slide-Übergang:** Start im Keyword-Panel; „Planung starten" schiebt per
  CSS-Transform (500 ms) dynamisch ins Chat-Panel. „Neue Reise planen" slidet zurück.
- **Chat-Sessions clientseitig** (`types/chat.ts → ChatSession`): mehrere Chats parallel,
  Wechsel über die Sidebar stellt Verlauf + Reiseplan wieder her. Pending/Error-Zustände
  werden pro Session getrackt (kein Backend-Listing-Endpoint vorhanden — offener Punkt).
- **Timeout-Fix Plan-Erstellung:** Compose-JSON dauert auf langsamen Modellen (z.B.
  `deepseek-v4-flash`) mehrere Minuten → `openrouter.complete()` hat jetzt einen
  `timeout_seconds`-Parameter (Compose: 300 s statt 60 s, vorher 3 sinnlose Retries → 503),
  nginx `proxy_read_timeout` auf 360 s erhöht, `compose.md` begrenzt auf max. 14 Items mit
  1-Satz-Beschreibungen, Spinner-Text weist auf die Wartezeit hin.

### Warum
- Nutzerwunsch: hochwertigeres UI mit Marken-Orange als Fläche, Chat-Verwaltung wie in
  gängigen Chat-Apps und ein flüssiger Übergang von der Stichwort-Eingabe in den Dialog.

### Auswirkungen
- Neue Dependencies: keine (Playwright nur lokal im Scratchpad zur Verifikation).
- Neue Env-Vars: keine.
- Migrationen: keine.
- Breaking: nein (`timeout_seconds` hat Default 60 s).

### Verifiziert
- `pytest` 10/10 grün, `tsc -b` + `vite build` sauber.
- Playwright gegen den Docker-Stack (Frontend-nginx → Backend → OpenRouter → Postgres):
  Keyword-Auswahl per Chips → Slide in den Chat → echter Migo-Dialog (2 Rückfragen) →
  `ready_to_plan` → TripCard „Tirol, Österreich" mit Tages-Timeline gerendert; Sidebar-Wechsel
  (zurück zu Keywords, Chat wieder öffnen) und Mobile-Overlay per Screenshot geprüft;
  keine Console-Errors.

### Offene Punkte
- [ ] Backend-Endpoint `GET /conversations` für persistente Chat-Liste in der Sidebar
- [ ] Einstellungen/Profil-Seiten (nach Auth-Flow)

## [2026-07-14] — Chatbot-Flow lauffähig gemacht + UI-Überarbeitung

**Typ:** Feature + Fix
**Betroffen:** `backend/app/`, `backend/tests/`, `frontend/src/`, `frontend/nginx.conf`, `frontend/vite.config.ts`, `.env.example`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.1.0)

### Was
- **Backend-Fixes (Chatbot war vorher nicht lauffähig):**
  - `models/conversation.py`: `user_id` nullable — vorher scheiterte JEDER Chat-Turn mit
    IntegrityError, weil `next_clarifying_turn` Conversations ohne User anlegt (Auth noch offen).
  - `main.py`: Lifespan erstellt fehlende Tabellen (`Base.metadata.create_all`) — vorher gab es
    ohne Alembic gar keine Tabellen; plus `CORS_ORIGIN_REGEX` (Codespaces-Hosts).
  - `config.py`: `.env` wird jetzt auch aus dem Repo-Root geladen — vorher lief `uvicorn` aus
    `backend/` ohne API-Key (leerer `OPENROUTER_API_KEY` → 503).
  - `services/planner.py`: Leere `message` startet die Konversation (Migo fragt zuerst);
    Historie geht als echte Message-Liste (system + turns) an OpenRouter statt als Flat-Prompt;
    `READY_TO_PLAN` wird robust erkannt (`in` statt `==`) und leakt nie mehr in die UI;
    Sicherheitsnetz `MAX_CLARIFY_TURNS = 5`; `build_trip_plan` lädt die Dialog-Historie aus
    `conversations.state` (vorher wurde der Plan ohne Gesprächskontext erstellt!); tolerantes
    Parsing für Plan-JSON (Markdown-Fences), Datumsangaben und deutsche Budgetformate;
    Items werden per `selectinload` geladen (async lazy-load hätte gecrasht — auch in
    `GET /trips/{id}` gefixt).
  - `services/openrouter.py`: 4xx-Fehler brechen sofort mit Detail ab statt 3× zu retryen.
  - Prompts überarbeitet: `clarify.md` als System-Prompt (eine Frage pro Turn, Beispieloptionen,
    max. {max_turns} Fragen), `compose.md` mit festem Payload-Schema
    (`title/description/location/time/price`) und heutigem Datum.
- **Frontend-Überarbeitung (komplett neues UI, nur die 5 Farb-Tokens):**
  - Same-Origin-API: `api/client.ts` → `/api/v1`; Vite-Dev-Proxy + nginx-Proxy (`/api/` →
    `backend:8000`) — funktioniert damit lokal, in Docker und in Codespaces ohne CORS-Konfiguration.
  - `App.tsx`: App-Shell mit Sticky-Header (Logo, Wortmarke Plan/Migo), Footer.
  - `PlannerPage.tsx`: Zwei-Phasen-Flow — (1) Keyword-Hero mit Vorschlags-Chips, Pills und
    „Planung starten"-CTA, (2) Chat mit Migo; bei `ready_to_plan` automatische Plan-Erstellung
    mit Lade- und Fehlerzuständen (inkl. Retry) und „Neue Reise planen"-Reset.
  - `ChatWindow.tsx`: Chat-Bubbles mit Migo-Avatar, Auto-Scroll, Tipp-Indikator (animierte
    Punkte), Auto-Fokus, Senden per Enter.
  - `TripCard.tsx`: Reiseplan als Tages-Timeline mit Typ-Icons/-Labels (Anreise, Unterkunft,
    Aktivität, Restaurant), strukturierter Payload-Darstellung (Titel, Beschreibung,
    Zeit · Ort · Preis), Datums- und Budget-Chips.
- **Tests:** `tests/test_chat.py` (Endpoint inkl. 503-Mapping) und `tests/test_planner.py`
  (Start-Turn, Marker-Handling, Max-Turns, JSON-/Datums-/Budget-Parsing) — 10 Tests grün.
- **Repo-Hygiene:** versehentlich committete `backend/.venv/`, `node_modules/`, `__pycache__/`
  und `.pytest_cache/` aus dem Git-Index entfernt (~9300 Dateien; lagen trotz `.gitignore` im Repo).

### Warum
- Der Kern-Use-Case (ARCHITECTURE.md §6) war durchgängig defekt; das UI entsprach nicht dem
  Produktanspruch aus README.md. Jetzt ist der komplette Flow Schlagwörter → Rückfragen →
  Reiseplan end-to-end lauffähig.

### Auswirkungen
- Neue Dependencies: keine.
- Neue Env-Vars: `CORS_ORIGIN_REGEX` (optional, Default: Codespaces-Hosts). `VITE_API_URL`
  in `.env.example` auf `/api/v1` geändert (Same-Origin-Proxy).
- Migrationen: keine (Tabellen via `create_all` beim Start; Alembic weiter offen).
- Breaking: `POST /api/v1/chat` akzeptiert jetzt leere `message` als Start-Turn (rückwärtskompatibel).

### Verifiziert
- `pytest`: 10/10 grün. `tsc -b` + `vite build`: sauber.
- End-to-End mit Postgres (Docker) + echtem OpenRouter-Key: Start-Turn → 3 Rückfragen →
  `ready_to_plan: true` (Marker leakt nicht) → `POST /trips/plan` erzeugt Plan „Tirol, Österreich",
  14.–21.09.2026, Budget 1500 €, 23 Items → `GET /trips/{id}` liefert Plan inkl. Items, 404 korrekt.
- Vite-Dev-Proxy: Chat-Turn über `http://localhost:5173/api/v1/chat` erfolgreich.

## [2026-07-14] — Initiales Code-Skelett (Backend, Frontend, Docker, Open WebUI)

**Typ:** Feature
**Betroffen:** `backend/`, `frontend/`, `openwebui/`, `docker-compose.yml`, `.env.example`
**Architektur geändert:** nein (Skelett folgt exakt der in `ARCHITECTURE.md` v1.0.0 festgelegten Struktur)

### Was
- `backend/app/`: `main.py` (App-Factory, CORS, Router-Include), `config.py` (Pydantic Settings),
  `core/` (`deps.py`, `security.py`, `logging.py`), `models/` (SQLAlchemy: `User`, `Conversation`,
  `TripPlan`, `TripItem` inkl. `session.py` für Engine/Session-Factory), `schemas/` (`chat.py`,
  `trip.py`, `search.py`), `services/` (`openrouter.py` mit Retry/Timeout/Fehler-Mapping,
  `planner.py` für Clarify-Loop + Plan-Komposition, `travel_api.py` als Adapter-Platzhalter für
  Amadeus/Booking/GetYourGuide, `prompts/clarify.md` + `prompts/compose.md`), `api/v1/` (`health`,
  `chat`, `trips`, `search`, `router.py`-Aggregat), `tests/test_health.py`, `requirements.txt`.
- `frontend/`: Vite + React 18 + TypeScript (strict) + Tailwind, `styles/tokens.css` +
  `tailwind.config.js` mit den 5 Farb-Tokens, `api/client.ts` (Axios) + `api/chat.ts` + `api/trips.ts`,
  `hooks/useChat.ts` + `useTripPlan.ts` + `useKeywords.ts` (TanStack Query, kein Redux),
  `components/ChatWindow.tsx` + `KeywordPills.tsx` + `TripCard.tsx`, `pages/PlannerPage.tsx`, `App.tsx`.
- `docker-compose.yml`: Services `db` (postgres:16), `backend`, `frontend`, `openwebui` im Netzwerk
  `planmigo-net`; je ein `Dockerfile` für `backend/` und `frontend/`.
- `openwebui/pipelines/planmigo_pipeline.py`: leitet Chat-Turns an `POST /api/v1/chat` weiter, kein
  direkter OpenRouter-Zugriff aus Open WebUI.
- `.env.example` um `POSTGRES_*` und Travel-API-Platzhalter (`AMADEUS_*`, `BOOKING_AFFILIATE_KEY`,
  `GETYOURGUIDE_API_KEY`) sowie `VITE_API_URL` ergänzt.
- `.gitignore` angelegt.

### Warum
- Umsetzung des in `ARCHITECTURE.md` beschriebenen Skeletts, damit ab sofort Feature-Arbeit auf
  einer lauffähigen Basis stattfinden kann statt auf reiner Doku.

### Auswirkungen
- Neue Dependencies: Backend — `fastapi`, `uvicorn`, `pydantic`/`pydantic-settings`,
  `sqlalchemy[asyncio]`, `asyncpg`, `httpx`, `python-jose`, `pytest`/`pytest-asyncio`. Frontend —
  `react`, `react-dom`, `@tanstack/react-query`, `axios`, `vite`, `typescript`, `tailwindcss` (+
  Dev-Tooling). Grund: Umsetzung der in `ARCHITECTURE.md` §3/§4 festgelegten Stacks.
- Neue Env-Vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `VITE_API_URL`,
  `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`, `BOOKING_AFFILIATE_KEY`, `GETYOURGUIDE_API_KEY`.
- Migrationen: keine (Tabellen werden aktuell nicht per Alembic verwaltet — `models/` definiert das
  Schema, Migrations-Tooling ist ein offener Punkt).
- Breaking: nein.

### Verifiziert
- Backend: `pip install -r requirements.txt`, App-Import + Routenliste, `pytest` (1 Test grün).
- Frontend: `npm install`, `tsc -b` (typecheckt sauber), `vite build` (Produktionsbuild erfolgreich).
- `docker compose config` validiert fehlerfrei.

### Offene Punkte
- [ ] Alembic-Migrationen für `models/` einführen
- [ ] Amadeus/Booking/GetYourGuide-Adapter in `travel_api.py` implementieren (aktuell Platzhalter)
- [ ] Auth-Flow (`get_current_user()` in `core/deps.py`) — aktuell nicht verdrahtet
- [ ] Frontend-Tests (Vitest/RTL) ergänzen
- [ ] Open-WebUI-Pipeline gegen echte Open-WebUI-Instanz end-to-end testen

## [2026-07-14] — Projekt-Setup & Dokumentationsgrundlage

**Typ:** Docs
**Betroffen:** `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.0.0, initial)

### Was
- `README.md` angelegt: Projektüberblick, Farbpalette, Tech-Stack, Setup, API-Übersicht, Roadmap.
- `ARCHITECTURE.md` angelegt (v1.0.0): Systemdiagramm, 8 verbindliche Prinzipien, Backend-/Frontend-
  Ordnerstruktur, OpenRouter-Vertrag, Datenmodell, Open-WebUI-Kopplung, Planungs-Flow, Nicht-Ziele.
- `CLAUDE.md` angelegt: Arbeitsregeln für KI-Sessions + dieses Protokoll.

### Warum
- Festlegung des Stacks: **FastAPI** (Backend), **React** (Frontend), **OpenRouter** (LLM-Bezug),
  **Open WebUI** (Host-/Chat-Oberfläche).
- Zwei Dateien (`ARCHITECTURE.md` + `CLAUDE.md`) sollen bei jedem KI-Prompt referenziert und
  automatisch fortgeschrieben werden, damit Architekturentscheidungen nicht verloren gehen.

### Auswirkungen
- Neue Dependencies: keine (nur Doku).
- Neue Env-Vars: `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL`,
  `OPENROUTER_APP_NAME`, `OPENROUTER_SITE_URL`, `DATABASE_URL`, `CORS_ORIGINS`, `SECRET_KEY`,
  `OPENWEBUI_PORT`, `WEBUI_SECRET_KEY`.
- Migrationen: keine.
- Breaking: nein.

### Offene Punkte
- [ ] `backend/app/` Skelett anlegen (main, config, api/v1, services)
- [ ] `services/openrouter.py` implementieren (Retry, Timeout, Fehler-Mapping)
- [ ] `frontend/` mit Vite + Tailwind + `tokens.css` initialisieren
- [ ] `docker-compose.yml` mit db · backend · frontend · openwebui
- [ ] Open-WebUI-Pipeline `planmigo_pipeline.py`