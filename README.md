# Civic Talk

Civic Talk is a civic-issue reporting and tracking prototype focused on complaints in Visakhapatnam (Vizag). It demonstrates how citizens can report local issues and how officials could review, update, and escalate them through an administrative workflow.

> **Project status:** Demonstration prototype. The interface and workflows have been tested in the Bolt preview. Authentication, role verification, secure evidence storage, and production-grade access control are not implemented.

## Features

### Citizen experience
- Citizen dashboard with complaint counts and a complaint list.
- Report an issue by selecting a category and locality, adding a description, and attaching photo evidence.
- Optional browser GPS selection for issue coordinates, with locality-based sample coordinates as a fallback.
- Voice reporting interface with speech recognition and translation support where the browser and translation service allow it.
- Complaint tracking with status, current administrative level, due date, and recorded event history.
- Visakhapatnam issue map with department-coloured markers.
- FAQ and feedback screens.

### Official experience
- Separate demonstration interface for official roles and departments.
- Complaint review and status updates through the Ward → Zone → City → IAS workflow.
- Department and administrative-level filtering in the interface.
- Complaint event history for recorded actions.

## Tech stack

- React 18 and TypeScript
- Vite
- Tailwind CSS
- Supabase JavaScript client and PostgreSQL
- Leaflet and OpenStreetMap tiles
- Lucide React icons
- Browser media APIs for camera, microphone, geolocation, and speech recognition

## Run locally

### Requirements
- Node.js (a current LTS release is recommended)
- npm
- A Supabase project with the database migration applied

### 1. Clone the repository

```bash
git clone https://github.com/Ruchika083/CrowdSourced-Civic-Issue.git
cd CrowdSourced-Civic-Issue
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Apply the SQL migration in `supabase/migrations/` to your Supabase project. Do not commit your `.env` file or expose service-role keys in frontend code.

**Security warning:** The current demonstration migration permits anonymous reading, inserting, and updating of complaint records. The UI's citizen and official roles are simulated and are not authenticated identities. Do not connect this configuration to real or sensitive citizen complaints.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite.

### Other commands

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Important prototype limitations

- **Authentication:** Login and role selection are simulated in the frontend. They do not verify a person's identity or official designation.
- **Authorization:** Citizen dashboard data is not restricted to complaints owned by the signed-in citizen. The current database policies are intentionally permissive for demonstration and are not suitable for deployment with real complaint data.
- **Evidence storage:** Photo data is currently passed through the application/database flow rather than a properly secured storage bucket. Voice recordings use temporary browser object URLs and are not durable uploads.
- **Voice services:** Speech recognition support varies by browser. Translation depends on external public translation services and may be unavailable or inaccurate.
- **Escalation:** The overdue-check logic is triggered by the application during a session; it is not a scheduled background job or guaranteed daily service.
- **Map data:** Demo complaint coordinates may be sample/locality coordinates. GPS requires browser permission and a secure context.
- **Feedback:** Feedback is shown as a local demo interaction and is not saved to a feedback database.

Before production use, implement Supabase Auth, verified official roles, complaint ownership, restrictive row-level security policies, secure evidence uploads, server-side escalation jobs, and appropriate privacy safeguards.

## Project structure

```text
src/
  components/     React screens and reusable UI components
  lib/            Supabase client and complaint data operations
  App.tsx         Application session and data loading
  main.tsx        React entry point
  types.ts        Shared application types and demo locality data
supabase/
  migrations/     Database schema and policies
```

## Contributions and project work

This is an AI-assisted academic project. My work has focused on shaping the frontend experience and workflows, reviewing and testing the application, checking behaviour in the preview, and coordinating fixes and project structure. AI tools were used during implementation. The project should be understood as a working prototype, not as a production civic-service platform.

## License

No license has been added yet. Unless a license is added, normal copyright restrictions apply to reuse of this repository.
