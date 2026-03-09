// Contact log rendering

import { getConfig } from '../../config.js';
import { loadRoles } from '../data/store.js';

const STAGE_BADGE = getConfig().stageBadge;

export function renderContactLog() {
  const roles = loadRoles();
  const container = document.getElementById('contactLog');
  if (!container) return;
  const appliedStages = new Set(['applied','screen','interview','offer']);
  const activeStages  = new Set(['outreach','applied','screen','interview','offer']);
  const activeRoles   = roles.filter(r => activeStages.has(r.stage));

  if (!activeRoles.length) {
    container.innerHTML = '<div style="font-size:11px;color:#a0aec0;padding:6px 0">No outreach or applications yet. Move a role to Outreach or beyond to start tracking here.</div>';
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const cmLabel = { email:'\u2709\uFE0F Email', linkedin:'\u{1F4BC} LinkedIn', other:'\u{1F4AC} Other' };

  function mostRecent(r) {
    const ds = [];
    if (r.lastContactedDate) ds.push(new Date(r.lastContactedDate+'T12:00:00'));
    if (r.date && activeStages.has(r.stage)) ds.push(new Date(r.date));
    return ds.length ? new Date(Math.max(...ds.map(d=>d.getTime()))) : null;
  }

  const sorted = [...activeRoles].sort((a,b) => {
    const ma=mostRecent(a), mb=mostRecent(b);
    if (ma&&mb) return mb-ma; if (ma) return -1; if (mb) return 1;
    return a.company.localeCompare(b.company);
  });

  container.innerHTML = sorted.map(r => {
    let stageEventHtml = '';
    if (r.stage==='outreach' && r.date) {
      stageEventHtml = `<span class="contact-log-applied">\u{1F4E8} Outreach <strong>${new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong></span>`;
    } else if (appliedStages.has(r.stage) && r.date) {
      stageEventHtml = `<span class="contact-log-applied">\u{1F4E4} Applied <strong>${new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong></span>`;
    }
    let contactHtml = '';
    if (r.lastContactedDate) {
      const d = new Date(r.lastContactedDate+'T12:00:00');
      const days = Math.floor((today-d)/86400000);
      const stale = days>=7;
      const label = days===0?'today':days===1?'1d ago':`${days}d ago`;
      const mb = r.lastContactedMethod ? `<span class="mini-badge contact-${r.lastContactedMethod}">${cmLabel[r.lastContactedMethod]}</span> ` : '';
      contactHtml = `<span class="${stale?'contact-stale':'contact-log-date'}">${mb}${stale?'\u26A0\uFE0F ':''}${label}</span>`;
    } else {
      contactHtml = `<span class="contact-log-never">no outreach logged</span>`;
    }
    const refBadge = r.referral==='referred' ? `<span class="mini-badge referral-badge-referred">\u{1F91D}</span> `
      : r.referral==='cold' ? `<span class="mini-badge referral-badge-cold">\u{1F9CA}</span> ` : '';
    const stageBadge = STAGE_BADGE[r.stage]
      ? `<span style="font-size:9px;background:#f0f4f8;padding:1px 5px;border-radius:6px;color:#4a5568">${STAGE_BADGE[r.stage].title}</span>` : '';

    return `<div class="contact-log-row" onclick="openEditModal('${r.id}')" title="Click to edit">
      <div class="contact-log-co">${r.company}</div>
      <div class="contact-log-role">${r.roleTitle} ${stageBadge}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        ${refBadge}${stageEventHtml}
        ${stageEventHtml&&contactHtml?'<span style="color:#e2e8f0;font-size:9px">\u00B7</span>':''}
        ${contactHtml}
      </div>
    </div>`;
  }).join('');
}

export function getContactLogForCompany(companyName) {
  return loadRoles().filter(r => r.company.toLowerCase() === companyName.toLowerCase());
}
