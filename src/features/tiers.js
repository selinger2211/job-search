// Tier list, company manager modal

import { getConfig } from '../../config.js';
import { loadRoles, getCompanies, saveCompaniesData } from '../data/store.js';
import { getConnectionsForCompany, buildConnBadge } from './connections.js';

const _cfg = getConfig();
const STAGE_BADGE = _cfg.stageBadge;
const TIER_COLORS = _cfg.tierColors;
const TIER_NAMES = _cfg.tierNames;
const TIER_HDR_COLORS = TIER_COLORS;

// ─── Edit Mode ──────────────────────────────────────────────────────────

let editModeActive = false;

export function toggleEditMode() {
  editModeActive = !editModeActive;
  document.body.classList.toggle('edit-mode', editModeActive);
  const btn = document.getElementById('editModeBtn');
  btn.textContent = editModeActive ? '✅ Done' : '✏️ Edit';
  btn.style.background   = editModeActive ? '#f0fdf4' : '#f7fafc';
  btn.style.borderColor  = editModeActive ? '#9ae6b4' : '#e2e8f0';
  btn.style.color        = editModeActive ? '#16a34a' : '#4a5568';
}

export function removeCompanyFromTier(co, tier) {
  const cos = getCompanies(); cos[tier] = cos[tier].filter(c=>c!==co);
  saveCompaniesData(cos); renderTierList();
}

// ─── Tier List ──────────────────────────────────────────────────────────

export function renderTierList(filterQuery) {
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

  const q = filterQuery || '';
  tierListEl.innerHTML = Object.entries(COMPANIES).map(([tier, cos]) => `
    <div class="tier-section">
      <span class="tier-label tier-${tier}">Tier ${tier}</span><br>
      <div style="margin-top:3px">
        ${cos.map(co => {
          const hidden = q && !co.toLowerCase().includes(q) ? ' chip-hidden' : '';
          const stage = coStage[co.toLowerCase()];
          const sb = stage ? STAGE_BADGE[stage] : null;
          const safeId = co.replace(/['"\\]/g,'');
          const cls = `company-chip chip-t${tier}${sb?' '+sb.cls:''}${hidden}`;
          const badge = sb ? `<span class="chip-status-badge" style="background:rgba(0,0,0,0.08)">${sb.label}</span>` : '';
          const conns = getConnectionsForCompany(co);
          const connBadge = buildConnBadge(co, conns);
          return `<span class="${cls}" title="${sb?sb.title:'Click to add to pipeline'}" onclick="if(!isEditMode())openAddModalCo('${safeId}','${tier}')">${co}${badge}${connBadge}<span class="chip-remove" onclick="event.stopPropagation();removeCompanyFromTier('${safeId}','${tier}')" title="Remove">×</span></span>`;
        }).join('')}
      </div>
    </div>`).join('');

  var clEl = document.getElementById('companyList');
  if (clEl) clEl.innerHTML = Object.values(COMPANIES).flat().map(c=>`<option value="${c}">`).join('');
}

// ─── Company Manager Modal ──────────────────────────────────────────────

export function openCoManager() { renderCoManagerList(); document.getElementById('coManagerModal').classList.add('open'); }
export function closeCoManager() { document.getElementById('coManagerModal').classList.remove('open'); renderTierList(); }

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

export function recheckCompany(co, newTier) {
  const cos = getCompanies();
  [1,2,3,4].forEach(t=>{ cos[t]=(cos[t]||[]).filter(c=>c!==co); });
  if (!cos[newTier]) cos[newTier]=[];
  cos[newTier].push(co);
  saveCompaniesData(cos); renderCoManagerList();
}

export function deleteCompany(co, tier) {
  const cos = getCompanies(); cos[tier]=cos[tier].filter(c=>c!==co);
  saveCompaniesData(cos); renderCoManagerList();
}

export function addCompany() {
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

// ─── Expose editModeActive for onclick references ───────────────────────
// The onclick in renderTierList checks `editModeActive` on window
export function isEditMode() { return editModeActive; }
