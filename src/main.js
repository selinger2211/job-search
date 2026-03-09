// ─── IMPORTS ───────────────────────────────────────────────────────────
import { getConfig } from '../config.js';
import { initTheme, cycleTheme } from './ui/theme.js';
import { normalizeCompanyName } from './utils/normalize.js';
import { formatFileSize, artifactTypeIcon } from './utils/format.js';
import {
  loadRoles, saveRoles, getCompanies, initCompanies,
  getLinkedInData, getCompanyArtifacts,
  getApiKey,
  getArtifactIndex,
} from './data/store.js';

// Feature modules
import { getConnectionsForCompany, importLinkedInCSV as _importLinkedInCSV, renderNetworkMap, openConnPanel, closeConnPanel, buildConnBadge } from './features/connections.js';
import { updateStreak, renderTodayActions, renderQuickCheck, saveCheck, renderNudges, refreshNudges, markNudgeDone } from './features/actions.js';
import { renderContactLog, getContactLogForCompany } from './features/contacts.js';
import { renderTierList, openCoManager, closeCoManager, recheckCompany, deleteCompany, addCompany, toggleEditMode, removeCompanyFromTier, isEditMode } from './features/tiers.js';
import { renderPipeline, moveStage, pushStageHistory } from './features/pipeline.js';
import { selectArtifactsFolder, uploadArtifactFor, deleteArtifactFile, openArtifactFile, handleArtifactUpload, renderArtifactManager, renderCompanyProfileArtifacts, initArtifacts, autoSaveResearchBrief } from './features/artifacts.js';

// ─── INIT THEME ─────────────────────────────────────────────────────────
initTheme();

// ─── CONSTANTS (from config) ─────────────────────────────────────────────
const _cfg = getConfig();
const STAGES = _cfg.stages;
const STAGE_LABELS = _cfg.stageLabels;
const STAGE_ICONS = _cfg.stageIcons;
const STAGE_COLORS = _cfg.stageColors;
const TIER_COLORS = _cfg.tierColors;
const TIER_NAMES = _cfg.tierNames;
const STAGE_BADGE = _cfg.stageBadge;

// ─── STORAGE (imported from data/store.js) ───────────────────────────────
initCompanies();

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
}

// Make getRoles available to imported modules
window._appGetRoles = loadRoles;

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
document.getElementById('new-co-name').addEventListener('keydown', e => { if(e.key==='Enter') addCompany(); });
document.getElementById('coManagerModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeCoManager(); });

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


// Wrapper for importLinkedInCSV to provide render callbacks
function importLinkedInCSV(input) {
  _importLinkedInCSV(input, {
    renderNetworkMap: () => renderNetworkMap(filterQuery),
    renderPipeline: () => renderPipeline(filterQuery),
    renderTierList: () => renderTierList(filterQuery)
  });
}

// ─── EXPOSE FUNCTIONS TO WINDOW (for onclick handlers in HTML) ──────────
// Functions referenced by onclick/onchange in index.html or dynamically generated HTML
// ─── EXPOSE FUNCTIONS TO WINDOW (for onclick handlers in HTML) ──────────
// Functions referenced by onclick/onchange in index.html or dynamically generated HTML
Object.assign(window, {
  // Theme
  cycleTheme,
  // Navigation
  switchView,
  // Pipeline
  applyFilter, clearFilter, moveStage,
  openAddModal, openAddModalCo, closeModal, saveRole,
  openEditModal, closeEditModal, updateRole, deleteRole,
  // Tiers
  openCoManager, closeCoManager, addCompany, deleteCompany, recheckCompany, toggleEditMode, removeCompanyFromTier, isEditMode,
  // Research
  openResearchModal, closeResearchModal, generateResearchBrief, generateCompanyProfile,
  reopenBrief, rerunBrief,
  // Connections
  openConnPanel, closeConnPanel, importLinkedInCSV,
  // Artifacts
  selectArtifactsFolder, uploadArtifactFor, deleteArtifactFile, openArtifactFile, handleArtifactUpload, renderArtifactManager,
  // Actions & nudges
  refreshNudges, markNudgeDone, saveCheck,
  // Company views
  filterCompanyByTier, filterCompanyCards, renderCompanyProfileArtifacts,
  // Render functions for dynamic calls
  renderPipeline, renderTierList, renderNetworkMap, renderTodayActions, renderQuickCheck, renderNudges, renderContactLog, renderArtifactManager, renderRecentBriefs,
});
