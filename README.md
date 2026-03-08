# Job Search Dashboard

A self-contained, privacy-first job search tracker built with vanilla HTML, CSS, and JavaScript. No backend, no accounts, no data leaves your browser.

Live demo → [selinger2211.github.io/job-search](https://selinger2211.github.io/job-search/)

---

## Why I built this

Most job search tools are either too lightweight (a spreadsheet) or too heavy (a full SaaS with logins and sync). I wanted something in between: a polished, opinionated workflow tool that lives entirely in the browser, runs offline, and keeps all data 100% private.

---

## Features

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

Research briefs are generated on-demand and saved locally. They are excluded from this repo via `.gitignore` to keep interview prep notes private.

---

## Setup

**No installation required.** Open `index.html` in any modern browser, or fork and deploy to GitHub Pages for HTTPS support (required for the AI research feature).

### AI research briefs (optional)
1. Deploy to GitHub Pages (or any HTTPS host)
2. Click **🔬 Research** in the dashboard header
3. Paste your [Anthropic API key](https://console.anthropic.com/) when prompted — it's stored only in your browser's localStorage

---

## Privacy model

All data — roles, companies, contacts, API key — is stored exclusively in `localStorage` in your browser. Nothing is ever sent to a server except Anthropic API calls when you explicitly generate a research brief. Forking and self-hosting means even that can be audited end-to-end.

---

## Tech

- Vanilla HTML / CSS / JavaScript — zero dependencies, zero build step
- HTML5 Drag and Drop API
- Anthropic Messages API with server-sent events (SSE) streaming
- localStorage for persistence with schema migration support

---

## Customization

Edit the following constants at the top of `index.html` to tailor the tool to your search:

| Constant | What it controls |
|---|---|
| `DEFAULT_COMPANIES` | Your starting tier list |
| `NETWORK_NUDGES` | Daily networking reminders |
| `CHECK_ITEMS` | Your personal "should I apply?" checklist |

---

## License

MIT — fork it, adapt it, make it yours.
