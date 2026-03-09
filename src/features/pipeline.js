// Pipeline: Kanban board, stage transitions, drag & drop

import { getConfig } from '../../config.js';
import { loadRoles, saveRoles, getCompanyArtifacts } from '../data/store.js';
import { getConnectionsForCompany } from './connections.js';

const _cfg = getConfig();
const STAGES = _cfg.stages;
const STAGE_LABELS = _cfg.stageLabels;
const TIER_COLORS = _cfg.tierColors;

// \u2500\u2500\u2500 Stage History \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function pushStageHistory(role, newStage) {
  if (role.stage === newStage) return role;
  if (!role.stageHistory) role.stageHistory = [{ stage: role.stage || 'tracking', ts: role.date || new Date().toISOString() }];
  role.stageHistory.push({ stage: newStage, ts: new Date().toISOString() });
  role.stage = newStage;
  return role;
}

// \u2500\u2500\u2500 Render Pipeline \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function renderPipeline(filterQuery) {
  if (!document.getElementById('col-tracking')) return;
  const roles  = loadRoles();
  const counts = {};
  STAGES.forEach(s => { counts[s] = 0; });

  // Clear cards (preserve column headers)
  STAGES.forEach(s => {
    Array.from(document.getElementById('col-'+s).querySelectorAll('.pipeline-card,.add-card-btn')).forEach(el=>el.remove());
  });

  const q = filterQuery || '';
  const visible = q
    ? roles.filter(r => r.company.toLowerCase().includes(q) || (r.roleTitle||'').toLowerCase().includes(q))
    : roles;

  if (q) {
    const fc = document.getElementById('filterCount');
    if (fc) { fc.textContent = `${visible.length} of ${roles.length}`; fc.style.display = 'inline'; }
  } else {
    const fc = document.getElementById('filterCount');
    if (fc) fc.style.display = 'none';
  }

  const cmLabel = { email:'\u2709\uFE0F', linkedin:'\u{1F4BC}', other:'\u{1F4AC}' };

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

    const refBadge = role.referral === 'referred' ? `<span class="mini-badge referral-badge-referred" title="Has referral">\u{1F91D}</span>`
      : role.referral === 'cold' ? `<span class="mini-badge referral-badge-cold" title="Cold application">\u{1F9CA}</span>` : '';
    const srcBadge = role.source === 'inbound'
      ? `<span class="mini-badge source-inbound" title="Inbound \u2014 recruiter reached out">\u{1F4E5}</span>`
      : `<span class="mini-badge source-outbound" title="Outbound \u2014 you applied">\u{1F4E4}</span>`;
    const contactBadge = role.lastContactedMethod
      ? `<span class="mini-badge contact-${role.lastContactedMethod}" title="Last contact method: ${role.lastContactedMethod}">${cmLabel[role.lastContactedMethod]}</span>` : '';
    const contactDateStr = role.lastContactedDate
      ? new Date(role.lastContactedDate+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})
      : null;

    const linkedConns = getConnectionsForCompany(role.company);
    const warmBadge = linkedConns.length
      ? `<span class="conn-chip-wrap" onclick="event.stopPropagation();openConnPanel('${role.company.replace(/'/g,"\\'")}')" title="View ${linkedConns.length} connections"><span class="warm-intro-badge">\u{1F517} ${linkedConns.length}</span></span>`
      : '';
    const coArtifacts = getCompanyArtifacts(role.company);
    const artifactBadge = coArtifacts.length
      ? `<span class="artifact-badge" title="${coArtifacts.length} file${coArtifacts.length>1?'s':''}: ${coArtifacts.map(a=>a.fileName).join(', ')}">\u{1F4CE} ${coArtifacts.length}</span>`
      : '';

    card.innerHTML = `
      <div class="co">
        <span class="tier-dot" style="background:${TIER_COLORS[role.tier]}"></span>
        ${role.company}
        ${refBadge}${warmBadge}${artifactBadge}
      </div>
      <div class="role">${role.roleTitle}</div>
      ${role.url ? `<div style="margin-top:2px"><a href="${role.url}" target="_blank" style="font-size:9px;color:var(--accent-blue);text-decoration:none;background:var(--bg-surface);padding:1px 6px;border-radius:4px;border:1px solid var(--border-medium)" onclick="event.stopPropagation()" title="Open job posting in new tab">\u{1F4C4} View Job Posting</a></div>` : ''}
      <div class="card-footer">
        <div class="card-meta">
          ${srcBadge}${contactBadge}
          ${contactDateStr ? `<span style="font-size:9px;color:var(--text-faint)" title="Last contacted">${contactDateStr}</span>` : ''}
        </div>
        <div style="display:flex;gap:3px;align-items:center">
          <button style="padding:2px 6px;background:var(--bg-surface);border:1px solid var(--border-medium);border-radius:4px;font-size:9px;cursor:pointer;color:var(--text-muted)" title="Edit role details" onclick="event.stopPropagation();openEditModal('${role.id}')">\u270F\uFE0F</button>
          <button class="btn-research" title="Generate AI research brief for this role" onclick="event.stopPropagation();openResearchModal('${role.company.replace(/'/g,"\\'")}','${(role.roleTitle||'').replace(/'/g,"\\'")}','${role.url||''}')">\u{1F52C}</button>
          <button class="btn-research" style="background:var(--accent-blue);color:white" title="Generate tailored resume for this role" onclick="event.stopPropagation();generateStandaloneResume('${role.company.replace(/'/g,"\\'")}','${(role.roleTitle||'').replace(/'/g,"\\'")}','${role.url||''}')">\u{1F4C4}</button>
          ${prevStage ? `<button class="stage-btn stage-btn-back" title="Move back to ${STAGE_LABELS[prevStage]}" onclick="event.stopPropagation();moveStage('${role.id}','${prevStage}')">\u2190</button>` : ''}
          ${nextStage ? `<button class="stage-btn stage-btn-fwd" title="Advance to ${STAGE_LABELS[nextStage]}" onclick="event.stopPropagation();moveStage('${role.id}','${nextStage}')">\u2192 ${STAGE_LABELS[nextStage]}</button>` : ''}
        </div>
      </div>`;

    card.addEventListener('click', () => { localStorage.setItem('ili_prevView', window._currentView || 'dashboard'); window.switchView('company-profile', role.company); });

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
    btn.onclick = e => { e.stopPropagation(); window.openAddModal(s); };
    col.appendChild(btn);
    document.getElementById('cnt-'+s).textContent = counts[s]||0;

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
        window.renderAll();
      }
    };
  });

  // Header stats
  var el;
  if ((el = document.getElementById('statTracking'))) el.textContent  = roles.filter(r=>r.stage==='tracking').length;
  if ((el = document.getElementById('statOutreach'))) el.textContent  = roles.filter(r=>r.stage==='outreach').length;
  if ((el = document.getElementById('statApplied')))  el.textContent  = roles.filter(r=>r.stage==='applied').length;
  if ((el = document.getElementById('statActive')))   el.textContent  = roles.filter(r=>['screen','interview'].includes(r.stage)).length;
  if ((el = document.getElementById('statInbound')))  el.textContent  = roles.filter(r=>r.source==='inbound').length;
  if ((el = document.getElementById('statOutbound'))) el.textContent  = roles.filter(r=>r.source!=='inbound').length;
}

// \u2500\u2500\u2500 Stage Move \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export function moveStage(id, newStage) {
  const roles = loadRoles();
  const idx = roles.findIndex(r => r.id === id);
  if (idx === -1) return;
  roles[idx] = pushStageHistory(roles[idx], newStage);
  saveRoles(roles);
  window.renderAll();
}
