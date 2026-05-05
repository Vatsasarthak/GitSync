
// background.js

async function log(message, ...args) {
  const { debugMode } = await chrome.storage.local.get(['debugMode']);
  if (debugMode) {
    console.log(`[GFG Sync] ${message}`, ...args);
  }
}

// 🔥 TEMPORARY BADGE AFTER SUBMISSION
async function showTemporaryFireIcon() {
  try {
    // Show the requested party emoji!
    await chrome.action.setBadgeText({ text: '🥳' });
    await chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green background

    // Revert after 5 seconds
    setTimeout(async () => {
      try {
        await chrome.action.setBadgeText({ text: '' });
      } catch(e) {
        // Ignore if context invalidated
      }
    }, 5000);

  } catch (err) {
    console.error("[GFG Sync ERROR] Failed to show badge:", err);
  }
}

// 🔥 MESSAGE HANDLER (FIXED)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PUSH_SUBMISSION') {
    handleSubmission(request.data)
      .then(result => sendResponse(result))
      .catch(error => {
        console.error("[GFG Sync ERROR]", error);
        sendResponse({ status: 'error', message: error.toString() });
      });
    return true;
  }
});

// 🔥 DIRECT PUSH (NO QUEUE FOR NOW)
async function handleSubmission(data) {
  const { githubPat, githubRepo } = await chrome.storage.local.get(['githubPat', 'githubRepo']);

  if (!githubPat || !githubRepo) {
    throw new Error('GitHub PAT or Repository not configured.');
  }

  try {
    await syncSingleProblem(data, githubPat, githubRepo);
    return { status: 'success' };
  } catch (err) {
    console.error("[GFG Sync ERROR]", err);
    return { status: 'error', message: err.message };
  }
}

// 🔥 MAIN SYNC
async function syncSingleProblem(data, pat, repo) {
  const extension = getFileExtension(data.language);

  // Safe naming (kebab-case)
  let safeTitle = data.title.replace(/[^a-zA-Z0-9\s-]/g, '');
  safeTitle = safeTitle.replace(/\s+/g, '-').toLowerCase().trim();

  let difficultyColor = 'brightgreen';
  if (data.difficulty === 'Medium') difficultyColor = 'yellow';
  else if (data.difficulty === 'Hard') difficultyColor = 'red';

  const folderPath = `${safeTitle}`;
  const codePath = `${folderPath}/${safeTitle}.${extension}`;
  const readmePath = `${folderPath}/README.md`;

  const commitMessage = `Added GFG: ${data.title} (${data.difficulty || 'Unknown'})`;

  // Construct README content
  const readmeContent = `<h2>${data.title}</h2>
<img src='https://img.shields.io/badge/Difficulty-${data.difficulty}-${difficultyColor}' alt='Difficulty: ${data.difficulty}' />
<hr>
${data.description || 'No description available.'}
`;

  log(`🚀 Pushing Code: ${codePath}`);
  await pushToGitHub(pat, repo, codePath, data.code, commitMessage);

  log(`🚀 Pushing README: ${readmePath}`);
  await pushToGitHub(pat, repo, readmePath, readmeContent, commitMessage);

  log(`✅ Push successful`);
  
  // Update local stats for UI
  await updateLocalStats(data);
}

// 🔥 FIXED ENCODING + PUSH
async function pushToGitHub(pat, repo, path, content, message) {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  let sha = null;

  // Check existing file
  const getRes = await fetch(apiUrl, {
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  }

  // 🔥 SAFE BASE64 ENCODING (FIXED)
  const encodedContent = btoa(
    new TextEncoder().encode(content)
      .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const body = {
    message: message,
    content: encodedContent
  };

  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    console.error("❌ GitHub Error:", err);
    throw new Error(`${putRes.status} ${err.message}`);
  }

  return true;
}

// 🔥 REMOVED FORMAT FILE FUNCTION

// 🔥 EXTENSION DETECTION
function getFileExtension(language) {
  const lang = (language || '').toLowerCase();

  if (lang.includes('java')) return 'java';
  if (lang.includes('c++') || lang.includes('cpp')) return 'cpp';
  if (lang.includes('python')) return 'py';
  if (lang.includes('javascript')) return 'js';

  return 'txt';
}

// 🔥 UPDATE LOCAL STATS (NO README)
async function updateLocalStats(currentProblemData) {
  try {
    let { stats, topics } = await chrome.storage.local.get(['stats', 'topics']);
    
    // Ensure stats structure exists and is valid
    if (!stats) stats = { totalSolved: 0, difficulty: {}, streak: 0, lastSolveDate: null };
    if (!stats.difficulty) stats.difficulty = {};
    if (!stats.totalSolved || typeof stats.totalSolved !== 'number') stats.totalSolved = 0;
    if (!topics) topics = {};

    stats.totalSolved += 1;
    
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

    // Show temporary fire icon!
    await showTemporaryFireIcon();

  } catch (err) {
    console.error("[GFG Sync ERROR] Failed to update local stats:", err);
  }
}
