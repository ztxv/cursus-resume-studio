// Hosted-demo shim. Loaded BEFORE public/app.js in the demo build only.
//
// Cursus normally needs a local Express server (OpenAI call, Puppeteer PDF, DOCX
// builder). On a static host none of that exists, so this file answers the three
// /api routes in the browser and keeps everything else, including app.js and
// index.html, exactly as shipped. Nothing here is loaded by `npm start`.
(function () {
  'use strict';
  var sample = window.CursusDemoSample;
  var template = window.CursusResumeHTML;
  var EXPORT_MESSAGE = 'Demo mode: exports are turned off. Run Cursus locally to download PDF or DOCX.';

  // 1. Keep the visitor's draft in memory only. Nothing is written to their
  //    browser, and a real key can never be stored by accident.
  var memory = {
    cursus_openai_key: 'sk-demo-no-key-needed',
    cursus_masterResume: sample.masterResume,
    cursus_jobDesc: sample.jobDescription
  };
  var keys = Object.keys(memory);
  var store = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; },
    setItem: function (k, v) { memory[k] = String(v); },
    removeItem: function (k) { delete memory[k]; },
    clear: function () { memory = {}; },
    key: function (i) { return Object.keys(memory)[i] || null; },
    get length() { return Object.keys(memory).length; }
  };
  try {
    Object.defineProperty(window, 'localStorage', { value: store, configurable: true });
  } catch (e) {
    // Extremely locked-down browsers: fall back to seeding only missing keys.
    try { keys.forEach(function (k) { if (localStorage.getItem(k) === null) localStorage.setItem(k, memory[k]); }); } catch (e2) {}
  }

  // 2. Answer the API routes locally.
  var realFetch = window.fetch.bind(window);
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var reply = function (body, status) {
    return new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  };
  window.fetch = async function (input, init) {
    var path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname;
    if (path.indexOf('/api/') !== 0) return realFetch(input, init);

    if (path === '/api/tailor') {
      var body = {};
      try { body = JSON.parse((init && init.body) || '{}'); } catch (e) {}
      if (!String(body.masterResume || '').trim()) return reply({ error: 'Your master resume is required.' }, 400);
      if (!String(body.jobDescription || '').trim()) return reply({ error: 'A job description is required.' }, 400);
      await wait(2400);
      return reply({
        resume: sample.tailoredResume,
        html: template.generateResumeHTML(sample.tailoredResume),
        elapsed: '2.4',
        usage: { total_tokens: 0 },
        model: 'sample output'
      });
    }
    if (path === '/api/download/pdf' || path === '/api/download/docx') return reply({ error: EXPORT_MESSAGE }, 501);
    return reply({ error: 'Not available in the demo.' }, 404);
  };

  // 3. Small, honest UI touches once app.js has run.
  document.addEventListener('DOMContentLoaded', function () {
    // Header pill: no key is needed here.
    var original = window.updateSettingsUI;
    window.updateSettingsUI = function () {
      original();
      var pill = document.getElementById('connection');
      pill.classList.add('saved');
      pill.lastChild.textContent = ' Demo · no key needed';
    };
    window.updateSettingsUI();

    // Settings dialog: say plainly that nothing is stored or sent.
    var intro = document.querySelector('.dialog-intro');
    if (intro) intro.insertAdjacentHTML('afterend',
      '<p class="demo-note">Demo mode: no API key is needed, and nothing you type here is saved or sent anywhere. Do not enter a real key.</p>');

    // Exports: friendly note instead of an error toast.
    document.addEventListener('click', function (e) {
      var target = e.target && e.target.closest && e.target.closest('#dlPdf, #dlDocx');
      if (!target) return;
      e.stopPropagation();
      e.preventDefault();
      window.notify(EXPORT_MESSAGE);
    }, true);
  });
})();
