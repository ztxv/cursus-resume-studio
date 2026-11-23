#!/usr/bin/env node
// Builds the static, server-free demo into demo-dist/ (used by Vercel).
//
//   public/*            copied unchanged (app.js and index.html are not edited)
//   vendor files        the same ones server.js serves from node_modules
//   lib/resume-html.js  the REAL resume template, wrapped for the browser
//   demo/*              sample data, API shim, banner styles
//
// Only demo-dist/index.html differs from public/index.html, by three inserted
// tags and a banner. Nothing from server.js, Puppeteer, or OpenAI is shipped.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'demo-dist');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const copy = (from, to) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

copy('public', '.');
copy('node_modules/lucide/dist/umd/lucide.min.js', 'vendor/lucide.js');
copy('node_modules/motion/dist/motion.js', 'vendor/motion.js');
copy('node_modules/@shoelace-style/shoelace/cdn', 'vendor/shoelace');

fs.writeFileSync(
  path.join(out, 'resume-html.js'),
  `window.CursusResumeHTML = (function () {\nvar module = { exports: {} };\n${read('lib/resume-html.js')}\nreturn module.exports;\n})();\n`
);
copy('demo/sample.js', 'demo-sample.js');
copy('demo/demo.js', 'demo.js');
copy('demo/demo.css', 'demo.css');

const banner = `<div class="demo-banner" role="note"><span class="demo-banner-label"><i></i>LIVE DEMO</span><span class="demo-banner-text">Try it with a sample resume and job. No AI is used and nothing is saved or sent.</span><a href="https://github.com/ztxv/cursus-resume-studio" target="_blank" rel="noopener noreferrer">Run it locally for real ↗</a></div>`;
let html = read('public/index.html');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`public/index.html changed; could not find: ${from}`);
  html = html.replace(from, to);
};
swap('<link rel="stylesheet" href="/styles.css">', '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/demo.css">');
swap('<script src="/app.js" defer></script>', '<script src="/demo-sample.js" defer></script><script src="/resume-html.js" defer></script><script src="/demo.js" defer></script><script src="/app.js" defer></script>');
swap('<body>', `<body>\n${banner}`);
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log(`Demo built in ${path.relative(process.cwd(), out) || '.'}`);
