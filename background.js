
// background.js

const GITHUB_CLIENT_ID = 'Ov23lid1EC78Wl5IT5Tv'; // Your GitHub Client ID
const BACKEND_URL = 'http://localhost:3000'; // Dev URL
const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

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

// 🔥 MESSAGE HANDLER
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'LOGIN') {
    loginWithGitHub()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

  if (request.action === 'LOGOUT') {
    chrome.storage.local.remove(['githubToken', 'githubUser', 'githubRepo'], () => {
      sendResponse({ status: 'success' });
    });
    return true;
  }

  if (request.action === 'GET_REPOS') {
    fetchRepositories()
      .then(repos => sendResponse({ status: 'success', repos }))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    return true;
  }

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

// 🔥 OAUTH FLOW
async function loginWithGitHub() {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo,user`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        return reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Login failed'));
      }

      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        return reject(new Error('No code returned from GitHub'));
      }

      try {
        // Exchange code for token via backend
        const res = await fetch(`${BACKEND_URL}/api/auth/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error_description || data.error || 'Token exchange failed');
        }

        const token = data.access_token;

        // Fetch user profile
        const userRes = await fetch(`${BACKEND_URL}/api/user`, {
          headers: { 'Authorization': `token ${token}` }
        });
        const userData = await userRes.json();

        await chrome.storage.local.set({ 
          githubToken: token, 
          githubUser: {
            login: userData.login,
            avatar: userData.avatar_url,
            name: userData.name
          }
        });

        resolve({ status: 'success', user: userData });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// 🔥 FETCH REPOSITORIES
async function fetchRepositories() {
  const { githubToken } = await chrome.storage.local.get(['githubToken']);
  if (!githubToken) throw new Error('Not authenticated');

  let repos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page < 5) { // Limit to 5 pages (150 repos)
    const res = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=30&page=${page}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch repos');

    if (data.length === 0) {
      hasMore = false;
    } else {
      repos = repos.concat(data.map(r => ({
        full_name: r.full_name,
        private: r.private
      })));
      page++;
    }
  }

  return repos;
}

// 🔥 DIRECT PUSH
async function handleSubmission(data) {
  let { githubToken, githubRepo } = await chrome.storage.local.get(['githubToken', 'githubRepo']);

  if (!githubToken || !githubRepo) {
    throw new Error('Please login and select a repository in the extension popup.');
  }

  try {
    await syncSingleProblem(data, githubToken, githubRepo);
    return { status: 'success' };
  } catch (err) {
    console.error("[GFG Sync ERROR]", err);
    return { status: 'error', message: err.message };
  }
}

// 🔥 MAIN SYNC
async function syncSingleProblem(data, pat, repo) {
  const extension = getFileExtension(data.language);

  // Use slug if available, otherwise title
  let folderName = data.slug || data.title;
  
  // Safe naming (kebab-case)
  let safeFolderName = folderName.replace(/[^a-zA-Z0-9\s-]/g, '');
  safeFolderName = safeFolderName.replace(/\s+/g, '-').toLowerCase().trim();

  // If the title is still very generic, add a timestamp to prevent overwrite
  if (safeFolderName === 'gfg-problem' || !safeFolderName) {
    safeFolderName = `gfg-${Date.now()}`;
  }

  let difficultyColor = 'brightgreen';
  if (data.difficulty === 'Medium') difficultyColor = 'yellow';
  else if (data.difficulty === 'Hard') difficultyColor = 'red';

  const folderPath = `${safeFolderName}`;
  const codePath = `${folderPath}/${safeFolderName}.${extension}`;
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
    let err = {};
    try {
      err = await putRes.json();
    } catch(e) {}
    
    console.error("❌ GitHub Error:", JSON.stringify(err));
    
    if (putRes.status === 404) {
      throw new Error(`404 Not Found: Check if repository '${repo}' exists and your PAT has 'repo' scope.`);
    } else if (putRes.status === 403 || putRes.status === 401) {
      throw new Error(`${putRes.status} Unauthorized: Check your PAT permissions (needs 'repo' scope).`);
    }
    
    throw new Error(`${putRes.status} ${err.message || 'Unknown error'}`);
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
