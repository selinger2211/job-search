// User configuration — edit this file to personalize the dashboard.
// Template users: replace these with your own companies, nudges, and criteria.

const CONFIG = {
  // Pipeline stage definitions (shared, rarely customized)
  stages: ['tracking','outreach','applied','screen','interview','offer'],
  stageLabels: { tracking:'Tracking', outreach:'Outreach', applied:'Applied', screen:'Screen', interview:'Interview', offer:'Offer/Done' },
  stageIcons:  { tracking:'\u{1F440}', outreach:'\u{1F4E8}', applied:'\u{1F4E4}', screen:'\u{1F4DE}', interview:'\u{1F3AF}', offer:'\u{1F389}' },
  stageColors: { tracking:'#a0aec0', outreach:'#0e7490', applied:'#2e75b6', screen:'#7c3aed', interview:'#d97706', offer:'#16a34a' },

  // Tier definitions
  tierColors: { "1":"#1a3a5c", "2":"#2e75b6", "3":"#1e7e34", "4":"#718096" },
  tierNames:  { "1":"Tier 1 \u2014 Dream", "2":"Tier 2 \u2014 High Prob", "3":"Tier 3 \u2014 Big Tech", "4":"Tier 4 \u2014 Monitor" },

  stageBadge: {
    tracking:  { label:'\u{1F440}',          title:'Tracking',     cls:'chip-status-tracking'  },
    outreach:  { label:'\u{1F4E8} Outreach', title:'Outreach',     cls:'chip-status-outreach'  },
    applied:   { label:'\u{1F4E4} Applied',  title:'Applied',      cls:'chip-status-applied'   },
    screen:    { label:'\u{1F4DE} Screen',   title:'Phone Screen', cls:'chip-status-screen'    },
    interview: { label:'\u{1F3AF} Live',     title:'Interviewing', cls:'chip-status-interview' },
    offer:     { label:'\u{1F389} Done',     title:'Offer/Done',   cls:'chip-status-offer'     },
  },

  // ── PERSONALIZE BELOW ──────────────────────────────────────────────

  defaultCompanies: {
    1: ["The Trade Desk","LiveRamp","Databricks","Plaid","Stripe","Glean","Scale AI","Cohere","AppsFlyer","Amplitude"],
    2: ["Snowflake","Weights & Biases","Together AI","Hightouch","mParticle","Segment / Twilio","Branch","Criteo","Magnite","PubMatic","Moveworks","Marqeta","Fivetran","dbt Labs","Braze","Yahoo"],
    3: ["Google","Meta","Microsoft","LinkedIn","Adobe","Salesforce","Snap","Pinterest","Uber","Amazon / AWS","Ymax.ai"],
    4: ["IAS","DoubleVerify","ironSource / Unity Ads","Taboola","Samsara","RudderStack","OpenAI","Anthropic","Lotame","Permutive"]
  },

  networkNudges: [
    { name:"Yahoo/Verizon Media alumni",  co:"\u2192 The Trade Desk, LiveRamp, Criteo",       why:"Your 5-year AdTech tenure is your warmest network. Search LinkedIn for former colleagues now at these companies." },
    { name:"JPMorgan connections",         co:"\u2192 Plaid, Stripe, Marqeta, Databricks",     why:"Finance-to-fintech migrations are common. Former colleagues may be at exactly your top targets." },
    { name:"New Relic alumni",             co:"\u2192 Amplitude, Fivetran, Segment",           why:"SaaS billing/platform background connects well with data infrastructure companies." },
    { name:"MetaCon / arXiv co-authors",  co:"\u2192 Cohere, Scale AI, Databricks, Glean",    why:"Your publication is a rare credibility signal in AI PM circles. Use it as a cold outreach opener." },
    { name:"Conversant alumni",            co:"\u2192 AppsFlyer, Branch, mParticle",           why:"Mobile SDK and tag management experience directly relevant to mobile attribution/CDP companies." },
    { name:"Type 3 outreach: Plaid",       co:"Staff PM, AI Foundations (open role)",     why:"Find 20 contacts \u2014 PM leads, eng leads, recruiters. Target: 20 emails \u2192 1 meeting \u2192 1 referral." },
    { name:"Type 3 outreach: Stripe",      co:"Staff PM, Agentic Commerce (open role)",   why:"Your JPMorgan agentic onboarding work is a near-perfect fit. Get a referral before or right after applying." },
    { name:"Type 3 outreach: Databricks",  co:"Staff PM, AI Platform",                   why:"Your LLM/RAG pipeline work + arXiv publication opens doors here. Reach out to PM and eng leads." },
  ],

  checkItems: [
    "Is the company Series B+ or public? (No pre-PMF)",
    "Is the location Remote, SF Bay Area, or Hybrid BART-accessible?",
    "Is the title Principal, Staff, or Group PM? (Senior OK at big tech)",
    "Does the role involve data, AI, AdTech, or complex decisioning systems?",
    "Is this an IC role with end-to-end ownership (not PM manager)?",
    "Does the JD mention specific outcomes / metrics (not just features)?",
  ],
};

export function getConfig() {
  return CONFIG;
}
