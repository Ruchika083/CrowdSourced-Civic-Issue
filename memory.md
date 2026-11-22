# Project memory

## Product intent & audience

- Civic Talk: civic issue reporting and resolution platform connecting citizens with municipal officials.
- Two user types: citizens (report/track issues) and officials (review/act on complaints).
- Demo-grade app: real DB persistence for complaints, but login is simulated (not real authentication yet).

## Brand personality & voice

- Public-service, transparent, trustworthy; clear plain-language messaging over jargon.
- Status communication is explicit and human-readable (timeline entries with reason, level, date).

## Visual design & UX direction

- Stack: Vite + React + JSX + Tailwind CSS; icons from `lucide-react`; imports via `@/` alias to `src/`.
- Avoid extra UI/icon packages unless absolutely necessary.
- Maps via Leaflet; must handle lazy load and resize when its tab becomes visible (fix for earlier blank-map bug).
- Indicators: ✓ resolved, ○ under consideration, 🚩 unsolved; used in both citizen and official views.
- Official table includes search and indicator filters.
- Forms validate inputs (email/phone, image size/type) and surface inline messages; alerts and raw HTML injection are avoided.
- Voice flow UX: choose language → record → preserve original transcript → show labelled machine translation → review/correct both → feed into standard complaint form. On free-tier translation failure, keep original text and show a clear message.

## Decisions, constraints & rationale

- Four-level escalation hierarchy: Ward → Zone → City → IAS.
- Department routing is derived from issue type.
- Five official actions: Resolve, Time Escalation, Budget Escalation, Not Possible, Escalate.
  - "Not Possible" requires an explanation.
  - Time/Budget escalations record reason and proposed deadline.
- Complaint history is a permanent chronological timeline (every decision: reason, level, date, extended deadline if any) — never overwritten.
- Overdue complaints auto-escalate by rule (checked on app load).
- Persistence: complaints and full history stored in real DB (survives reload).
- Translation uses free public services with no API keys; graceful degradation when rate-limited; no paid APIs introduced.
- `.bolt/prompt` holds authoritative global instructions (referenced, not restated here).

## Open questions & assumptions

- Real authentication/accounts not yet implemented — current login is simulated.
- Voice typing requires Chrome/Edge; Firefox lacks speech recognition (platform limitation).
- Free translation services may rate-limit; behavior degrades gracefully but reliability is not guaranteed.
- App is positioned as a demo until real accounts and production auth are added.