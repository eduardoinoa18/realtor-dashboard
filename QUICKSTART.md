# Eduardo Inoa — Realtor HQ | Quick Start

## 1. Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Update .env.local with your API keys (see below)

# Start dev server
npm run dev

# Open http://localhost:3000
```

## 2. Get Your API Keys

### Supabase (Database)
1. Go to [supabase.com](https://supabase.com)
2. Create a free project
3. Run the SQL schema from `supabase/migrations/001_initial.sql`
4. Copy your credentials from Settings → API

### Follow Boss (CRM)
1. Log into your FUB account
2. Go to Admin → API
3. Generate a new key and copy it

### Anthropic Claude (AI)
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Copy it (you'll be charged ~$3–5/month based on usage)

## 3. Environment Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Follow Boss
FUB_API_KEY=your-fub-api-key

# Claude
ANTHROPIC_API_KEY=your-anthropic-key

# Web Push (optional - generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public
VAPID_PRIVATE_KEY=your-vapid-private
VAPID_EMAIL=mailto:eduardoinoa18@gmail.com
```

## 4. Project Structure

```
Realtor-Dashboard/
├── app/
│   ├── (auth)/login/          ← Login page
│   ├── (dashboard)/            ← Main app
│   │   ├── today/             ← Daily workflow (PRIORITY)
│   │   ├── pipeline/          ← Leads management
│   │   ├── kpis/              ← Weekly tracking
│   │   ├── calculator/        ← Commission calculator
│   │   ├── ai/                ← AI coach
│   │   ├── team/              ← Professionals
│   │   ├── mlo/               ← MLO tracker
│   │   ├── plans/             ← Action plans
│   │   └── settings/          ← Configuration
│   ├── api/
│   │   ├── fub/               ← Follow Boss proxy
│   │   └── ai/                ← Claude proxy
│   ├── layout.tsx             ← Root layout
│   └── globals.css            ← Global styles
├── components/
│   ├── dashboard/             ← Page components
│   ├── providers/             ← Context providers
│   └── ui/                    ← UI components
├── lib/
│   ├── constants.ts           ← Eduardo's business data
│   ├── claude.ts              ← AI system prompt
│   ├── fub.ts                 ← FUB helpers
│   ├── utils.ts               ← Utilities
│   └── supabase/              ← Supabase clients
├── hooks/                     ← Custom hooks
├── store/                     ← Zustand stores
├── public/                    ← PWA assets
└── supabase/
    └── migrations/            ← Database schema
```

## 5. Key Pages

### /today — Daily Workflow Hub
- NowZone widget (time-aware "what to do RIGHT NOW")
- Task checklist
- Month progress
- Appointments
- Activity log
- Motive card (reminder of why you're doing this)

### /pipeline — Lead Management
- All leads synced from FUB
- Filter by stage
- Lead cards with commission preview
- Add lead form
- Pipeline value calculator

### /calculator — Commission Projector
- Input: sale price, commission %, lead source
- Output: gross → franchise fee → your net
- Monthly projector: mix of own/company/zillow deals
- Goal tracker: "How many of each type to hit $9,500/month?"

### /ai — Claude Coach
- 7 prompt types: draft text/email, coaching, pipeline review, weekly review, Instagram, action plan
- Context-aware responses
- Copy button for easy use

### /kpis — Weekly Scorecard
- Track all 6 KPIs manually or auto-sync from FUB
- Progress bars (red < 50%, amber 50–80%, green > 80%)
- Monthly projection based on current pace
- Streak counter

### /mlo — MLO Tracking
- 10-step licensing checklist
- Hours tracker
- Income calculator based on referral volume
- Why MLO explainer

## 6. Features

✨ **Real Estate Specific**
- FUB API integration (leads, appointments, events)
- Exact commission math (own leads, company, Zillow splits)
- MLO referral income tracking
- Action plan templates

🤖 **AI Coaching**
- Claude-powered coaching tied to Eduardo's business model
- Draft sales messages
- Pipeline analysis
- Weekly review

📱 **Mobile First PWA**
- Installable on iOS/Android
- Offline support with service worker
- Touch-optimized interface

⚡ **Time-Aware**
- NowZone widget shows what to do RIGHT NOW (1pm–6pm)
- Motivation card (son's treatment costs $1,500/month)
- Daily streak counter

## 7. Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## 8. Deployment

See `DEPLOY.md` for full step-by-step guide.

**TL;DR:**
1. Push to GitHub
2. Create Vercel project
3. Add environment variables
4. Deploy (automatic on every push)

**Cost**: $0–5/month (free Supabase + Vercel, pay-as-you-go Claude)

## 9. Database Schema

Created in `supabase/migrations/001_initial.sql`:
- `leads` — CRM leads
- `tasks` — Daily to-do list
- `kpis` — Weekly KPI tracking
- `closings` — Closing records
- `appointments` — Calendar events
- `message_templates` — Sales message presets
- `professionals` — Lender/inspector directory
- `mlo_steps` — Licensing checklist
- Plus more...

## 10. Troubleshooting

### "Cannot find module"
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Restart dev server

### "FUB API not responding"
- Check `FUB_API_KEY` in .env.local
- Verify key hasn't been rotated in FUB admin
- Check internet connection

### "Claude not responding"
- Check `ANTHROPIC_API_KEY` is valid
- Verify account has credits
- Check Anthropic status page

### Magic link opens localhost or fails with `otp_expired`
- In Supabase Auth settings, add your production domain to allowed redirect URLs.
- Include callback path: `https://your-domain.com/auth/callback`.
- Keep localhost callback only for local development: `http://localhost:3000/auth/callback`.
- Request a fresh login link after changing redirect settings.

### PWA not installing
- Make sure served over HTTPS (Vercel does this)
- Check manifest.json is accessible
- Try different browser/device

---

**Ready to build? Let's go! 🚀**

Next step: Set up your environment variables and run `npm run dev`
