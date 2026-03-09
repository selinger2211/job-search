// Company Artifacts: File System Access API, IndexedDB handle storage

import { detectArtifactType, artifactTypeIcon, formatFileSize } from '../utils/format.js';
import { getArtifactIndex, saveArtifactIndex, loadRoles, getCompanies } from '../data/store.js';

const ARTIFACT_DB_NAME = 'ili_artifact_db';
const ARTIFACT_STORE = 'handles';
let _artifactDirHandle = null;
let _artifactReady = false;
let _artifactUploadCompany = null;

// \u2500\u2500\u2500 IndexedDB helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

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

// \u2500\u2500\u2500 Folder selection & permission \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function selectArtifactsFolder() {
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
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') { _artifactDirHandle = handle; _artifactReady = true; return handle; }
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
    const safe = company.replace(/[<>:"/\\|?*]/g, '_').trim();
    return await root.getDirectoryHandle(safe, { create: true });
  }
}

// \u2500\u2500\u2500 File operations \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function saveArtifactFile(company, fileName, blob) {
  const dir = await ensureCompanyFolder(company);
  if (!dir) return false;
  try {
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    const index = getArtifactIndex();
    const existing = index.artifacts.find(a => a.company === company && a.fileName === fileName);
    if (existing) {
      existing.modified = new Date().toISOString();
      existing.size = blob.size;
    } else {
      index.artifacts.push({
        id: 'a_' + Date.now(),
        company, type: detectArtifactType(fileName),
        fileName, label: fileName,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        size: blob.size
      });
    }
    saveArtifactIndex(index);
    return true;
  } catch (e) { console.error('Save artifact failed:', e); return false; }
}

export async function deleteArtifactFile(company, fileName) {
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

export async function openArtifactFile(company, fileName) {
  const dir = await ensureCompanyFolder(company);
  if (!dir) return;
  try {
    const fh = await dir.getFileHandle(fileName);
    const file = await fh.getFile();
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  } catch (e) { console.error('Open artifact failed:', e); }
}

// \u2500\u2500\u2500 Sync \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

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
            company, type: detectArtifactType(fname),
            fileName: fname, label: fname,
            created: new Date(file.lastModified).toISOString(),
            modified: new Date(file.lastModified).toISOString(),
            size: file.size
          });
        }
      }
    }
    index.artifacts = index.artifacts.filter(a => found.has(a.company + '/' + a.fileName));
    saveArtifactIndex(index);
  } catch (e) { console.error('Sync failed:', e); }
}

// \u2500\u2500\u2500 UI helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

function updateArtifactFolderStatus() {
  const el = document.getElementById('artifactFolderStatus');
  const btn = document.getElementById('artifactFolderBtn');
  if (!el || !btn) return;
  const folderName = localStorage.getItem('ili_artifacts_folder');
  if (_artifactReady && folderName) {
    el.textContent = '\u{1F4C2} ' + folderName;
    btn.textContent = '\u{1F504} Sync';
    btn.onclick = async function() { await syncFolderToIndex(); renderArtifactManager(); window.renderPipeline && window.renderPipeline(); showArtifactToast('Artifacts synced!'); };
  } else {
    el.textContent = '';
    btn.textContent = '\u{1F4C1} Set Folder';
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

export async function handleArtifactUpload(input) {
  if (!input.files.length || !_artifactUploadCompany) return;
  const company = _artifactUploadCompany;
  for (const file of input.files) {
    await saveArtifactFile(company, file.name, file);
  }
  input.value = '';
  _artifactUploadCompany = null;
  renderArtifactManager();
  window.renderPipeline && window.renderPipeline();
  showArtifactToast(input.files.length + ' file(s) added to ' + company);
}

export function uploadArtifactFor(company) {
  _artifactUploadCompany = company;
  document.getElementById('artifactFileInput').click();
}

// \u2500\u2500\u2500 Artifact Manager \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function renderArtifactManager() {
  const container = document.getElementById('artifactManager');
  if (!container) return;
  const handle = await getArtifactsHandle(false);

  if (!handle) {
    container.innerHTML = '<div class="artifact-empty">'
      + '<div style="font-size:24px;margin-bottom:6px">\u{1F4C1}</div>'
      + 'Select a folder to store company-specific files<br>'
      + '<span style="font-size:10px;color:var(--text-faintest)">Resumes, research briefs, slides, interview notes \u2014 organized by company</span>'
      + '</div>';
    updateArtifactFolderStatus();
    return;
  }

  updateArtifactFolderStatus();
  const index = getArtifactIndex();
  const roles = loadRoles();
  const companies = getCompanies();
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
    const chevron = arts.length > 0 ? '\u25BE' : '\u25B8';
    html += '<div class="artifact-company">';
    html += '<div class="artifact-company-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">';
    html += '<span>' + chevron + '</span> ' + co;
    html += '<span class="count">' + (arts.length ? arts.length + ' file' + (arts.length > 1 ? 's' : '') : 'empty') + '</span>';
    html += '</div>';
    html += '<div class="artifact-company-body">';
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
      html += '<button class="a-btn a-btn-del" onclick="if(confirm(\'Delete ' + a.fileName.replace(/'/g, "\\'") + '?\'))deleteArtifactFile(\'' + a.company.replace(/'/g, "\\'") + '\',\'' + a.fileName.replace(/'/g, "\\'") + '\').then(()=>{renderArtifactManager();renderPipeline();})">\u00D7</button>';
      html += '</div>';
    });
    html += '<div class="artifact-upload-row">';
    html += '<button class="artifact-upload-btn" onclick="uploadArtifactFor(\'' + co.replace(/'/g, "\\'") + '\')">+ Add File</button>';
    html += '</div>';
    html += '</div></div>';
  });

  container.innerHTML = html;
}

// \u2500\u2500\u2500 Auto-save research brief \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function autoSaveResearchBrief(company, role, htmlContent) {
  if (!_artifactReady) return;
  const safeName = 'research_brief_' + role.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '.html';
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const saved = await saveArtifactFile(company, safeName, blob);
  if (saved) {
    renderArtifactManager();
    showArtifactToast('Brief saved to ' + company + '/' + safeName);
  }
}

// \u2500\u2500\u2500 Init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function initArtifacts() {
  if (!window.showDirectoryPicker) {
    updateArtifactFolderStatus();
    renderArtifactManager();
    return;
  }
  const handle = await getArtifactsHandle(false);
  if (handle) {
    await syncFolderToIndex();
  }
  updateArtifactFolderStatus();
  renderArtifactManager();
}

// \u2500\u2500\u2500 Company Profile Artifacts (for company-profile view) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export async function renderCompanyProfileArtifacts(companyName, artifacts) {
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
      <button onclick="selectArtifactsFolder().then(()=>switchView('company-profile','${companyName.replace(/'/g, "\\'")}'))" style="padding:6px 14px;background:#d97706;color:white;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer">\u{1F4C1} Set Folder</button>
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
