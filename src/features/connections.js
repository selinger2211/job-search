// LinkedIn connections: import, matching, network map, side panel

import { normalizeCompanyName } from '../utils/normalize.js';
import { parseCSVLine } from '../utils/csv.js';
import { getLinkedInData, saveLinkedInData, getCompanies } from '../data/store.js';

// ─── Connection matching ────────────────────────────────────────────────

export function getConnectionsForCompany(companyName) {
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

// ─── CSV Import ─────────────────────────────────────────────────────────

export function importLinkedInCSV(input, { renderNetworkMap, renderPipeline, renderTierList }) {
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
        firstName, lastName,
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
      connections
    };
    saveLinkedInData(data);
    renderNetworkMap();
    renderPipeline();
    renderTierList();
    input.value = '';
  };
  reader.readAsText(file);
}

// ─── Network Map ────────────────────────────────────────────────────────

export function renderNetworkMap(filterQuery) {
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

  const roles = (window._appGetRoles || function(){ return []; })();
  const companies = getCompanies();
  const allTargets = [...new Set([
    ...roles.map(r => r.company),
    ...Object.values(companies).flat()
  ])];

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

  const q = filterQuery || '';
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

// ─── Side Panel ─────────────────────────────────────────────────────────

export function openConnPanel(companyName) {
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
    const scored = conns.map(function(c) {
      let score = 0;
      const t = (c.position || '').toLowerCase();
      const isProduct = /\b(product|pm\b|program)/.test(t);
      const isEng = /\b(engineer|software|developer|swe|platform|infrastructure|architect|technical|tech lead|cto|sre)/.test(t);
      const isDesign = /\b(design|ux|ui|creative|brand)/.test(t);
      const isData = /\b(data|analytics|machine learning|ml\b|ai\b|science)/.test(t);
      const isRelevant = isProduct || isEng || isDesign || isData;
      if (isProduct) score += 30;
      else if (isEng) score += 25;
      else if (isDesign) score += 22;
      else if (isData) score += 22;
      if (/\b(recruiter|recruiting|talent|hr|people)\b/.test(t)) score += 28;
      if (/\b(ceo|cto|cfo|coo|cpo|cmo|chief|president)\b/.test(t)) score += 60;
      else if (/\b(svp|senior vice president|evp|executive vice president)\b/.test(t)) score += 55;
      else if (/\b(vp|vice president)\b/.test(t)) score += 50;
      else if (/\bdir(ector)?\b/.test(t)) score += 40;
      else if (/\b(head of|head,)\b/.test(t)) score += 38;
      else if (/\b(principal|staff|fellow)\b/.test(t)) score += 30;
      else if (/\b(senior|sr\.?|lead)\b/.test(t)) score += 25;
      else if (/\bmanager\b/.test(t)) score += 20;
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

export function closeConnPanel() {
  document.getElementById('connPanel').classList.remove('open');
  document.getElementById('connPanelOverlay').classList.remove('open');
}

export function buildConnBadge(company, conns) {
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
