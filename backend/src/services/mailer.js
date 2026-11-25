const { google } = require('googleapis');
const { decrypt } = require('../utils');

function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/gmail/callback`
  );
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const encodeHeader = (s) => `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`;

function buildMime({ fromName, from, to, subject, text, attachment }) {
  const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n'),
  ];
  if (attachment) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mime || 'application/octet-stream'}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      attachment.buffer.toString('base64').replace(/(.{76})/g, '$1\r\n')
    );
  }
  lines.push(`--${boundary}--`);
  return lines.join('\r\n');
}

async function sendFromUser(user, { to, subject, text, attachment }) {
  const client = oauthClient();
  client.setCredentials({ refresh_token: decrypt(user.gmail.refreshTokenEnc) });
  const gmail = google.gmail({ version: 'v1', auth: client });
  const raw = b64url(buildMime({ fromName: user.name, from: user.gmail.email, to, subject, text, attachment }));
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

module.exports = { oauthClient, sendFromUser };
