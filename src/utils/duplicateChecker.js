// src/utils/duplicateChecker.js

async function isDuplicateSubmission(platform, slug, language, currentRepo = '', currentCode = '') {
  const data = await chrome.storage.local.get(['syncedSolutions']);
  const synced = data.syncedSolutions || {};
  
  // Format: platform:slug:language
  const key = `${platform.toLowerCase()}:${slug.toLowerCase()}:${language.toLowerCase()}`;
  
  if (synced[key]) {
    // If the target repository has changed, it's not a duplicate
    if (currentRepo && synced[key].repo !== currentRepo) {
      return false;
    }
    // If the code content has changed, it's not a duplicate
    if (currentCode && synced[key].code !== currentCode) {
      return false;
    }
    return true;
  }
  
  return false;
}

async function markSubmissionAsSynced(platform, slug, title, language, pathOnGithub = '', repo = '', code = '') {
  const data = await chrome.storage.local.get(['syncedSolutions', 'syncHistory']);
  const synced = data.syncedSolutions || {};
  const history = data.syncHistory || [];

  const key = `${platform.toLowerCase()}:${slug.toLowerCase()}:${language.toLowerCase()}`;
  synced[key] = {
    timestamp: Date.now(),
    path: pathOnGithub,
    repo: repo,
    code: code
  };

  const cleanTitleStr = title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const newHistoryItem = {
    id: `${platform}-${slug}-${Date.now()}`,
    platform,
    slug,
    title: cleanTitleStr,
    language,
    path: pathOnGithub,
    timestamp: Date.now()
  };

  // Prepend to history, limit to 50 items
  history.unshift(newHistoryItem);
  if (history.length > 50) history.pop();

  await chrome.storage.local.set({ 
    syncedSolutions: synced,
    syncHistory: history
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isDuplicateSubmission, markSubmissionAsSynced };
} else {
  self.isDuplicateSubmission = isDuplicateSubmission;
  self.markSubmissionAsSynced = markSubmissionAsSynced;
}
