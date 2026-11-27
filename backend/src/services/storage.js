const cloudinary = require('cloudinary').v2;
const axios = require('axios');

// Configure once when the server starts, so the daily runner works even if nobody has uploaded a CV since a restart.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// New CVs are stored as "authenticated" files: the plain link does not open, only a signed link made by the server does.
function uploadCv(buffer, userId, ext) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: 'raw', type: 'authenticated', folder: 'applyly-cvs', public_id: `${userId}-${Date.now()}${ext}` },
        (err, r) => (err ? reject(err) : resolve(r))
      )
      .end(buffer);
  });
}

function signedUrl(cv) {
  return cloudinary.url(cv.publicId, { resource_type: 'raw', type: 'authenticated', sign_url: true, secure: true });
}

// Older CVs (uploaded before this fix) were public; they keep working through their saved link.
async function downloadCv(cv) {
  const url = cv.authenticated ? signedUrl(cv) : cv.url;
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return { filename: cv.filename || 'CV.pdf', mime: cv.mime, buffer: Buffer.from(data) };
}

async function deleteCv(cv) {
  if (!cv?.publicId) return;
  try {
    await cloudinary.uploader.destroy(cv.publicId, { resource_type: 'raw', type: cv.authenticated ? 'authenticated' : 'upload' });
  } catch (e) {
    console.error('CV delete failed', e.message);
  }
}

module.exports = { uploadCv, downloadCv, deleteCv, signedUrl };
