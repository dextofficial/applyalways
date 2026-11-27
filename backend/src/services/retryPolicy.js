function isRetryableModelFailure(error) {
  return /models?\/gemini-2\.[0-9]+-[\w.-]+.*(?:no longer available|not found|deprecated|shut ?down)/i.test(error || '');
}

module.exports = { isRetryableModelFailure };
