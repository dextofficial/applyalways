const { Application, Notification, User } = require('../models');
const { decrypt } = require('../utils');
const { deleteCv } = require('./storage');
const { oauthClient } = require('./mailer');

// Removes everything we hold about a user, except payment records (kept for accounting).
async function deleteUserData(user) {
  if (user.gmail?.refreshTokenEnc) {
    try {
      const token = decrypt(user.gmail.refreshTokenEnc);
      await oauthClient().revokeToken(token); // tells Google to cancel our access
    } catch (e) {
      console.error('Google token revoke failed', e.message);
    }
  }
  await deleteCv(user.cv);
  await Application.deleteMany({ user: user._id });
  await Notification.deleteMany({ user: user._id });
  await User.deleteOne({ _id: user._id });
}

module.exports = { deleteUserData };
