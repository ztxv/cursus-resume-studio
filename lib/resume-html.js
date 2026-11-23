// Pure resume-to-HTML template. Shared by the server (preview + PDF) and the hosted demo build.
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

module.exports = { generateResumeHTML };
