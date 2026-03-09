// Formatting utilities

export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function detectArtifactType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['pdf', 'docx', 'doc'].includes(ext)) return 'resume';
  if (['pptx', 'ppt', 'key'].includes(ext)) return 'slides';
  if (ext === 'html' && fileName.includes('research')) return 'research_brief';
  if (['md', 'txt'].includes(ext)) return 'notes';
  return 'other';
}

export function artifactTypeIcon(type) {
  const icons = { resume: '📄', research_brief: '🔬', deep_research: '🔍', slides: '📊', notes: '📝', other: '📎' };
  return icons[type] || '📎';
}
