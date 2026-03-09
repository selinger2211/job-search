// Company name normalization and word-boundary matching

export function normalizeCompanyName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/,?\s*(inc\.?|ltd\.?|llc|corp\.?|co\.?|plc|l\.?p\.?|gmbh|ag|s\.?a\.?|n\.?v\.?)$/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
