-- Leads/Pipeline (synced from FUB + manual)
create table leads (
  id uuid primary key default gen_random_uuid(),
  fub_id text unique,
  name text not null,
  phone text,
  email text,
  stage text default 'new', -- new, nurture, active, uag, closed, lost
  lead_source text, -- own, zillow, company, realtor_com
  price_range_min integer,
  price_range_max integer,
  notes text,
  last_contact timestamptz,
  next_followup timestamptz,
  days_in_stage integer default 0,
  is_hot boolean default false,
  buyer_or_seller text, -- buyer, seller, both
  assigned_to text default 'Eduardo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Daily tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date date default current_date,
  is_done boolean default false,
  is_critical boolean default false,
  sort_order integer default 0,
  category text, -- lead_followup, admin, marketing, prospecting
  lead_id uuid references leads(id) on delete set null,
  created_at timestamptz default now()
);

-- KPI tracking (weekly)
create table kpis (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  touches integer default 0,        -- calls + texts + emails
  calls integer default 0,
  texts integer default 0,
  emails integer default 0,
  appointments integer default 0,
  new_leads integer default 0,
  uags integer default 0,
  closings integer default 0,
  notes text,
  fub_synced_at timestamptz,
  created_at timestamptz default now(),
  unique(week_start)
);

-- Monthly closings
create table closings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  address text,
  sale_price integer,
  commission_pct numeric(4,3) default 0.02,
  lead_source text, -- own, zillow, company, realtor_com
  gross_commission numeric(10,2),
  net_commission numeric(10,2),
  close_date date,
  notes text,
  created_at timestamptz default now()
);

-- Today's schedule / appointments
create table appointments (
  id uuid primary key default gen_random_uuid(),
  fub_id text unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  type text, -- showing, listing_appt, call, buyer_consult, other
  lead_id uuid references leads(id) on delete set null,
  location text,
  notes text,
  created_at timestamptz default now()
);

-- Priorities (tomorrow's top 3)
create table priorities (
  id uuid primary key default gen_random_uuid(),
  for_date date not null,
  rank integer not null, -- 1, 2, 3
  title text not null,
  created_at timestamptz default now()
);

-- Activity log
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  logged_at timestamptz default now(),
  activity text not null,
  category text, -- call, text, email, showing, note
  lead_id uuid references leads(id) on delete set null,
  auto_logged boolean default false -- true = came from FUB sync
);

-- Message templates
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  category text, -- new_lead, followup, buyer, seller, past_client, instagram
  title text,
  body text,
  is_custom boolean default false,
  sort_order integer default 0
);

-- AI conversation history (last 30 days rolling)
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  prompt_type text, -- coaching, draft_text, draft_email, pipeline_review, weekly_review
  prompt text,
  response text,
  model text,
  tokens_used integer,
  created_at timestamptz default now()
);

-- MLO study progress
create table mlo_steps (
  id uuid primary key default gen_random_uuid(),
  step_name text,
  category text,
  hours_required numeric(4,1),
  is_done boolean default false,
  done_at timestamptz,
  sort_order integer
);

-- Professionals directory (lenders, inspectors, attorneys, etc.)
create table professionals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  role text, -- lender, inspector, attorney, stager, photographer, contractor
  phone text,
  email text,
  website text,
  notes text,
  is_preferred boolean default false,
  is_mlo_partner boolean default false, -- gets MLO referrals
  created_at timestamptz default now()
);

-- User settings (single row)
create table settings (
  id uuid primary key default gen_random_uuid(),
  fub_api_key text,
  claude_api_key text,
  push_subscription jsonb,
  streak_count integer default 0,
  last_active_date date,
  theme text default 'dark',
  notifications_enabled boolean default true
);

-- Enable RLS
alter table leads enable row level security;
alter table tasks enable row level security;
alter table kpis enable row level security;
alter table closings enable row level security;
alter table appointments enable row level security;
alter table priorities enable row level security;
alter table activity_log enable row level security;
alter table message_templates enable row level security;
alter table ai_conversations enable row level security;
alter table mlo_steps enable row level security;
alter table professionals enable row level security;
alter table settings enable row level security;

-- Indexes
create index on leads(stage);
create index on leads(updated_at desc);
create index on tasks(due_date);
create index on kpis(week_start desc);
create index on appointments(start_time);
create index on activity_log(logged_at desc);

-- Seed default message templates (daily workflow)
insert into message_templates (category, title, body, sort_order) values
('new_lead', 'New buyer lead — first contact', 'Hi [Name]! This is Eduardo Inoa with Century 21. I saw you were looking at homes in [area]. I''d love to help — are you still in the market? I have some great options that just came on. When''s a good time to chat?', 1),
('new_lead', 'New seller lead — first contact', 'Hi [Name], this is Eduardo Inoa with Century 21. I saw your inquiry about selling your home. I''d love to give you a free market analysis — homes in your area are moving fast right now. Can we jump on a quick call this week?', 2),
('followup', '3-day follow-up (no response)', 'Hey [Name], just checking back in! I know life gets busy. Still happy to help with your home search/sale whenever you''re ready. No pressure — just want you to know I''m here. 🏡', 3),
('followup', '7-day nurture', 'Hi [Name]! New listings just hit the market in [area] that match what you''re looking for. Want me to send them over? Completely free, no strings attached.', 4),
('buyer', 'Pre-approval reminder', 'Hey [Name], just a quick reminder — getting pre-approved takes about 20 minutes and puts you ahead of 80% of buyers. My preferred lender [Lender] is fast and great. Want me to intro you?', 5),
('seller', 'CMA follow-up', 'Hi [Name], I just finished your comparative market analysis. Based on recent sales in [area], your home could sell for [range]. I''d love to walk you through it — do you have 30 minutes this week?', 6),
('past_client', 'Check-in (6 months)', 'Hey [Name]! Eduardo here — hope you''re loving [address]! 😊 Quick check-in: do you know anyone looking to buy or sell? I''d love to help them the same way I helped you. Referrals are always appreciated!', 7),
('instagram', 'Market update reel', 'HOME PRICES in [CITY] just moved 📊 Here''s what buyers and sellers need to know right now... [add 3 key stats]. Thinking about making a move? DM me — free consultation, no pressure. Eduardo Inoa | Century 21 NE | MA & NH Licensed 🏡 #[city]realestate #homebuying', 8);

-- Seed MLO study steps
insert into mlo_steps (step_name, category, hours_required, sort_order) values
('Complete 20-hour NMLS pre-licensing course', 'licensing', 20, 1),
('Pass NMLS national exam (75% required)', 'licensing', 4, 2),
('Pass Massachusetts state exam', 'licensing', 2, 3),
('Apply for MA MLO license via NMLS system', 'licensing', 1, 4),
('Background check + credit report submitted', 'licensing', 0.5, 5),
('Surety bond obtained ($25k for MA)', 'licensing', 1, 6),
('Sponsor agreement with Newfed Mortgage signed', 'business', 2, 7),
('Set up MLO referral tracking system', 'business', 1, 8),
('Create referral agreement template', 'business', 1, 9),
('Send intro email to top 10 buyer leads about Newfed', 'business', 0.5, 10);

-- Seed professionals
insert into professionals (name, company, role, is_preferred, is_mlo_partner) values
('TBD', 'Newfed Mortgage', 'lender', true, true),
('TBD', 'TBD', 'inspector', false, false),
('TBD', 'TBD', 'attorney', false, false);
