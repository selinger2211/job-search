// Today's actions, quick-check, streak, networking nudges

import { getConfig } from '../../config.js';
import { loadRoles } from '../data/store.js';

const _cfg = getConfig();
const NETWORK_NUDGES = _cfg.networkNudges;
const CHECK_ITEMS = _cfg.checkItems;

// ─── Streak ─────────────────────────────────────────────────────────────

export function updateStreak() {
  const today = new Date().toDateString();
  try {
    const s = JSON.parse(localStorage.getItem('ili_streak') || '{"lastVisit":null,"streak":0}');
    if (s.lastVisit !== today) {
      const yest = new Date(Date.now() - 86400000).toDateString();
      localStorage.setItem('ili_streak', JSON.stringify({ lastVisit: today, streak: s.lastVisit === yest ? s.streak + 1 : 1 }));
    }
  } catch {}
}

// ─── Today's Actions ────────────────────────────────────────────────────

export function renderTodayActions() {
  const todayActionsEl = document.getElementById('todayActions');
  if (!todayActionsEl) return;
  const d   = new Date();
  const day = d.getDay();
  const todayLabelEl = document.getElementById('todayLabel');
  if (todayLabelEl) todayLabelEl.textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const actions = [];

  if ([1,3,5].includes(day)) actions.push({
    icon:'🏆', bg:'#ebf4ff',
    title:'Check Tier 1 company job boards',
    sub:'Visit career pages for your Tier 1 companies and scan for new openings',
    badge:'badge-blue', badgeText:'Apply same day'
  });
  if (day === 1) {
    actions.push({ icon:'📋', bg:'#f0fdf4', title:'Monday sweep: Tier 2 & 3 job boards', sub:'Check career pages for your Tier 2 and 3 companies — most postings go live Monday morning', badge:'badge-green', badgeText:'Apply within 3 days' });
    actions.push({ icon:'🔔', bg:'#faf5ff', title:'Check LinkedIn saved search alerts', sub:'Review saved job search alerts — most new roles post on Monday mornings', badge:'badge-purple', badgeText:'Most jobs post today' });
  }

  const nudgeIdx = d.getDate() % NETWORK_NUDGES.length;
  actions.push({ icon:'🤝', bg:'#fffbeb', title:'Networking: ' + NETWORK_NUDGES[nudgeIdx].name, sub:NETWORK_NUDGES[nudgeIdx].co, badge:'badge-amber', badgeText:'Daily nudge' });

  const roles = loadRoles();
  const twoWeeksAgo = Date.now() - 14 * 86400000;
  const stale = roles.filter(r => ['outreach','applied'].includes(r.stage) && new Date(r.date).getTime() < twoWeeksAgo);
  if (stale.length) actions.push({ icon:'⏰', bg:'#fef2f2', title:`${stale.length} outreach/application(s) — no movement in 2+ weeks`, sub:stale.map(r=>r.company).join(' · '), badge:'badge-red', badgeText:'Follow up or move on' });

  if ([0,6].includes(day)) actions.push({ icon:'📚', bg:'#f7fafc', title:'Weekend: prep & practice', sub:'Good time for resume tailoring, interview prep, or warm outreach.', badge:'badge-blue', badgeText:'No new postings today' });

  todayActionsEl.innerHTML = actions.map(a => `
    <div class="action-item">
      <div class="action-icon" style="background:${a.bg}">${a.icon}</div>
      <div class="action-text" style="flex:1"><strong>${a.title}</strong><span>${a.sub}</span></div>
      <span class="badge ${a.badge}">${a.badgeText}</span>
    </div>`).join('');
}

// ─── Quick Check ────────────────────────────────────────────────────────

export function renderQuickCheck() {
  const qcEl = document.getElementById('quickCheck');
  if (!qcEl) return;
  const key   = 'ili_qcheck_' + new Date().toDateString();
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  qcEl.innerHTML =
    CHECK_ITEMS.map((item, i) => `
      <div class="check-row">
        <input type="checkbox" id="qc${i}" ${saved[i]?'checked':''} onchange="saveCheck(${i},this.checked,'${key}')">
        <label for="qc${i}">${item}</label>
      </div>`).join('') +
    `<div style="margin-top:8px;font-size:10px;color:#718096">5 of 6 ✓ = apply. 4 or fewer = skip unless Tier 1 + referral.</div>`;
}

export function saveCheck(i, val, key) {
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  saved[i] = val;
  localStorage.setItem(key, JSON.stringify(saved));
}

// ─── Networking Nudges ──────────────────────────────────────────────────

let nudgeOffset = 0;

export function renderNudges() {
  const nudgesEl = document.getElementById('networkNudges');
  if (!nudgesEl) return;
  const seed = new Date().getDate() + nudgeOffset;
  const shown = [seed % NETWORK_NUDGES.length, (seed+1) % NETWORK_NUDGES.length];
  nudgesEl.innerHTML = shown.map(i => {
    const n = NETWORK_NUDGES[i];
    return `<div class="nudge-card">
      <div class="nudge-name">${n.name}</div>
      <div class="nudge-co">${n.co}</div>
      <div class="nudge-why">${n.why}</div>
      <button class="nudge-btn" onclick="markNudgeDone(this)">✓ Done for today</button>
    </div>`;
  }).join('');
}

export function refreshNudges() { nudgeOffset += 2; renderNudges(); }

export function markNudgeDone(btn) {
  btn.closest('.nudge-card').style.opacity='0.4';
  btn.textContent='✓ Done';
  btn.disabled=true;
}
