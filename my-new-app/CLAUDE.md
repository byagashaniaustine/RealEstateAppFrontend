
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DalaliKiganjani** — a React Native (Expo) mobile app for a Tanzanian real estate marketplace. Clients browse and book property visits; agents manage their listings. The backend is a FastAPI server connected to Supabase.

The repository root is `/newMobileApp/`, containing two sub-projects:
- `my-new-app/` — the Expo/React Native frontend
- `backend/` — the FastAPI Python backend

## Commands

### Frontend (`my-new-app/`)
```bash
npm install
npx expo start
npx expo start --ios
npx expo start --android
npm run lint
```

### Backend (`backend/`)
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8081 --reload
```

## Architecture

### Navigation Flow
`app/app.tsx` → `app/navigations/RootStack.tsx`

Nested navigator pattern:
- `RootStack` (NativeStack) wraps everything; `Splash` is the initial route
- `Main` is a `BottomTabNavigator` with tabs: `Home`, `Properties`, `Agents`
- Stack screens outside tabs: `AgentLogin`, `AgentRegister`, `AgentDashboard`, `ViewProperty`, `AgentProfile`, `AiChat`, `AgentAiChat`

All navigator param types live in `app/type/navigation.tsx` (`RootStackParamList`, `BottomTabParamList`). **Always update this file when adding a new screen.**

### API Connection
Every screen hardcodes `const API_URL = "http://127.0.0.1:8081"`. For physical device testing change this to the machine's LAN IP.

### Backend Structure
- `backend/main.py` — all FastAPI route definitions; no business logic
- `backend/services/supabase.py` — all database and storage logic
- `backend/services/ai_agent.py` — Anthropic Claude agent logic (client AI + agent AI)

**Key Supabase tables:** `agents_dalalikiganjani`, `Properties`, `Bookings`, `negotiations`  
**Storage bucket:** `Nyumba` — agent profile images under `agents/`, property images under `properties/{agent_id}/`

Two Supabase clients:
- `supabase` (anon key) — auth sign-in and user-facing reads
- `supabase_admin` (service key) — bypasses RLS for registration, uploads, admin inserts

### Data Patterns
- Property `image` field is `text[]` — always normalize on the frontend: `Array.isArray(item.image) ? item.image : [item.image]`
- Property statuses: `"available"` | `"booked"` | `"unavailable"`
- All API responses: `{ status: "success" | "failed", data: ..., message?: ... }`
- Agent auth flow: login → Supabase Auth → lookup `agents_dalalikiganjani` by `user_id` → return agent row as `data` → frontend navigates to `AgentDashboard` with `{ agent: data }`

### User Identity
Client users are unauthenticated. Name and phone are stored in `AsyncStorage` under `"dalali_profile"` after first booking and pre-filled on subsequent visits.

### AI Agent System (`backend/services/ai_agent.py`)
Two separate AI flows, both using `claude-sonnet-4-6` with an agentic tool-use loop (max 10 rounds):

**Client AI** (`run_agent`) — endpoint `POST /ai/chat`  
Request: `{ message, user_name?, user_phone?, property_context? }`  
Tools: `search_properties`, `get_property_details`, `book_property_visit`, `get_agents`, `check_property_bookings`, `send_offer`, `get_my_offers`  
If `property_context` is passed (from `ViewProperty`), the AI knows which property the user is viewing.

**Agent AI** (`run_agent_assistant`) — endpoint `POST /ai/agent-chat`  
Request: `{ message, agent_id, agent_name? }`  
Tools: `get_my_properties`, `get_my_negotiations`, `respond_to_offer`, `update_property_status`  
Scoped to the authenticated agent's own data only.

### Negotiation Flow
1. Client sends offer via `AiChat` → AI calls `send_offer` → inserts into `negotiations` table
2. Agent sees offers in `AgentDashboard` "Offers" tab → responds via modal or via `AgentAiChat`
3. Backend routes: `GET /negotiations/agent/{agent_id}`, `PUT /negotiations/{negotiation_id}/respond`
4. `negotiations` table fields: `property_id`, `agent_id`, `client_name`, `client_phone`, `offer_price`, `client_message`, `status` (`pending`|`accepted`|`rejected`|`countered`), `agent_response`

### Screen Responsibilities
| Screen | Purpose |
|---|---|
| `SplashScreen` | App entry, transitions to `Main` |
| `HomeScreen` | Hero + horizontal scrolling previews of properties & agents |
| `PropertiesScreen` | Searchable/filterable 2-column grid of all properties |
| `ViewProperty` | Property detail, image slider, booking modal, visit list |
| `AgentScreen` | Agent login form |
| `Agents` | Agent registration form |
| `AgentsProfileScreen` | Public agent listing (Agents tab) |
| `AgentDashboard` | Agent's listings (add/edit/delete) + Offers tab (view & respond to negotiations) + AI button |
| `AiChat` | Client-facing AI assistant; accepts optional `propertyContext` nav param |
| `AgentAiChat` | Agent-facing AI assistant; requires `agent` nav param `{ id, name }` |
