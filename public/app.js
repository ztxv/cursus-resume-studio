const $ = id => document.getElementById(id);
const storage = {
  get(key) { try { return localStorage.getItem(`cursus_${key}`); } catch { return null; } },
  set(key, value) { localStorage.setItem(`cursus_${key}`, value); },
  remove(key) { localStorage.removeItem(`cursus_${key}`); }
};
let apiKey = storage.get('openai_key') || '';
let model = storage.get('model') || 'gpt-5-mini';
let currentResume = null;
let currentInputs = null;
let generationFailed = false;
let busy = false;
let toastTimer;
function notify(message, error = false) {
  clearTimeout(toastTimer); $('toast').textContent = message;
  $('toast').className = `show${error ? ' error' : ''}`;
  toastTimer = setTimeout(() => $('toast').className = '', 4500);
}
function updateSettingsUI() {
  $('connection').classList.toggle('saved', !!apiKey);
  $('connection').lastChild.textContent = apiKey ? ' Key saved locally' : ' Add your API key';
  $('modelName').textContent = (({ 'gpt-5-mini': 'GPT-5 mini', 'gpt-5': 'GPT-5' })[model] || model);
}
function openSettings() {
  $('apiKey').value = apiKey; $('apiKey').type = 'password';
  $('revealKey').textContent = 'Show'; $('revealKey').setAttribute('aria-label', 'Show API key');
  $('modelSelect').value = ['gpt-5-mini', 'gpt-5'].includes(model) ? model : 'custom';
  $('customModel').value = model; $('customModel').hidden = $('modelSelect').value !== 'custom';
  $('settingsError').textContent = '';
  $('settingsDialog').showModal();
  if (window.Motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) Motion.animate($('settingsDialog'), { opacity: [0, 1], transform: ['translateY(8px) scale(.985)', 'translateY(0) scale(1)'] }, { duration: .23, ease: 'easeOut' });
}
$('settingsToggle').onclick = openSettings; $('modelButton').onclick = openSettings;
$('closeSettings').onclick = () => $('settingsDialog').close();
$('settingsDialog').addEventListener('click', e => { if (e.target === $('settingsDialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });
$('modelSelect').onchange = () => { $('customModel').hidden = $('modelSelect').value !== 'custom'; };
$('revealKey').onclick = () => { const show = $('apiKey').type === 'password'; $('apiKey').type = show ? 'text' : 'password'; $('revealKey').textContent = show ? 'Hide' : 'Show'; $('revealKey').setAttribute('aria-label', `${show ? 'Hide' : 'Show'} API key`); };
$('settingsForm').onsubmit = e => {
  e.preventDefault();
  const key = $('apiKey').value.trim();
  const nextModel = $('modelSelect').value === 'custom' ? $('customModel').value.trim() : $('modelSelect').value;
  if (key && (!key.startsWith('sk-') || /\s/.test(key))) { $('settingsError').textContent = 'Enter an OpenAI API key beginning with sk-.'; return; }
  if (!/^gpt-[a-z0-9.-]{1,80}$/.test(nextModel)) { $('settingsError').textContent = 'Enter a GPT model ID, such as gpt-5-mini.'; return; }
  try {
    if (key) storage.set('openai_key', key); else storage.remove('openai_key');
    storage.set('model', nextModel);
    apiKey = key; model = nextModel;
    updateSettingsUI(); updatePreviewState(); $('settingsDialog').close(); notify('Settings saved on this device.');
  } catch { $('settingsError').textContent = 'Browser storage is unavailable. Allow local storage to save your settings.'; }
};
$('removeKey').onclick = () => {
  try { storage.remove('openai_key'); apiKey = ''; $('apiKey').value = ''; updateSettingsUI(); $('settingsError').textContent = 'Saved key removed from this browser.'; } catch { $('settingsError').textContent = 'Could not access browser storage.'; }
};
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeToggle').innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
  lucide.createIcons({ root: $('themeToggle'), attrs: { 'stroke-width': 1.8 } });
  $('themeToggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}
applyTheme(storage.get('theme') === 'light' ? 'light' : 'dark');
$('themeToggle').onclick = () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(theme); try { storage.set('theme', theme); } catch { notify('Appearance changed for this session.'); } };
function inputSnapshot() {
  return { masterResume: $('masterResume').value, jobDescription: $('jobDesc').value, model };
}
function updatePreviewState() {
  if (!currentResume) return;
  const inputs = inputSnapshot();
  const stale = Object.keys(inputs).some(key => inputs[key] !== currentInputs[key]);
  $('previewStatus').textContent = stale ? 'INPUTS CHANGED' : generationFailed ? 'PREVIOUS RESULT' : busy ? 'UPDATING' : 'READY';
  $('exportHint').textContent = stale
    ? 'Inputs changed. Downloads contain the previous result. Tailor again to update it.'
    : generationFailed
      ? 'The latest attempt failed. Downloads contain the last successful result.'
      : busy
        ? 'Tailoring in progress. Downloads contain the last successful result.'
        : 'Review the details, then make your next move.';
}
function counts() {
  for (const [input, label] of [['masterResume', 'resumeCount'], ['jobDesc', 'jobCount']]) {
    const text = $(input).value.trim(); $(label).textContent = `${text ? text.split(/\s+/).length.toLocaleString() : 0} words`;
  }
  $('clearJd').disabled = !$('jobDesc').value;
}
for (const id of ['masterResume', 'jobDesc']) {
  $(id).value = storage.get(id) || '';
  $(id).addEventListener('input', () => { counts(); updatePreviewState(); try { storage.set(id, $(id).value); } catch { notify('Draft could not be saved to this browser.', true); } });
}
$('clearJd').onclick = () => { $('jobDesc').value = ''; $('jobDesc').dispatchEvent(new Event('input')); $('jobDesc').focus(); };
$('toggleMaster').onclick = () => { const collapsed = !$('masterSection').hidden; $('masterSection').hidden = collapsed; $('toggleMasterText').textContent = collapsed ? 'Expand' : 'Collapse'; $('toggleMaster').classList.toggle('collapsed', collapsed); $('toggleMaster').setAttribute('aria-expanded', String(!collapsed)); };
$('tailorBtn').onclick = async () => {
  if (busy) return;
  if (!apiKey) { openSettings(); $('apiKey').focus(); return; }
  if (!$('masterResume').value.trim()) { $('masterSection').hidden = false; $('toggleMasterText').textContent = 'Collapse'; $('toggleMaster').classList.remove('collapsed'); $('toggleMaster').setAttribute('aria-expanded', 'true'); $('masterResume').focus(); notify('Add your master resume first.', true); return; }
  if (!$('jobDesc').value.trim()) { $('jobDesc').focus(); notify('Add a job description first.', true); return; }
  const requestedInputs = inputSnapshot();
  generationFailed = false;
  busy = true; updatePreviewState(); $('tailorBtn').disabled = true; $('btnText').textContent = 'Tailoring your story…'; $('tailorBtn').loading = true; $('previewLoader').hidden = false; $('previewCanvas').setAttribute('aria-busy', 'true');
  $('usageInfo').textContent = 'Making every word work for you…'; $('usageInfo').classList.remove('error');
  try {
    const response = await fetch('/api/tailor', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(requestedInputs), signal: AbortSignal.timeout(190000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not tailor your resume. Please retry.');
    currentResume = data.resume; currentInputs = requestedInputs; $('previewFrame').srcdoc = data.html; $('previewFrame').hidden = false; $('emptyState').hidden = true;
    $('dlPdf').disabled = false; $('dlDocx').disabled = false; $('previewStatus').textContent = 'READY';
    $('usageInfo').textContent = `Ready in ${data.elapsed}s · ${(data.usage?.total_tokens || 0).toLocaleString()} tokens · ${data.model}`;
    if (window.Motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) Motion.animate($('previewFrame'), { opacity: [0, 1] }, { duration: .4 });
    notify('Your next chapter is ready.');
  } catch (err) {
    generationFailed = true;
    const message = err.name === 'TimeoutError' ? 'The request timed out. Please try again.' : err.message;
    $('usageInfo').textContent = message; $('usageInfo').classList.add('error'); notify(message, true);
  } finally {
    busy = false; updatePreviewState(); $('tailorBtn').disabled = false; $('btnText').textContent = 'Tailor my resume'; $('tailorBtn').loading = false; $('previewLoader').hidden = true; $('previewCanvas').setAttribute('aria-busy', 'false');
  }
};
async function download(format, button) {
  if (!currentResume || button.disabled) return;
  const resumeToDownload = currentResume;
  const label = button.innerHTML; button.loading = true; button.disabled = true;
  try {
    const response = await fetch(`/api/download/${format}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resume: resumeToDownload }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Download failed.'); }
    const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a');
    a.href = url; a.download = `${resumeToDownload.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Tailored'}_Resume.${format}`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify(`${format.toUpperCase()} downloaded.`);
  } catch (err) { notify(err.message, true); } finally { button.loading = false; button.disabled = false; button.innerHTML = label; }
}
$('dlPdf').onclick = () => download('pdf', $('dlPdf')); $('dlDocx').onclick = () => download('docx', $('dlDocx'));
document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !$('settingsDialog').open) { e.preventDefault(); $('tailorBtn').click(); } });
updateSettingsUI(); counts();
lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
if (window.Motion && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  Motion.animate('.intro > div:first-child', { opacity: [0, 1], transform: ['translateY(9px)', 'translateY(0)'] }, { duration: .55, ease: 'easeOut' });
  Motion.animate('.workspace > section', { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] }, { duration: .6, delay: .1, ease: 'easeOut' });
}
