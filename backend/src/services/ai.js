const axios = require('axios');

// Gemini 2.0 models were shut down by Google on 1 June 2026. Change GEMINI_MODEL on Render if this one is retired too.
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

class AiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiError';
  }
}

function describe(e) {
  const d = e.response?.data;
  const msg = d?.error?.message || (typeof d?.error === 'string' ? d.error : '') || e.message;
  const status = e.response?.status ? `HTTP ${e.response.status}: ` : '';
  return `${status}${msg}`.slice(0, 300);
}

async function complete(prompt) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  try {
    if (provider === 'claude') {
      const { data } = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          timeout: 60000,
        }
      );
      return data.content?.[0]?.text || '';
    }
    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const generationConfig = { temperature: 0.7, maxOutputTokens: 2048 };
    // 2.5 Flash "thinks" by default and thinking tokens use up the output budget, which can cut letters short.
    if (/2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { contents: [{ parts: [{ text: prompt }] }], generationConfig },
      { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, timeout: 60000 }
    );
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  } catch (e) {
    throw new AiError(describe(e));
  }
}

async function writeLetter({ user, job, style }) {
  const cv = (user.cv?.text || '').slice(0, 6000);
  const p = user.profile || {};
  const prompt = `You write job application emails on behalf of a candidate.

CANDIDATE
Name: ${user.name}
Target roles: ${(p.desiredTitles || []).join(', ')}
Skills: ${(p.skills || []).join(', ')}
Years of experience: ${p.experienceYears ?? 'not stated'}
Summary: ${p.summary || 'not stated'}
CV TEXT:
${cv}

JOB
Title: ${job.title}
Company: ${job.company || 'unknown'}
Location: ${job.location || 'not stated'}
Description: ${(job.description || '').slice(0, 2500)}

RULES
- Write a concise professional cover email body of 150-220 words.
- Use ONLY facts found in the CV/profile above. Never invent employers, degrees, numbers or skills.
- No placeholders, no square brackets, no markdown, no subject line.
- Start with "Dear Hiring Manager," unless a contact name appears in the job description.
- Mention that the CV is attached and invite them to reply to this email.
- End with a sign-off using exactly the name: ${user.name}
- Style notes from the platform: ${style}

Return ONLY the email body text.`;
  let text = (await complete(prompt)).trim();
  text = text.replace(/^```[a-z]*\n?|```$/g, '').replace(/\*\*/g, '').trim();
  if (text.length < 200 || /\[[^\]]+\]/.test(text)) throw new AiError('AI letter failed quality check');
  return text;
}

module.exports = { writeLetter, AiError, DEFAULT_GEMINI_MODEL };
