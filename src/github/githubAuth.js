// src/github/githubAuth.js

const GITHUB_CLIENT_ID = 'Ov23lid1EC78Wl5IT5Tv';
const BACKEND_URL = 'https://gfgsync.onrender.com';
const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

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

async function logoutFromGitHub() {
  await chrome.storage.local.remove(['githubToken', 'githubUser', 'githubRepo']);
  return { status: 'success' };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loginWithGitHub, logoutFromGitHub };
} else {
  self.loginWithGitHub = loginWithGitHub;
  self.logoutFromGitHub = logoutFromGitHub;
}
