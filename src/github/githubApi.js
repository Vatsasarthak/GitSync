// src/github/githubApi.js

async function fetchRepositories() {
  const { githubToken } = await chrome.storage.local.get(['githubToken']);
  if (!githubToken) throw new Error('Not authenticated');

  let repos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page < 5) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchRepositories };
} else {
  self.fetchRepositories = fetchRepositories;
}
