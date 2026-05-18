# Realtor HQ — Eduardo Inoa's Real Estate Command Center

A full-stack progressive web app (PWA) designed specifically for Eduardo Inoa's real estate business. Built with Next.js 14, Supabase, Claude AI, and Follow Boss integration.

## Features

✨ **Real Estate Specific**
- Real-time lead pipeline with FUB sync
- Commission calculator with exact split logic (own leads, company, Zillow)
- KPI tracking tied to Eduardo's specific targets
- MLO income tracking and licensing progress
- Action plan templates for lead follow-up sequences

🤖 **AI Coaching**
- Claude-powered AI coach with system prompt trained on Eduardo's business model
- Draft text messages, emails, and Instagram content
- Pipeline review and weekly coaching
- Context-aware financial advice

📱 **Mobile First**
- Installable PWA (works offline)
- Bottom navigation on mobile, sidebar on desktop
- Touch-optimized interface
- Service worker for caching and background sync

🔄 **CRM Integration**
- Real-time sync with Follow Boss (FUB) API
- Auto-populate leads, appointments, activity logs
- Manual entry fallback when API unavailable

⚡ **Time-Aware Workflow**
- "Now Zone" widget shows what to do RIGHT NOW based on time (1pm–6pm workflow)
- Automated reminders and notifications
- Daily streak counter for motivation

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (magic links)
- **AI**: Anthropic Claude (Haiku for speed, Sonnet for deep analysis)
- **CRM**: Follow Boss API proxy
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **PWA**: next-pwa
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Hosting**: Vercel (free)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/eduardoinoa18/realtor-hq.git
cd realtor-hq
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your API keys:

```bash
cp .env.local.example .env.local
```

You'll need:
- **Supabase**: Project URL and Anon Key
- **Supabase Service Role Key**: Required for server-generated instant access links
- **Follow Boss**: API key (from Admin → API)
- **Claude**: Anthropic API key
- **Web Push**: VAPID keys

### 4. Set Up Supabase Database

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and paste the schema from `supabase/migrations/001_initial.sql`
3. Copy your project URL and Anon Key into `.env.local`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Directory Structure

```
app/
├── (auth)/login          ← Magic link authentication
├── (dashboard)/          ← Main app shell
│   ├── today/            ← Daily workflow hub (PRIORITY)
│   ├── pipeline/         ← Lead management
│   ├── kpis/             ← Weekly scorecard
│   ├── calculator/       ← Commission projector
│   ├── ai/               ← Claude coach
│   ├── team/             ← Professionals directory
│   ├── mlo/              ← MLO tracking
│   ├── plans/            ← Action templates
│   └── settings/         ← Configuration
├── api/
│   ├── fub/              ← Follow Boss proxy
│   ├── ai/               ← Claude proxy
│   └── push/             ← Web push notifications
lib/
├── supabase/             ← Supabase clients
├── constants.ts          ← Eduardo's business data
├── claude.ts             ← Claude system prompt
├── fub.ts                ← FUB API helpers
└── utils.ts              ← Utilities (currency, commission calc)
components/
├── dashboard/            ← Page-specific components
├── ui/                   ← shadcn components
└── providers/            ← Context providers
```

## Key Features Deep Dive

### NowZone Widget
The "Now Zone" widget shows Eduardo what to focus on RIGHT NOW based on the time of day:
- 1:00–1:30pm: Respond to new leads
- 1:30–3:00pm: Power calls
- 3:00–3:30pm: Follow-up in writing
- 3:30–4:30pm: Showings/appointments
- 4:30–5:00pm: Update pipeline
- 5:00–5:30pm: Social + content
- 5:30–5:45pm: Set tomorrow's priorities
- 5:45–6:00pm: Wrap up

Outside 1–6pm: Rest prompt with tomorrow's top priority

### Commission Calculator
The calculator enforces Eduardo's exact split structure:
- **Own Lead**: 70% → 10% franchise fee → net ~$5,040 on $400k deal
- **Company Lead**: 50% → 10% franchise fee → net ~$3,600
- **Zillow Flex**: 35% to Zillow → 50% split → 10% franchise fee → net ~$2,300

The key insight: 1 own lead ≈ 2+ Zillow deals in net value

### AI Coaching Prompts
- **Coaching**: Direct action advice based on current situation
- **Pipeline Review**: Top 3 leads to close this month
- **Weekly Review**: KPI analysis + next week's actions
- **Draft Text/Email**: Sales messages optimized for warm, natural tone
- **Instagram Reel**: Social media content with hashtags and CTA
- **Action Plan**: 14-day structured follow-up sequence

### FUB Sync
Automatically pulls from Follow Boss:
- Only leads assigned to Eduardo Inoa by default (people endpoint, paginated)
- Communication activity scoped to assigned leads (calls, texts, emails)
- Assigned events, appointments, and tasks only

Results cached for 5 minutes to avoid API hammering.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions.

**TL;DR:**
1. Push to GitHub
2. Create Vercel project, import repo
3. Add environment variables
4. Deploy (automatic on every push)

## Database Schema

Key tables:
- `leads` — Pipeline leads (from FUB or manual)
- `tasks` — Daily to-do list
- `kpis` — Weekly KPI tracking
- `closings` — Monthly closing record
- `appointments` — Calendar events
- `ai_conversations` — Conversation history
- `message_templates` — Preset sales texts/emails
- `professionals` — Lender, inspector, attorney directory
- `mlo_steps` — MLO licensing checklist
- `settings` — User config + API keys

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_INSTANT_ACCESS_EMAILS=eduardoinoa18@gmail.com

FUB_API_KEY=
FUB_ASSIGNED_USER_NAME=Eduardo Inoa
FUB_ASSIGNED_USER_ID=
DASHBOARD_AUTH_PIN=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN_EDUARDO=
NEXT_PUBLIC_SITE_URL=https://realtor-dashboard-neon.vercel.app

ANTHROPIC_API_KEY=

EMAIL_IMAP_HOST=
EMAIL_IMAP_PORT=993
EMAIL_IMAP_SECURE=true
EMAIL_IMAP_USER=
EMAIL_IMAP_PASS=
EMAIL_IMAP_MAILBOX=INBOX

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=mailto:eduardoinoa18@gmail.com
```

### Integration Notes

- FUB diagnostics: open Settings and use Integration Health to confirm scope mode and assigned lead counts.
- Explicit FUB routes now available: `/api/fub-events`, `/api/fub-appts`, `/api/fub-notes`, `/api/fub-tasks`, `/api/fub-deals`, `/api/fub-stages`, `/api/fub-sources`.
- Google Calendar sync uses either profile Google Calendar ID or a public ICS URL.
- Google OAuth/Gmail/Calendar setup: see `SETUP_GOOGLE.md`.
- IMAP inbox AI review requires all EMAIL_IMAP_* variables; validate in Settings -> Email AI Integration.

## Contributing

This is Eduardo's personal app, but feel free to open issues or PRs for improvements.

## License

Private. Built for Eduardo Inoa.

---

**Questions?** Check the documentation or reach out via [Instagram @eduardoinoa_](https://www.instagram.com/eduardoinoa_)
