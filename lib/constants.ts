export const EDUARDO = {
  name: 'Eduardo Inoa',
  team: 'Century 21 NE – Fermin Group',
  markets: ['Northeast MA', 'Southern NH'],
  email: 'eduardoinoa18@gmail.com',
  instagram: '@eduardoinoa_',
  facebook: 'Eduardo Inoa - Realtor',
  phone: '', // Eduardo fills in
};

export const TARGETS = {
  closingsPerMonth: 3,
  avgSalePrice: 400_000,
  avgCommissionPct: 0.02,
  netMonthlyTarget: 9_500, // midpoint of $9k–$10k
  survivalMinimum: 5_200,
  businessExpenses: 700,
};

export const SPLITS = {
  ownLead: {
    label: 'Own Lead',
    agentPct: 0.70,
    franchiseFee: 0.10,
    description: '70/30 + 10% franchise',
    netOnFourHundredK: 5_040,
  },
  companyLead: {
    label: 'Company Lead',
    agentPct: 0.50,
    franchiseFee: 0.10,
    description: '50/50 + 10% franchise',
    netOnFourHundredK: 3_600,
  },
  zillowFlex: {
    label: 'Zillow Flex',
    zillowPct: 0.35,
    agentPct: 0.50, // of what remains
    franchiseFee: 0.10,
    description: '35% Zillow + 50/50 + 10%',
    netOnFourHundredK: 2_300,
  },
};

export const QUICK_LINKS = [
  { label: 'Follow Boss', url: 'https://app.followupboss.com', icon: 'ClipboardList' },
  { label: 'New Email', url: 'https://mail.google.com/mail/u/0/#compose', icon: 'Mail' },
  { label: 'Calendar', url: 'https://calendar.google.com/calendar/r', icon: 'Calendar' },
  { label: 'RealScout', url: 'https://app.realscout.com', icon: 'Search' },
  { label: 'Realtor.com', url: 'https://dashboard.realtor.com', icon: 'Home' },
  { label: 'Zillow', url: 'https://www.zillow.com/agent-resources', icon: 'Zap' },
  { label: 'Newfed', url: 'https://newfedmortgage.com', icon: 'Banknote' },
  { label: 'Instagram', url: 'https://www.instagram.com/eduardoinoa_', icon: 'Instagram' },
];

export const NOW_ZONES = [
  { start: '13:00', end: '13:30', title: '🔥 Respond to ALL new leads first', sub: 'Check Follow Boss + Zillow dashboard. Anyone in the last 24hrs gets a call or text RIGHT NOW. Speed wins.' },
  { start: '13:30', end: '15:00', title: '⚡ Power Hour — make your calls', sub: 'Call or text 8–12 leads. Use Mojo or manual. No excuses. This is the only thing that matters right now.' },
  { start: '15:00', end: '15:30', title: '📧 Follow up in writing', sub: 'Send emails/texts to everyone you called who didn\'t pick up. Log everything in FUB. Notes drive your next contact.' },
  { start: '15:30', end: '16:30', title: '🏠 Showings / Appointments', sub: 'Be present, be sharp. Every showing is a potential UAG. Ask for the offer before you leave.' },
  { start: '16:30', end: '17:00', title: '📊 Log & Update pipeline', sub: 'Update FUB stages. Who moved forward? Who ghosted? Who needs a price reduction conversation?' },
  { start: '17:00', end: '17:30', title: '📱 Social + Content', sub: 'Post one Reel or Story on Instagram. Engage with 5 comments. Keep your name in front of your audience.' },
  { start: '17:30', end: '17:45', title: '📋 Set tomorrow\'s priorities', sub: 'Write your top 3 for tomorrow before you close. Don\'t start tomorrow blank.' },
  { start: '17:45', end: '18:00', title: '✅ Wrap up & disconnect', sub: 'Log final activity. Check that all leads from today have a next step in FUB. Good job — you showed up.' },
];

export const WEEKLY_KPIS = [
  { key: 'touches', label: 'Total Touches', target: 45, unit: 'contacts', icon: 'Phone', color: 'blue' },
  { key: 'calls', label: 'Calls Made', target: 25, unit: 'calls', icon: 'PhoneCall', color: 'green' },
  { key: 'appointments', label: 'Appointments Set', target: 4, unit: 'appts', icon: 'CalendarCheck', color: 'amber' },
  { key: 'new_leads', label: 'New Leads', target: 5, unit: 'leads', icon: 'UserPlus', color: 'purple' },
  { key: 'uags', label: 'Under Agreement', target: 1, unit: 'UAGs', icon: 'FileCheck', color: 'teal' },
  { key: 'closings', label: 'Closings', target: 3, unit: 'closes', icon: 'Key', color: 'gold' },
];
