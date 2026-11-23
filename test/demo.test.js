const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { validateResume } = require('../lib/openai');
const { generateResumeHTML } = require('../lib/resume-html');
const sample = require('../demo/sample');

test('demo sample result is a valid resume and renders through the real template', () => {
  assert.ok(validateResume(sample.tailoredResume));
  const html = generateResumeHTML(sample.tailoredResume);
  assert.ok(html.includes('Jordan Rivera') && html.includes('CompTIA A+ (2025)'));
});

test('demo sample only reuses facts from the sample master resume', () => {
  const master = sample.masterResume.toLowerCase();
  const { experience, education, certifications } = sample.tailoredResume;
  for (const bullet of experience.flatMap(e => e.bullets)) assert.ok(master.includes(bullet.toLowerCase()), bullet);
  for (const text of [...experience.map(e => e.company), ...education.map(e => e.school), ...certifications])
    assert.ok(master.includes(text.toLowerCase()), text);
});

test('demo build leaves the app untouched and ships no server code', () => {
  const root = path.join(__dirname, '..');
  const out = path.join(root, 'demo-dist');
  execFileSync(process.execPath, [path.join(root, 'scripts/build-demo.js')], { stdio: 'pipe' });
  try {
    for (const file of ['app.js', 'styles.css'])
      assert.equal(fs.readFileSync(path.join(out, file), 'utf8'), fs.readFileSync(path.join(root, 'public', file), 'utf8'));
    const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    assert.ok(html.indexOf('/demo.js') < html.indexOf('/app.js'), 'shim must load before app.js');
    assert.ok(html.includes('LIVE DEMO'));
    for (const forbidden of ['server.js', 'openai.js', 'package.json', '.env'])
      assert.equal(fs.existsSync(path.join(out, forbidden)), false, forbidden);
    const everything = ['demo.js', 'demo-sample.js', 'resume-html.js', 'index.html'].map(f => fs.readFileSync(path.join(out, f), 'utf8')).join('\n');
    assert.ok(!everything.includes('api.openai.com'), 'demo must not reference OpenAI');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
