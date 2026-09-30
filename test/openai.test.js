const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tailorResume, validateResume } = require('../lib/openai');
const resume = { name: 'Test Candidate', email: 'test@example.com', phone: '', university: '', summary: 'Support specialist.', technicalSkills: { categories: [{ name: 'Tools', items: ['Python'] }] }, softSkills: [], experience: [], education: [], certifications: [] };
const input = { apiKey: 'sk-test-only', model: 'gpt-5-mini', masterResume: 'Test resume', jobDescription: 'Test job' };
test('sends credentials only as a header and requests strict resume JSON', async () => {
  const result = await tailorResume(input, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer sk-test-only');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.model, input.model);
    assert.equal(body.text.format.strict, true); assert.equal(options.body.includes(input.apiKey), false);
    assert.deepEqual(JSON.parse(body.input), { masterResume: input.masterResume, jobDescription: input.jobDescription });
    return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'reasoning' }, { content: [{ type: 'output_text', text: JSON.stringify(resume) }] }], usage: { total_tokens: 40 }, model: input.model }) };
  });
  assert.deepEqual(result.resume, resume);
});
for (const status of [401, 403, 404, 429, 500]) test(`sanitizes upstream error ${status}`, async () => {
  await assert.rejects(tailorResume(input, async () => ({ ok: false, status })), err => err.status === (status === 500 ? 502 : status) && !err.message.includes(input.apiKey));
});
for (const data of [
  { status: 'incomplete', output: [] },
  { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
  { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{}' }] }] },
  { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'bad json' }] }] }
]) test('rejects unusable output', async () => { await assert.rejects(tailorResume(input, async () => ({ ok: true, json: async () => data }))); });
test('validates nested export data', () => { assert.equal(validateResume(resume), true); assert.equal(validateResume({ ...resume, technicalSkills: { categories: [{ name: 'Tools', items: 'bad' }] } }), false); assert.equal(validateResume(null), false); });
