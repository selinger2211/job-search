# Job Search Command Center

A self-contained, privacy-first job search tracker built with vanilla HTML, CSS, and JavaScript. No backend, no accounts, no data leaves your browser.

Live demo → [selinger2211.github.io/job-search](https://selinger2211.github.io/job-search/)

---

## Why I built this

Most job search tools are either too lightweight (a spreadsheet) or too heavy (a full SaaS with logins and sync). I wanted something in between: a polished, opinionated workflow tool that lives entirely in the browser, runs offline, and keeps all data 100% private.

The goal is a single-page command center that handles every stage of the search — from target list to offer negotiation — without ever sending your data to someone else's server.

---

## Current features (V1.0)

### Pipeline board
Drag-and-drop kanban across six stages: **Tracking → Outreach → Applied → Phone Screen → Interview → Offer**. Each card tracks stage history with timestamps so you can see how long a role has been sitting at any stage.

### Contact & outreach log
Log every touchpoint per role — date, method (email, LinkedIn, other), and whether the contact was a cold reach or a referral. Applications are also tracked in the same log so the full history of a role is in one place.

### Company tier list
Organize target companies into four tiers with drag-and-drop reordering. Used to generate daily action nudges and job board sweep reminders.

### Daily action panel
Auto-generates a prioritized to-do list each day based on the day of the week, which roles have gone stale, and which network nudges are due — so you always know exactly what to work on.

### AI-powered research briefs  *(requires Anthropic API key)*
One-click generation of a structured interview prep brief for any role. Streams in real time via the Anthropic API and covers:

- Company snapshot & business model
- Role breakdown & key requirements
- Product & competitive landscape
- Likely tough questions with suggested framings
- Interviewer background (if names provided)
- A tailored "tell me about yourself" opener
- Resume customization notes
- Smart questions to ask them

Research briefs are generated on-demand, saved locally, and tracked in a "Recent Research Briefs" section for easy access. They are excluded from this repo via `.gitignore` to keep interview prep notes private.

---

## Roadmap

### V1.1 — Stability & data safety
- **Export / import** — one-click JSON backup and restore so you never lose data
- **Archived / rejected stage** — move roles out of the active pipeline without deleting history
- **Analytics dashboard** — funnel conversion rates, average time per stage, activity streaks
- **Follow-up reminders** — configurable alerts when a role or contact goes stale
- **Mobile responsiveness** — usable layout on phones and tablets

### V2.0 — Company workspace & deep prep

- **Company workspace** — a per-company folder view that collects the research brief, tailored resume, outreach history, and interview notes in one place, with a dashboard card for quick navigation
- **Deep research mode** — extended AI research triggered at the screening stage, covering 10-K filings, earnings calls, Glassdoor sentiment, leadership changes, competitive threats, and more
- **Auto resume tailoring** — paste a JD and get two outputs: a quick-tailor markup showing exactly what to change, and a full rewrite with rephrased bullets, reordered sections, and a custom summary — both stored in the company workspace
- **Interview prep deck (PPTX)** — auto-generated slide deck from the research brief with company overview, role breakdown, key talking points, and a "questions to ask" closing slide

### V3.0 — Intelligence layer

- **Google Calendar & Gmail integration** — auto-detect interview invites and recruiter threads, surface them in the pipeline, and offer one-click deep research when a screening is scheduled
- **Smart stage suggestions** — prompt to advance a role when outreach gets a reply or an interview lands on the calendar
- **Weekly digest** — automated summary of pipeline movement, stale roles, and suggested next actions

---

## Setup

**No installation required.** Open `index.html` in any modern browser, or fork and deploy to GitHub Pages for HTTPS support (required for the AI research feature).

### Quick start

1. **Try it now** — visit the [live demo](https://selinger2211.github.io/job-search/) (your data stays in your browser)
2. **Self-host** — fork this repo and enable GitHub Pages, or open `index.html` locally
3. **Customize** — edit the constants at the top of `index.html` (see Customization below)

### AI research briefs (optional)

1. Deploy to GitHub Pages (or any HTTPS host)
2. Click **Research** in the dashboard header
3. Paste your [Anthropic API key](https://console.anthropic.com/) when prompted — it's stored only in your browser's localStorage
4. Enter a company name, role title, and optionally a JD URL and interviewer names
5. The brief streams in real-time and is saved for future reference

---

## Privacy model

All data — roles, companies, contacts, API key — is stored exclusively in `localStorage` in your browser. Nothing is ever sent to a server except Anthropic API calls when you explicitly generate a research brief. The API key is sent only to `api.anthropic.com` and nowhere else.

Forking and self-hosting means the entire data flow can be audited end-to-end. There are no analytics, no tracking pixels, no third-party scripts.

---

## Tech

- Vanilla HTML / CSS / JavaScript — zero dependencies, zero build step
- Single-file architecture — everything in one `index.html`
- HTML5 Drag and Drop API
- Anthropic Messages API with server-sent events (SSE) streaming
- localStorage for persistence with schema migration support

---

## Customization

Edit the following constants at the top of `index.html` to tailor the tool to your search:

| Constant | What it controls |
|---|---|
| `DEFAULT_COMPANIES` | Your starting company tier list |
| `NETWORK_NUDGES` | Daily networking reminders |
| `CHECK_ITEMS` | Your personal "should I apply?" checklist |

---

## Contributing

This is a personal project but contributions are welcome. The single-file architecture keeps things simple — everything lives in `index.html`. If you're adding a feature, try to keep it self-contained and privacy-first.

---

## License

MIT — fork it, adapt it, make it yours.
