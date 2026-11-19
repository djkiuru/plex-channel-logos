require('dotenv').config();
const path = require('path');
const lti = require('ltijs').Provider;
const canvas = require('./canvas');
const pangram = require('./pangram');
const { submissionText } = require('./extract');

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MIN_WORDS = 50; // Pangram works best on longer text

lti.setup(process.env.LTI_KEY, { url: process.env.MONGO_URL }, {
  appRoute: '/', loginRoute: '/login', keysetRoute: '/keys',
  cookies: { secure: true, sameSite: 'None' },
  devMode: false
});

// Only instructors/admins may use the tool
const isTeacher = roles => (roles || []).some(r => /Instructor|Administrator|TeachingAssistant/.test(r));

lti.onConnect(async (token, req, res) => {
  if (!isTeacher(token.platformContext.roles)) return res.status(403).send('Instructors only.');
  const custom = token.platformContext.custom || {};
  const courseId = custom.canvas_course_id, assignmentId = custom.canvas_assignment_id;
  if (!courseId || !assignmentId)
    return res.send('Launch this tool from an assignment (SpeedGrader / assignment menu) so a course and assignment are available.');
  return res.send(`<!doctype html><meta charset=utf-8><title>AI Check</title>
<link rel=stylesheet href="/style.css"><h1>AI-writing check</h1>
<form method=post action="/scan?ltik=${res.locals.ltik}">
<input type=hidden name=c value="${esc(courseId)}"><input type=hidden name=a value="${esc(assignmentId)}">
<button>Scan all submissions with Pangram</button></form>
<p class=note>Detection results are probabilistic. Use them as one signal, not proof of misconduct.</p>`);
});

lti.app.use(require('express').urlencoded({ extended: false }));
lti.app.use(require('express').static(path.join(__dirname, '..', 'public')));

lti.app.post('/scan', async (req, res) => {
  try {
    const token = res.locals.token;
    if (!token || !isTeacher(token.platformContext.roles)) return res.status(403).send('Forbidden');
    const { c, a } = req.body;
    if (!/^\d+$/.test(c) || !/^\d+$/.test(a)) return res.status(400).send('Bad ids');
    const subs = (await canvas.listSubmissions(c, a)).filter(s => s.workflow_state !== 'unsubmitted');
    const rows = [];
    for (const s of subs) {
      const name = s.user ? s.user.name : `User ${s.user_id}`;
      const text = await submissionText(s, canvas);
      if (!text) { rows.push(`<tr><td>${esc(name)}</td><td colspan=3>No readable text</td></tr>`); continue; }
      if (text.split(/\s+/).length < MIN_WORDS) { rows.push(`<tr><td>${esc(name)}</td><td colspan=3>Too short to assess</td></tr>`); continue; }
      try {
        const r = await pangram.detect(text);
        const pct = x => (x == null ? '–' : Math.round(x * 100) + '%');
        rows.push(`<tr><td>${esc(name)}</td><td>${pct(r.fractionAi)}</td><td>${pct(r.fractionAssisted)}</td><td>${pct(r.fractionHuman)}</td></tr>`);
      } catch (e) { rows.push(`<tr><td>${esc(name)}</td><td colspan=3>Error: ${esc(e.message)}</td></tr>`); }
    }
    res.send(`<!doctype html><meta charset=utf-8><link rel=stylesheet href="/style.css"><h1>Results</h1>
<table><tr><th>Student<th>AI<th>AI-assisted<th>Human</tr>${rows.join('')}</table>`);
  } catch (e) { res.status(500).send('Scan failed: ' + esc(e.message)); }
});

(async () => {
  await lti.deploy({ port: process.env.PORT || 3000 });
  // Register Canvas platform: fill in from your Canvas Developer Key (see README)
  if (process.env.CANVAS_CLIENT_ID) {
    const base = process.env.CANVAS_BASE_URL.replace(/\/$/, '');
    await lti.registerPlatform({
      url: 'https://canvas.instructure.com', name: 'Canvas',
      clientId: process.env.CANVAS_CLIENT_ID,
      authenticationEndpoint: `${base}/api/lti/authorize_redirect`,
      accesstokenEndpoint: `${base}/login/oauth2/token`,
      authConfig: { method: 'JWK_SET', key: `${base}/api/lti/security/jwks` }
    }).catch(() => {});
  }
})();
