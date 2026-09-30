require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, TabStopType
} = require('docx');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/vendor/lucide.js', (_, res) => res.sendFile(path.join(__dirname, 'node_modules/lucide/dist/umd/lucide.min.js')));
app.use('/vendor/shoelace', express.static(path.join(__dirname, 'node_modules/@shoelace-style/shoelace/cdn')));
app.get('/vendor/motion.js', (_, res) => res.sendFile(path.join(__dirname, 'node_modules/motion/dist/motion.js')));

const { tailorResume, validateResume } = require('./lib/openai');
app.use('/api', (_, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// ─── Resume HTML Template ─────────────────────────────────────────────────────
function generateResumeHTML(resume) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const skillsHTML = (resume.technicalSkills?.categories || [])
    .map(cat => `<div class="skill-row"><strong>${esc(cat.name)}:</strong> ${esc(cat.items.join(', '))}</div>`)
    .join('');

  const expHTML = (resume.experience || []).map(exp => `
    <div class="entry">
      <div class="entry-hdr">
        <div class="entry-left"><strong>${esc(exp.title)}</strong> <span class="muted">| ${esc(exp.company)} • ${esc(exp.location)}</span></div>
        <div class="entry-date">${esc(exp.startDate)} – ${esc(exp.endDate)}</div>
      </div>
      <ul>${(exp.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
    </div>`).join('');

  const eduHTML = (resume.education || []).map(edu => `
    <div class="entry">
      <div class="entry-hdr">
        <div class="entry-left"><strong>${esc(edu.degree)}</strong> <span class="muted">| ${esc(edu.school)} • ${esc(edu.location)}</span></div>
        <div class="entry-date">${esc(edu.date)}</div>
      </div>
      ${edu.details?.length ? `<ul>${edu.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    </div>`).join('');

  const certHTML = (resume.certifications || []).map(c => `<div class="cert">• ${esc(c)}</div>`).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Times New Roman', Times, serif;
  font-size: 10.5pt;
  color: #111;
  background: #fff;
  padding: 0.6in;
  line-height: 1.45;
}
.hdr { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
.name { font-size: 22pt; font-weight: 700; letter-spacing: 0.5px; }
.contact { font-size: 9.5pt; color: #555; margin-top: 4px; }
.sec { margin-top: 10px; }
.sec-title {
  font-size: 11pt; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; border-bottom: 1.5px solid #222;
  padding-bottom: 2px; margin-bottom: 7px;
}
.entry { margin-bottom: 9px; }
.entry-hdr { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.entry-left { flex: 1; }
.entry-date { font-size: 9.5pt; color: #555; white-space: nowrap; }
.muted { color: #555; font-weight: normal; font-size: 10pt; }
ul { margin: 3px 0 0 18px; }
li { font-size: 10pt; margin-bottom: 2px; }
.skill-row { font-size: 10pt; margin-bottom: 3px; }
.skills-head { font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
.soft { font-size: 10pt; margin-top: 6px; }
.cert { font-size: 10pt; margin-bottom: 2px; }
</style>
</head>
<body>
<div class="hdr">
  <div class="name">${esc(resume.name)}</div>
  <div class="contact">${esc(resume.email)} / ${esc(resume.phone)} / ${esc(resume.university)}</div>
</div>

<div class="sec">
  <div class="sec-title">Summary</div>
  <p style="font-size:10pt;line-height:1.5">${esc(resume.summary)}</p>
</div>

<div class="sec">
  <div class="sec-title">Skills</div>
  <div class="skills-head">Technical Skills</div>
  ${skillsHTML}
  <div class="soft"><strong>Soft Skills:</strong> ${esc((resume.softSkills || []).join(', '))}</div>
</div>

<div class="sec">
  <div class="sec-title">Experience</div>
  ${expHTML}
</div>

<div class="sec">
  <div class="sec-title">Education</div>
  ${eduHTML}
</div>

${certHTML ? `<div class="sec"><div class="sec-title">Certificates</div>${certHTML}</div>` : ''}
</body></html>`;
}

// ─── DOCX Builder ─────────────────────────────────────────────────────────────
async function buildDocx(resume) {
  const children = [];
  // TextRun sizes use half-points; paragraph spacing and margins use twips.
  const pt = (n) => Math.round(n * 2);
  const RIGHT_TAB = { type: TabStopType.RIGHT, position: 9360 };

  const secTitle = (text) => new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: pt(11) })],
    spacing: { before: 180, after: 60 },
    border: { bottom: { color: '222222', space: 1, style: BorderStyle.SINGLE, size: 8 } }
  });

  // Name
  children.push(new Paragraph({
    children: [new TextRun({ text: resume.name || '', bold: true, size: pt(22) })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 }
  }));

  // Contact line — also acts as visual header border
  children.push(new Paragraph({
    children: [new TextRun({
      text: `${resume.email || ''} / ${resume.phone || ''} / ${resume.university || ''}`,
      size: pt(9.5), color: '555555'
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    border: { bottom: { color: '111111', space: 1, style: BorderStyle.SINGLE, size: 12 } }
  }));

  // Summary
  children.push(secTitle('Summary'));
  children.push(new Paragraph({
    children: [new TextRun({ text: resume.summary || '', size: pt(10) })],
    spacing: { after: 60 }
  }));

  // Skills
  children.push(secTitle('Skills'));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'TECHNICAL SKILLS', bold: true, size: pt(10.5) })],
    spacing: { before: 40, after: 40 }
  }));

  for (const cat of (resume.technicalSkills?.categories || [])) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${cat.name}: `, bold: true, size: pt(10) }),
        new TextRun({ text: (cat.items || []).join(', '), size: pt(10) })
      ],
      spacing: { before: 40 }
    }));
  }

  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'Soft Skills: ', bold: true, size: pt(10) }),
      new TextRun({ text: (resume.softSkills || []).join(', '), size: pt(10) })
    ],
    spacing: { before: 60 }
  }));

  // Experience
  children.push(secTitle('Experience'));
  for (const exp of (resume.experience || [])) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: exp.title || '', bold: true, size: pt(10.5) }),
        new TextRun({ text: ` | ${exp.company} • ${exp.location}`, size: pt(10), color: '555555' }),
        new TextRun({ text: '\t' }),
        new TextRun({ text: `${exp.startDate} – ${exp.endDate}`, size: pt(9.5), color: '666666' })
      ],
      tabStops: [RIGHT_TAB],
      spacing: { before: 120 }
    }));
    for (const b of (exp.bullets || [])) {
      children.push(new Paragraph({
        children: [new TextRun({ text: b, size: pt(10) })],
        bullet: { level: 0 },
        spacing: { before: 30 }
      }));
    }
  }

  // Education
  children.push(secTitle('Education'));
  for (const edu of (resume.education || [])) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: edu.degree || '', bold: true, size: pt(10.5) }),
        new TextRun({ text: ` | ${edu.school} • ${edu.location}`, size: pt(10), color: '555555' }),
        new TextRun({ text: '\t' }),
        new TextRun({ text: edu.date || '', size: pt(9.5), color: '666666' })
      ],
      tabStops: [RIGHT_TAB],
      spacing: { before: 120 }
    }));
    for (const d of (edu.details || [])) {
      children.push(new Paragraph({
        children: [new TextRun({ text: d, size: pt(10) })],
        bullet: { level: 0 },
        spacing: { before: 30 }
      }));
    }
  }

  // Certifications
  if (resume.certifications?.length) {
    children.push(secTitle('Certificates'));
    for (const cert of resume.certifications) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${cert}`, size: pt(10) })],
        spacing: { before: 40 }
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 864, bottom: 864, left: 1080, right: 1080 } } },
      children
    }]
  });

  return Packer.toBuffer(doc);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.post('/api/tailor', async (req, res) => {
  const { masterResume, jobDescription, model = 'gpt-5-mini' } = req.body;
  const apiKey = req.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!apiKey || !apiKey.startsWith('sk-')) return res.status(401).json({ error: 'Add a valid OpenAI API key in Settings.' });
  if (typeof masterResume !== 'string' || !masterResume.trim()) return res.status(400).json({ error: 'Your master resume is required.' });
  if (typeof jobDescription !== 'string' || !jobDescription.trim()) return res.status(400).json({ error: 'A job description is required.' });
  if (masterResume.length > 50000 || jobDescription.length > 50000) return res.status(400).json({ error: 'Keep each input under 50,000 characters.' });
  if (typeof model !== 'string' || !/^gpt-[a-z0-9.-]{1,80}$/.test(model)) return res.status(400).json({ error: 'Enter a valid OpenAI GPT model ID in Settings.' });
  try {
    const start = Date.now();
    const result = await tailorResume({ apiKey, model, masterResume, jobDescription });
    res.json({ ...result, html: generateResumeHTML(result.resume), elapsed: ((Date.now() - start) / 1000).toFixed(1) });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

// Generate and download PDF
app.post('/api/download/pdf', async (req, res) => {
  const { resume } = req.body;
  if (!validateResume(resume)) return res.status(400).json({ error: 'Valid resume data required' });

  let browser;
  try {
    const html = generateResumeHTML(resume);

    // Try system Chrome first (avoids re-downloading Chromium on Mac)
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    ];
    let executablePath;
    for (const p of macPaths) {
      if (fs.existsSync(p)) { executablePath = p; break; }
    }

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });


    const name = (resume.name || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${name}_Resume.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: 'PDF export failed. Check that Chrome is installed.' });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// Generate and download DOCX
app.post('/api/download/docx', async (req, res) => {
  const { resume } = req.body;
  if (!validateResume(resume)) return res.status(400).json({ error: 'Valid resume data required' });

  try {
    const buffer = await buildDocx(resume);
    const name = (resume.name || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${name}_Resume.docx"`);
    res.send(buffer);
  } catch (err) {
    console.error('[/api/download/docx]', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✦ Cursus running → http://localhost:${PORT}\n`);
});
module.exports = app;
