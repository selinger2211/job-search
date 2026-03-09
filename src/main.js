// ─── THEME (dark mode) ──────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('ili_theme'); // 'light', 'dark', or 'auto'
  const pref = saved || 'auto';
  applyTheme(pref);
  // Listen for system changes when in auto mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if ((localStorage.getItem('ili_theme') || 'auto') === 'auto') applyTheme('auto');
  });
})();
function applyTheme(mode) {
  let dark;
  if (mode === 'auto') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  else dark = mode === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const saved = localStorage.getItem('ili_theme') || 'auto';
    btn.textContent = saved === 'auto' ? (dark ? '🌙' : '☀️') : (dark ? '🌙' : '☀️');
    btn.title = 'Theme: ' + saved + (saved === 'auto' ? ' (system)' : '');
  }
}
function cycleTheme() {
  const current = localStorage.getItem('ili_theme') || 'auto';
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  localStorage.setItem('ili_theme', next);
  applyTheme(next);
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────
const STAGES = ['tracking','outreach','applied','screen','interview','offer'];
const STAGE_LABELS = { tracking:'Tracking', outreach:'Outreach', applied:'Applied', screen:'Screen', interview:'Interview', offer:'Offer/Done' };
const STAGE_ICONS  = { tracking:'👀', outreach:'📨', applied:'📤', screen:'📞', interview:'🎯', offer:'🎉' };
const STAGE_COLORS = { tracking:'#a0aec0', outreach:'#0e7490', applied:'#2e75b6', screen:'#7c3aed', interview:'#d97706', offer:'#16a34a' };

const TIER_COLORS = { "1":"#1a3a5c", "2":"#2e75b6", "3":"#1e7e34", "4":"#718096" };
const TIER_NAMES  = { "1":"Tier 1 — Dream", "2":"Tier 2 — High Prob", "3":"Tier 3 — Big Tech", "4":"Tier 4 — Monitor" };
const TIER_HDR_COLORS = TIER_COLORS;

const STAGE_BADGE = {
  tracking:  { label:'👀',          title:'Tracking',     cls:'chip-status-tracking'  },
  outreach:  { label:'📨 Outreach', title:'Outreach',     cls:'chip-status-outreach'  },
  applied:   { label:'📤 Applied',  title:'Applied',      cls:'chip-status-applied'   },
  screen:    { label:'📞 Screen',   title:'Phone Screen', cls:'chip-status-screen'    },
  interview: { label:'🎯 Live',     title:'Interviewing', cls:'chip-status-interview' },
  offer:     { label:'🎉 Done',     title:'Offer/Done',   cls:'chip-status-offer'     },
};

const DEFAULT_COMPANIES = {
  1: ["Company A","Company B","Company C","Company D","Company E"],
  2: ["Company F","Company G","Company H","Company I","Company J"],
  3: ["Company K","Company L","Company M","Company N","Company O"],
  4: ["Company P","Company Q","Company R","Company S","Company T"]
};

// Edit these nudges to reflect YOUR network and target companies
const NETWORK_NUDGES = [
  { name:"Former employer alumni",      co:"→ Target Company 1, Target Company 2",     why:"Your former colleagues are your warmest network. Search LinkedIn for people from past roles now at your target companies." },
  { name:"School / community network",  co:"→ Target Company 3, Target Company 4",     why:"Alumni networks are underutilized. Reach out to classmates or community members at companies you're targeting." },
  { name:"Online community contacts",   co:"→ Target Company 5, Target Company 6",     why:"Slack communities, Discord servers, and Twitter/X connections can open unexpected doors." },
  { name:"Type 3 outreach example",     co:"Role Title at Target Company (open role)", why:"Find 15–20 contacts — hiring managers, team leads, recruiters. Target: 20 messages → 2 conversations → 1 referral." },
];

// Edit these criteria to match YOUR job search filters
const CHECK_ITEMS = [
  "Does the role match my target title / seniority level?",
  "Is the location or remote policy compatible with my needs?",
  "Does the company have the stage / size I'm looking for?",
  "Does the role align with my target domain or industry?",
  "Is this an IC role with end-to-end ownership?",
  "Does the JD mention specific outcomes / metrics (not just features)?",
];

// ─── STORAGE ─────────────────────────────────────────────────────────────
function loadRoles()    { try { return JSON.parse(localStorage.getItem('ili_roles')    || '[]'); } catch { return []; } }
function saveRoles(r)   { localStorage.setItem('ili_roles', JSON.stringify(r)); }
function getCompanies() {
  try { const s = localStorage.getItem('ili_companies'); if (s) return JSON.parse(s); } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_COMPANIES));
}
function saveCompaniesData(c) { localStorage.setItem('ili_companies', JSON.stringify(c)); }
if (!localStorage.getItem('ili_companies')) saveCompaniesData(DEFAULT_COMPANIES);

// ─── STAGE HISTORY ────────────────────────────────────────────────────────
function pushStageHistory(role, newStage) {
  if (role.stage === newStage) return role;
  if (!role.stageHistory) role.stageHistory = [{ stage: role.stage || 'tracking', ts: role.date || new Date().toISOString() }];
  role.stageHistory.push({ stage: newStage, ts: new Date().toISOString() });
  role.stage = newStage;
  return role;
}

// ─── FILTER STATE ─────────────────────────────────────────────────────────
let filterQuery = '';
function applyFilter(val) {
  filterQuery = val.trim().toLowerCase();
  var scb = document.getElementById('searchClearBtn');
  if (scb) scb.classList.toggle('visible', filterQuery.length > 0);
  renderPipeline();
  renderTierList();
  renderNetworkMap();
}
function clearFilter() {
  filterQuery = '';
  var ps = document.getElementById('pipelineSearch');
  if (ps) ps.value = '';
  var scb = document.getElementById('searchClearBtn');
  if (scb) scb.classList.remove('visible');
  var fc = document.getElementById('filterCount');
  if (fc) fc.style.display = 'none';
  renderPipeline();
  renderTierList();
  renderNetworkMap();
}

// ─── STREAK ───────────────────────────────────────────────────────────────
function updateStreak() {
  const today = new Date().toDateString();
  try {
    const s = JSON.parse(localStorage.getItem('ili_streak') || '{"lastVisit":null,"streak":0}');
    if (s.lastVisit !== today) {
      const yest = new Date(Date.now() - 86400000).toDateString();
      localStorage.setItem('ili_streak', JSON.stringify({ lastVisit: today, streak: s.lastVisit === yest ? s.streak + 1 : 1 }));
    }
  } catch {}
}

// ─── TODAY'S ACTIONS ─────────────────────────────────────────────────────
function renderTodayActions() {
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

// ─── QUICK CHECK ─────────────────────────────────────────────────────────
function renderQuickCheck() {
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
function saveCheck(i, val, key) {
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  saved[i] = val;
  localStorage.setItem(key, JSON.stringify(saved));
}

// ─── PIPELINE ────────────────────────────────────────────────────────────
function renderPipeline() {
  if (!document.getElementById('col-tracking')) return;
  const roles  = loadRoles();
  const counts = {};
  STAGES.forEach(s => { counts[s] = 0; });

  // Clear cards (preserve column headers)
  STAGES.forEach(s => {
    Array.from(document.getElementById('col-'+s).querySelectorAll('.pipeline-card,.add-card-btn')).forEach(el=>el.remove());
  });

  // Filter
  const visible = filterQuery
    ? roles.filter(r => r.company.toLowerCase().includes(filterQuery) || (r.roleTitle||'').toLowerCase().includes(filterQuery))
    : roles;

  if (filterQuery) {
    const fc = document.getElementById('filterCount');
    if (fc) { fc.textContent = `${visible.length} of ${roles.length}`; fc.style.display = 'inline'; }
  } else {
    const fc = document.getElementById('filterCount');
    if (fc) fc.style.display = 'none';
  }

  const cmLabel = { email:'✉️', linkedin:'💼', other:'💬' };

  visible.forEach(role => {
    const col = document.getElementById('col-'+role.stage);
    if (!col) return;
    counts[role.stage] = (counts[role.stage]||0) + 1;

    const card = document.createElement('div');
    card.className = 'pipeline-card';
    card.setAttribute('draggable','true');
    card.dataset.id = role.id;

    const stageIdx = STAGES.indexOf(role.stage);
    const prevStage = stageIdx > 0 ? STAGES[stageIdx-1] : null;
    const nextStage = stageIdx < STAGES.length-1 ? STAGES[stageIdx+1] : null;

    const refBadge = role.referral === 'referred' ? `<span class="mini-badge referral-badge-referred" title="Has referral">🤝</span>`
      : role.referral === 'cold' ? `<span class="mini-badge referral-badge-cold" title="Cold application">🧊</span>` : '';
    const srcBadge = role.source === 'inbound'
      ? `<span class="mini-badge source-inbound" title="Inbound — recruiter reached out">📥</span>`
      : `<span class="mini-badge source-outbound" title="Outbound — you applied">📤</span>`;
    const contactBadge = role.lastContactedMethod
      ? `<span class="mini-badge contact-${role.lastContactedMethod}" title="Last contact method: ${role.lastContactedMethod}">${cmLabel[role.lastContactedMethod]}</span>` : '';
    const contactDateStr = role.lastContactedDate
      ? new Date(role.lastContactedDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
      : null;

    const linkedConns = getConnectionsForCompany(role.company);
    const warmBadge = linkedConns.length
      ? `<span class="conn-chip-wrap" onclick="event.stopPropagation();openConnPanel('${role.company.replace(/'/g,"\\'")}')" title="View ${linkedConns.length} connections"><span class="warm-intro-badge">🔗 ${linkedConns.length}</span></span>`
      : '';
    const coArtifacts = getCompanyArtifacts(role.company);
    const artifactBadge = coArtifacts.length
      ? `<span class="artifact-badge" title="${coArtifacts.length} file${coArtifacts.length>1?'s':''}: ${coArtifacts.map(a=>a.fileName).join(', ')}">📎 ${coArtifacts.length}</span>`
      : '';

    card.innerHTML = `
      <div class="co">
        <span class="tier-dot" style="background:${TIER_COLORS[role.tier]}"></span>
        ${role.company}
        ${refBadge}${warmBadge}${artifactBadge}
      </div>
      <div class="role">${role.roleTitle}</div>
      ${role.url ? `<div style="margin-top:2px"><a href="${role.url}" target="_blank" style="font-size:9px;color:var(--accent-blue);text-decoration:none;background:var(--bg-surface);padding:1px 6px;border-radius:4px;border:1px solid var(--border-medium)" onclick="event.stopPropagation()" title="Open job posting in new tab">📄 View Job Posting</a></div>` : ''}
      <div class="card-footer">
        <div class="card-meta">
          ${srcBadge}${contactBadge}
          ${contactDateStr ? `<span style="font-size:9px;color:var(--text-faint)" title="Last contacted">${contactDateStr}</span>` : ''}
        </div>
        <div style="display:flex;gap:3px;align-items:center">
          <button style="padding:2px 6px;background:var(--bg-surface);border:1px solid var(--border-medium);border-radius:4px;font-size:9px;cursor:pointer;color:var(--text-muted)" title="Edit role details" onclick="event.stopPropagation();openEditModal('${role.id}')">✏️</button>
          <button class="btn-research" title="Generate AI research brief for this role" onclick="event.stopPropagation();openResearchModal('${role.company.replace(/'/g,"\\'")}','${(role.roleTitle||'').replace(/'/g,"\\'")}','${role.url||''}')">🔬</button>
          ${prevStage ? `<button class="stage-btn stage-btn-back" title="Move back to ${STAGE_LABELS[prevStage]}" onclick="event.stopPropagation();moveStage('${role.id}','${prevStage}')">←</button>` : ''}
          ${nextStage ? `<button class="stage-btn stage-btn-fwd" title="Advance to ${STAGE_LABELS[nextStage]}" onclick="event.stopPropagation();moveStage('${role.id}','${nextStage}')">→ ${STAGE_LABELS[nextStage]}</button>` : ''}
        </div>
      </div>`;

    card.addEventListener('click', () => { localStorage.setItem('ili_prevView', currentView); switchView('company-profile', role.company); });

    // Drag events
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('roleId', role.id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));

    col.appendChild(card);
  });

  // Add buttons + drop zones per column
  STAGES.forEach(s => {
    const col = document.getElementById('col-'+s);
    const btn = document.createElement('button');
    btn.className = 'add-card-btn';
    btn.textContent = '+ Add here';
    btn.onclick = e => { e.stopPropagation(); openAddModal(s); };
    col.appendChild(btn);
    document.getElementById('cnt-'+s).textContent = counts[s]||0;

    // Drop zone handlers
    col.ondragover  = e => { e.preventDefault(); col.classList.add('drag-over'); };
    col.ondragleave = e => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); };
    col.ondrop      = e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('roleId');
      if (!id) return;
      const allRoles = loadRoles();
      const idx = allRoles.findIndex(r => r.id === id);
      if (idx !== -1 && allRoles[idx].stage !== s) {
        allRoles[idx] = pushStageHistory(allRoles[idx], s);
        saveRoles(allRoles);
        renderAll();
      }
    };
  });

  // Header stats (only update if elements exist)
  var el;
  if ((el = document.getElementById('statTracking'))) el.textContent  = roles.filter(r=>r.stage==='tracking').length;
  if ((el = document.getElementById('statOutreach'))) el.textContent  = roles.filter(r=>r.stage==='outreach').length;
  if ((el = document.getElementById('statApplied')))  el.textContent  = roles.filter(r=>r.stage==='applied').length;
  if ((el = document.getElementById('statActive')))   el.textContent  = roles.filter(r=>['screen','interview'].includes(r.stage)).length;
  if ((el = document.getElementById('statInbound')))  el.textContent  = roles.filter(r=>r.source==='inbound').length;
  if ((el = document.getElementById('statOutbound'))) el.textContent  = roles.filter(r=>r.source!=='inbound').length;
}

// Quick stage move
function moveStage(id, newStage) {
  const roles = loadRoles();
  const idx = roles.findIndex(r => r.id === id);
  if (idx === -1) return;
  roles[idx] = pushStageHistory(roles[idx], newStage);
  saveRoles(roles);
  renderAll();
}

// ─── CONNECTIONS SIDE PANEL ───────────────────────────────────────────────
function openConnPanel(companyName) {
  const conns = getConnectionsForCompany(companyName);
  const panel = document.getElementById('connPanel');
  const overlay = document.getElementById('connPanelOverlay');
  const title = document.getElementById('connPanelTitle');
  const count = document.getElementById('connPanelCount');
  const body = document.getElementById('connPanelBody');

  title.textContent = companyName + ' Connections';
  count.textContent = conns.length + ' connection' + (conns.length !== 1 ? 's' : '') + ' found';

  if (!conns.length) {
    body.innerHTML = '<div class="conn-panel-empty">No LinkedIn connections found at ' + companyName + '.<br><br>Consider cold outreach or finding warm intros through mutual connections.</div>';
  } else {
    // Score connections by influence — prioritize Product/Eng/Design + seniority
    const scored = conns.map(function(c) {
      let score = 0;
      const t = (c.position || '').toLowerCase();
      // ── Function relevance (Product/Eng/Design get big boost) ──
      const isProduct = /\b(product|pm\b|program)/.test(t);
      const isEng = /\b(engineer|software|developer|swe|platform|infrastructure|architect|technical|tech lead|cto|sre)/.test(t);
      const isDesign = /\b(design|ux|ui|creative|brand)/.test(t);
      const isData = /\b(data|analytics|machine learning|ml\b|ai\b|science)/.test(t);
      const isRelevant = isProduct || isEng || isDesign || isData;
      if (isProduct) score += 30;
      else if (isEng) score += 25;
      else if (isDesign) score += 22;
      else if (isData) score += 22;
      // Recruiter / Talent = can directly refer
      if (/\b(recruiter|recruiting|talent|hr|people)\b/.test(t)) score += 28;
      // ── Seniority (stacks with function) ──
      if (/\b(ceo|cto|cfo|coo|cpo|cmo|chief|president)\b/.test(t)) score += 60;
      else if (/\b(svp|senior vice president|evp|executive vice president)\b/.test(t)) score += 55;
      else if (/\b(vp|vice president)\b/.test(t)) score += 50;
      else if (/\bdir(ector)?\b/.test(t)) score += 40;
      else if (/\b(head of|head,)\b/.test(t)) score += 38;
      else if (/\b(principal|staff|fellow)\b/.test(t)) score += 30;
      else if (/\b(senior|sr\.?|lead)\b/.test(t)) score += 25;
      else if (/\bmanager\b/.test(t)) score += 20;
      // Small boost for having any title at all
      if (t && t.length > 2) score += 2;
      return { conn: c, score: score, isRelevant: isRelevant };
    });
    scored.sort(function(a, b) { return b.score - a.score; });

    body.innerHTML = scored.map(function(item) {
      var c = item.conn;
      var initials = ((c.firstName || '').charAt(0) + (c.lastName || '').charAt(0)).toUpperCase();
      var connDate = c.connectedOn ? 'Connected ' + c.connectedOn : '';
      var profileLink = c.url ? '<a href="' + c.url + '" target="_blank">' + c.fullName + '</a>' : c.fullName;
      var influence = '';
      if (item.score >= 70) influence = '<span style="background:#f0fdf4;color:#16a34a;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:600;margin-left:6px">Top Contact</span>';
      else if (item.score >= 50) influence = '<span style="background:#f0fdf4;color:#16a34a;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:600;margin-left:6px">Key Contact</span>';
      else if (item.score >= 35) influence = '<span style="background:#ebf4ff;color:#2e75b6;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:600;margin-left:6px">Senior</span>';
      else if (item.score >= 20) influence = '<span style="background:#fffbeb;color:#d97706;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:600;margin-left:6px">Manager</span>';
      if (item.isRelevant) { var fn = ((c.position||'').toLowerCase().match(/product|engineer|design|data|software|ux|ml\b|ai\b/)||['relevant'])[0]; influence += '<span style="background:#faf5ff;color:#7c3aed;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:600;margin-left:4px">' + fn + '</span>'; }
      return '<div class="conn-panel-item">'
        + '<div class="conn-panel-avatar">' + initials + '</div>'
        + '<div class="conn-panel-info">'
        + '<div class="conn-panel-name">' + profileLink + influence + '</div>'
        + '<div class="conn-panel-title">' + (c.position || 'No title listed') + '</div>'
        + '<div class="conn-panel-meta">' + connDate + '</div>'
        + '</div>'
        + (c.url ? '<a href="' + c.url + '" target="_blank" style="font-size:11px;color:var(--accent-blue);text-decoration:none;flex-shrink:0;padding:4px 8px;background:var(--bg-surface);border:1px solid var(--border-medium);border-radius:5px" title="View LinkedIn profile">🔗 Profile</a>' : '')
        + '</div>';
    }).join('');
  }

  overlay.classList.add('open');
  panel.classList.add('open');
}

function closeConnPanel() {
  document.getElementById('connPanel').classList.remove('open');
  document.getElementById('connPanelOverlay').classList.remove('open');
}

// Build a connection badge with hover tooltip and click-to-panel
function buildConnBadge(company, conns) {
  if (!conns.length) return '';
  var preview = conns.slice(0, 3).map(function(c) {
    return '<div class="conn-tooltip-item"><strong>' + c.fullName + '</strong> — ' + (c.position || '?') + '</div>';
  }).join('');
  if (conns.length > 3) preview += '<div class="conn-tooltip-more">+ ' + (conns.length - 3) + ' more — click to see all</div>';
  var safeCo = company.replace(/'/g, "\\'");
  return '<span class="conn-chip-wrap" onclick="event.stopPropagation();openConnPanel(\'' + safeCo + '\')">'
    + '<span class="tier-chip-conn">🔗' + conns.length + '</span>'
    + '<div class="conn-tooltip">' + preview + '</div>'
    + '</span>';
}

// ─── TIER LIST ────────────────────────────────────────────────────────────
let editModeActive = false;
function toggleEditMode() {
  editModeActive = !editModeActive;
  document.body.classList.toggle('edit-mode', editModeActive);
  const btn = document.getElementById('editModeBtn');
  btn.textContent = editModeActive ? '✅ Done' : '✏️ Edit';
  btn.style.background   = editModeActive ? '#f0fdf4' : '#f7fafc';
  btn.style.borderColor  = editModeActive ? '#9ae6b4' : '#e2e8f0';
  btn.style.color        = editModeActive ? '#16a34a' : '#4a5568';
}
function removeCompanyFromTier(co, tier) {
  const cos = getCompanies(); cos[tier] = cos[tier].filter(c=>c!==co);
  saveCompaniesData(cos); renderTierList();
}
function renderTierList() {
  const tierListEl = document.getElementById('tierList');
  if (!tierListEl) return;
  const COMPANIES = getCompanies();
  const roles = loadRoles();
  const stagePriority = ['offer','interview','screen','applied','outreach','tracking'];
  const coStage = {};
  roles.forEach(r => {
    const key = r.company.toLowerCase();
    if (!coStage[key] || stagePriority.indexOf(r.stage) < stagePriority.indexOf(coStage[key])) coStage[key] = r.stage;
  });

  tierListEl.innerHTML = Object.entries(COMPANIES).map(([tier, cos]) => `
    <div class="tier-section">
      <span class="tier-label tier-${tier}">Tier ${tier}</span><br>
      <div style="margin-top:3px">
        ${cos.map(co => {
          const q = filterQuery;
          const hidden = q && !co.toLowerCase().includes(q) ? ' chip-hidden' : '';
          const stage = coStage[co.toLowerCase()];
          const sb = stage ? STAGE_BADGE[stage] : null;
          const safeId = co.replace(/['"\\]/g,'');
          const cls = `company-chip chip-t${tier}${sb?' '+sb.cls:''}${hidden}`;
          const badge = sb ? `<span class="chip-status-badge" style="background:rgba(0,0,0,0.08)">${sb.label}</span>` : '';
          const conns = getConnectionsForCompany(co);
          const connBadge = buildConnBadge(co, conns);
          return `<span class="${cls}" title="${sb?sb.title:'Click to add to pipeline'}" onclick="if(!editModeActive)openAddModalCo('${safeId}','${tier}')">${co}${badge}${connBadge}<span class="chip-remove" onclick="event.stopPropagation();removeCompanyFromTier('${safeId}','${tier}')" title="Remove">×</span></span>`;
        }).join('')}
      </div>
    </div>`).join('');

  // Populate datalist (if it exists)
  var clEl = document.getElementById('companyList');
  if (clEl) clEl.innerHTML = Object.values(COMPANIES).flat().map(c=>`<option value="${c}">`).join('');
}

// ─── COMPANY MANAGER ──────────────────────────────────────────────────────
function openCoManager()   { renderCoManagerList(); document.getElementById('coManagerModal').classList.add('open'); }
function closeCoManager()  { document.getElementById('coManagerModal').classList.remove('open'); renderTierList(); }
function renderCoManagerList() {
  const COMPANIES = getCompanies();
  document.getElementById('coManagerList').innerHTML = Object.entries(COMPANIES).map(([tier,cos]) => `
    <div class="co-mgr-section">
      <div class="co-mgr-section-title" style="color:${TIER_HDR_COLORS[tier]}">${TIER_NAMES[tier]}</div>
      ${cos.length===0?'<div style="font-size:11px;color:#a0aec0;padding:3px 0">No companies</div>':''}
      ${cos.map(co=>`<div class="co-mgr-row">
        <span class="co-mgr-name">${co}</span>
        <select class="co-mgr-tier" onchange="recheckCompany('${co.replace(/'/g,"\\'")}',this.value)">
          ${[1,2,3,4].map(t=>`<option value="${t}" ${t==tier?'selected':''}>${TIER_NAMES[t]}</option>`).join('')}
        </select>
        <button class="co-mgr-del" onclick="deleteCompany('${co.replace(/'/g,"\\'")}','${tier}')">✕</button>
      </div>`).join('')}
    </div>`).join('');
}
function recheckCompany(co, newTier) {
  const cos = getCompanies();
  [1,2,3,4].forEach(t=>{ cos[t]=(cos[t]||[]).filter(c=>c!==co); });
  if (!cos[newTier]) cos[newTier]=[];
  cos[newTier].push(co);
  saveCompaniesData(cos); renderCoManagerList();
}
function deleteCompany(co, tier) {
  const cos = getCompanies(); cos[tier]=cos[tier].filter(c=>c!==co);
  saveCompaniesData(cos); renderCoManagerList();
}
function addCompany() {
  const name = document.getElementById('new-co-name').value.trim();
  const tier = document.getElementById('new-co-tier').value;
  if (!name) return;
  const cos = getCompanies();
  if (!cos[tier]) cos[tier]=[];
  if (!cos[tier].includes(name)) cos[tier].push(name);
  saveCompaniesData(cos);
  document.getElementById('new-co-name').value = '';
  renderCoManagerList();
}
document.getElementById('new-co-name').addEventListener('keydown', e => { if(e.key==='Enter') addCompany(); });
document.getElementById('coManagerModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeCoManager(); });

// ─── NETWORKING NUDGES ────────────────────────────────────────────────────
let nudgeOffset = 0;
function renderNudges() {
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
function refreshNudges()      { nudgeOffset += 2; renderNudges(); }
function markNudgeDone(btn)   { btn.closest('.nudge-card').style.opacity='0.4'; btn.textContent='✓ Done'; btn.disabled=true; }

// ─── ADD MODAL ────────────────────────────────────────────────────────────
let currentStageForAdd = 'tracking';
function openAddModal(stage) {
  currentStageForAdd = stage || 'tracking';
  document.getElementById('f-stage').value = currentStageForAdd;
  ['f-company','f-role','f-url','f-notes'].forEach(id => document.getElementById(id).value='');
  document.getElementById('f-tier').value = '1';
  document.getElementById('f-last-contacted').value = '';
  document.getElementById('f-src-out').checked    = true;
  document.getElementById('f-cm-none').checked    = true;
  document.getElementById('f-ref-none').checked   = true;
  document.getElementById('addModal').classList.add('open');
}
function openAddModalCo(company, tier) {
  openAddModal('tracking');
  document.getElementById('f-company').value = company;
  document.getElementById('f-tier').value    = tier;
}
function closeModal() { document.getElementById('addModal').classList.remove('open'); }
function saveRole() {
  const stage = document.getElementById('f-stage').value;
  const newRole = {
    id: Date.now().toString(),
    company: document.getElementById('f-company').value,
    roleTitle: document.getElementById('f-role').value,
    stage,
    tier: document.getElementById('f-tier').value,
    url: document.getElementById('f-url').value,
    notes: document.getElementById('f-notes').value,
    source: document.querySelector('input[name="f-source"]:checked').value,
    lastContactedDate:   document.getElementById('f-last-contacted').value || '',
    lastContactedMethod: document.querySelector('input[name="f-contact-method"]:checked').value || '',
    referral: document.querySelector('input[name="f-referral"]:checked').value || '',
    stageHistory: [{ stage, ts: new Date().toISOString() }],
    date: new Date().toISOString()
  };
  const roles = loadRoles();
  roles.push(newRole);
  saveRoles(roles);
  closeModal();
  renderAll();
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────
function openEditModal(id) {
  const r = loadRoles().find(x => x.id===id);
  if (!r) return;
  document.getElementById('ef-id').value      = id;
  document.getElementById('ef-company').value  = r.company;
  document.getElementById('ef-role').value     = r.roleTitle;
  document.getElementById('ef-stage').value    = r.stage;
  document.getElementById('ef-tier').value     = r.tier;
  document.getElementById('ef-url').value      = r.url||'';
  document.getElementById('ef-notes').value    = r.notes||'';
  document.getElementById('ef-last-contacted').value = r.lastContactedDate||'';
  const src = r.source||'outbound';
  document.getElementById(src==='inbound'?'ef-src-in':'ef-src-out').checked = true;
  const cm = r.lastContactedMethod||'';
  const cmEl = document.querySelector(`input[name="ef-contact-method"][value="${cm}"]`);
  if (cmEl) cmEl.checked=true; else document.getElementById('ef-cm-none').checked=true;
  const ref = r.referral||'';
  const refEl = document.querySelector(`input[name="ef-referral"][value="${ref}"]`);
  if (refEl) refEl.checked=true; else document.getElementById('ef-ref-none').checked=true;

  // Stage history
  const histEl = document.getElementById('ef-stage-history');
  const itemsEl = document.getElementById('ef-history-items');
  if (r.stageHistory && r.stageHistory.length > 0) {
    histEl.style.display = 'block';
    itemsEl.innerHTML = r.stageHistory.map((h,i) => {
      const d = new Date(h.ts);
      const dateStr = d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      return `${i>0?'<span class="sh-arrow">→</span>':''}<span class="sh-item"><span class="sh-dot" style="background:${STAGE_COLORS[h.stage]||'#a0aec0'}"></span>${STAGE_ICONS[h.stage]||''} ${STAGE_LABELS[h.stage]||h.stage} <span class="sh-date">${dateStr}</span></span>`;
    }).join('');
  } else {
    histEl.style.display = 'none';
  }

  document.getElementById('editModal').classList.add('open');
}
function closeEditModal() { document.getElementById('editModal').classList.remove('open'); }
function updateRole() {
  const id    = document.getElementById('ef-id').value;
  const roles = loadRoles();
  const idx   = roles.findIndex(x => x.id===id);
  if (idx===-1) return;
  const newStage = document.getElementById('ef-stage').value;
  let updated = { ...roles[idx],
    company:    document.getElementById('ef-company').value,
    roleTitle:  document.getElementById('ef-role').value,
    tier:       document.getElementById('ef-tier').value,
    url:        document.getElementById('ef-url').value,
    notes:      document.getElementById('ef-notes').value,
    source:     document.querySelector('input[name="ef-source"]:checked').value,
    lastContactedDate:   document.getElementById('ef-last-contacted').value||'',
    lastContactedMethod: document.querySelector('input[name="ef-contact-method"]:checked').value||'',
    referral:   document.querySelector('input[name="ef-referral"]:checked').value||'',
  };
  if (updated.stage !== newStage) updated = pushStageHistory(updated, newStage);
  roles[idx] = updated;
  saveRoles(roles);
  closeEditModal();
  renderAll();
}
function deleteRole() {
  if (!confirm('Remove this role from your pipeline?')) return;
  const id = document.getElementById('ef-id').value;
  saveRoles(loadRoles().filter(x=>x.id!==id));
  closeEditModal();
  renderAll();
}
document.getElementById('addModal').addEventListener('click',  e => { if(e.target===e.currentTarget) closeModal(); });
document.getElementById('editModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeEditModal(); });

// ─── CONTACT LOG ──────────────────────────────────────────────────────────
function renderContactLog() {
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
  const cmLabel = { email:'✉️ Email', linkedin:'💼 LinkedIn', other:'💬 Other' };

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
      stageEventHtml = `<span class="contact-log-applied">📨 Outreach <strong>${new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong></span>`;
    } else if (appliedStages.has(r.stage) && r.date) {
      stageEventHtml = `<span class="contact-log-applied">📤 Applied <strong>${new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</strong></span>`;
    }
    let contactHtml = '';
    if (r.lastContactedDate) {
      const d = new Date(r.lastContactedDate+'T12:00:00');
      const days = Math.floor((today-d)/86400000);
      const stale = days>=7;
      const label = days===0?'today':days===1?'1d ago':`${days}d ago`;
      const mb = r.lastContactedMethod ? `<span class="mini-badge contact-${r.lastContactedMethod}">${cmLabel[r.lastContactedMethod]}</span> ` : '';
      contactHtml = `<span class="${stale?'contact-stale':'contact-log-date'}">${mb}${stale?'⚠️ ':''}${label}</span>`;
    } else {
      contactHtml = `<span class="contact-log-never">no outreach logged</span>`;
    }
    const refBadge = r.referral==='referred' ? `<span class="mini-badge referral-badge-referred">🤝</span> `
      : r.referral==='cold' ? `<span class="mini-badge referral-badge-cold">🧊</span> ` : '';
    const stageBadge = STAGE_BADGE[r.stage]
      ? `<span style="font-size:9px;background:#f0f4f8;padding:1px 5px;border-radius:6px;color:#4a5568">${STAGE_BADGE[r.stage].title}</span>` : '';

    return `<div class="contact-log-row" onclick="openEditModal('${r.id}')" title="Click to edit">
      <div class="contact-log-co">${r.company}</div>
      <div class="contact-log-role">${r.roleTitle} ${stageBadge}</div>
      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        ${refBadge}${stageEventHtml}
        ${stageEventHtml&&contactHtml?'<span style="color:#e2e8f0;font-size:9px">·</span>':''}
        ${contactHtml}
      </div>
    </div>`;
  }).join('');
}

// ─── LINKEDIN NETWORK MAP ─────────────────────────────────────────────────
function normalizeCompanyName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/,?\s*(inc\.?|ltd\.?|llc|corp\.?|co\.?|plc|l\.?p\.?|gmbh|ag|s\.?a\.?|n\.?v\.?)$/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let _connectionCache = null;
function getLinkedInData() {
  if (_connectionCache) return _connectionCache;
  try {
    _connectionCache = JSON.parse(localStorage.getItem('ili_linkedin_connections'));
  } catch(e) { _connectionCache = null; }
  return _connectionCache;
}

function getConnectionsForCompany(companyName) {
  const data = getLinkedInData();
  if (!data || !data.connections) return [];
  const norm = normalizeCompanyName(companyName);
  if (!norm) return [];
  return data.connections.filter(c => {
    const cn = normalizeCompanyName(c.company);
    // Skip connections with no company listed
    if (!cn) return false;
    // Both must be at least 3 chars to avoid spurious substring matches
    if (cn.length < 3 || norm.length < 3) return cn === norm;
    // Exact normalized match
    if (cn === norm) return true;
    // Word-boundary substring: only match if the shorter string appears
    // as a complete word segment (e.g. "workday" won't match "day")
    if (cn.length >= norm.length) {
      // Check if norm appears in cn as a word boundary match
      const idx = cn.indexOf(norm);
      if (idx !== -1) {
        const before = idx === 0 || cn[idx - 1] === ' ';
        const after = idx + norm.length === cn.length || cn[idx + norm.length] === ' ';
        if (before && after) return true;
      }
    } else {
      const idx = norm.indexOf(cn);
      if (idx !== -1) {
        const before = idx === 0 || norm[idx - 1] === ' ';
        const after = idx + cn.length === norm.length || norm[idx + cn.length] === ' ';
        if (before && after) return true;
      }
    }
    return false;
  });
}

function importLinkedInCSV(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    if (lines.length < 2) { alert('CSV appears empty.'); return; }

    // Parse header — LinkedIn CSVs sometimes have extra rows before the header
    let headerIdx = 0;
    let headers = [];
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.some(c => c.toLowerCase().includes('first name') || c.toLowerCase().includes('firstname'))) {
        headerIdx = i;
        headers = cols.map(h => h.trim().toLowerCase());
        break;
      }
    }
    if (!headers.length) {
      // Fallback: assume first row is header
      headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    }

    const iFirst = headers.findIndex(h => h.includes('first name') || h === 'firstname');
    const iLast  = headers.findIndex(h => h.includes('last name') || h === 'lastname');
    const iCo    = headers.findIndex(h => h === 'company');
    const iPos   = headers.findIndex(h => h === 'position');
    const iUrl   = headers.findIndex(h => h === 'url' || h.includes('profile'));
    const iDate  = headers.findIndex(h => h.includes('connected on') || h.includes('connected_on'));

    if (iFirst === -1 && iLast === -1) {
      alert('Could not find "First Name" or "Last Name" columns. Make sure this is a LinkedIn Connections CSV.');
      return;
    }

    const connections = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const firstName = (cols[iFirst] || '').trim();
      const lastName  = (cols[iLast]  || '').trim();
      if (!firstName && !lastName) continue;
      connections.push({
        firstName: firstName,
        lastName: lastName,
        fullName: (firstName + ' ' + lastName).trim(),
        company: iCo >= 0 ? (cols[iCo] || '').trim() : '',
        position: iPos >= 0 ? (cols[iPos] || '').trim() : '',
        url: iUrl >= 0 ? (cols[iUrl] || '').trim() : '',
        connectedOn: iDate >= 0 ? (cols[iDate] || '').trim() : ''
      });
    }

    const data = {
      importedAt: new Date().toISOString(),
      fileName: file.name,
      total: connections.length,
      connections: connections
    };
    _connectionCache = data;
    localStorage.setItem('ili_linkedin_connections', JSON.stringify(data));
    renderNetworkMap();
    renderPipeline();
    renderTierList();
    input.value = '';  // Reset file input
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i+1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else { current += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current); current = ''; }
      else current += ch;
    }
  }
  result.push(current);
  return result;
}

function renderNetworkMap() {
  const container = document.getElementById('networkMap');
  if (!container) return;
  const data = getLinkedInData();
  if (!data || !data.connections || data.connections.length === 0) {
    container.innerHTML = '<div class="network-empty">'
      + '<div style="font-size:24px;margin-bottom:6px">🔗</div>'
      + 'Import your LinkedIn connections to see warm intro paths.<br>'
      + '<span style="font-size:10px;color:#cbd5e0">LinkedIn → Settings → Data Privacy → Get a copy of your data → Connections</span>'
      + '</div>';
    return;
  }

  const roles = loadRoles();
  const companies = getCompanies();
  const allTargets = [...new Set([
    ...roles.map(r => r.company),
    ...Object.values(companies).flat()
  ])];

  // Match connections to target companies
  const matchMap = {};
  let totalMatched = 0;
  allTargets.forEach(co => {
    const matches = getConnectionsForCompany(co);
    if (matches.length) {
      matchMap[co] = matches;
      totalMatched += matches.length;
    }
  });

  const pipelineCos = [...new Set(roles.map(r => r.company))];
  const pipelineMatches = pipelineCos.filter(c => matchMap[c]);
  const tierCos = Object.values(companies).flat();
  const tierMatches = tierCos.filter(c => matchMap[c]);
  const coldPipeline = pipelineCos.filter(c => !matchMap[c]);

  const importDate = new Date(data.importedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  let html = '<div class="network-summary">'
    + '<div class="network-stat"><div class="num">' + data.total + '</div><div class="lbl">Connections</div></div>'
    + '<div class="network-stat"><div class="num">' + pipelineMatches.length + '</div><div class="lbl">Pipeline matches</div></div>'
    + '<div class="network-stat"><div class="num">' + tierMatches.length + '</div><div class="lbl">Tier list matches</div></div>'
    + '<div class="network-stat"><div class="num">' + coldPipeline.length + '</div><div class="lbl">Cold (no connections)</div></div>'
    + '</div>';

  // Filter support
  const q = filterQuery;

  // Pipeline matches
  let groupIdx = 0;
  if (pipelineMatches.length) {
    html += '<div style="font-size:11px;font-weight:700;color:#4a5568;text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">Pipeline — Warm Intros</div>';
    pipelineMatches.forEach(co => {
      if (q && !co.toLowerCase().includes(q)) return;
      const conns = matchMap[co];
      const gid = 'nm-grp-' + (groupIdx++);
      const safeCo = co.replace(/'/g, "\\'");
      const PREVIEW = 3;
      const personHtml = (c) => {
        const linkedIn = c.linkedInUrl ? ' href="' + c.linkedInUrl + '" target="_blank" style="color:var(--text-primary);text-decoration:none"' : '';
        return '<div class="network-person">' + (linkedIn ? '<a' + linkedIn + '>' : '') + c.fullName + (linkedIn ? '</a>' : '') + (c.position ? ' <span class="pos">— ' + c.position + '</span>' : '') + '</div>';
      };
      html += '<div class="network-group">'
        + '<div class="network-group-title" style="cursor:pointer" onclick="openConnPanel(\'' + safeCo + '\')">' + co + ' <span class="network-group-count">' + conns.length + ' connection' + (conns.length>1?'s':'') + ' →</span></div>'
        + conns.slice(0, PREVIEW).map(personHtml).join('')
        + (conns.length > PREVIEW ? '<div id="' + gid + '" style="display:none">' + conns.slice(PREVIEW).map(personHtml).join('') + '</div>'
          + '<div class="network-person" style="cursor:pointer;color:var(--accent-blue);font-weight:600" onclick="var el=document.getElementById(\'' + gid + '\');if(el.style.display===\'none\'){el.style.display=\'block\';this.textContent=\'▲ Show fewer\';}else{el.style.display=\'none\';this.textContent=\'▼ Show all ' + conns.length + ' connections\';}">▼ Show all ' + conns.length + ' connections</div>' : '')
        + '</div>';
    });
  }

  // Cold pipeline companies
  if (coldPipeline.length) {
    const coldVisible = q ? coldPipeline.filter(c => c.toLowerCase().includes(q)) : coldPipeline;
    if (coldVisible.length) {
      html += '<div style="font-size:11px;font-weight:700;color:#4a5568;text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px">Pipeline — No Connections (cold)</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      coldVisible.forEach(co => {
        html += '<span style="display:inline-block;font-size:10px;color:#a0aec0;background:#f7fafc;padding:2px 8px;border-radius:10px;border:1px solid #e2e8f0">' + co + '</span>';
      });
      html += '</div>';
    }
  }

  html += '<div style="font-size:9px;color:#cbd5e0;margin-top:10px">Imported ' + importDate + ' from ' + data.fileName + ' · <a href="#" onclick="event.preventDefault();document.getElementById(\'linkedinCsvInput\').click()" style="color:#2e75b6;text-decoration:none">Re-import</a></div>';

  container.innerHTML = html;
}

// ─── COMPANY ARTIFACTS (File System Access API) ──────────────────────────
const ARTIFACT_DB_NAME = 'ili_artifact_db';
const ARTIFACT_STORE = 'handles';
let _artifactDirHandle = null;
let _artifactReady = false;
let _artifactUploadCompany = null; // Track which company an upload targets

function openArtifactDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(ARTIFACT_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ARTIFACT_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandleToDB(handle) {
  const db = await openArtifactDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARTIFACT_STORE, 'readwrite');
    tx.objectStore(ARTIFACT_STORE).put(handle, 'rootDir');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getHandleFromDB() {
  const db = await openArtifactDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARTIFACT_STORE, 'readonly');
    const req = tx.objectStore(ARTIFACT_STORE).get('rootDir');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function selectArtifactsFolder() {
  if (!window.showDirectoryPicker) {
    alert('Your browser does not support the File System Access API. Please use Chrome or Edge.');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    _artifactDirHandle = handle;
    _artifactReady = true;
    await saveHandleToDB(handle);
    localStorage.setItem('ili_artifacts_folder', handle.name);
    await syncFolderToIndex();
    renderArtifactManager();
    updateArtifactFolderStatus();
  } catch (e) {
    if (e.name !== 'AbortError') console.error('Folder selection failed:', e);
  }
}

async function getArtifactsHandle(interactive) {
  if (_artifactDirHandle) return _artifactDirHandle;
  try {
    const handle = await getHandleFromDB();
    if (!handle) return null;
    // Check if permission already granted
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') { _artifactDirHandle = handle; _artifactReady = true; return handle; }
    // Only prompt user if interactive (user clicked something)
    if (!interactive) return null;
    const req = await handle.requestPermission({ mode: 'readwrite' });
    if (req === 'granted') { _artifactDirHandle = handle; _artifactReady = true; return handle; }
    return null;
  } catch (e) { return null; }
}

async function ensureCompanyFolder(company) {
  const root = await getArtifactsHandle(true);
  if (!root) return null;
  try { return await root.getDirectoryHandle(company, { create: true }); }
  catch (e) {
    // Sanitize company name for file system (remove invalid chars)
    const safe = company.replace(/[<>:"/\\|?*]/g, '_').trim();
    return await root.getDirectoryHandle(safe, { create: true });
  }
}

async function saveArtifactFile(company, fileName, blob) {
  const dir = await ensureCompanyFolder(company);
  if (!dir) return false;
  try {
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    // Update index
    const index = getArtifactIndex();
    const existing = index.artifacts.find(a => a.company === company && a.fileName === fileName);
    if (existing) {
      existing.modified = new Date().toISOString();
      existing.size = blob.size;
    } else {
      index.artifacts.push({
        id: 'a_' + Date.now(),
        company: company,
        type: detectArtifactType(fileName),
        fileName: fileName,
        label: fileName,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        size: blob.size
      });
    }
    saveArtifactIndex(index);
    return true;
  } catch (e) { console.error('Save artifact failed:', e); return false; }
}

async function deleteArtifactFile(company, fileName) {
  const dir = await ensureCompanyFolder(company);
  if (!dir) return false;
  try {
    await dir.removeEntry(fileName);
    const index = getArtifactIndex();
    index.artifacts = index.artifacts.filter(a => !(a.company === company && a.fileName === fileName));
    saveArtifactIndex(index);
    return true;
  } catch (e) { console.error('Delete artifact failed:', e); return false; }
}

async function openArtifactFile(company, fileName) {
  const dir = await ensureCompanyFolder(company);
  if (!dir) return;
  try {
    const fh = await dir.getFileHandle(fileName);
    const file = await fh.getFile();
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  } catch (e) { console.error('Open artifact failed:', e); }
}

function detectArtifactType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['pdf', 'docx', 'doc'].includes(ext)) return 'resume';
  if (['pptx', 'ppt', 'key'].includes(ext)) return 'slides';
  if (ext === 'html' && fileName.includes('research')) return 'research_brief';
  if (['md', 'txt'].includes(ext)) return 'notes';
  return 'other';
}

function artifactTypeIcon(type) {
  const icons = { resume: '📄', research_brief: '🔬', deep_research: '🔍', slides: '📊', notes: '📝', other: '📎' };
  return icons[type] || '📎';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getArtifactIndex() {
  try { return JSON.parse(localStorage.getItem('ili_artifacts')) || { artifacts: [] }; }
  catch { return { artifacts: [] }; }
}
function saveArtifactIndex(index) {
  localStorage.setItem('ili_artifacts', JSON.stringify(index));
}
function getCompanyArtifacts(company) {
  return getArtifactIndex().artifacts.filter(a => a.company === company);
}

async function syncFolderToIndex() {
  const root = await getArtifactsHandle(false);
  if (!root) return;
  const index = getArtifactIndex();
  const found = new Set();
  try {
    for await (const [name, handle] of root.entries()) {
      if (handle.kind !== 'directory') continue;
      const company = name;
      for await (const [fname, fhandle] of handle.entries()) {
        if (fhandle.kind !== 'file') continue;
        const key = company + '/' + fname;
        found.add(key);
        const exists = index.artifacts.find(a => a.company === company && a.fileName === fname);
        if (!exists) {
          const file = await fhandle.getFile();
          index.artifacts.push({
            id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            company: company,
            type: detectArtifactType(fname),
            fileName: fname,
            label: fname,
            created: new Date(file.lastModified).toISOString(),
            modified: new Date(file.lastModified).toISOString(),
            size: file.size
          });
        }
      }
    }
    // Remove stale entries
    index.artifacts = index.artifacts.filter(a => found.has(a.company + '/' + a.fileName));
    saveArtifactIndex(index);
  } catch (e) { console.error('Sync failed:', e); }
}

function updateArtifactFolderStatus() {
  const el = document.getElementById('artifactFolderStatus');
  const btn = document.getElementById('artifactFolderBtn');
  if (!el || !btn) return;
  const folderName = localStorage.getItem('ili_artifacts_folder');
  if (_artifactReady && folderName) {
    el.textContent = '📂 ' + folderName;
    btn.textContent = '🔄 Sync';
    btn.onclick = async function() { await syncFolderToIndex(); renderArtifactManager(); renderPipeline(); showArtifactToast('Artifacts synced!'); };
  } else {
    el.textContent = '';
    btn.textContent = '📁 Set Folder';
    btn.onclick = selectArtifactsFolder;
  }
}

function showArtifactToast(msg) {
  const t = document.createElement('div');
  t.className = 'artifact-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2000);
}

async function handleArtifactUpload(input) {
  if (!input.files.length || !_artifactUploadCompany) return;
  const company = _artifactUploadCompany;
  for (const file of input.files) {
    await saveArtifactFile(company, file.name, file);
  }
  input.value = '';
  _artifactUploadCompany = null;
  renderArtifactManager();
  renderPipeline();
  showArtifactToast(input.files.length + ' file(s) added to ' + company);
}

function uploadArtifactFor(company) {
  _artifactUploadCompany = company;
  document.getElementById('artifactFileInput').click();
}

async function renderArtifactManager() {
  const container = document.getElementById('artifactManager');
  if (!container) return;
  const handle = await getArtifactsHandle(false);

  if (!handle) {
    container.innerHTML = '<div class="artifact-empty">'
      + '<div style="font-size:24px;margin-bottom:6px">📁</div>'
      + 'Select a folder to store company-specific files<br>'
      + '<span style="font-size:10px;color:var(--text-faintest)">Resumes, research briefs, slides, interview notes — organized by company</span>'
      + '</div>';
    updateArtifactFolderStatus();
    return;
  }

  updateArtifactFolderStatus();
  const index = getArtifactIndex();
  const roles = loadRoles();
  const companies = getCompanies();
  // Get all unique companies from pipeline + tiers + artifacts
  const allCo = [...new Set([
    ...roles.map(r => r.company),
    ...Object.values(companies).flat(),
    ...index.artifacts.map(a => a.company)
  ])].sort();

  const totalFiles = index.artifacts.length;
  const companiesWithFiles = [...new Set(index.artifacts.map(a => a.company))].length;

  let html = '<div class="artifact-summary">';
  html += '<div class="artifact-stat"><div class="num">' + totalFiles + '</div><div class="lbl">Files</div></div>';
  html += '<div class="artifact-stat"><div class="num">' + companiesWithFiles + '</div><div class="lbl">Companies</div></div>';
  html += '<div class="artifact-stat"><div class="num">' + index.artifacts.filter(a => a.type === 'research_brief').length + '</div><div class="lbl">Briefs</div></div>';
  html += '</div>';

  allCo.forEach(co => {
    const arts = index.artifacts.filter(a => a.company === co);
    const chevron = arts.length > 0 ? '▾' : '▸';
    html += '<div class="artifact-company">';
    html += '<div class="artifact-company-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">';
    html += '<span>' + chevron + '</span> ' + co;
    html += '<span class="count">' + (arts.length ? arts.length + ' file' + (arts.length > 1 ? 's' : '') : 'empty') + '</span>';
    html += '</div>';
    html += '<div class="artifact-company-body' + (arts.length > 0 ? '' : '') + '">';
    if (arts.length === 0) {
      html += '<div style="font-size:10px;color:var(--text-faint);padding:4px 0">No files yet</div>';
    }
    arts.forEach(a => {
      const dateStr = a.modified ? new Date(a.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      html += '<div class="artifact-row">';
      html += '<span class="a-icon">' + artifactTypeIcon(a.type) + '</span>';
      html += '<span class="a-name" title="' + a.fileName + '">' + a.fileName + '</span>';
      html += '<span class="a-size">' + formatFileSize(a.size) + '</span>';
      html += '<span class="a-date">' + dateStr + '</span>';
      html += '<button class="a-btn" onclick="openArtifactFile(\'' + a.company.replace(/'/g, "\\'") + '\',\'' + a.fileName.replace(/'/g, "\\'") + '\')">Open</button>';
      html += '<button class="a-btn a-btn-del" onclick="if(confirm(\'Delete ' + a.fileName.replace(/'/g, "\\'") + '?\'))deleteArtifactFile(\'' + a.company.replace(/'/g, "\\'") + '\',\'' + a.fileName.replace(/'/g, "\\'") + '\').then(()=>{renderArtifactManager();renderPipeline();})">×</button>';
      html += '</div>';
    });
    html += '<div class="artifact-upload-row">';
    html += '<button class="artifact-upload-btn" onclick="uploadArtifactFor(\'' + co.replace(/'/g, "\\'") + '\')">+ Add File</button>';
    html += '</div>';
    html += '</div></div>';
  });

  container.innerHTML = html;
}

async function autoSaveResearchBrief(company, role, htmlContent) {
  if (!_artifactReady) return;
  const safeName = 'research_brief_' + role.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '.html';
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const saved = await saveArtifactFile(company, safeName, blob);
  if (saved) {
    renderArtifactManager();
    showArtifactToast('Brief saved to ' + company + '/' + safeName);
  }
}

// Initialize artifact system on load
async function initArtifacts() {
  if (!window.showDirectoryPicker) {
    updateArtifactFolderStatus();
    renderArtifactManager();
    return;
  }
  // Non-interactive: only use handle if permission already granted (no browser prompt)
  const handle = await getArtifactsHandle(false);
  if (handle) {
    await syncFolderToIndex();
  }
  updateArtifactFolderStatus();
  renderArtifactManager();
}

// ─── VIEW SWITCHING ENGINE ─────────────────────────────────────────────────
let currentView = localStorage.getItem('ili_lastView') || 'dashboard';
let currentCompany = localStorage.getItem('ili_lastCompany') || null;

const STAGE_COLORS_MAP = { tracking:'#4a5568', outreach:'#0e7490', applied:'#2e75b6', screen:'#7c3aed', interview:'#d97706', offer:'#16a34a' };
const STAGE_ICONS_MAP  = { tracking:'👀', outreach:'📨', applied:'📤', screen:'📞', interview:'🎯', offer:'🎉' };

function switchView(viewName, company) {
  currentView = viewName;
  if (viewName === 'company-profile' && company) {
    currentCompany = company;
    localStorage.setItem('ili_lastCompany', company);
  }
  localStorage.setItem('ili_lastView', viewName);

  // Update nav active state
  document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + viewName);
  if (navBtn) navBtn.classList.add('active');

  renderActiveView();
}

function renderActiveView() {
  const container = document.getElementById('mainView');
  switch (currentView) {
    case 'dashboard':   renderDashboardView(container); break;
    case 'pipeline':    currentView = 'dashboard'; renderDashboardView(container); break; // merged into dashboard
    case 'companies':   renderCompaniesListView(container); break;
    case 'tierlist':    renderTierListView(container); break;
    case 'company-profile': renderCompanyProfileView(container, currentCompany); break;
    default: renderDashboardView(container);
  }
}

// ── Helper: get all unique companies across all data sources ──
function getAllTrackedCompanies() {
  const cos = getCompanies();
  const roles = loadRoles();
  const connData = getLinkedInData();
  const artifactIdx = getArtifactIndex();
  const briefs = JSON.parse(localStorage.getItem('ili_research_briefs') || '[]');

  const companyMap = {}; // name -> { tier, roles, connections, artifacts, briefs, contacts, lastContact }

  // From tier list
  Object.entries(cos).forEach(([tier, list]) => {
    list.forEach(name => {
      const key = name.toLowerCase();
      if (!companyMap[key]) companyMap[key] = { name, tier: null, roles: [], connections: [], artifacts: [], briefs: [], lastContact: null };
      companyMap[key].tier = tier;
      companyMap[key].name = name; // preserve original casing from tier list
    });
  });

  // From pipeline roles
  roles.forEach(r => {
    const key = r.company.toLowerCase();
    if (!companyMap[key]) companyMap[key] = { name: r.company, tier: null, roles: [], connections: [], artifacts: [], briefs: [], lastContact: null };
    companyMap[key].roles.push(r);
    // Track tier from role if not set from tier list
    if (!companyMap[key].tier && r.tier) companyMap[key].tier = r.tier;
    // Track last contact
    if (r.lastContactedDate) {
      const d = new Date(r.lastContactedDate + 'T12:00:00');
      if (!companyMap[key].lastContact || d > companyMap[key].lastContact) companyMap[key].lastContact = d;
    }
    if (r.date) {
      const d = new Date(r.date);
      if (!companyMap[key].lastContact || d > companyMap[key].lastContact) companyMap[key].lastContact = d;
    }
  });

  // Connections
  if (connData && connData.connections) {
    connData.connections.forEach(c => {
      if (!c.company) return;
      // Find matching company in map
      const normC = normalizeCompanyName(c.company);
      const matchKey = Object.keys(companyMap).find(k => normalizeCompanyName(k) === normC);
      if (matchKey) {
        companyMap[matchKey].connections.push(c);
      }
    });
  }

  // Artifacts
  (artifactIdx.artifacts || []).forEach(a => {
    if (!a.company) return;
    const key = a.company.toLowerCase();
    if (companyMap[key]) companyMap[key].artifacts.push(a);
  });

  // Briefs
  briefs.forEach(b => {
    const key = b.company.toLowerCase();
    if (companyMap[key]) companyMap[key].briefs.push(b);
  });

  return companyMap;
}

function getContactLogForCompany(companyName) {
  const roles = loadRoles().filter(r => r.company.toLowerCase() === companyName.toLowerCase());
  return roles;
}

function getResearchBriefsForCompany(companyName) {
  const briefs = JSON.parse(localStorage.getItem('ili_research_briefs') || '[]');
  return briefs.filter(b => b.company.toLowerCase() === companyName.toLowerCase());
}

// ── Dashboard View (includes Pipeline) ──
function renderDashboardView(container) {
  const roles = loadRoles();
  const stageCounts = {};
  STAGES.forEach(s => { stageCounts[s] = roles.filter(r => r.stage === s).length; });
  const totalCompanies = Object.values(getCompanies()).flat().length;
  const connData = getLinkedInData();
  const totalConns = connData ? connData.connections.filter(c => {
    const normC = normalizeCompanyName(c.company);
    const allCos = [...Object.values(getCompanies()).flat(), ...roles.map(r => r.company)];
    return allCos.some(co => normalizeCompanyName(co) === normC);
  }).length : 0;

  container.innerHTML = `
    <div class="quick-stats">
      <div class="quick-stat-box"><div class="num">${stageCounts.tracking}</div><div class="lbl">👀 Tracking</div></div>
      <div class="quick-stat-box"><div class="num" style="color:#0e7490">${stageCounts.outreach}</div><div class="lbl">📨 Outreach</div></div>
      <div class="quick-stat-box"><div class="num">${stageCounts.applied}</div><div class="lbl">📤 Applied</div></div>
      <div class="quick-stat-box"><div class="num" style="color:#7c3aed">${stageCounts.screen + stageCounts.interview}</div><div class="lbl">🎯 Active</div></div>
      <div class="quick-stat-box"><div class="num" style="color:#16a34a">${stageCounts.offer}</div><div class="lbl">🎉 Offers</div></div>
      <div class="quick-stat-box"><div class="num">${totalCompanies}</div><div class="lbl">🏢 Companies</div></div>
      <div class="quick-stat-box"><div class="num" style="color:#16a34a">${totalConns}</div><div class="lbl">🔗 Warm Intros</div></div>
    </div>

    <!-- Pipeline (inline) -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-title" style="margin-bottom:10px">
        <span class="dot" style="background:#d97706"></span>Application Pipeline
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <div class="search-bar-wrap" style="margin:0">
            <input class="search-bar" id="pipelineSearch" placeholder="Filter companies…" oninput="applyFilter(this.value)" style="width:180px" value="${filterQuery || ''}">
            <button class="search-clear" id="searchClearBtn" onclick="clearFilter()" style="${filterQuery ? '' : 'display:none'}">✕ Clear</button>
            <span class="filter-count" id="filterCount" style="display:none"></span>
          </div>
          <button onclick="openAddModal()" style="padding:5px 13px;background:var(--accent-blue);color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">+ Add Role</button>
        </div>
      </div>
      <div class="pipeline">
        ${STAGES.map(s => `
          <div class="pipeline-col col-${s}" id="col-${s}">
            <div class="pipeline-col-header"><span style="color:${STAGE_COLORS_MAP[s]}">${STAGE_ICONS_MAP[s]} ${STAGE_LABELS[s]}</span> <span class="pipeline-col-count" id="cnt-${s}">0</span></div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Action items & details -->
    <div class="grid2">
      <div class="card today-card">
        <div class="card-title"><span class="dot" style="background:#2e75b6"></span>Today's Action Items</div>
        <div id="todayActions"></div>
      </div>
      <div class="card">
        <div class="card-title"><span class="dot" style="background:#16a34a"></span>Role Fit Quick-Check</div>
        <div id="quickCheck"></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">
        <span class="dot" style="background:#2e75b6"></span>Recent Research Briefs
        <span style="margin-left:6px;font-size:10px;color:var(--text-faint);font-weight:400;text-transform:none;letter-spacing:0">interview prep — saved locally</span>
        <button onclick="openResearchModal()" style="margin-left:auto;padding:3px 10px;background:var(--accent-blue);border:none;border-radius:5px;font-size:10px;color:white;cursor:pointer;font-weight:600">+ New Brief</button>
      </div>
      <div id="recentBriefs"></div>
    </div>
    <div class="grid2">
      <div class="card">
        <div class="card-title"><span class="dot" style="background:#7c3aed"></span>Today's Networking Nudges</div>
        <div id="networkNudges"></div>
        <button onclick="refreshNudges()" style="width:100%;padding:7px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:7px;font-size:11px;color:var(--text-secondary);cursor:pointer;margin-top:7px">↻ Refresh nudges</button>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">
          <span class="dot" style="background:#7c3aed"></span>Contact Log
          <span style="margin-left:6px;font-size:10px;color:var(--text-faint);font-weight:400;text-transform:none;letter-spacing:0">outreach & applications</span>
        </div>
        <div id="contactLog"></div>
      </div>
    </div>
  `;
  renderPipeline();
  renderTodayActions();
  renderQuickCheck();
  renderRecentBriefs();
  renderNudges();
  renderContactLog();
}

// ── Tier List View ──
function renderTierListView(container) {
  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="dot" style="background:#1a3a5c"></span>Target Company List
        <div style="margin-left:auto;display:flex;gap:5px">
          <button id="editModeBtn" onclick="toggleEditMode()" style="padding:3px 10px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:10px;color:var(--text-secondary);cursor:pointer">✏️ Edit</button>
          <button onclick="openCoManager()" style="padding:3px 10px;background:var(--accent-blue);color:white;border:none;border-radius:5px;font-size:10px;font-weight:600;cursor:pointer">+ Add/Remove</button>
        </div>
      </div>
      <div id="tierList"></div>
    </div>
    <div class="card" style="margin-top:14px;margin-bottom:14px">
      <div class="card-title">
        <span class="dot" style="background:#16a34a"></span>LinkedIn Network Map
        <span style="margin-left:6px;font-size:10px;color:var(--text-faint);font-weight:400;text-transform:none;letter-spacing:0">1st-degree connections mapped to pipeline</span>
        <button onclick="document.getElementById('linkedinCsvInput').click()" style="margin-left:auto;padding:3px 10px;background:#16a34a;border:none;border-radius:5px;font-size:10px;color:white;cursor:pointer;font-weight:600">📥 Import CSV</button>
      </div>
      <div id="networkMap"></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">
        <span class="dot" style="background:#d97706"></span>Company Artifacts
        <span class="artifact-folder-status" id="artifactFolderStatus"></span>
        <button id="artifactFolderBtn" onclick="selectArtifactsFolder()" style="margin-left:auto;padding:3px 10px;background:#d97706;border:none;border-radius:5px;font-size:10px;color:white;cursor:pointer;font-weight:600">📁 Set Folder</button>
      </div>
      <div id="artifactManager"></div>
    </div>
  `;
  renderTierList();
  renderNetworkMap();
  renderArtifactManager();
}

// ── All Companies View ──
function renderCompaniesListView(container) {
  const companyMap = getAllTrackedCompanies();
  const companies = Object.values(companyMap).sort((a, b) => {
    // Sort by tier (ascending), then by role count (desc), then name
    const ta = parseInt(a.tier) || 5, tb = parseInt(b.tier) || 5;
    if (ta !== tb) return ta - tb;
    if (b.roles.length !== a.roles.length) return b.roles.length - a.roles.length;
    return a.name.localeCompare(b.name);
  });

  container.innerHTML = `
    <div class="company-filter-bar">
      <input type="text" id="companySearchInput" placeholder="Search companies…" oninput="filterCompanyCards(this.value)">
      <button class="company-filter-btn" data-tier="all" onclick="filterCompanyByTier('all',this)">All</button>
      <button class="company-filter-btn" data-tier="1" onclick="filterCompanyByTier('1',this)">Tier 1</button>
      <button class="company-filter-btn" data-tier="2" onclick="filterCompanyByTier('2',this)">Tier 2</button>
      <button class="company-filter-btn" data-tier="3" onclick="filterCompanyByTier('3',this)">Tier 3</button>
      <button class="company-filter-btn" data-tier="4" onclick="filterCompanyByTier('4',this)">Tier 4</button>
      <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer;margin-left:8px">
        <input type="checkbox" id="filterWarmIntros" onchange="filterCompanyCards()"> Has warm intros
      </label>
      <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer">
        <input type="checkbox" id="filterInPipeline" onchange="filterCompanyCards()"> In pipeline
      </label>
    </div>
    <div class="company-card-grid" id="companyCardGrid">
      ${companies.map(co => {
        const tierClass = co.tier ? 'chip-t' + co.tier : '';
        const tierLabel = co.tier ? 'Tier ' + co.tier : 'Untiered';
        const lastContactStr = co.lastContact
          ? co.lastContact.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Never';
        const safeName = co.name.replace(/'/g, "\\'");
        const rolesHtml = co.roles.length ? co.roles.map(r => {
          const stageIcon = STAGE_ICONS_MAP[r.stage] || '📋';
          const stageColor = STAGE_COLORS_MAP[r.stage] || '#4a5568';
          const postingLink = r.url ? `<a href="${r.url}" target="_blank" onclick="event.stopPropagation()" style="color:var(--accent-blue);font-size:10px;text-decoration:none;margin-left:4px" title="View job posting">📄 Posting</a>` : '';
          return `<div style="display:flex;align-items:center;gap:5px;padding:2px 0;font-size:11px">
            <span style="color:${stageColor}" title="${STAGE_LABELS[r.stage] || r.stage}">${stageIcon}</span>
            <span style="color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${r.roleTitle || 'Untitled'}</span>
            ${postingLink}
          </div>`;
        }).join('') : '';

        const coLogoDomain = co.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
        const coAltLogos = {'jpmorgan chase':'jpmorganchase.com','jp morgan':'jpmorganchase.com','meta':'meta.com','trade desk':'thetradedesk.com','the trade desk':'thetradedesk.com','new relic':'newrelic.com','yahoo':'yahoo.com','datadog':'datadoghq.com','notion':'notion.so','block':'block.xyz','scale ai':'scale.com','snap':'snap.com','snapchat':'snap.com'};
        const coLogoDomainFinal = coAltLogos[co.name.toLowerCase()] || coLogoDomain;
        const coLogoFinal = 'https://logo.clearbit.com/' + coLogoDomainFinal + '?size=40';
        const coLogoFallback = 'https://www.google.com/s2/favicons?domain=' + coLogoDomainFinal + '&sz=64';
        const coInitial = co.name.charAt(0).toUpperCase();
        return `<div class="company-card" data-company="${co.name.toLowerCase()}" data-tier="${co.tier || ''}" data-roles="${co.roles.length}" data-conns="${co.connections.length}" onclick="switchView('company-profile','${safeName}')">
          <div class="company-card-name">
            <img src="${coLogoFinal}" alt="" style="width:32px;height:32px;border-radius:6px;border:1px solid var(--border-light);object-fit:contain;background:white;flex-shrink:0" onerror="this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'};this.src='${coLogoFallback}'">
            <span style="display:none;width:32px;height:32px;border-radius:6px;background:var(--accent-blue);color:white;font-size:14px;font-weight:700;align-items:center;justify-content:center;flex-shrink:0">${coInitial}</span>
            ${co.name}
            <span class="company-card-tier ${tierClass}" style="margin-left:auto">${tierLabel}</span>
          </div>
          ${rolesHtml ? `<div style="padding:4px 0 2px;border-top:1px solid var(--border-light);margin-top:4px">${rolesHtml}</div>` : ''}
          <div class="company-card-metrics">
            <div class="company-card-metric"><strong>${co.roles.length}</strong> roles</div>
            <div class="company-card-metric"><strong>${co.connections.length}</strong> connections</div>
            <div class="company-card-metric"><strong>${co.artifacts.length}</strong> artifacts</div>
            <div class="company-card-metric">📨 ${lastContactStr}</div>
          </div>
          <div class="company-card-actions">
            <button onclick="event.stopPropagation();openAddModalCo('${safeName}','${co.tier||1}')" style="padding:4px 10px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:10px;color:var(--text-secondary);cursor:pointer">+ Add Role</button>
            <button onclick="event.stopPropagation();openResearchModal('${safeName}','','')" style="padding:4px 10px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:10px;color:var(--text-secondary);cursor:pointer">🔬 Research</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${companies.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-faint)">No companies tracked yet. Add companies via the Tier List or Pipeline.</div>' : ''}
  `;
}

let companyTierFilter = 'all';
function filterCompanyByTier(tier, btn) {
  companyTierFilter = tier;
  document.querySelectorAll('.company-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterCompanyCards();
}
function filterCompanyCards(searchVal) {
  const search = (searchVal || (document.getElementById('companySearchInput') || {}).value || '').toLowerCase();
  const warmOnly = document.getElementById('filterWarmIntros') && document.getElementById('filterWarmIntros').checked;
  const pipelineOnly = document.getElementById('filterInPipeline') && document.getElementById('filterInPipeline').checked;

  document.querySelectorAll('.company-card').forEach(card => {
    const name = card.dataset.company;
    const tier = card.dataset.tier;
    const conns = parseInt(card.dataset.conns) || 0;
    const roles = parseInt(card.dataset.roles) || 0;

    let show = true;
    if (search && !name.includes(search)) show = false;
    if (companyTierFilter !== 'all' && tier !== companyTierFilter) show = false;
    if (warmOnly && conns === 0) show = false;
    if (pipelineOnly && roles === 0) show = false;

    card.style.display = show ? '' : 'none';
  });
}

// ── Company Profile View ──
function renderCompanyProfileView(container, companyName) {
  if (!companyName) { renderDashboardView(container); return; }

  const roles = loadRoles().filter(r => r.company.toLowerCase() === companyName.toLowerCase());
  const connections = getConnectionsForCompany(companyName);
  const artifacts = getCompanyArtifacts(companyName);
  const briefs = getResearchBriefsForCompany(companyName);
  const companies = getCompanies();
  let tier = null;
  Object.entries(companies).forEach(([t, cos]) => {
    if (cos.some(c => c.toLowerCase() === companyName.toLowerCase())) tier = t;
  });

  const tierLabel = tier ? `<span class="company-card-tier chip-t${tier}">Tier ${tier}</span>` : '';
  const safeName = companyName.replace(/'/g, "\\'");

  // Contact log (roles with outreach/application activity)
  const activeStages = new Set(['outreach', 'applied', 'screen', 'interview', 'offer']);
  const contactRoles = roles.filter(r => activeStages.has(r.stage) || r.lastContactedDate);

  // Company profile data (stored in localStorage)
  const profileKey = 'ili_company_profile_' + companyName.replace(/\W+/g, '_').toLowerCase();
  const savedProfile = JSON.parse(localStorage.getItem(profileKey) || 'null');
  const logoDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  const logoUrl = 'https://logo.clearbit.com/' + logoDomain + '?size=80';
  const altLogos = {
    'jpmorgan chase': 'jpmorganchase.com', 'jp morgan': 'jpmorganchase.com', 'meta': 'meta.com',
    'trade desk': 'thetradedesk.com', 'the trade desk': 'thetradedesk.com', 'new relic': 'newrelic.com',
    'verizon media': 'verizonmedia.com', 'yahoo': 'yahoo.com', 'google': 'google.com',
    'amazon': 'amazon.com', 'apple': 'apple.com', 'microsoft': 'microsoft.com', 'netflix': 'netflix.com',
    'nvidia': 'nvidia.com', 'salesforce': 'salesforce.com', 'stripe': 'stripe.com', 'openai': 'openai.com',
    'anthropic': 'anthropic.com', 'snap': 'snap.com', 'snapchat': 'snap.com', 'pinterest': 'pinterest.com',
    'uber': 'uber.com', 'lyft': 'lyft.com', 'airbnb': 'airbnb.com', 'doordash': 'doordash.com',
    'instacart': 'instacart.com', 'spotify': 'spotify.com', 'databricks': 'databricks.com',
    'snowflake': 'snowflake.com', 'datadog': 'datadoghq.com', 'mongodb': 'mongodb.com',
    'twilio': 'twilio.com', 'cloudflare': 'cloudflare.com', 'palantir': 'palantir.com',
    'coinbase': 'coinbase.com', 'robinhood': 'robinhood.com', 'square': 'squareup.com',
    'block': 'block.xyz', 'figma': 'figma.com', 'notion': 'notion.so', 'vercel': 'vercel.com',
    'plaid': 'plaid.com', 'brex': 'brex.com', 'ramp': 'ramp.com', 'scale ai': 'scale.com'
  };
  const domainOverride = altLogos[companyName.toLowerCase()];
  const finalLogoDomain = domainOverride || logoDomain;
  const finalLogoUrl = 'https://logo.clearbit.com/' + finalLogoDomain + '?size=80';
  const fallbackLogoUrl = 'https://www.google.com/s2/favicons?domain=' + finalLogoDomain + '&sz=128';
  const compInitial = companyName.charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="cp-breadcrumb">
      <a onclick="switchView('companies')">All Companies</a> &rsaquo;
      <strong>${companyName}</strong>
      ${tier ? ` &rsaquo; Tier ${tier}` : ''}
    </div>

    <div class="cp-header">
      <div class="cp-header-top" style="display:flex;align-items:center;gap:14px">
        <img src="${finalLogoUrl}" alt="${companyName}" style="width:56px;height:56px;border-radius:12px;border:1px solid var(--border-light);object-fit:contain;background:white" onerror="this.onerror=function(){this.style.display='none';this.nextElementSibling.style.display='flex'};this.src='${fallbackLogoUrl}'">
        <span style="display:none;width:56px;height:56px;border-radius:12px;background:var(--accent-blue);color:white;font-size:20px;font-weight:700;align-items:center;justify-content:center;flex-shrink:0">${compInitial}</span>
        <div>
          <h2>${companyName}</h2>
          ${tierLabel}
        </div>
      </div>
      <div class="cp-metrics">
        <div class="cp-metric"><strong>${roles.length}</strong> roles in pipeline</div>
        <div class="cp-metric"><strong>${connections.length}</strong> warm intros</div>
        <div class="cp-metric"><strong>${artifacts.length}</strong> artifacts</div>
        <div class="cp-metric"><strong>${briefs.length}</strong> research briefs</div>
      </div>
      <div class="cp-actions">
        <button onclick="openAddModalCo('${safeName}','${tier || 1}')">+ Add Role</button>
        <button onclick="openResearchModal('${safeName}','','')">🔬 Research</button>
        <button onclick="uploadArtifactFor('${safeName}')">📎 Upload File</button>
        <button onclick="switchView('${localStorage.getItem('ili_prevView') || 'companies'}')">← Back</button>
      </div>
    </div>

    <div class="cp-section" id="companyProfileSection">
      <h3>🏢 Company Profile</h3>
      <div id="companyProfileContent">
        ${savedProfile ? `
          <div class="cp-profile-grid">
            <div class="cp-profile-item"><div class="cp-profile-label">Mission</div><div>${savedProfile.mission || 'Not available'}</div></div>
            <div class="cp-profile-item"><div class="cp-profile-label">Approach Strategy</div><div>${savedProfile.approach || 'Not available'}</div></div>
            <div class="cp-profile-item"><div class="cp-profile-label">Fit Analysis</div><div>${savedProfile.fit || 'Not available'}</div></div>
          </div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button onclick="generateCompanyProfile('${safeName}')" style="padding:5px 12px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:6px;font-size:11px;color:var(--text-secondary);cursor:pointer">🔄 Refresh Profile</button>
          </div>
        ` : `
          <div style="padding:12px 0;color:var(--text-muted);font-size:12px">
            <p>Generate an AI-powered company profile with mission, approach strategy, and fit analysis.</p>
            <button onclick="generateCompanyProfile('${safeName}')" style="margin-top:8px;padding:7px 16px;background:var(--accent-blue);color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">🏢 Generate Company Profile</button>
          </div>
        `}
      </div>
    </div>

    <div class="cp-section">
      <h3>🎯 Roles in Pipeline <span class="count">(${roles.length})</span></h3>
      ${roles.length ? roles.map(r => {
        const stageColor = STAGE_COLORS_MAP[r.stage] || '#4a5568';
        const stageLabel = STAGE_LABELS[r.stage] || r.stage;
        const daysInStage = r.stageHistory && r.stageHistory.length
          ? Math.floor((Date.now() - new Date(r.stageHistory[r.stageHistory.length - 1].ts).getTime()) / 86400000)
          : '';
        return `<div class="cp-role-item">
          <span class="cp-role-stage" style="background:${stageColor}20;color:${stageColor};border:1px solid ${stageColor}40">${stageLabel}</span>
          <strong style="flex:1">${r.roleTitle}</strong>
          ${daysInStage !== '' ? `<span style="font-size:10px;color:var(--text-faint)">${daysInStage}d in stage</span>` : ''}
          <button class="btn-research" onclick="event.stopPropagation();openResearchModal('${safeName}','${(r.roleTitle||'').replace(/'/g,"\\'")}','${r.url||''}')" title="Research">🔬</button>
          <button onclick="openEditModal('${r.id}')" style="padding:3px 8px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:10px;color:var(--text-secondary);cursor:pointer">Edit</button>
        </div>`;
      }).join('') : '<div class="cp-empty">No roles tracked yet.</div>'}
      <button class="cp-add-btn" onclick="openAddModalCo('${safeName}','${tier || 1}')">+ Add another role</button>
    </div>

    <div class="cp-section">
      <h3>🔗 Warm Introductions <span class="count">(${connections.length})</span></h3>
      ${connections.length ? (() => {
        const TOP_SHOW = 3;
        const allConns = connections.map(c => {
          const linkedinUrl = c.url || ('https://www.linkedin.com/search/results/all/?keywords=' + encodeURIComponent(c.fullName));
          return `<div class="cp-conn-item">
            <a href="${linkedinUrl}" target="_blank" style="font-weight:600;color:var(--text-primary);text-decoration:none">${c.fullName}</a>
            <span style="color:var(--text-muted);flex:1">${c.position || ''}</span>
            <a href="${linkedinUrl}" target="_blank" style="font-size:10px;color:var(--accent-blue);text-decoration:none">🔗 Profile</a>
          </div>`;
        });
        const topHtml = allConns.slice(0, TOP_SHOW).join('');
        const moreHtml = allConns.length > TOP_SHOW
          ? `<div id="connMoreWrap_${safeName.replace(/[^a-zA-Z0-9]/g,'_')}" style="display:none">${allConns.slice(TOP_SHOW).join('')}</div>
             <button id="connMoreBtn_${safeName.replace(/[^a-zA-Z0-9]/g,'_')}" onclick="document.getElementById('connMoreWrap_${safeName.replace(/[^a-zA-Z0-9]/g,'_')}').style.display='block';this.style.display='none'" style="padding:4px 12px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:11px;color:var(--text-secondary);cursor:pointer;margin-top:4px">Show ${allConns.length - TOP_SHOW} more connections</button>`
          : '';
        return topHtml + moreHtml;
      })()
      : '<div class="cp-empty">No connections found at this company. Consider cold outreach or finding warm intros through mutual connections.</div>'}
    </div>

    <div class="cp-section">
      <h3>🔬 Research Briefs <span class="count">(${briefs.length})</span></h3>
      ${briefs.length ? briefs.map(b => {
        const date = new Date(b.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const hasCache = !!localStorage.getItem(b.storageKey + '_ai_research');
        return `<div class="cp-brief-item">
          <span style="flex:1"><strong>${b.role || 'General'}</strong> <span style="color:var(--text-faint)">${date}</span></span>
          ${hasCache ? `<button onclick="reopenBrief('${b.storageKey.replace(/'/g, "\\'")}')" style="padding:3px 8px;background:var(--accent-blue);color:white;border:none;border-radius:5px;font-size:10px;cursor:pointer">Open</button>` : ''}
          <button onclick="rerunBrief('${encodeURIComponent(JSON.stringify(b)).replace(/'/g, "\\'")}')" style="padding:3px 8px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:10px;color:var(--text-secondary);cursor:pointer">🔄</button>
        </div>`;
      }).join('') : '<div class="cp-empty">No research briefs generated yet.</div>'}
      <button class="cp-add-btn" onclick="openResearchModal('${safeName}','','')">+ Generate new brief</button>
    </div>

    <div class="cp-section">
      <h3>📨 Contact History <span class="count">(${contactRoles.length})</span></h3>
      ${contactRoles.length ? contactRoles.map(r => {
        const cmLabel = { email: '✉️ Email', linkedin: '💼 LinkedIn', other: '💬 Other' };
        let events = [];
        if (r.date && activeStages.has(r.stage)) {
          const d = new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          events.push(`<span style="color:var(--accent-blue)">${r.stage === 'outreach' ? '📨 Outreach' : '📤 Applied'} ${d}</span>`);
        }
        if (r.lastContactedDate) {
          const d = new Date(r.lastContactedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const m = r.lastContactedMethod ? cmLabel[r.lastContactedMethod] || '' : '';
          events.push(`<span>${m} ${d}</span>`);
        }
        return `<div class="cp-contact-item" onclick="openEditModal('${r.id}')" style="cursor:pointer" title="Click to edit">
          <strong style="min-width:120px">${r.roleTitle}</strong>
          <span style="flex:1;display:flex;gap:8px;flex-wrap:wrap">${events.join('')}</span>
        </div>`;
      }).join('') : '<div class="cp-empty">No outreach or applications logged yet.</div>'}
    </div>

    <div class="cp-section">
      <h3>📎 Company Artifacts <span class="count">(${artifacts.length})</span></h3>
      <div id="artifactManager"></div>
      <div id="artifactFolderStatus" class="artifact-folder-status" style="display:none"></div>
    </div>
  `;

  // Render artifacts for this specific company
  renderCompanyProfileArtifacts(companyName, artifacts);
}

async function renderCompanyProfileArtifacts(companyName, artifacts) {
  const mgr = document.getElementById('artifactManager');
  if (!mgr) return;

  if (!window.showDirectoryPicker) {
    mgr.innerHTML = '<div class="cp-empty">File System Access API not available in this browser. Use Chrome for full artifact support.</div>';
    return;
  }

  const handle = await getArtifactsHandle(false);
  if (!handle) {
    mgr.innerHTML = `<div class="artifact-empty">
      <div style="font-size:13px;margin-bottom:6px">No artifacts folder configured</div>
      <button onclick="selectArtifactsFolder().then(()=>switchView('company-profile','${companyName.replace(/'/g, "\\'")}'))" style="padding:6px 14px;background:#d97706;color:white;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer">📁 Set Folder</button>
    </div>`;
    return;
  }

  if (artifacts.length) {
    mgr.innerHTML = artifacts.map(a => `
      <div class="artifact-row">
        <span>${artifactTypeIcon(a.type)}</span>
        <strong style="flex:1;font-size:12px">${a.fileName}</strong>
        <span style="font-size:10px;color:var(--text-faint)">${formatFileSize(a.size)}</span>
        <button onclick="openArtifactFile('${companyName.replace(/'/g, "\\'")}','${a.fileName.replace(/'/g, "\\'")}')" style="padding:3px 8px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:5px;font-size:10px;color:var(--text-secondary);cursor:pointer">Open</button>
        <button onclick="deleteArtifactFile('${companyName.replace(/'/g, "\\'")}','${a.fileName.replace(/'/g, "\\'")}').then(()=>switchView('company-profile','${companyName.replace(/'/g, "\\'")}'))" style="padding:3px 8px;background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;border-radius:5px;font-size:10px;cursor:pointer">Delete</button>
      </div>
    `).join('');
  } else {
    mgr.innerHTML = '<div class="cp-empty">No artifacts for this company yet.</div>';
  }
  mgr.innerHTML += `<button class="cp-add-btn" onclick="uploadArtifactFor('${companyName.replace(/'/g, "\\'")}')">+ Upload file</button>`;
}

// ─── RENDER ALL (legacy compat) ───────────────────────────────────────────
function renderAll() {
  renderActiveView();
}

// ─── MIGRATION ────────────────────────────────────────────────────────────
// Ensures roles saved by older dashboard versions are compatible with new schema.
function migrateData() {
  const roles = loadRoles();
  if (!roles.length) return 0;
  let changed = false;
  roles.forEach(r => {
    // Back-fill stageHistory (new field — old roles don't have it)
    if (!r.stageHistory) {
      r.stageHistory = [{ stage: r.stage || 'tracking', ts: r.date || new Date().toISOString() }];
      changed = true;
    }
    // Back-fill source (default outbound)
    if (!r.source) { r.source = 'outbound'; changed = true; }
    // Back-fill contact / referral fields
    if (r.lastContactedDate   === undefined) { r.lastContactedDate   = ''; changed = true; }
    if (r.lastContactedMethod === undefined) { r.lastContactedMethod = ''; changed = true; }
    if (r.referral            === undefined) { r.referral            = ''; changed = true; }
    // Ensure stage is one of the known STAGES values
    if (!STAGES.includes(r.stage)) { r.stage = 'tracking'; changed = true; }
    // Ensure tier is a string (old data sometimes stored as number)
    if (typeof r.tier === 'number') { r.tier = String(r.tier); changed = true; }
  });
  if (changed) {
    saveRoles(roles);
    console.log(`[Dashboard] Migrated ${roles.length} role(s) to current schema.`);
  }
  return roles.length;
}

// ─── RESEARCH MODAL ───────────────────────────────────────────────────────
function openResearchModal(company, roleTitle, url) {
  document.getElementById('rm-company').value      = company   || '';
  document.getElementById('rm-role').value         = roleTitle || '';
  document.getElementById('rm-url').value          = url       || '';
  const iv = document.getElementById('rm-interviewers');
  if (iv) iv.value = '';
  // Restore saved API key
  const savedKey = localStorage.getItem('ili_anthropic_key');
  if (savedKey) {
    document.getElementById('rm-apikey').value = savedKey;
    document.getElementById('rm-savekey').checked = true;
  }
  document.getElementById('researchModal').classList.add('open');
  setTimeout(() => document.getElementById('rm-company').focus(), 80);
}

function closeResearchModal() {
  document.getElementById('researchModal').classList.remove('open');
}

// Close research modal on overlay click
document.getElementById('researchModal').addEventListener('click', function(e) {
  if (e.target === this) closeResearchModal();
});

async function generateCompanyProfile(companyName) {
  const profileKey = 'ili_company_profile_' + companyName.replace(/\W+/g, '_').toLowerCase();
  const contentEl = document.getElementById('companyProfileContent');
  if (!contentEl) return;
  const apiKey = localStorage.getItem('ili_anthropic_key') || '';
  if (!apiKey) {
    contentEl.innerHTML = '<div style="padding:12px;background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;font-size:12px;color:#c53030">API key required. Generate a Research Brief first and save your API key, then try again.</div>';
    return;
  }
  contentEl.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--accent-blue);font-weight:600">🔄 Generating company profile…</div>';
  try {
    const roles = loadRoles().filter(r => r.company.toLowerCase() === companyName.toLowerCase());
    const roleCtx = roles.length ? 'Roles being considered: ' + roles.map(r => r.roleTitle).join(', ') : '';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: 'You are generating a company profile for my job search dashboard. Write in SECOND PERSON — "you should", "your experience", "your background". NEVER use "Ili" or third person. My background: 15+ years PM, Yahoo (20B+ daily ads, $500M+ revenue, Principal PM → Director → Sr. Director), JPMorgan Chase (AI/ML, agentic RAG, search ranking — IC role), New Relic (SaaS billing), Conversant (AdTech tag management). Published MetaCon on arXiv. Targeting IC Principal/Staff PM roles. Respond in JSON format ONLY — no markdown, no commentary.',
        messages: [{ role: 'user', content: 'Generate a company profile for ' + companyName + '. ' + roleCtx + '\n\nRespond with ONLY this JSON:\n{"mission":"2-3 sentence company mission/what they do","approach":"2-3 sentences on how I should approach this company — what angle, which experience to lead with, who to connect with, what to emphasize. Write as \\"you should\\" not \\"Ili should\\"","fit":"2-3 sentences analyzing fit — what matches well and any gaps to address. Write as \\"you are\\" not \\"Ili is\\""}' }]
      })
    });
    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const text = data.content[0].text;
    const profile = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    localStorage.setItem(profileKey, JSON.stringify(profile));
    contentEl.innerHTML = '<div class="cp-profile-grid">'
      + '<div class="cp-profile-item"><div class="cp-profile-label">Mission</div><div>' + profile.mission + '</div></div>'
      + '<div class="cp-profile-item"><div class="cp-profile-label">Approach Strategy</div><div>' + profile.approach + '</div></div>'
      + '<div class="cp-profile-item"><div class="cp-profile-label">Fit Analysis</div><div>' + profile.fit + '</div></div>'
      + '</div>'
      + '<div style="margin-top:10px"><button onclick="generateCompanyProfile(\'' + companyName.replace(/'/g, "\\'") + '\')" style="padding:5px 12px;background:var(--bg-surface);border:1.5px solid var(--border-medium);border-radius:6px;font-size:11px;color:var(--text-secondary);cursor:pointer">🔄 Refresh Profile</button></div>';
  } catch (e) {
    console.error('[Company Profile error]', e);
    contentEl.innerHTML = '<div style="padding:12px;background:#fff5f5;border:1px solid #fed7d7;border-radius:8px;font-size:12px;color:#c53030">Error generating profile: ' + e.message + '</div>';
  }
}

function generateResearchBrief() {
  try {
  const company      = (document.getElementById('rm-company').value.trim()      || 'Unknown Company');
  const role         = (document.getElementById('rm-role').value.trim()         || 'Unknown Role');
  const jdUrl        = document.getElementById('rm-url').value.trim()           || '';
  const ivEl         = document.getElementById('rm-interviewers');
  const interviewers = ivEl ? ivEl.value.trim() : '';
  const apiKey       = document.getElementById('rm-apikey').value.trim()        || '';
  const saveKey      = document.getElementById('rm-savekey').checked;
  const storageKey   = 'research_' + (company + '_' + role).replace(/\W+/g,'_').toLowerCase();
  const createdDate  = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

  // LinkedIn connection context for research brief — sorted by relevance (Product/Eng/Design + seniority)
  const briefConns = getConnectionsForCompany(company);
  const scoredConns = briefConns.map(function(c) {
    let s = 0; const t = (c.position || '').toLowerCase();
    if (/\b(product|pm\b|program)/.test(t)) s += 30;
    else if (/\b(engineer|software|developer|platform|architect|technical|cto|sre)/.test(t)) s += 25;
    else if (/\b(design|ux|ui|creative)/.test(t)) s += 22;
    else if (/\b(data|analytics|machine learning|ml\b|ai\b|science)/.test(t)) s += 22;
    if (/\b(recruiter|recruiting|talent|hr|people)\b/.test(t)) s += 28;
    if (/\b(ceo|cto|cfo|coo|cpo|cmo|chief|president)\b/.test(t)) s += 60;
    else if (/\b(svp|senior vice president|evp)\b/.test(t)) s += 55;
    else if (/\b(vp|vice president)\b/.test(t)) s += 50;
    else if (/\bdir(ector)?\b/.test(t)) s += 40;
    else if (/\b(head of|head,)\b/.test(t)) s += 38;
    else if (/\b(principal|staff)\b/.test(t)) s += 30;
    else if (/\b(senior|sr\.?|lead)\b/.test(t)) s += 25;
    else if (/\bmanager\b/.test(t)) s += 20;
    return { c: c, s: s };
  }).sort(function(a,b){ return b.s - a.s; });
  const networkCtx = scoredConns.length
    ? '\n\nNETWORKING CONTEXT: I have ' + scoredConns.length + ' 1st-degree LinkedIn connection(s) at ' + company + ' (listed by relevance — Product/Eng/Design and seniority prioritized):\n' + scoredConns.slice(0,15).map(function(x){ return '- ' + x.c.fullName + (x.c.position ? ', ' + x.c.position : '') + ' (score:' + x.s + ')'; }).join('\n') + '\nPRIORITIZE the most senior Product, Engineering, and Design connections in Section 5 (Interviewer Insights). For each top connection, explain how I can leverage them for a warm introduction. Put the most influential contacts first. Use "your connection" not "Ili\'s connection".'
    : '\n\nNETWORKING CONTEXT: I don\'t have direct LinkedIn connections at ' + company + '. Suggest strategies for getting a warm intro (mutual connections, alumni networks, industry events).';

  // Save or clear API key
  if (apiKey && saveKey) localStorage.setItem('ili_anthropic_key', apiKey);
  else if (!saveKey) localStorage.removeItem('ili_anthropic_key');

  // Build the Claude request message (fallback for manual copy-paste)
  const claudeMsg = 'Research ' + company + ' for the ' + role + ' role'
    + (jdUrl ? ' — job posting: ' + jdUrl : '')
    + (interviewers ? ' — interviewers: ' + interviewers : '')
    + ' and generate my interview prep brief.';

  const sectionDefs = [
    {id:'s1',emoji:'🏢',title:'Company Snapshot',       hint:'Mission, size, stage, business model, recent news, investors, culture.'},
    {id:'s2',emoji:'📋',title:'Role Breakdown',          hint:'Key responsibilities, must-have skills, day-1 priorities, success metrics.'},
    {id:'s3',emoji:'🛍️',title:'Product & Problem Space', hint:'Core products, target customers, differentiators, competitors, market trends.'},
    {id:'s4',emoji:'🎯',title:'Key Skepticisms & Counter-Stories', hint:'Top 4-5 reasons they might doubt your candidacy — with the specific story or accomplishment that neutralizes each one.'},
    {id:'s5',emoji:'👤',title:'Interviewer Insights',    hint:'Each interviewer\'s background, recent posts/opinions, and specific talking points to align with their views.'},
    {id:'s6',emoji:'🎤',title:'Your Sales Pitch (TMAY)',  hint:'The "why I\'m the perfect fit" format: 2-3 sentence summary → 3 accomplishments addressing skepticisms → why this role. Under 90 seconds.'},
    {id:'s7',emoji:'📄',title:'Tailored Resume',          hint:'Your real resume, reframed for this role. Bullets ordered by what the recruiter is scanning for. Export as DOCX or PDF.'},
    {id:'s8',emoji:'❓',title:'Questions to Ask Them',   hint:'Strategic questions about roadmap, team, success definition.'},
    {id:'s9',emoji:'✉️',title:'Cover Letter & Cold Outreach', hint:'A customized cover letter, LinkedIn connection request, and cold email for networking into this role.'},
    {id:'s10',emoji:'🏆',title:'Post-Interview Playbook', hint:'Thank-you email template (send within 2 hours), "cherry on top" work product idea, and debrief checklist.'},
  ];

  const refreshableSections = new Set(['s5','s6','s7','s9','s10']);
  const sectionsHtml = sectionDefs.map(function(s) {
    const refreshBtn = refreshableSections.has(s.id)
      ? '<button class="sec-refresh-btn" onclick="refreshSection(\'' + s.id + '\')" title="Regenerate this section">🔄</button>'
      : '';
    return '<section class="sec" id="' + s.id + '">'
      + '<div class="sec-hd"><span class="sec-em">' + s.emoji + '</span><h2>' + s.title + '</h2>' + refreshBtn + '</div>'
      + '<p class="sec-hint">' + s.hint + '</p>'
      + '<div class="sec-content" id="content-' + s.id + '">'
      + (apiKey ? '<p class="streaming-msg">⏳ Researching…</p>' : '<p class="empty-msg">Waiting for Claude to research this…</p>')
      + '</div>'
      + '<div class="notes-wrap">'
      + '<div class="notes-label">My Notes</div>'
      + '<textarea class="notes-ta" data-key="' + storageKey + '_note_' + s.id + '" placeholder="Add your own notes here…"></textarea>'
      + '</div>'
      + '</section>';
  }).join('');

  const navHtml = sectionDefs.map(function(s) {
    return '<a class="nav-item" href="#' + s.id + '" onclick="return navScroll(\'' + s.id + '\')">'
      + s.emoji + ' ' + s.title + '</a>';
  }).join('');

  // Markdown-to-HTML converter (lightweight, no dependencies)
  const mdToHtmlFn = `function mdToHtml(md){
    // Parse markdown tables first
    md = md.replace(/((?:^\\|.+\\|\\s*\\n)+)/gm, function(tableBlock){
      var rows = tableBlock.trim().split('\\n').filter(function(r){return r.trim();});
      if(rows.length < 2) return tableBlock;
      var html = '<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12px">';
      rows.forEach(function(row, idx){
        if(row.replace(/[|\\-\\s]/g,'').length === 0) return; // skip separator row
        var cells = row.split('|').filter(function(c,i,a){return i>0 && i<a.length-1;});
        var tag = idx === 0 ? 'th' : 'td';
        var style = idx === 0 ? 'style="text-align:left;padding:6px 10px;border-bottom:2px solid var(--border-medium,#e2e8f0);font-weight:600;color:var(--text-primary,#1a202c);background:var(--bg-surface,#f7fafc)"' : 'style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--border-light,#f0f4f8)"';
        html += '<tr>' + cells.map(function(c){return '<'+tag+' '+style+'>'+c.trim()+'</'+tag+'>';}).join('') + '</tr>';
      });
      return html + '</table>';
    });
    return md
      .replace(/^#### (.+)$/gm,'<h4>$1</h4>')
      .replace(/^### (.+)$/gm,'<h3>$1</h3>')
      .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')
      .replace(/\\*(.+?)\\*/g,'<em>$1</em>')
      .replace(/^- (.+)$/gm,'<li>$1</li>')
      .replace(/(<li>.*<\\/li>)/gs,function(m){return '<ul>'+m+'</ul>';})
      .replace(/<\\/ul>\\s*<ul>/g,'')
      .replace(/^(?!<[hultTp]|<li)(\\S.+)$/gm,'<p>$1</p>')
      .replace(/\\n{2,}/g,'\\n');
  }`;

  // Streaming API call function
  const streamFn = apiKey ? `
  async function streamResearch(){
    const statusEl=document.getElementById('stream-status');
    statusEl.textContent='🔄 Connecting to Claude…';
    statusEl.style.display='block';
    const SECTION_MARKERS=['## 1:','## 2:','## 3:','## 4:','## 5:','## 6:','## 7:','## 8:','## 9:','## 10:'];
    const SECTION_IDS=['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10'];
    try{
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':'${apiKey.replace(/'/g,"\\'")}',
          'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true'
        },
        body:JSON.stringify({
          model:'claude-sonnet-4-6',
          max_tokens:12000,
          stream:true,
          system:\`You are generating an interview prep research brief for me. Write everything in FIRST PERSON — address me as "you" and "your", never "Ili" or "the candidate". This is my personal prep tool.

My background:
- JPMorgan Chase (2021-2026): Product Director, AI & LLM (Executive Director). Built keyword search/ranking platform (99% top-5 accuracy, 7000+ users), agentic RAG pipeline over 45M+ docs, agentic reporting system (300+ outputs/week, 90%+ manual work eliminated), agentic onboarding (<24hr turnaround for 85%+ of cases)
- Yahoo/Verizon Media (2016-2021): Principal PM → Director → Sr. Director. 5-year progression. $500M+ annual revenue owned across targeting. Rebuilt ranking models (50% revenue increase), $100M+ growth via retargeting, reduced infrastructure costs 30%. Trust & Verification: reduced ad fraud 90% at 20B+ daily ads scale. IAB taxonomy audiences protecting ~$50M+ revenue across 900M monthly users. GDPR/CCPA compliance lead.
- New Relic (2014-2016): PM → Sr. Manager. Billing/provisioning for $100M+ ARR SaaS. Reduced new product integration from 6 engineer-months to 3 engineer-weeks. Zero incidents over multiple months.
- Conversant (2011-2014): PM. Launched Tag Manager in ~6 months with 50+ integrations. Mobile SDK, ~3% revenue lift via server-to-server tracking.
- Mindjet (2005-2011): Project Manager. Established PMO, 40% IT savings, Mac product with 3-language localization.
- Certifications: PMP, CSM. B.S. UC Santa Barbara.
- Publication: MetaCon — Unified Predictive Segments with Trillion Concept Meta-Learning (arXiv 2022). 15.4% targeting accuracy improvement at 20B+ daily ads scale.
- Target: IC Principal/Staff PM at Series B+ or public companies in AdTech, AI/ML, or data platforms

IC EXPERIENCE CONTEXT (important — I have deep IC roots):
- My JPMC role (2021-2026) is an IC role with Executive Director level. No direct reports — pure product ownership.
- At New Relic, I was simultaneously managing (2 direct reports) AND performing as an individual contributor.
- At Conversant, I was a pure IC Product Manager for the first year before taking on PM leadership.
- I am specifically targeting IC Principal/Staff roles because I do my best work as a deep IC contributor.

IMPORTANT VOICE RULES:
- Write in second person: "you have", "your experience", "your background in..."
- Section 6 (Tell Me About Yourself) should be written in first person as a script I would actually say. Do NOT open with "Sr. Director-level product leader" if the target role is IC — instead lead with the relevant IC framing (e.g., "I'm a product leader with 15+ years building [relevant domain] at scale" or "I'm a Principal-level PM who's spent the last decade..."). Match the seniority framing to the role.
- Section 5 (Interviewer Insights) should say "your connection" not "Ili's connection"
- NEVER refer to me in the third person. This is MY personal prep document.

TITLE ACCURACY: My Yahoo progression was "Principal PM → Director → Sr. Director". Do NOT abbreviate or alter this. I was NEVER a "Principal PM" as a standalone title — I started as a Principal PM and was promoted twice. My JPMC title is "Product Director, AI & LLM (Executive Director)". Use exact titles everywhere.

Output your research in EXACTLY this format with these section markers. Each section MUST start with the marker on its own line:

## 1: Company Snapshot
Company stage, employee count, last fundraise/valuation/market cap, latest financials, mission, culture, recent news. Include what software artifacts a PM in this role would own.

## 2: Role Breakdown
Key responsibilities, must-have skills, day-1 priorities, success metrics. Identify the ONE hardest-to-find skill the recruiter is scanning for.

## 3: Product & Problem Space
Core products, target customers, buyer/user personas, differentiators, competitors, market trends. Describe the specific part of the product org this role sits in.

## 4: Key Skepticisms & Counter-Stories
Identify the top 4-5 reasons the hiring committee would be SKEPTICAL about my candidacy for this specific role. For each skepticism, map it to a specific story or accomplishment from my background that neutralizes it. Format as:
**Skepticism 1: [what they would doubt]**
→ Counter-story: [specific accomplishment + metric that disproves it]
→ Use in: [TMAY / Resume / Q&A — where to deploy this counter]

## 5: Interviewer Insights
For each interviewer: their background, current role, years at company, any LinkedIn posts or published content, their likely opinions and philosophies about product management. Then suggest specific talking points that ALIGN with their known views. If no interviewers provided, give general advice for common PM interviewer archetypes (HM, skip-level, XFN eng/design, recruiter).

## 6: Your Sales Pitch (Tell Me About Yourself)
Write this as a FIRST PERSON script I would actually say. Follow this EXACT 3-part structure (under 90 seconds total):
PART 1 — Summary (2-3 sentences): Who I am and my through-line/brand. Match seniority framing to the target role. If IC role, do NOT lead with "Sr. Director-level".
PART 2 — Three Accomplishments: Pick exactly 3 accomplishments that directly ADDRESS the top skepticisms from Section 4. Each should use the SAD format (Surface → Action → Data). These are NOT a chronological walk-through — they are cherry-picked to neutralize doubts.
PART 3 — Why This Role (2-3 sentences): Why I specifically want THIS role at THIS company. Must be specific enough that swapping in a competitor's name would NOT still make sense.

## 7: Tailored Resume
Output EXACTLY the JSON structure below (inside a JSON code block).

YOU ARE A RESUME REFRAMING ENGINE, NOT A RESUME WRITER.
Your job: select, reorder, and lightly rephrase Ili's REAL experience to put the best foot forward for this role. You do NOT invent anything.

STRICT RULES:
1. TITLES: Use EXACTLY these titles — no variations, no upgrades, no creative rewording:
   - "Product Director, AI & LLM" with level "(Executive Director)"
   - "Principal PM → Director → Sr. Director"
   - "Product Manager → Sr. Manager, Product"
   - "Product Manager" (Conversant)
2. SKILLS LINE: Pick 5-8 from ONLY this pool, reorder by relevance to the role:
   [Addressability & Identity Resolution, First-Party Data Activation, Data Collaboration, Programmatic & RTB, Privacy Law (GDPR / CCPA), Publisher Monetization, Real-Time Decisioning, Audience Segmentation, AI/ML Platforms, Agentic Systems & RAG, Search & Ranking, Ad Quality & Trust, Cross-Functional Leadership, Platform Infrastructure]
   Do NOT invent skills. Do NOT pull keywords from the JD as skills.
3. SUMMARY AS SKEPTICISM PIN: The summary must directly address the recruiter's #1 doubt about my candidacy (identified in Section 4). 3-4 sentences reframing the same real experience through a lens relevant to this role. MUST mention "$500M+ revenue products at Yahoo" and "20B+ daily ads scale". For the opening, match seniority framing to the TARGET ROLE: if the role is IC (Principal PM, Staff PM, etc.), do NOT lead with "Sr. Director-level" — instead use framing like "Product leader with 10+ years" or "Principal-level product leader with 10+ years". Only use "Sr. Director-level" if applying to a Director+ management role. Do NOT add capabilities or experience not in the bullet bank.
4. BULLETS: Choose from the BULLET BANK below. You may lightly rephrase for flow (see examples) but every metric, every number, every claim must match the original. You may combine two related bullets into one.
   ORDERING RULE: Within each role, put the bullet that is MOST relevant to the JD's hardest-to-find requirement FIRST. Order remaining bullets by relevance to the role, not chronologically. Bold the key metrics with **.
   SAD CHECK: Every bullet should follow Surface → Action → Data. If a bullet bank entry lacks one element, that's fine — do not invent data.
   VERB CHECK: Never start bullets with weak verbs (helped, worked, managed, participated, assisted, implemented). Use strong verbs (built, designed, led, drove, launched, reduced, accelerated, owned, scaled).
5. DO NOT add JD-specific keywords, technologies, or frameworks that don't appear in the bullet bank. The resume should feel naturally relevant, not keyword-stuffed.
6. Mindjet role: include ONLY if relevant, otherwise omit entirely.
7. JPMC bullets 3 and 4 can be combined into one bullet (see bullet bank).
8. COMPANY CONTEXT for lesser-known companies: For New Relic, Conversant, and Mindjet, the subtitle should include a brief company descriptor (e.g. "SaaS observability platform, $100M+ ARR at time" or "Digital advertising platform, ValueClick subsidiary"). JPMC and Yahoo need no descriptor.

GOOD vs BAD examples:
GOOD reframe: "Owned $500M+ annual revenue across targeting infrastructure; led migration from batch to real-time decisioning, improving advertiser CPA 25% and enabling addressable audience activation at scale" ← adds "enabling addressable audience activation at scale" which is a true description of what the system did
BAD fabrication: "Defined AI product strategy across LLM orchestration and retrieval-augmented generation" ← Ili never "defined AI product strategy across LLM orchestration" — this is invented
GOOD reframe: "Drove publisher monetization and brand safety: rolled out IAB taxonomy audiences protecting ~$50M+ revenue across 900M monthly users" ← combines two real bullets naturally
BAD keyword gaming: "directly applicable to sponsored ads quality scoring" ← shoehorns JD language into a bullet

BULLET BANK — choose from these (you may lightly rephrase but preserve all facts and numbers):

JPMC (pick 3, or combine bullets 3+4 into one and pick 3 total):
B1: "Built keyword search and ranking platform for company, investor, and contact search — 99% top-5 accuracy / 80%+ precision, reducing analyst time-to-insight 40–60% across 7,000+ users"
B2: "Designed agentic RAG pipeline over 45M+ documents enabling large-scale retrieval and synthesis, replacing manual research workflows"
B3: "Built agentic reporting system generating 300+ structured outputs/week, eliminating 90%+ manual work"
B4: "Orchestrated agentic onboarding workflows reducing client turnaround to <24 hours for 85%+ of cases"
B3+B4 combined: "Automated reporting and onboarding workflows: 300+ structured outputs/week eliminating 90%+ manual work; client turnaround reduced to <24 hrs for 85%+ of cases"

Yahoo (pick 4-6):
Y1: "Owned $500M+ annual revenue across targeting infrastructure; led migration from batch to real-time decisioning, improving advertiser CPA 25% and enabling addressable audience activation at scale"
Y2: "Built and scaled audience addressability systems for brands, publishers, and DSPs/SSPs; rebuilt ranking models driving 50% revenue increase and $100M+ growth via search and mail retargeting"
Y3: "Led GDPR and CCPA compliance across targeting and identity systems; designed consent-aware data pipelines and high-performance data warehouse improving audience modeling accuracy while staying ahead of regulatory requirements"
Y4: "As Sr. Director, Trust & Verification: reduced ad fraud 90% via cloaking detection and enforcement systems at 20B+ daily ads scale, protecting addressable inventory quality across the ecosystem"
Y5: "Drove publisher monetization and brand safety: rolled out IAB taxonomy audiences protecting ~$50M+ revenue across 900M monthly users; implemented ads.txt and sellers.json protocols reducing counterfeit inventory 30%"
Y6: "Reduced storage and compute costs 30% through data lifecycle optimization across targeting infrastructure"

New Relic (pick 2):
N1: "Accelerated SaaS product integration into billing platform supporting $100M+ ARR, reducing time-to-market ~80%; cut new product integration from 6 engineer-months to 3 engineer-weeks"
N2: "Stabilized financial services infrastructure to 99.99% uptime, eliminating recurring incidents; rebuilt e-commerce and partnership portals improving scalability"

Conversant (pick 2):
C1: "Launched Tag Manager with 50+ partner integrations in ~6 months, enabling seamless cross-product deployment at scale"
C2: "Developed unified mobile SDK; improved conversion tracking via server-to-server integration, delivering ~3% revenue lift"

Mindjet (OPTIONAL — only if relevant):
M1: "Established PMO; pioneered multi-vendor bidding saving 40% in IT expenditures"
M2: "Led remote engineering team building Mac product with 3-language localization"

FIXED BLOCKS (do not modify):
Publication: {"title":"MetaCon: Unified Predictive Segments System with Trillion Concept Meta-Learning","venue":"arXiv, 2022 · Co-author","description":"AI system predicting user interests across 68+ tasks simultaneously; improved targeting accuracy 15.4% over prior production system at 20B+ daily ads scale"}
Certs: "Project Management Professional (PMP) · Certified Scrum Master (CSM) · B.S., University of California, Santa Barbara"

Yahoo subtitle options (pick one or lightly adapt):
- "5-year progression across targeting, optimization, and ad integrity — 20B+ daily ads scale"
- "5-year progression across addressability, targeting, optimization, and ad integrity — 20B+ daily ads scale"

JSON FORMAT:
\\\`\\\`\\\`json
{"summary":"...","skills":"Skill1 · Skill2 · ...","experience":[{"company":"JPMorgan Chase","title":"Product Director, AI & LLM","level":"(Executive Director)","dates":"2021 – 2026","subtitle":"AI-powered search, retrieval, and decisioning platforms for investment banking workflows","bullets":["..."]},{"company":"Yahoo (Verizon Media / Oath)","title":"Principal PM → Director → Sr. Director","dates":"2016 – 2021","subtitle":"...","bullets":["..."]},{"company":"New Relic","title":"Product Manager → Sr. Manager, Product","dates":"2014 – 2016","subtitle":"Billing, provisioning, and packaging systems during hypergrowth","bullets":["..."]},{"company":"Conversant","title":"Product Manager","dates":"2011 – 2014","subtitle":"Tag management, mobile measurement, and conversion tracking","bullets":["..."]}],"certs":"Project Management Professional (PMP) · Certified Scrum Master (CSM) · B.S., University of California, Santa Barbara","publication":{"title":"MetaCon: Unified Predictive Segments System with Trillion Concept Meta-Learning","venue":"arXiv, 2022 · Co-author","description":"AI system predicting user interests across 68+ tasks simultaneously; improved targeting accuracy 15.4% over prior production system at 20B+ daily ads scale"}}
\\\`\\\`\\\`

CRITICAL RESUME VALIDATION — before outputting the JSON, verify:
✓ JPMC has exactly 3 bullets (all from B1-B4 or B3+B4 combined)
✓ Yahoo has 4-6 bullets (all from Y1-Y6)
✓ New Relic has exactly 2 bullets (from N1-N2)
✓ Conversant has exactly 2 bullets (from C1-C2)
✓ Every metric and number matches the bullet bank EXACTLY
✓ No bullet was invented — if you cannot trace it to the bank, DELETE it
✓ Summary is a plain string, NOT a nested object

## 8: Questions to Ask Them
Be specific, opinionated, and direct. No filler. Write as if advising a senior PM colleague. Include at least one question that demonstrates you understand the company's specific challenges. Advanced tip: weave in an accomplishment — e.g. "At Yahoo I did X — have you guys tried something similar?"

## 9: Cover Letter & Cold Outreach
Generate THREE pieces of outreach content:

**A. Cover Letter (for applications)**
Follow this 4-element formula:
1. Specific, relevant experience connecting my background to this role's requirements
2. Proof I've studied the product (mention a specific feature, metric, or challenge)
3. Role-relevant skills addressing the gap areas
4. A brief product idea or observation relevant to the role (the "work product" hook)
Keep it to 4-5 short paragraphs. Professional but not stiff.

**B. LinkedIn Connection Request (300 char max)**
For reaching out to someone at the company. Personalize with something that ties us together, qualify myself for the role in one sentence, and ask for a chat. Include a meeting link placeholder.

**C. Cold Email (for networking)**
Semi-personalized outreach for someone at the company. Include: a hook showing I researched them, qualification for the role, and a soft ask for a referral or chat. Keep it under 150 words.

## 10: Post-Interview Playbook
Generate three things:

**A. Thank-You Email Template**
A concise thank-you note to send within 2 HOURS (not 24) of the interview. Reference the conversation specifically — include placeholders like [topic you discussed] and [their point about X]. Keep it 3-4 sentences + one sentence about continued interest.

**B. "Cherry on Top" Work Product Idea**
Based on the role and company, suggest ONE specific work product I could create and send to the hiring manager to stand out: a competitor feature teardown, a mini product spec, a metrics framework, or a strategy one-pager. Describe what it would contain in 3-4 bullet points. This should take no more than 2-3 hours.

**C. Debrief Checklist**
A quick checklist for after each interview round:
- What went well?
- What didn't go well?
- What questions were asked?
- Did I inject all my counter-stories from Section 4?
- Who might be my voice in the debrief meeting?
- What follow-up is needed?\`,
          messages:[{role:'user',content:'Research ' + ${JSON.stringify(company)} + ' for the ' + ${JSON.stringify(role)} + ' role' + ${jdUrl ? JSON.stringify(' — job posting: '+jdUrl) : "''"} + ${interviewers ? JSON.stringify(' — interviewers: '+interviewers) : "''"} + '. Generate a complete interview prep brief covering all 10 sections.' + ${JSON.stringify(networkCtx)}}]
        })
      });
      if(!resp.ok){
        const err=await resp.text();
        throw new Error('API error '+resp.status+': '+err);
      }
      const reader=resp.body.getReader();
      const decoder=new TextDecoder();
      let fullText='';
      let buffer='';
      statusEl.textContent='🔄 Streaming research…';
      while(true){
        const{done,value}=await reader.read();
        if(done)break;
        buffer+=decoder.decode(value,{stream:true});
        const lines=buffer.split('\\n');
        buffer=lines.pop()||'';
        for(const line of lines){
          if(!line.startsWith('data: '))continue;
          const data=line.slice(6);
          if(data==='[DONE]')continue;
          try{
            const evt=JSON.parse(data);
            if(evt.type==='content_block_delta'&&evt.delta&&evt.delta.text){
              fullText+=evt.delta.text;
              renderSections(fullText);
            }
          }catch(e){}
        }
      }
      renderSections(fullText);
      // Post-stream: if s7 resume didn't parse, try harder
      if(!resumeData){
        var s7El=document.getElementById('content-s7');
        if(s7El){
          var s7Content=fullText;
          var s7Start=fullText.search(/^## 7:/m);
          if(s7Start!==-1){var s7End=fullText.search(/^## 8:/m);s7Content=fullText.slice(s7Start,s7End!==-1?s7End:undefined);}
          try{
            // Try extracting JSON more aggressively: find first { to last }
            var firstBrace=s7Content.indexOf('{');var lastBrace=s7Content.lastIndexOf('}');
            if(firstBrace!==-1&&lastBrace>firstBrace){
              resumeData=JSON.parse(s7Content.slice(firstBrace,lastBrace+1));
              renderResumePreview(s7El,resumeData);
            }else{
              s7El.innerHTML='<div style="text-align:center;padding:30px 20px;color:#dc2626;"><div style="font-size:13px;font-weight:600;">Resume generation incomplete</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Click 🔄 to regenerate this section</div></div>';
            }
          }catch(e){
            s7El.innerHTML='<div style="text-align:center;padding:30px 20px;color:#dc2626;"><div style="font-size:13px;font-weight:600;">Resume generation incomplete</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Click 🔄 to regenerate this section</div></div>';
          }
        }
      }
      // Save to localStorage
      localStorage.setItem('${storageKey}_ai_research',fullText);
      statusEl.textContent='✅ Research complete';
      setTimeout(function(){statusEl.style.display='none';},3000);
      // Mark all sections done
      document.querySelectorAll('.sec').forEach(function(s){s.classList.add('done');});
    }catch(err){
      statusEl.textContent='❌ '+err.message;
      statusEl.style.background='rgba(220,38,38,.15)';
      statusEl.style.color='#dc2626';
      console.error('Stream error:',err);
      // Show retry button
      statusEl.innerHTML+=' <button onclick="streamResearch()" style="margin-left:8px;padding:3px 10px;border-radius:5px;border:1px solid #dc2626;background:white;color:#dc2626;font-size:11px;cursor:pointer">Retry</button>';
    }
  }
  let resumeData=null;
  function renderSections(text){
    const MARKERS=[/^## 1:/m,/^## 2:/m,/^## 3:/m,/^## 4:/m,/^## 5:/m,/^## 6:/m,/^## 7:/m,/^## 8:/m,/^## 9:/m,/^## 10:/m];
    const IDS=['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10'];
    const positions=MARKERS.map(function(m){const match=text.match(m);return match?text.indexOf(match[0]):-1;});
    for(let i=0;i<10;i++){
      if(positions[i]===-1)continue;
      const start=text.indexOf('\\n',positions[i]);
      if(start===-1)continue;
      const end=(i<9&&positions[i+1]!==-1)?positions[i+1]:text.length;
      const content=text.slice(start+1,end).trim();
      if(!content)continue;
      const el=document.getElementById('content-'+IDS[i]);
      if(!el)continue;
      // Section 7 = Tailored Resume — parse JSON and show resume preview
      if(IDS[i]==='s7'){
        try{
          const jsonMatch=content.match(/\\\`\\\`\\\`json\\n([\\s\\S]*?)\\\`\\\`\\\`/)||content.match(/\\{[\\s\\S]*"summary"[\\s\\S]*\\}/);
          const jsonStr=jsonMatch?(jsonMatch[1]||jsonMatch[0]):content;
          resumeData=JSON.parse(jsonStr);
          renderResumePreview(el,resumeData);
        }catch(e){
          // Still streaming — show a friendly loading state, not raw JSON
          if(!el.querySelector('.resume-loading')){
            el.innerHTML='<div class="resume-loading" style="text-align:center;padding:40px 20px;color:#64748b;"><div style="font-size:28px;margin-bottom:12px;">📄</div><div style="font-size:13px;font-weight:600;">Building your tailored resume…</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Reframing experience for this role</div><div style="margin:16px auto 0;width:200px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:0%;background:linear-gradient(90deg,#2e75b6,#1f4e79);border-radius:2px;animation:resumeProgress 25s ease-out forwards;"></div></div><style>@keyframes resumeProgress{0%{width:0%}30%{width:40%}60%{width:65%}80%{width:80%}100%{width:92%}}</style></div>';
          }
        }
      }else{
        el.innerHTML=mdToHtml(content);
      }
      const sec=document.getElementById(IDS[i]);
      if(sec)sec.classList.add('done');
    }
  }
  async function refreshSection(sid){
    var aKey='${apiKey.replace(/'/g,"\\'")}';
    if(!aKey){alert('No API key.');return;}
    var el=document.getElementById('content-'+sid);
    if(!el)return;
    el.innerHTML='<p class="streaming-msg">🔄 Regenerating…</p>';
    var sNames={s5:'Interviewer Insights',s6:'Your Sales Pitch (Tell Me About Yourself)',s7:'Tailored Resume',s9:'Cover Letter & Cold Outreach',s10:'Post-Interview Playbook'};
    var sNum=parseInt(sid.replace('s',''));
    var cached=localStorage.getItem('${storageKey}_ai_research')||'';
    var ctxM=cached.match(/## 1:[\\s\\S]*?(?=## 3:|$)/);
    var ctx=ctxM?ctxM[0].slice(0,1500):'';
    var jdCtx=(cached.match(/## 2:[\\s\\S]*?(?=## 3:|$)/)||[''])[0].slice(0,1000);
    var prompts={};
    prompts.s5='Regenerate Section 5: Interviewer Insights. For each interviewer: background, current role, years at company, any LinkedIn posts or published content, their likely opinions/philosophies. Suggest specific talking points that ALIGN with their known views. Write in second person (your, you). Previous context:\\n'+ctx;
    prompts.s6='Regenerate Section 6: Your Sales Pitch (Tell Me About Yourself). Write in FIRST PERSON as a script I would say. Follow this EXACT 3-part structure (under 90 seconds total): PART 1 — Summary (2-3 sentences): Who I am and my brand. Match seniority to role — if IC, do NOT say Sr. Director-level. PART 2 — Three Accomplishments that address top skepticisms about my candidacy. Use SAD format (Surface, Action, Data). PART 3 — Why This Role (2-3 sentences, specific to THIS company — swapping in a competitor name should NOT still make sense). My Yahoo progression was "Principal PM then Director then Sr. Director". JPMC title: "Product Director, AI and LLM (Executive Director)". Context:\\n'+ctx+'\\n'+jdCtx;
    prompts.s7='Regenerate Section 7: Tailored Resume. Output ONLY a JSON code block. RULES: Use EXACT titles (Product Director AI and LLM with level Executive Director; Principal PM then Director then Sr. Director; Product Manager then Sr. Manager Product; Product Manager at Conversant). Skills from ONLY: Addressability and Identity Resolution, First-Party Data Activation, Data Collaboration, Programmatic and RTB, Privacy Law GDPR CCPA, Publisher Monetization, Real-Time Decisioning, Audience Segmentation, AI/ML Platforms, Agentic Systems and RAG, Search and Ranking, Ad Quality and Trust, Cross-Functional Leadership, Platform Infrastructure. NEVER invent skills or pull JD keywords. All bullets must use real metrics from my actual experience. Order bullets within each role by relevance to JD hardest-to-find skill FIRST. Use strong verbs (built, designed, led, drove, launched). Summary must address recruiter top skepticism as a pin. For lesser-known companies (New Relic, Conversant, Mindjet), include company descriptor in subtitle. Context:\\n'+jdCtx;
    prompts.s9='Regenerate Section 9: Cover Letter and Cold Outreach. Generate three pieces: A) Cover letter (4-5 paragraphs, 4-element formula: relevant experience, product knowledge proof, role-relevant skills, product idea hook). B) LinkedIn connection request (300 char max). C) Cold email for networking (under 150 words). Write in first person. Context:\\n'+ctx+'\\n'+jdCtx;
    prompts.s10='Regenerate Section 10: Post-Interview Playbook. Generate: A) Thank-you email template to send within 2 HOURS of interview, with [placeholders] for conversation specifics. B) One cherry-on-top work product idea (competitor teardown, mini spec, metrics framework, or strategy one-pager) described in 3-4 bullets. C) Debrief checklist (what went well, what didnt, questions asked, did I inject counter-stories, who is my voice in debrief, what follow-up needed). Context:\\n'+ctx+'\\n'+jdCtx;
    var sysP='You are regenerating one section of my interview prep brief. Write in second person (you/your) except Section 6 which should be first person. NEVER refer to me as Ili or the candidate. My background: JPMC 2021-2026 Product Director AI/LLM (ED), Yahoo 2016-2021 Principal PM to Director to Sr. Director ($500M+ revenue, 20B+ daily ads), New Relic 2014-2016, Conversant 2011-2014. Publication: MetaCon arXiv 2022.';
    try{
      var resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':aKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:4000,stream:true,system:sysP,messages:[{role:'user',content:prompts[sid]+' '+${JSON.stringify(networkCtx)}}]})
      });
      if(!resp.ok)throw new Error('API '+resp.status);
      var reader=resp.body.getReader();var decoder=new TextDecoder();var txt='';var buf='';
      while(true){
        var rd=await reader.read();if(rd.done)break;
        buf+=decoder.decode(rd.value,{stream:true});
        var lns=buf.split('\\n');buf=lns.pop()||'';
        for(var ln of lns){
          if(!ln.startsWith('data: '))continue;var d=ln.slice(6);if(d==='[DONE]')continue;
          try{var ev=JSON.parse(d);if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.text){txt+=ev.delta.text;
            if(sid==='s7'){try{var jm=txt.match(/\\\`\\\`\\\`json\\n([\\s\\S]*?)\\\`\\\`\\\`/)||txt.match(/\\{[\\s\\S]*"summary"[\\s\\S]*\\}/);if(jm){resumeData=JSON.parse(jm[1]||jm[0]);renderResumePreview(el,resumeData);}else if(!el.querySelector('.resume-loading')){el.innerHTML='<div class="resume-loading" style="text-align:center;padding:40px 20px;color:#64748b;"><div style="font-size:28px;margin-bottom:12px;">📄</div><div style="font-size:13px;font-weight:600;">Building your tailored resume…</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Reframing experience for this role</div><div style="margin:16px auto 0;width:200px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:0%;background:linear-gradient(90deg,#2e75b6,#1f4e79);border-radius:2px;animation:resumeProgress 25s ease-out forwards;"></div></div><style>@keyframes resumeProgress{0%{width:0%}30%{width:40%}60%{width:65%}80%{width:80%}100%{width:92%}}</style></div>';}}catch(e){if(!el.querySelector('.resume-loading')){el.innerHTML='<div class="resume-loading" style="text-align:center;padding:40px 20px;color:#64748b;"><div style="font-size:28px;margin-bottom:12px;">📄</div><div style="font-size:13px;font-weight:600;">Building your tailored resume…</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Reframing experience for this role</div><div style="margin:16px auto 0;width:200px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:0%;background:linear-gradient(90deg,#2e75b6,#1f4e79);border-radius:2px;animation:resumeProgress 25s ease-out forwards;"></div></div><style>@keyframes resumeProgress{0%{width:0%}30%{width:40%}60%{width:65%}80%{width:80%}100%{width:92%}}</style></div>';}}}
            else{el.innerHTML=mdToHtml(txt);}
          }}catch(e){}
        }
      }
      // Post-stream: if s7 resume still not parsed, try aggressive extraction
      if(sid==='s7'&&!resumeData){
        try{var fb=txt.indexOf('{');var lb=txt.lastIndexOf('}');if(fb!==-1&&lb>fb){resumeData=JSON.parse(txt.slice(fb,lb+1));renderResumePreview(el,resumeData);}}catch(e2){el.innerHTML='<div style="text-align:center;padding:30px 20px;color:#dc2626;"><div style="font-size:13px;font-weight:600;">Resume generation incomplete</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Click 🔄 to try again</div></div>';}
      }
      var full=localStorage.getItem('${storageKey}_ai_research')||'';
      var mk='## '+sNum+':';var nk='## '+(sNum+1)+':';var mi=full.indexOf(mk);
      if(mi!==-1){var ni=full.indexOf(nk,mi);full=full.slice(0,mi)+mk+' '+sNames[sid]+'\\n'+txt+'\\n'+(ni!==-1?full.slice(ni):'');localStorage.setItem('${storageKey}_ai_research',full);}
    }catch(err){el.innerHTML='<p style="color:#dc2626">Error: '+err.message+' <button onclick="refreshSection(\\''+sid+'\\')">Retry</button></p>';}
  }
  function renderResumePreview(el,rd){
    // Validate that we have real data — reject if key fields are missing
    if(!rd || !rd.summary || rd.summary==='undefined' || !rd.experience || !rd.experience.length){
      el.innerHTML='<div style="text-align:center;padding:30px 20px;color:#dc2626;"><div style="font-size:13px;font-weight:600;">Resume data incomplete</div><div style="font-size:11px;margin-top:6px;color:#94a3b8;">Click 🔄 to regenerate this section</div></div>';
      resumeData=null;
      return;
    }
    // Coerce summary to string in case API returns an object
    if(typeof rd.summary==='object') rd.summary=rd.summary.text||rd.summary.content||JSON.stringify(rd.summary);
    rd.summary=String(rd.summary||'');
    let h='<div class="resume-preview" style="font-family:Arial,sans-serif;max-width:700px;border:1px solid #e2e8f0;border-radius:8px;padding:24px;background:#fff;margin-bottom:14px">';
    h+='<div style="font-size:20px;font-weight:bold;color:#1f4e79">Ili Selinger</div>';
    h+='<div style="font-size:9px;color:#444;margin:3px 0 8px">ilan.selinger@gmail.com · 510-332-0543 · Walnut Creek, CA · linkedin.com/in/ilan-selinger</div>';
    h+='<div style="border-bottom:2px solid #2e75b6;margin-bottom:10px"></div>';
    h+='<div style="font-size:9px;font-weight:bold;color:#1f4e79;margin-bottom:4px">SUMMARY</div>';
    h+='<div style="font-size:9px;color:#1a1a1a;line-height:1.5;margin-bottom:4px">'+(rd.summary||'')+'</div>';
    if(rd.skills) h+='<div style="font-size:8px;color:#444;font-style:italic;margin-bottom:8px">'+rd.skills+'</div>';
    h+='<div style="border-bottom:2px solid #2e75b6;margin-bottom:8px"></div>';
    h+='<div style="font-size:9px;font-weight:bold;color:#1f4e79;margin-bottom:6px">EXPERIENCE</div>';
    (rd.experience||[]).forEach(function(exp){
      if(!exp||!exp.company)return;
      h+='<div style="margin-bottom:8px">';
      h+='<div style="font-size:10px;color:#1a1a1a"><strong>'+(exp.company||'')+'</strong> <span style="color:#999">|</span> <strong>'+(exp.title||'')+'</strong>';
      if(exp.level) h+=' <span style="color:#888;font-weight:normal;font-size:9px">'+exp.level+'</span>';
      h+=' <span style="color:#999">|</span> <span style="color:#444">'+(exp.dates||'')+'</span></div>';
      if(exp.subtitle) h+='<div style="font-size:8px;color:#444;font-style:italic;margin:2px 0">'+exp.subtitle+'</div>';
      if(exp.bullets&&exp.bullets.length){
        h+='<ul style="margin:3px 0 0 16px;padding:0;font-size:8.5px;line-height:1.5;color:#1a1a1a">';
        exp.bullets.forEach(function(b){ if(b) h+='<li style="margin:1px 0">'+b.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')+'</li>'; });
        h+='</ul>';
      }
      h+='</div>';
    });
    if(rd.certs){
      h+='<div style="border-bottom:2px solid #2e75b6;margin:8px 0"></div>';
      h+='<div style="font-size:9px;font-weight:bold;color:#1f4e79;margin-bottom:3px">CERTIFICATIONS & EDUCATION</div>';
      h+='<div style="font-size:8.5px;color:#1a1a1a">'+rd.certs+'</div>';
    }
    if(rd.publication){
      h+='<div style="border-bottom:2px solid #2e75b6;margin:8px 0"></div>';
      h+='<div style="font-size:9px;font-weight:bold;color:#1f4e79;margin-bottom:3px">PUBLICATION</div>';
      h+='<div style="font-size:8.5px;color:#1a1a1a"><strong>'+(rd.publication.title||'')+'</strong> | '+(rd.publication.venue||'')+'</div>';
      if(rd.publication.description) h+='<div style="font-size:8px;color:#1a1a1a;margin-top:2px">'+rd.publication.description+'</div>';
    }
    h+='</div>';
    h+='<div style="display:flex;gap:10px;flex-wrap:wrap">';
    h+='<button onclick="generateDocx()" style="padding:8px 18px;background:#2e75b6;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">📥 Download Word (.docx)</button>';
    h+='<button onclick="printResume()" style="padding:8px 18px;background:#1a3a5c;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer">🖨️ Print / Save PDF</button>';
    h+='</div>';
    el.innerHTML=h;
  }
  function printResume(){
    if(!resumeData)return alert('Resume data not ready yet.');
    const rd=resumeData;
    let h='<!DOCTYPE html><html><head><style>';
    h+='@page{size:letter;margin:0.5in 0.625in}@media print{@page{margin:0.5in 0.625in}}*{box-sizing:border-box;margin:0;padding:0}';
    h+='body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:8.5pt;line-height:1.35}';
    h+='.name{font-size:20pt;font-weight:bold;color:#1f4e79}.contact{font-size:8.5pt;color:#444;margin:2pt 0 5pt}';
    h+='.divider{border-bottom:2px solid #2e75b6;margin:4pt 0 6pt}.sec-hdr{font-size:9pt;font-weight:bold;color:#1f4e79;margin:4pt 0 3pt}';
    h+='.summary{font-size:8.5pt;line-height:1.4;margin-bottom:2pt}.skills{font-size:8pt;color:#444;font-style:italic;margin-bottom:4pt}';
    h+='.exp-hdr{font-size:10pt;margin:4pt 0 1pt}.exp-sub{font-size:8.5pt;color:#444;font-style:italic;margin:1pt 0}';
    h+='ul{margin:2pt 0 0 16pt;padding:0}li{margin:1pt 0;font-size:8.5pt;line-height:1.35}';
    h+='</style></head><body>';
    h+='<div class="name">Ili Selinger</div>';
    h+='<div class="contact">ilan.selinger@gmail.com · 510-332-0543 · Walnut Creek, CA · <a href="https://linkedin.com/in/ilan-selinger">linkedin.com/in/ilan-selinger</a></div>';
    h+='<div class="divider"></div>';
    h+='<div class="sec-hdr">SUMMARY</div>';
    h+='<div class="summary">'+rd.summary+'</div>';
    if(rd.skills) h+='<div class="skills">'+rd.skills+'</div>';
    h+='<div class="divider"></div>';
    h+='<div class="sec-hdr">EXPERIENCE</div>';
    (rd.experience||[]).forEach(function(exp){
      h+='<div class="exp-hdr"><strong>'+exp.company+'</strong> <span style="color:#999">|</span> <strong>'+exp.title+'</strong>';
      if(exp.level) h+=' <span style="color:#888;font-weight:normal;font-size:8.5pt">'+exp.level+'</span>';
      h+=' <span style="color:#999">|</span> <span style="color:#444">'+exp.dates+'</span></div>';
      if(exp.subtitle) h+='<div class="exp-sub">'+exp.subtitle+'</div>';
      if(exp.bullets&&exp.bullets.length){
        h+='<ul>';
        exp.bullets.forEach(function(b){ h+='<li>'+b.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')+'</li>'; });
        h+='</ul>';
      }
    });
    if(rd.certs){h+='<div class="divider"></div><div class="sec-hdr">CERTIFICATIONS & EDUCATION</div><div style="font-size:8.5pt">'+rd.certs+'</div>';}
    if(rd.publication){h+='<div class="divider"></div><div class="sec-hdr">PUBLICATION</div><div style="font-size:8.5pt"><strong>'+rd.publication.title+'</strong> | '+rd.publication.venue+'</div>';if(rd.publication.description)h+='<div style="font-size:8pt;margin-top:2pt">'+rd.publication.description+'</div>';}
    h+='</body></html>';
    const w=window.open('','_blank');
    if(w){w.document.write(h);w.document.close();w.document.title='Ili_Selinger_Resume';setTimeout(function(){w.print();},500);}
  }
  async function generateDocx(){
    if(!resumeData)return alert('Resume data not ready yet.');
    const statusEl=document.getElementById('stream-status');
    statusEl.textContent='📄 Generating Word document…';
    statusEl.style.display='block';
    try{
      // Load docx library from CDN
      if(!window.docx){
        await new Promise(function(resolve,reject){
          const s=document.createElement('script');
          s.src='https://unpkg.com/docx@9.1.1/build/index.umd.js';
          s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
        });
      }
      const{Document,Packer,Paragraph,TextRun,AlignmentType,LevelFormat,ExternalHyperlink,BorderStyle}=window.docx;
      const rd=resumeData;
      // Build document children
      const children=[];
      // Name
      children.push(new Paragraph({spacing:{after:10,before:0},alignment:AlignmentType.LEFT,children:[new TextRun({text:'Ili Selinger',font:'Arial',bold:true,color:'1f4e79',size:40})]}));
      // Contact
      children.push(new Paragraph({spacing:{after:60,before:0},children:[new TextRun({text:'ilan.selinger@gmail.com  ·  510-332-0543  ·  Walnut Creek, CA  ·  ',font:'Arial',color:'444444',size:17}),new ExternalHyperlink({children:[new TextRun({text:'linkedin.com/in/ilan-selinger',font:'Arial',color:'1155cc',size:17,style:'Hyperlink'})],link:'https://linkedin.com/in/ilan-selinger'})]}));
      // Blue divider
      children.push(new Paragraph({spacing:{after:40,before:15},border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2e75b6',space:1}},children:[]}));
      // SUMMARY header
      children.push(new Paragraph({spacing:{after:30,before:40},children:[new TextRun({text:'SUMMARY',font:'Arial',bold:true,color:'1f4e79',size:18})]}));
      // Summary text
      children.push(new Paragraph({spacing:{after:10,before:0},children:[new TextRun({text:rd.summary,font:'Arial',color:'1a1a1a',size:17})]}));
      // Skills italic
      if(rd.skills)children.push(new Paragraph({spacing:{after:60,before:0},children:[new TextRun({text:rd.skills,font:'Arial',italics:true,color:'444444',size:16})]}));
      // Blue divider
      children.push(new Paragraph({spacing:{after:40,before:15},border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2e75b6',space:1}},children:[]}));
      // EXPERIENCE header
      children.push(new Paragraph({spacing:{after:30,before:40},children:[new TextRun({text:'EXPERIENCE',font:'Arial',bold:true,color:'1f4e79',size:18})]}));
      // Experience entries
      (rd.experience||[]).forEach(function(exp){
        const titleRuns=[
          new TextRun({text:exp.company,font:'Arial',bold:true,color:'1a1a1a',size:20}),
          new TextRun({text:'  |  ',font:'Arial',color:'999999',size:19}),
          new TextRun({text:exp.title,font:'Arial',bold:true,color:'1a1a1a',size:19})
        ];
        if(exp.level)titleRuns.push(new TextRun({text:'  '+exp.level,font:'Arial',color:'888888',size:17}));
        titleRuns.push(new TextRun({text:'  |  ',font:'Arial',color:'999999',size:19}));
        titleRuns.push(new TextRun({text:exp.dates,font:'Arial',color:'444444',size:19}));
        children.push(new Paragraph({spacing:{after:16,before:40},children:titleRuns}));
        if(exp.subtitle)children.push(new Paragraph({spacing:{after:10,before:0},children:[new TextRun({text:exp.subtitle,font:'Arial',italics:true,color:'444444',size:17})]}));
        (exp.bullets||[]).forEach(function(bullet){
          // Parse **bold** markers
          const parts=bullet.split(/\\*\\*(.+?)\\*\\*/g);
          const runs=parts.map(function(p,idx){
            return new TextRun({text:p,font:'Arial',bold:idx%2===1,color:'1a1a1a',size:17});
          });
          children.push(new Paragraph({spacing:{after:18,before:18,line:240,lineRule:'auto'},indent:{left:480,hanging:240},numbering:{reference:'bullets',level:0},children:runs}));
        });
      });
      // CERTS
      if(rd.certs){
        children.push(new Paragraph({spacing:{after:40,before:15},border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2e75b6',space:1}},children:[]}));
        children.push(new Paragraph({spacing:{after:30,before:40},children:[new TextRun({text:'CERTIFICATIONS & EDUCATION',font:'Arial',bold:true,color:'1f4e79',size:18})]}));
        children.push(new Paragraph({spacing:{after:10,before:0},children:[new TextRun({text:rd.certs,font:'Arial',color:'1a1a1a',size:17})]}));
      }
      // PUBLICATION
      if(rd.publication){
        children.push(new Paragraph({spacing:{after:40,before:15},border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'2e75b6',space:1}},children:[]}));
        children.push(new Paragraph({spacing:{after:30,before:40},children:[new TextRun({text:'PUBLICATION',font:'Arial',bold:true,color:'1f4e79',size:18})]}));
        children.push(new Paragraph({spacing:{after:10,before:0},children:[new TextRun({text:rd.publication.title,font:'Arial',bold:true,color:'1a1a1a',size:17}),new TextRun({text:' | '+rd.publication.venue,font:'Arial',color:'1a1a1a',size:17})]}));
        if(rd.publication.description)children.push(new Paragraph({spacing:{after:10,before:0},children:[new TextRun({text:rd.publication.description,font:'Arial',color:'1a1a1a',size:17})]}));
      }
      const doc=new Document({
        numbering:{config:[{reference:'bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'\\u2022',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:480,hanging:240}}}}]}]},
        sections:[{
          properties:{page:{size:{width:12240,height:15840},margin:{top:500,bottom:500,left:900,right:900}}},
          children:children
        }]
      });
      const buffer=await Packer.toBuffer(doc);
      const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download='Ili_Selinger_Resume_'+${JSON.stringify(company)}.replace(/\\W+/g,'_')+'_'+${JSON.stringify(role)}.replace(/\\W+/g,'_')+'.docx';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
      statusEl.textContent='✅ Resume downloaded!';
      setTimeout(function(){statusEl.style.display='none';},3000);
    }catch(err){
      statusEl.textContent='❌ '+err.message;
      statusEl.style.background='rgba(220,38,38,.15)';
      statusEl.style.color='#dc2626';
      console.error('DOCX generation error:',err);
    }
  }
  // Check for cached research first
  const cached=localStorage.getItem('${storageKey}_ai_research');
  if(cached){renderSections(cached);document.querySelectorAll('.sec').forEach(function(s){s.classList.add('done');});document.getElementById('stream-status').textContent='📦 Loaded from cache';document.getElementById('stream-status').style.display='block';setTimeout(function(){document.getElementById('stream-status').style.display='none';},2000);}
  else{streamResearch();}
  ` : '';

  const pageJs = [
    mdToHtmlFn,
    'function restoreNotes(){',
    '  document.querySelectorAll("[data-key]").forEach(function(el){',
    '    const v=localStorage.getItem(el.dataset.key);if(v)el.value=v;',
    '  });',
    '  document.querySelectorAll(".notes-ta").forEach(function(ta){',
    '    ta.addEventListener("input",function(){localStorage.setItem(ta.dataset.key,ta.value);});',
    '  });',
    '}',
    'function copyRequest(){',
    '  const msg=document.getElementById("claude-msg").textContent;',
    '  navigator.clipboard.writeText(msg).then(function(){',
    '    const btn=document.getElementById("copy-btn");',
    '    btn.textContent="✓ Copied!";',
    '    setTimeout(function(){btn.textContent="📋 Copy message";},2500);',
    '  });',
    '}',
    'function navScroll(id){document.getElementById(id).scrollIntoView({behavior:"smooth",block:"start"});return false;}',
    'const obs=new IntersectionObserver(function(entries){',
    '  entries.forEach(function(e){',
    '    if(!e.isIntersecting)return;',
    '    document.querySelectorAll(".nav-item").forEach(function(a){a.classList.remove("active");});',
    '    const a=document.querySelector(\'.nav-item[href="#\'+e.target.id+\'"]\');',
    '    if(a)a.classList.add("active");',
    '  });',
    '},{threshold:0.25});',
    'document.querySelectorAll("section.sec").forEach(function(s){obs.observe(s);});',
    'restoreNotes();',
  ].join('\n');

  const css = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#f0f4f8;color:#1a202c;display:flex;min-height:100vh}',
    '.sidebar{width:240px;flex-shrink:0;position:fixed;top:0;left:0;height:100vh;background:#1a3a5c;color:white;display:flex;flex-direction:column;overflow-y:auto;z-index:10}',
    '.sb-head{padding:18px 16px 12px;border-bottom:1px solid rgba(255,255,255,.12)}',
    '.sb-co{font-size:14px;font-weight:800;color:#fff;line-height:1.3}',
    '.sb-role{font-size:11px;opacity:.6;margin-top:3px}',
    '.sb-date{font-size:10px;opacity:.4;margin-top:5px}',
    '.claude-box{padding:14px 16px;background:rgba(46,117,182,.35);border-bottom:1px solid rgba(255,255,255,.1)}',
    '.claude-box .lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#90cdf4;margin-bottom:8px}',
    '.claude-msg{font-size:11px;color:white;line-height:1.5;background:rgba(0,0,0,.2);border-radius:6px;padding:8px 10px;margin-bottom:8px;font-style:italic}',
    '.btn-copy{width:100%;padding:7px;background:#2e75b6;border:none;border-radius:6px;color:white;font-size:11px;font-weight:700;cursor:pointer;transition:background .15s}',
    '.btn-copy:hover{background:#1a5ca0}',
    '.claude-note{font-size:9px;opacity:.45;margin-top:6px;line-height:1.4}',
    'nav{padding:6px 0;flex:1}',
    '.nav-item{display:flex;align-items:flex-start;gap:7px;padding:7px 16px;font-size:11px;opacity:.65;cursor:pointer;transition:all .12s;line-height:1.3;text-decoration:none;color:white}',
    '.nav-item:hover,.nav-item.active{background:rgba(255,255,255,.1);opacity:1}',
    '.sb-foot{padding:12px 16px;border-top:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;gap:6px}',
    '.btn-print{padding:7px 0;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:white;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;text-align:center}',
    '.btn-print:hover{background:rgba(255,255,255,.22)}',
    '.jd-lnk{font-size:10px;opacity:.5;word-break:break-all;line-height:1.4}',
    '.jd-lnk a{color:#90cdf4;text-decoration:underline}',
    '.main{margin-left:240px;flex:1;padding:28px 32px 60px;max-width:860px}',
    '.pg-head{margin-bottom:22px}',
    '.pg-head h2{font-size:22px;font-weight:800;color:#1a3a5c}',
    '.pg-head .sub{font-size:13px;color:#718096;margin-top:4px}',
    '#stream-status{display:none;background:rgba(46,117,182,.1);border:1px solid rgba(46,117,182,.25);border-radius:8px;padding:10px 16px;margin-bottom:14px;font-size:12px;font-weight:600;color:#2e75b6;transition:all .2s}',
    '.streaming-msg{color:#2e75b6;font-style:italic;font-size:12px;animation:pulse 1.5s ease-in-out infinite}',
    '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}',
    '.sec{background:white;border-radius:12px;padding:20px 22px;box-shadow:0 1px 4px rgba(0,0,0,.07);margin-bottom:14px;border-left:4px solid #e2e8f0;transition:border-color .3s}',
    '.sec.done{border-left-color:#48bb78}',
    '.sec-hd{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
    '.sec-em{font-size:20px;line-height:1}',
    '.sec-hd h2{font-size:15px;font-weight:700;color:#1a3a5c;flex:1}',
    '.sec-refresh-btn{padding:3px 8px;background:var(--bg-surface,#f7fafc);border:1.5px solid var(--border-medium,#e2e8f0);border-radius:5px;font-size:11px;cursor:pointer;opacity:0.6;transition:opacity .2s}',
    '.sec-refresh-btn:hover{opacity:1}',
    '.sec-hint{font-size:11px;color:#a0aec0;margin-bottom:10px;line-height:1.4}',
    '.sec-content{font-size:13px;line-height:1.75;color:#2d3748;min-height:40px}',
    '.empty-msg{color:#cbd5e0;font-style:italic;font-size:12px}',
    '.sec-content h3{font-size:14px;font-weight:700;margin:14px 0 5px;color:#1a3a5c}',
    '.sec-content h4{font-size:13px;font-weight:700;margin:11px 0 3px}',
    '.sec-content p{margin:5px 0}',
    '.sec-content ul{margin:6px 0 6px 20px}',
    '.sec-content li{margin:3px 0}',
    '.sec-content strong{color:#1a3a5c}',
    '.notes-wrap{margin-top:14px;border-top:1px dashed #e2e8f0;padding-top:12px}',
    '.notes-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#a0aec0;margin-bottom:5px}',
    '.notes-ta{width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:12px;color:#1a202c;font-family:inherit;resize:vertical;min-height:60px;line-height:1.5}',
    '.notes-ta:focus{outline:none;border-color:#2e75b6}',
    '@media print{.sidebar,.notes-wrap,#stream-status{display:none!important}.main{margin-left:0;padding:16px}.sec{break-inside:avoid;box-shadow:none;border:1px solid #e2e8f0}}',
  ].join('\n');

  const jdLinkHtml = jdUrl ? '    <div class="jd-lnk">📎 <a href="' + jdUrl + '" target="_blank">Job Posting</a></div>\n' : '';
  const jdSubHtml  = jdUrl ? ' · <a href="' + jdUrl + '" target="_blank" style="color:#2e75b6">Job Posting ↗</a>' : '';

  // In sidebar: show API status if key provided, else show manual copy-paste
  const sidebarAiHtml = apiKey
    ? '  <div class="claude-box">\n'
      + '    <div class="lbl">⚡ AI Auto-Research</div>\n'
      + '    <div style="font-size:11px;color:rgba(255,255,255,.7);line-height:1.5;margin-bottom:6px">Streaming research from Claude…</div>\n'
      + '    <button class="btn-copy" onclick="streamResearch()">🔄 Re-run Research</button>\n'
      + '    <div class="claude-note" style="margin-top:6px">Results are cached locally. Re-run to refresh.</div>\n'
      + '  </div>\n'
    : '  <div class="claude-box">\n'
      + '    <div class="lbl">⚡ Get AI Research</div>\n'
      + '    <div class="claude-msg" id="claude-msg">' + claudeMsg + '</div>\n'
      + '    <button class="btn-copy" id="copy-btn" onclick="copyRequest()">📋 Copy message</button>\n'
      + '    <div class="claude-note">Paste into the Claude sidebar → Claude will research and fill these sections automatically.</div>\n'
      + '  </div>\n';

  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>Research: ' + company + ' – ' + role + '</title>\n'
    + '<style>\n' + css + '\n</style>\n'
    + '</head>\n<body>\n'
    + '<aside class="sidebar">\n'
    + '  <div class="sb-head">\n'
    + '    <div class="sb-co">' + company + '</div>\n'
    + '    <div class="sb-role">' + role + '</div>\n'
    + '    <div class="sb-date">Created ' + createdDate + '</div>\n'
    + '  </div>\n'
    + sidebarAiHtml
    + '  <nav>\n' + navHtml + '\n  </nav>\n'
    + '  <div class="sb-foot">\n'
    + '    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>\n'
    + jdLinkHtml
    + '  </div>\n'
    + '</aside>\n'
    + '<main class="main">\n'
    + '  <div class="pg-head">\n'
    + '    <h2>🔬 ' + company + '</h2>\n'
    + '    <div class="sub">' + role + jdSubHtml + '</div>\n'
    + '  </div>\n'
    + '  <div id="stream-status"></div>\n'
    + sectionsHtml + '\n'
    + '</main>\n'
    + '<script>\n' + pageJs + '\n' + streamFn + '\n<\/script>\n'
    + '</body>\n</html>';

  // Open brief as HTML in a new tab
  const fileName = 'brief_' + company.replace(/\W+/g,'_').toLowerCase() + '_' + role.replace(/\W+/g,'_').toLowerCase() + '.html';
  const briefWin = window.open('', '_blank');
  if (briefWin) {
    briefWin.document.open();
    briefWin.document.write(html);
    briefWin.document.close();
  } else {
    // Fallback if popup blocked: open in same tab with back button
    alert('Popup blocked! The brief will open in this tab. Use your browser back button to return.');
    document.open();
    document.write(html);
    document.close();
  }

  // Track this brief in localStorage for the Recent Briefs list
  const briefs = JSON.parse(localStorage.getItem('ili_research_briefs') || '[]');
  const existing = briefs.findIndex(b => b.storageKey === storageKey);
  const briefMeta = { company, role, jdUrl, interviewers, storageKey, fileName, created: new Date().toISOString() };
  if (existing >= 0) briefs[existing] = briefMeta;
  else briefs.unshift(briefMeta);
  localStorage.setItem('ili_research_briefs', JSON.stringify(briefs));

  closeResearchModal();
  renderRecentBriefs();
  } catch(e) { console.error('[Research Brief error]', e); alert('Error generating brief: ' + e.message); }
}

// ─── RECENT BRIEFS ──────────────────────────────────────────────────────
function renderRecentBriefs() {
  const container = document.getElementById('recentBriefs');
  if (!container) return;
  const briefs = JSON.parse(localStorage.getItem('ili_research_briefs') || '[]');
  if (briefs.length === 0) {
    container.innerHTML = '<div style="color:#a0aec0;font-size:12px;font-style:italic;padding:6px 0">No briefs generated yet. Click "Research a Company" to create one.</div>';
    return;
  }
  container.innerHTML = briefs.map(function(b) {
    const date = new Date(b.created).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const hasCache = !!localStorage.getItem(b.storageKey + '_ai_research');
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f4f8">'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:13px;font-weight:600;color:#1a3a5c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + b.company + '</div>'
      + '<div style="font-size:11px;color:#718096;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + b.role + '</div>'
      + '</div>'
      + '<div style="font-size:10px;color:#a0aec0;white-space:nowrap">' + date + '</div>'
      + (hasCache ? '<button onclick="reopenBrief(\'' + b.storageKey.replace(/'/g,"\\'") + '\')" style="padding:4px 10px;background:#2e75b6;color:white;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">Open</button>' : '<span style="font-size:10px;color:#cbd5e0">no cache</span>')
      + '<button onclick="rerunBrief(\'' + encodeURIComponent(JSON.stringify(b)).replace(/'/g,"\\'") + '\')" style="padding:4px 10px;background:white;color:#2e75b6;border:1.5px solid #2e75b6;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap" title="Re-generate with API">🔄</button>'
      + '</div>';
  }).join('');
}

function reopenBrief(storageKey) {
  const briefs = JSON.parse(localStorage.getItem('ili_research_briefs') || '[]');
  const b = briefs.find(x => x.storageKey === storageKey);
  if (!b) return;
  document.getElementById('rm-company').value = b.company || '';
  document.getElementById('rm-role').value = b.role || '';
  document.getElementById('rm-url').value = b.jdUrl || '';
  const iv = document.getElementById('rm-interviewers');
  if (iv) iv.value = b.interviewers || '';
  generateResearchBrief();
}

function rerunBrief(encoded) {
  const b = JSON.parse(decodeURIComponent(encoded));
  localStorage.removeItem(b.storageKey + '_ai_research');
  document.getElementById('rm-company').value = b.company || '';
  document.getElementById('rm-role').value = b.role || '';
  document.getElementById('rm-url').value = b.jdUrl || '';
  const iv = document.getElementById('rm-interviewers');
  if (iv) iv.value = b.interviewers || '';
  generateResearchBrief();
}
// ─── INIT ─────────────────────────────────────────────────────────────────
try {
  migrateData();
  updateStreak();
  // Initialize view system — renders the last active view
  switchView(currentView, currentCompany);
} catch(e) { console.error('[Dashboard INIT error]', e); }
// Init artifacts (async, may need to verify handle)
initArtifacts();
