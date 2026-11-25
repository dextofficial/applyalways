const axios = require('axios');

async function complete(prompt) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'claude') {
    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        timeout: 60000,
      }
    );
    return data.content?.[0]?.text || '';
  }
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 800 } },
    { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }, timeout: 60000 }
  );
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
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
  if (text.length < 200 || /\[[^\]]+\]/.test(text)) throw new Error('AI letter failed quality check');
  return text;
}

module.exports = { writeLetter };
