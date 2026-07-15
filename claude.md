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

## [2026-07-15] — Auth-Flow: Registrierung, Login, eigene Reisen-Liste + Alembic

**Typ:** Feature
**Betroffen:** `backend/alembic{,.ini}` (neu), `backend/app/{main,config}.py`,
`backend/app/core/{security,deps}.py`, `backend/app/models/user.py`,
`backend/app/schemas/auth.py` (neu), `backend/app/api/v1/{auth(neu),chat,trips,router}.py`,
`backend/app/services/planner.py`, `backend/tests/{test_auth(neu),test_chat}.py`,
`backend/requirements.txt`, `frontend/src/api/{client,auth(neu),trips}.ts`,
`frontend/src/hooks/{useAuth(neu),useTripPlan,usePlannerSession,useSettings}.ts`,
`frontend/src/types/auth.ts` (neu), `frontend/src/pages/{ProfilePage,TripsPage,SettingsPage}.tsx`,
`frontend/src/App.tsx`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.6.0)

### Was
- **Alembic eingeführt:** `backend/alembic/` (async env.py, URL aus `Settings` — nie hartcodiert),
  Baseline-Migration `0001` (idempotent: `create_all(checkfirst)` für frische DBs **plus**
  Spalten-Check für DBs, die noch vom alten `create_all`-Startup stammen). Der Lifespan führt
  jetzt `alembic upgrade head` aus (in `asyncio.to_thread`, da env.py einen eigenen Loop fährt)
  statt `Base.metadata.create_all` — damit ist der Alembic-Punkt aus dem Skelett-Eintrag erledigt.
- **Backend-Auth:** `users.password_hash` (bcrypt; nullable für Alt-Zeilen),
  `POST /auth/register` (201; 409 bei doppelter E-Mail, E-Mail lowercased),
  `POST /auth/login` (401 mit identischer Meldung für unbekannte E-Mail/falsches Passwort —
  keine Account-Enumeration), `GET /auth/me`. JWT über bestehendes `core/security.py`
  (HS256, `SECRET_KEY`, 24 h, `sub` = User-ID). Neue Dependencies `CurrentUser` (401-Pflicht)
  und `OptionalUser` (Gast erlaubt) in `core/deps.py` via `HTTPBearer(auto_error=False)`.
- **Ownership:** `/chat` und `/trips/plan` laufen mit `OptionalUser` — Gäste können weiterhin
  ohne Konto planen. Neue Conversations bekommen die User-ID; eine Gast-Conversation wird beim
  nächsten Turn nach Login geclaimt. Fremde Conversations/Pläne → 404
  (`planner.ConversationAccessError`). Neu: `GET /trips` (Auth-Pflicht) listet die Pläne des
  Users (Join über `conversations.user_id`, neueste zuerst).
- **Frontend-Auth:** JWT in `localStorage["pm_token"]`, Axios-Request-Interceptor in
  `api/client.ts`; `useAuth`-Hook (App-Ebene) mit `login/register/logout` + `GET /auth/me`
  beim Start (ungültiger Token wird verworfen). `ProfilePage`: Anmelde-/Registrierformular
  für Gäste (deutsche Fehlermeldungen für 401/409/422), eingeloggt Konto-Karte mit E-Mail,
  „Mitglied seit", Statistiken (Server-Zahl) und Abmelden. `TripsPage`: mischt `GET /trips`
  (via `useMyTrips`, TanStack Query) mit Sitzungs-Plänen von Gästen; Hinweistexte je nach
  Login-Status. Nach Plan-Erstellung wird `["my-trips"]` invalidiert. „Lokale Daten
  zurücksetzen" entfernt auch den Token und meldet ab.

### Warum
- Nutzeranfrage: „wie kann man eine Datenbank einstellen, dass man sich einloggen kann und
  einen neuen Kunden anlegen kann" → Umsetzung des vorgeschlagenen Pakets (Alembic → Auth-
  Endpoints → get_current_user/GET /trips → Frontend). Reisepläne überleben damit erstmals
  einen Reload — der größte offene Punkt der Web-App-Shell.

### Auswirkungen
- Neue Dependencies (Backend): `alembic` (Migrations-Tooling, ersetzt create_all-Startup),
  `bcrypt` (Passwort-Hashing; direkt statt passlib — eine Abhängigkeit weniger),
  `email-validator` (für Pydantics `EmailStr` in den Auth-Schemas). Frontend: keine.
- Neue Env-Vars: keine (`SECRET_KEY` existierte bereits; in Produktion zwingend ändern).
- Migrationen: `0001_initial_schema_and_password_hash` (läuft automatisch beim Backend-Start).
- Breaking: nein — Chat/Planung funktionieren unverändert ohne Konto; `TripsPage`/`ProfilePage`
  haben neue Props (`sessionPlans`/`auth`).

### Verifiziert
- `pytest` im Backend-Container: **16/16 grün** (10 Bestand + 6 neue Auth-Tests: Register/Login/
  Me-Roundtrip, 409-Duplikat, 401-Falschpasswort, 422-Kurzpasswort, 401 ohne Token für
  `/auth/me` und `GET /trips`). Die Auth-Tests laufen gegen die echte Postgres (Skip ohne DB);
  Engine wird nach jedem Test disposed (pytest-asyncio: ein Loop pro Test).
- Migration auf der **bestehenden** DB verifiziert: Log `Running upgrade  -> 0001`, `\d users`
  zeigt `password_hash`; Health 200.
- API-Smoke per curl: register 201 → login → me → `GET /trips` `[]` → falsches Passwort 401 →
  `GET /trips` ohne Token 401.
- `tsc -b` + `vite build` fehlerfrei.
- Playwright-E2E gegen den Docker-Stack: Registrieren über das Profil → eingeloggt nach
  Reload → Chat als eingeloggter User bis zum fertigen Reiseplan → **harter Reload → Plan
  erscheint weiterhin unter „Gebuchte Reisen" (Server-Liste)** → Abmelden → erneutes Anmelden →
  falsches Passwort zeigt deutsche Fehlermeldung. Keine Page-Errors.

### Offen
- [ ] Token-Ablauf (24 h) führt clientseitig nur zu stillem Logout beim nächsten `/auth/me` —
  kein Refresh-Token-Flow.
- [ ] Gast-Pläne, die **vor** einem Login erstellt wurden, werden nicht nachträglich dem Konto
  zugeordnet (nur laufende Conversations werden geclaimt).
- [ ] E-Mail-Verifikation / Passwort-Reset fehlen (bewusst außerhalb des MVP-Schnitts).

## [2026-07-15] — Web-App-Shell: Sidebar + 6 Screens (Design-Export „app.html")

**Typ:** Feature | Breaking
**Betroffen:** `frontend/src/App.tsx`, `frontend/src/components/{Sidebar(neu),Chat,ChatWindow}.tsx`,
`frontend/src/pages/{StartPage,ChatPage,SearchPage,TripsPage,ProfilePage,SettingsPage}.tsx` (alle neu),
`frontend/src/hooks/{usePlannerSession,useSettings}.ts` (neu), `frontend/src/types/navigation.ts` (neu),
gelöscht: `pages/PlannerPage.tsx`, `components/KeywordPills.tsx`, `hooks/useKeywords.ts`
**Architektur geändert:** ja (→ ARCHITECTURE.md v1.5.0)

### Was
- Frontend vollständig auf den vom Nutzer gelieferten Design-Export „Web-App" (`app.html`)
  umgebaut: **linke Sidebar** (weiß, sticky, 240 px; unter `lg` 76-px-Icon-Rail) mit Logo (→ Start),
  Navigation Suche / Gebuchte Reisen / Profil / Einstellungen (aktiv = Sage-Pill) und
  „Chat starten"-CTA (Orange). Screen-Umschaltung über State in `App.tsx`, aktiver Screen
  persistiert in `localStorage["pm_web_screen"]` (wie im Export) — kein Router, keine neue Dependency.
- **Sechs Screens** (`pages/`), an die reale Backend-Funktionalität angepasst statt statischer Mockups:
  - `StartPage`: Hero mit Freitext-Promptbox (Enter/Senden startet den Chat mit dem Text als
    erstem User-Turn — der Backend-Vertrag erlaubt das bereits), Vorschlags-Chips, Deko-Kreise
    aus Token-Farben statt der nicht vorhandenen Bali-Fotos, Gradient `creamWarm→cream`.
  - `ChatPage`: zentrierte Spalte (max. 760 px), `Bubble`-Kette, Fehler-/Lade-Karten, `TripCard`
    inline nach Plan-Erstellung + „Zu deinen Reisen →", sticky `Composer`; ohne Session ein
    Empty-State („Wovon träumst du?") mit Composer und Beispiel-Chips. „＋ Neue Reise" resettet.
  - `SearchPage`: Suchfeld + Multi-Select-Chips → startet den Chat mit den gewählten Keywords
    (statt des statischen Bali-Fake-Ergebnisses aus dem Export — es gibt keinen Such-Endpoint).
  - `TripsPage`: Reisepläne der Sitzung als Karten („Entwurf"-Badge, aufklappbare `TripCard`),
    Empty-State mit Chat-CTA; Hinweis, dass Buchung/Persistenz mit dem Konto-System folgen.
  - `ProfilePage`: Gast-Platzhalter (Auth folgt) + echte Sitzungs-Statistiken (geplante Reisen,
    aktive Planung) statt des fiktiven „Alex Krüger"-Profils.
  - `SettingsPage`: Toggles/Selects funktional, persistiert in `localStorage["pm_settings"]`
    (`useSettings`); „Konto löschen" aus dem Export ersetzt durch ehrliches
    „Lokale Daten zurücksetzen" (mit Confirm). Klartext-Hinweis, dass alles nur lokal gespeichert wird.
- **Session-State hochgezogen:** Chat-Logik aus `PlannerPage` in den Hook `usePlannerSession`
  (App-Ebene) extrahiert — die Session überlebt Screen-Wechsel; fertige Pläne werden clientseitig
  für `TripsPage`/`ProfilePage` gesammelt.
- **Primitives ans Design angepasst:** Nutzer-`Bubble` jetzt Sage mit weißem Text (statt
  Terrakotta), Ecken 18/4 px wie im Export; `Composer`-Send-Button Sage mit `greenDark`-Hover;
  `Chip` mit Sage-Aktivzustand. `Nav`, `ChatLayout`, `TripPanel` (Topbar-Shell aus v1.4) entfernt.
- Bugfix während der Verifikation: Settings-Toggle nutzte `h-7` — durch die Spacing-Tokens sind
  das 48 px statt 28 px → explizit `h-[28px] w-[48px]`.

### Warum
- Nutzer hat den neuen Design-Export „Web-App" (Sidebar-Shell mit Start/Suche/Reisen/Profil/
  Einstellungen/Chat) geliefert mit der Vorgabe, ihn vollständig und **nutzbar** umzusetzen.
  Statische Mockup-Inhalte (Fake-Suchtreffer, fiktives Profil, gebuchte Bali-Reise) wurden auf
  die tatsächlich vorhandene Backend-Funktionalität abgebildet, statt tote UI auszuliefern.

### Auswirkungen
- Neue Dependencies: keine (Icons weiterhin `lucide-react`, Navigation ohne Router).
- Neue Env-Vars: keine. (`.env` fehlte im Repo und wurde lokal aus `.env.example` neu erzeugt —
  der frühere echte OpenRouter-Key ist nicht mehr vorhanden; für echte LLM-Antworten ggf. Key
  eintragen.)
- Migrationen: keine.
- Breaking: Topbar-`Nav`/`ChatLayout`-Shell und `KeywordPills`/`useKeywords` entfernt; Keyword-
  Pill-Eingabe auf der Startseite durch Freitext-Promptbox ersetzt (Keywords laufen jetzt über
  die Suche). `localStorage`-Keys `pm_web_screen`/`pm_settings` neu.

### Verifiziert
- `tsc -b` + `vite build`: fehlerfrei (Node 24 jetzt lokal installiert).
- `docker compose up -d --build db backend frontend`: alle Container up, Health `200`.
- Playwright (lokal, Chromium) gegen den Docker-Stack — Navigations-Suite: Start-Hero →
  Suche (Query „Bali" + Chips Strand/Kultur → „Mit PlanMigo planen") → Chat mit Keyword-Pills
  und echter Migo-Antwort → „＋ Neue Reise" → Chat-Empty-State → Reisen-Empty-State → Profil →
  Einstellungen (Toggle umschalten, Reload: Setting **und** aktiver Screen persistiert) →
  Start-Promptbox startet Chat mit User-Bubble → 900-px-Viewport zeigt Icon-Rail.
  Keine Console-/Page-Errors.
- Kern-Flow-Suite end-to-end grün: Start-Promptbox („Eine Woche Strand und Kultur auf Bali für
  1.500 €") → 5 Clarify-Turns mit echten Migo-Antworten → Plan-Compose → `TripCard` „Bali,
  Indonesien" (01.–07.09.2026, 16 Items, 7-Tage-Timeline) inline im Chat → „Zu deinen Reisen" →
  Plan in `TripsPage` als Entwurfs-Karte aufklappbar. Keine Page-Errors.
  (Bemerkenswert: OpenRouter antwortete mit dem Beispiel-Key aus `.env.example` mit 200 —
  vermutlich Free-Tier des Modells; für den Produktivbetrieb trotzdem echten Key setzen.)

### Offen
- [ ] Sprache/Währung in den Einstellungen werden gespeichert, aber noch nicht angewendet
  (Backend antwortet Deutsch, Preise EUR) — bei Bedarf an Backend/`TripCard` anbinden.
- [ ] `TripsPage`/`ProfilePage` zeigen nur Sitzungsdaten — `GET /conversations`/`GET /trips`-
  Listing-Endpoints + Persistenz über Reload hinaus fehlen weiterhin.

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