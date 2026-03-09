// DataStore: centralized localStorage access layer
// All localStorage reads/writes go through here.

import { getConfig } from '../../config.js';

// ─── Roles (pipeline applications) ─────────────────────────────────────

export function loadRoles() {
  try { return JSON.parse(localStorage.getItem('ili_roles') || '[]'); }
  catch { return []; }
}

export function saveRoles(r) {
  localStorage.setItem('ili_roles', JSON.stringify(r));
}

// ─── Companies (tier list) ─────────────────────────────────────────────

export function getCompanies() {
  try {
    const s = localStorage.getItem('ili_companies');
    if (s) return JSON.parse(s);
  } catch {}
  return JSON.parse(JSON.stringify(getConfig().defaultCompanies));
}

export function saveCompaniesData(c) {
  localStorage.setItem('ili_companies', JSON.stringify(c));
}

export function initCompanies() {
  if (!localStorage.getItem('ili_companies')) {
    saveCompaniesData(getConfig().defaultCompanies);
  }
}

// ─── LinkedIn connections ──────────────────────────────────────────────

let _connectionCache = null;

export function getLinkedInData() {
  if (_connectionCache) return _connectionCache;
  try {
    _connectionCache = JSON.parse(localStorage.getItem('ili_linkedin_connections'));
  } catch(e) { _connectionCache = null; }
  return _connectionCache;
}

export function saveLinkedInData(data) {
  localStorage.setItem('ili_linkedin_connections', JSON.stringify(data));
  _connectionCache = data;
}

export function clearConnectionCache() {
  _connectionCache = null;
}

// ─── Artifacts ─────────────────────────────────────────────────────────

export function getArtifactIndex() {
  try { return JSON.parse(localStorage.getItem('ili_artifacts')) || { artifacts: [] }; }
  catch { return { artifacts: [] }; }
}

export function saveArtifactIndex(index) {
  localStorage.setItem('ili_artifacts', JSON.stringify(index));
}

export function getCompanyArtifacts(company) {
  return getArtifactIndex().artifacts.filter(a => a.company === company);
}

// ─── Research briefs ───────────────────────────────────────────────────

export function getResearchBriefsList() {
  try { return JSON.parse(localStorage.getItem('ili_research_briefs') || '[]'); }
  catch { return []; }
}

export function saveResearchBriefsList(list) {
  localStorage.setItem('ili_research_briefs', JSON.stringify(list));
}

export function getResearchContent(storageKey) {
  return localStorage.getItem(storageKey + '_ai_research') || '';
}

export function saveResearchContent(storageKey, text) {
  localStorage.setItem(storageKey + '_ai_research', text);
}

// ─── Company profiles ──────────────────────────────────────────────────

export function getCompanyProfile(companyName) {
  try {
    return JSON.parse(localStorage.getItem('ili_company_profile_' + companyName));
  } catch { return null; }
}

export function saveCompanyProfile(companyName, profile) {
  localStorage.setItem('ili_company_profile_' + companyName, JSON.stringify(profile));
}

// ─── Settings ──────────────────────────────────────────────────────────

export function getTheme() {
  return localStorage.getItem('ili_theme') || 'auto';
}

export function saveTheme(mode) {
  localStorage.setItem('ili_theme', mode);
}

export function getApiKey() {
  return localStorage.getItem('ili_anthropic_key') || '';
}

export function saveApiKey(key) {
  localStorage.setItem('ili_anthropic_key', key);
}

// ─── UI State ──────────────────────────────────────────────────────────

export function getLastView() {
  return localStorage.getItem('ili_lastView') || 'dashboard';
}

export function saveLastView(view) {
  localStorage.setItem('ili_lastView', view);
}

export function getLastCompany() {
  return localStorage.getItem('ili_lastCompany') || '';
}

export function saveLastCompany(company) {
  localStorage.setItem('ili_lastCompany', company);
}

export function getStreak() {
  try { return JSON.parse(localStorage.getItem('ili_streak')) || {}; }
  catch { return {}; }
}

export function saveStreak(data) {
  localStorage.setItem('ili_streak', JSON.stringify(data));
}

// ─── Artifacts folder ──────────────────────────────────────────────────

export function getArtifactsFolderName() {
  return localStorage.getItem('ili_artifacts_folder') || '';
}

export function saveArtifactsFolderName(name) {
  localStorage.setItem('ili_artifacts_folder', name);
}

// ─── Quick check ───────────────────────────────────────────────────────

export function getQuickCheck(roleId) {
  try { return JSON.parse(localStorage.getItem('quickCheck_' + roleId) || '{}'); }
  catch { return {}; }
}

export function saveQuickCheck(roleId, data) {
  localStorage.setItem('quickCheck_' + roleId, JSON.stringify(data));
}
