const mammoth = require('mammoth');
const pdf = require('pdf-parse');

const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

async function fileText(att, buf) {
  const name = (att.filename || '').toLowerCase();
  if (name.endsWith('.docx')) return (await mammoth.extractRawText({ buffer: buf })).value;
  if (name.endsWith('.pdf')) return (await pdf(buf)).text;
  if (/\.(txt|md|rtf)$/.test(name)) return buf.toString('utf8');
  return null; // unsupported type
}

// Returns concatenated submission text or null
async function submissionText(sub, canvas) {
  const parts = [];
  if (sub.submission_type === 'online_text_entry' && sub.body) parts.push(strip(sub.body));
  for (const att of sub.attachments || []) {
    try { const t = await fileText(att, await canvas.download(att)); if (t) parts.push(t); } catch (e) { /* skip */ }
  }
  const text = parts.join('\n\n').trim();
  return text || null;
}
module.exports = { submissionText };
