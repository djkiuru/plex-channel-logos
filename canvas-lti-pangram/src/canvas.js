// Reads submissions through the Canvas REST API (LTI itself does not expose submission content).
const base = () => process.env.CANVAS_BASE_URL.replace(/\/$/, '');
const H = () => ({ Authorization: `Bearer ${process.env.CANVAS_API_TOKEN}` });

async function getJson(url) {
  const out = [];
  while (url) {
    const r = await fetch(url, { headers: H() });
    if (!r.ok) throw new Error(`Canvas ${r.status} ${url}`);
    const j = await r.json();
    Array.isArray(j) ? out.push(...j) : out.push(j);
    const m = (r.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
  }
  return out;
}

const listSubmissions = (courseId, assignmentId) =>
  getJson(`${base()}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions?include[]=user&per_page=100`);

async function download(att) {
  const r = await fetch(att.url, { headers: H(), redirect: 'follow' });
  if (!r.ok) throw new Error(`download ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
module.exports = { listSubmissions, download };
