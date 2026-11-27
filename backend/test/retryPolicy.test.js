const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { DEFAULT_GEMINI_MODEL, writeLetter } = require('../src/services/ai');
const { isRetryableModelFailure } = require('../src/services/retryPolicy');

test('defaults to the current Gemini Flash model', () => {
  assert.equal(DEFAULT_GEMINI_MODEL, 'gemini-3.8-flash');
});

test('retries failed applications caused by a retired Gemini 2.x model only', () => {
  assert.equal(
    isRetryableModelFailure('This model models/gemini-2.0-flash is no longer available.'),
    true
  );
  assert.equal(isRetryableModelFailure('Invalid Gmail credentials'), false);
  assert.equal(isRetryableModelFailure('AI letter failed quality check'), false);
});

test('falls back to the current model when the configured Gemini model is retired', async () => {
  const originalPost = axios.post;
  const originalModel = process.env.GEMINI_MODEL;
  const originalKey = process.env.GEMINI_API_KEY;
  const urls = [];
  process.env.GEMINI_MODEL = 'gemini-2.0-flash';
  process.env.GEMINI_API_KEY = 'test-key';
  axios.post = async (url) => {
    urls.push(url);
    if (urls.length === 1) {
      const error = new Error('model unavailable');
      error.response = { data: { error: { message: 'This model models/gemini-2.0-flash is no longer available' } } };
      throw error;
    }
    return { data: { candidates: [{ content: { parts: [{ text: 'A'.repeat(220) }] } }] } };
  };

  try {
    const body = await writeLetter({
      user: { name: 'Example User', cv: { text: '' }, profile: {} },
      job: { title: 'Engineer', company: 'Example Co' },
      style: '',
    });

    assert.equal(body.length, 220);
    assert.match(urls[0], /gemini-2\.0-flash/);
    assert.match(urls[1], /gemini-3\.8-flash/);
  } finally {
    axios.post = originalPost;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
