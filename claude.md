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
| 1 | **Farben:** nur `#C9603A`, `#7B9D6F`, `#5C7A52`, `#D8C9A8`, `#FAF6F1`. Immer über Tokens, nie hartcodiert. |
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