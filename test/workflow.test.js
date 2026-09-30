const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const JSZip = createRequire(require.resolve('docx'))('jszip');
const app = require('../server');

const resume = { name: 'Sample Candidate', email: 'sample@example.com', phone: '', university: '', summary: 'Support specialist.', technicalSkills: { categories: [{ name: 'Tools', items: ['Python'] }] }, softSkills: ['Documentation'], experience: [{ title: 'IT Assistant', company: 'Example Company', location: 'Virginia', startDate: '2024', endDate: '2025', bullets: ['Resolved support tickets.'] }], education: [{ degree: 'Cybersecurity', school: 'Example College', location: 'Virginia', date: '2026', details: ['Network security coursework'] }], certifications: ['Example certification'] };

test('Word exports use readable half-point font sizes throughout the document', async () => {
  const handler = app._router.stack.find(layer => layer.route?.path === '/api/download/docx').route.stack[0].handle;
  let buffer;
  await handler({ body: { resume } }, { setHeader() {}, send(value) { buffer = value; }, status(code) { assert.fail(`Export failed: ${code}`); } });
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml').async('string');
  const sizes = [...xml.matchAll(/<w:sz w:val="(\d+)"/g)].map(match => Number(match[1]));
  assert.equal(sizes[0], 44, '22-point name');
  assert.ok(sizes.includes(19), '9.5-point contact text');
  assert.ok(sizes.includes(20), '10-point body text');
  assert.ok(sizes.every(size => size >= 19 && size <= 44));
  assert.ok(xml.includes('Resolved support tickets.'));
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

// Exercise the actual browser script with a minimal DOM and controlled responses.
function browser(saved = {}) {
  const elements = new Map();
  const values = new Map(Object.entries({ cursus_openai_key: 'sk-test-only', cursus_masterResume: 'Support experience', cursus_jobDesc: 'Support job', ...saved }));
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, open: false,
      lastChild: { textContent: '' }, classList: { toggle() {}, remove() {}, add() {} },
      listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; },
      setAttribute() {}, focus() {}, showModal() { this.open = true; }, close() { this.open = false; }
    });
    return elements.get(id);
  };
  const requests = [];
  const context = {
    document: { getElementById: element, documentElement: { dataset: {} }, addEventListener() {} },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    window: {}, lucide: { createIcons() {} }, matchMedia: () => ({ matches: true }),
    URL, AbortSignal, setTimeout: () => 1, clearTimeout() {},
    fetch: (url, options) => {
      assert.equal(url, '/api/tailor');
      const pending = deferred(); requests.push({ ...pending, body: JSON.parse(options.body) }); return pending.promise;
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'), context);
  return {
    element, requests,
    input(id, value) { element(id).value = value; element(id).listeners.input(); },
    generate() { return element('tailorBtn').onclick(); },
    respond(index, ok = true) { requests[index].resolve({ ok, json: async () => ok ? { resume, html: '<p>Sample</p>', elapsed: '1', model: 'gpt-5-mini' } : { error: 'Test failure' } }); },
    save(model = 'gpt-5-mini') { element('apiKey').value = 'sk-test-only'; element('modelSelect').value = model; element('settingsForm').onsubmit({ preventDefault() {} }); }
  };
}

test('settings save model without requiring a repository setting', () => {
  const b = browser({ cursus_github_url: 'https://github.com/example/old' });
  b.save('gpt-5');
  assert.equal(b.element('modelName').textContent, 'GPT-5');
  assert.equal(b.element('settingsDialog').open, false);
});
test('a first-time visitor starts with an empty resume and no preload endpoint', () => {
  const b = browser({ cursus_masterResume: null, cursus_jobDesc: null });
  assert.equal(b.element('masterResume').value, '');
  assert.equal(b.element('jobDesc').value, '');
  assert.equal(b.requests.length, 0);
  assert.equal(app._router.stack.some(layer => layer.route?.path === '/api/master-resume'), false);
});
test('edits and restored inputs label the retained result correctly', async () => {
  const b = browser(); const pending = b.generate(); b.respond(0); await pending;
  assert.equal(b.element('previewStatus').textContent, 'READY');
  for (const [id, original] of [['jobDesc', 'Support job'], ['masterResume', 'Support experience']]) {
    b.input(id, 'Changed'); assert.equal(b.element('previewStatus').textContent, 'INPUTS CHANGED');
    assert.match(b.element('exportHint').textContent, /Downloads contain the previous result/);
    assert.equal(b.element('dlPdf').disabled, false);
    b.input(id, original); assert.equal(b.element('previewStatus').textContent, 'READY');
  }
  b.save('gpt-5'); assert.equal(b.element('previewStatus').textContent, 'INPUTS CHANGED');
});
test('edits during generation are compared with the submitted snapshot', async () => {
  const b = browser(); const pending = b.generate();
  b.input('jobDesc', 'New job'); b.respond(0); await pending;
  assert.equal(b.requests[0].body.jobDescription, 'Support job');
  assert.equal(b.element('previewStatus').textContent, 'INPUTS CHANGED');
  const updated = b.generate(); b.respond(1); await updated;
  assert.equal(b.element('previewStatus').textContent, 'READY');
});
test('regeneration and failure clearly identify the preserved result', async () => {
  const b = browser(); let pending = b.generate(); b.respond(0); await pending;
  pending = b.generate(); assert.match(b.element('exportHint').textContent, /Tailoring in progress/);
  b.respond(1, false); await pending;
  assert.equal(b.element('previewStatus').textContent, 'PREVIOUS RESULT');
  assert.match(b.element('exportHint').textContent, /latest attempt failed/);
  assert.equal(b.element('dlDocx').disabled, false);
  b.input('jobDesc', 'New job'); pending = b.generate(); b.respond(2, false); await pending;
  assert.equal(b.element('previewStatus').textContent, 'INPUTS CHANGED');
  assert.equal(b.element('previewFrame').hidden, false);
});
