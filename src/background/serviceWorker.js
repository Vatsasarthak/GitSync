// src/background/serviceWorker.js

importScripts(
  '../utils/languageMap.js',
  '../utils/slugify.js',
  '../utils/queue.js',
  '../utils/duplicateChecker.js',
  '../github/githubAuth.js',
  '../github/githubApi.js',
  '../github/fileUploader.js'
);

// Clear any persistent badge and reset icon on startup
chrome.action.setBadgeText({ text: '' }).catch(() => {});
resetIconToDefault().catch(() => {});

async function log(message, ...args) {
  const { debugMode } = await chrome.storage.local.get(['debugMode']);
  if (debugMode) {
    console.log(`[GitSync Background] ${message}`, ...args);
  }
}

async function resetIconToDefault() {
  try {
    await chrome.action.setIcon({
      path: {
        "16": "/icons/icon16.png",
        "48": "/icons/icon48.png",
        "128": "/icons/icon128.png"
      }
    });
  } catch (err) {
    console.error("[GFG Sync ERROR] Failed to reset icon to default:", err);
  }
}

// Show temporary fire icon on successful sync
async function showTemporaryFireIcon() {
  try {
    // Clear any persistent badge text
    await chrome.action.setBadgeText({ text: '' });

    await chrome.action.setIcon({
      path: {
        "16": "/icons/fire16.png",
        "48": "/icons/fire48.png",
        "128": "/icons/fire128.png"
      }
    });

    // Clear any existing reset alarm before setting a new one
    try {
      await chrome.alarms.clear('reset_icon_alarm');
    } catch (e) {}

    // Set an alarm as a fallback in case the service worker is terminated
    try {
      await chrome.alarms.create('reset_icon_alarm', { delayInMinutes: 0.1 });
    } catch (e) {}

    let resetDone = false;
    const resetIcon = async () => {
      if (resetDone) return;
      resetDone = true;
      try {
        await resetIconToDefault();
        await chrome.alarms.clear('reset_icon_alarm');
      } catch (e) {
        // Ignore context invalidation
      }
    };

    setTimeout(resetIcon, 5000);
  } catch (err) {
    console.error("[GFG Sync ERROR] Failed to show fire icon:", err);
  }
}

// Format submission path based on platform and options
function buildGitHubPath(data, customFormat = '') {
  const extension = getFileExtension(data.language);
  const cleanTitleStr = cleanTitle(data.title);
  const titleSlug = slugify(cleanTitleStr || data.slug);
  const platform = data.platform;
  
  if (customFormat && typeof customFormat === 'string' && customFormat.trim().length > 0) {
    // Advanced: Customize folder structure. Placeholders: {platform}, {difficulty}, {title}, {language}, {category}, {contest}
    let path = customFormat
      .replace(/{platform}/gi, platform)
      .replace(/{difficulty}/gi, data.difficulty || 'Unknown')
      .replace(/{title}/gi, cleanTitleStr || data.slug)
      .replace(/{language}/gi, data.language)
      .replace(/{category}/gi, data.category || 'Algorithms')
      .replace(/{contest}/gi, data.contest || 'Practice');
    
    path = path.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
    
    // ENFORCE UNIQUE SUBFOLDER FOR README PROTECTION:
    const titleSlugPath = slugify(cleanTitleStr || data.slug);
    const pathParts = path.split('/');
    const lastPart = pathParts[pathParts.length - 1];

    if (slugify(lastPart) !== titleSlugPath) {
      path = `${path}/${titleSlugPath}/${titleSlugPath}`;
    } else if (pathParts.length === 1 || slugify(pathParts[pathParts.length - 2]) !== titleSlugPath) {
      path = `${path}/${lastPart}`;
    }
    
    return `${path}.${extension}`;
  }

  // Default structure: Put every question folder directly at the root!
  let folderName = titleSlug;
  
  if (platform === 'CodeChef') {
    const code = data.problemCode || titleSlug;
    folderName = slugify(code);
  } else if (platform === 'Codeforces') {
    const indexName = data.problemIndex ? `${data.problemIndex}-${titleSlug}` : titleSlug;
    folderName = slugify(indexName);
  }

  // Fallback check
  if (!folderName) {
    folderName = `solution-${Date.now()}`;
  }

  return `${folderName}/${folderName}.${extension}`;
}

// Processes the offline queue
async function processOfflineQueue() {
  log("Attempting to process offline queue...");
  let { githubToken, githubRepo, folderStructure } = await chrome.storage.local.get(['githubToken', 'githubRepo', 'folderStructure']);
  if (!githubToken || !githubRepo) {
    log("Skipping queue process: Not logged in or repo not set");
    return;
  }

  const queue = await getQueue();
  if (queue.length === 0) {
    log("Queue is empty");
    return;
  }

  log(`Processing ${queue.length} items in queue`);
  for (const item of queue) {
    try {
      const data = item.data;
      const codePath = buildGitHubPath(data, folderStructure);
      const readmePath = codePath.substring(0, codePath.lastIndexOf('/')) + '/README.md';

      const commitMessage = `Added ${data.platform}: ${data.title} (${data.difficulty || 'Unknown'}) - GitSync`;
      const readmeContent = generateReadmeContent(data);

      log(`Uploading queued item: ${data.title}`);
      await uploadToGitHub(githubToken, githubRepo, codePath, data.code, commitMessage);
      await uploadToGitHub(githubToken, githubRepo, readmePath, readmeContent, commitMessage);

      // Mark synced and remove from queue
      await markSubmissionAsSynced(data.platform, data.slug, data.title, data.language, codePath, githubRepo, data.code);
      await removeFromQueue(item.id);
      await updateLocalStats(data);
      log(`Queued item successfully synced: ${data.title}`);
    } catch (err) {
      log(`Queued item failed to upload: ${item.data.title}. Error: ${err.message}`);
      // Increment attempt counter and apply simple retry delay backoff
      await updateQueueItem(item.id, { 
        attempts: item.attempts + 1,
        status: 'failed'
      });
    }
  }
}

// Direct Sync Function
async function handleSubmission(data) {
  let { githubToken, githubRepo, folderStructure, autoSync } = await chrome.storage.local.get(['githubToken', 'githubRepo', 'folderStructure', 'autoSync']);
  
  if (autoSync === false && !data.isManual) {
    log("Auto-sync is disabled. Submission skipped.");
    return { status: 'skipped', message: 'Auto-sync is disabled' };
  }

  if (!githubToken || !githubRepo) {
    log("Not authenticated or repo not chosen. Adding to queue...");
    await addToQueue(data);
    return { status: 'queued', message: 'Please login and select a repository in the popup. Solutions queued!' };
  }

  // Check duplicate disabled per user request to always push and update on every submission
  const isDuplicate = false;

  const codePath = buildGitHubPath(data, folderStructure);
  const readmePath = codePath.substring(0, codePath.lastIndexOf('/')) + '/README.md';
  const commitMessage = `Added ${data.platform}: ${data.title} (${data.difficulty || 'Unknown'}) - GitSync`;
  const readmeContent = generateReadmeContent(data);

  try {
    log(`Pushing code to: ${codePath}`);
    await uploadToGitHub(githubToken, githubRepo, codePath, data.code, commitMessage);
    log(`Pushing README to: ${readmePath}`);
    await uploadToGitHub(githubToken, githubRepo, readmePath, readmeContent, commitMessage);

    // Mark successfully synced
    await markSubmissionAsSynced(data.platform, data.slug, data.title, data.language, codePath, githubRepo, data.code);
    await updateLocalStats(data);
    
    return { status: 'success', path: codePath };
  } catch (err) {
    log(`Push failed: ${err.message}. Adding to queue...`);
    await addToQueue(data);
    return { status: 'queued', message: `GitHub Sync Failed (${err.message}). Queued for retry!` };
  }
}

// Local statistics updating
async function updateLocalStats(currentProblemData) {
  try {
    let { stats, topics } = await chrome.storage.local.get(['stats', 'topics']);
    
    if (!stats) stats = { totalSolved: 0, difficulty: {}, streak: 0, lastSolveDate: null };
    if (!stats.difficulty) stats.difficulty = {};
    if (!topics) topics = {};

    stats.totalSolved = (stats.totalSolved || 0) + 1;
    
    const diff = currentProblemData && currentProblemData.difficulty ? currentProblemData.difficulty : 'Unknown';
    stats.difficulty[diff] = (stats.difficulty[diff] || 0) + 1;

    if (currentProblemData && currentProblemData.tags && currentProblemData.tags.length > 0) {
        const topTopic = currentProblemData.tags[0];
        topics[topTopic] = (topics[topTopic] || 0) + 1;
    }

    const today = new Date().toDateString();
    if (stats.lastSolveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (stats.lastSolveDate === yesterday.toDateString()) {
        stats.streak = (stats.streak || 0) + 1;
      } else {
        stats.streak = 1;
      }
      stats.lastSolveDate = today;
    }
    
    await chrome.storage.local.set({ 
      stats: stats, 
      topics: topics,
      lastSynced: currentProblemData.title || 'Unknown Problem'
    });

    await showTemporaryFireIcon();
  } catch (err) {
    console.error("[GFG Sync ERROR] Failed to update local stats:", err);
  }
}

// 🔥 MESSAGE LISTENER ORCHESTRATOR
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log("Message received:", request.action);

  if (request.action === 'login') {
    loginWithGitHub()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'logout') {
    logoutFromGitHub()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'get_repos') {
    fetchRepositories()
      .then(repos => sendResponse({ status: 'success', repos }))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'push_submission') {
    handleSubmission(request.data)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error("[GFG Sync ERROR]", error);
        sendResponse({ status: 'error', message: error.toString() });
      });
    return true;
  }

  if (request.action === 'retry_queue') {
    processOfflineQueue()
      .then(() => getQueue())
      .then(queue => sendResponse({ status: 'success', queueCount: queue.length, message: 'Queue processed' }))
      .catch(err => sendResponse({ status: 'error', message: err.message }));
    return true;
  }
});

// Setup alarm listener for periodic retry checks
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'process_queue_alarm') {
    processOfflineQueue();
  } else if (alarm.name === 'reset_icon_alarm') {
    resetIconToDefault().catch(() => {});
  }
});

// Init alarm on startup
chrome.runtime.onInstalled.addListener(async () => {
  chrome.alarms.create('process_queue_alarm', { delayInMinutes: 1, periodInMinutes: 5 });
  try {
    await chrome.storage.local.remove(['folderStructure']);
  } catch(e) {}
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch(e) {}
  try {
    await chrome.alarms.clear('reset_icon_alarm');
    await resetIconToDefault();
  } catch(e) {}
  log("Extension installed. Offline retry engine registered. Legacy structures cleared.");
});
