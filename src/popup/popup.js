// src/popup/popup.js

document.addEventListener('DOMContentLoaded', async () => {
  // --- UI Elements ---
  const authSection = document.getElementById('auth-section');
  const mainSection = document.getElementById('main-section');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const repoSelect = document.getElementById('repo-select');
  const refreshReposBtn = document.getElementById('refresh-repos-btn');
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  const folderInput = document.getElementById('folder-structure-input');
  const saveStructureBtn = document.getElementById('save-structure-btn');
  const pushManualBtn = document.getElementById('push-manual-btn');
  const retryQueueBtn = document.getElementById('retry-queue-btn');

  const toastContainer = document.getElementById('toast-container');
  const historyList = document.getElementById('history-list');

  // Dashboard Stats
  const totalSolvedEl = document.getElementById('total-solved');
  const currentStreakEl = document.getElementById('current-streak');
  const queueCountEl = document.getElementById('queue-count');
  const lastSyncedEl = document.getElementById('last-synced');

  // Profile details
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  // Staggered Intro Animations
  function triggerStaggeredAnimations() {
    const elements = document.querySelectorAll('.staggered');
    elements.forEach((el, index) => {
      el.style.animationDelay = `${index * 0.06}s`;
    });
  }

  // Toast notification system
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 350);
    }, 3500);
  }

  // Highlight the platform tab active pill
  async function highlightActivePlatform() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0] && tabs[0].url) {
        const url = tabs[0].url.toLowerCase();
        
        // Remove active state from all
        document.querySelectorAll('.platform-pill').forEach(el => el.classList.remove('active'));

        if (url.includes('geeksforgeeks.org')) {
          document.getElementById('pill-gfg').classList.add('active');
        } else if (url.includes('leetcode.com')) {
          document.getElementById('pill-leetcode').classList.add('active');
        } else if (url.includes('codechef.com')) {
          document.getElementById('pill-codechef').classList.add('active');
        } else if (url.includes('codeforces.com')) {
          document.getElementById('pill-codeforces').classList.add('active');
        } else if (url.includes('hackerrank.com')) {
          document.getElementById('pill-hackerrank').classList.add('active');
        }
      }
    } catch (e) {
      console.warn("Could not query active tab platform:", e);
    }
  }

  // Populate sync history
  async function populateHistory() {
    const { syncHistory } = await chrome.storage.local.get(['syncHistory']);
    const history = syncHistory || [];

    if (history.length === 0) {
      historyList.innerHTML = '<div class="empty-history">No solutions synced yet. Solve a problem to start!</div>';
      return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      
      const platClass = item.platform.toLowerCase();
      const platText = item.platform === 'GeeksforGeeks' ? 'GFG' : (item.platform === 'LeetCode' ? 'LC' : (item.platform === 'CodeChef' ? 'CC' : (item.platform === 'Codeforces' ? 'CF' : 'HR')));

      el.innerHTML = `
        <div class="history-meta-wrap">
          <div class="history-item-title">${item.title}</div>
          <div class="history-item-tags">
            <span class="history-item-platform ${platClass}">${platText}</span>
            <span class="history-item-lang">${item.language}</span>
          </div>
        </div>
        <div class="view-code-link" data-path="${item.path}" title="View file on GitHub">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </div>
      `;

      // Event listener for opening link
      el.querySelector('.view-code-link').addEventListener('click', async (e) => {
        const { githubRepo } = await chrome.storage.local.get(['githubRepo']);
        if (githubRepo) {
          const path = e.currentTarget.getAttribute('data-path');
          const gitUrl = `https://github.com/${githubRepo}/blob/main/${path}`;
          chrome.tabs.create({ url: gitUrl });
        }
      });

      historyList.appendChild(el);
    });
  }

  // --- State Updates ---
  async function updateUIState() {
    const data = await chrome.storage.local.get([
      'githubToken', 'githubUser', 'githubRepo', 'stats', 'lastSynced', 
      'autoSync', 'debugMode', 'folderStructure', 'syncQueue'
    ]);
    
    const activeRepo = data.githubRepo;
    const queue = data.syncQueue || [];

    // Stats
    const stats = data.stats || {};
    totalSolvedEl.textContent = stats.totalSolved || 0;
    currentStreakEl.textContent = stats.streak || 0;
    queueCountEl.textContent = queue.length;
    lastSyncedEl.textContent = data.lastSynced || 'None';

    // Toggles and inputs
    autoSyncToggle.checked = data.autoSync !== false;

    if (data.folderStructure) {
      folderInput.value = data.folderStructure;
    }

    // Auth screen routing
    if (data.githubToken) {
      authSection.style.display = 'none';
      mainSection.style.display = 'block';
      
      const user = data.githubUser;
      if (user) {
        userAvatar.src = user.avatar || user.avatar_url || '';
        userName.textContent = user.name || user.login || 'Coder Profile';
      }

      await loadRepositories(activeRepo);
      await populateHistory();
      await highlightActivePlatform();
    } else {
      authSection.style.display = 'flex';
      mainSection.style.display = 'none';
    }

    triggerStaggeredAnimations();
  }

  // Fetch repositories from background and render select
  async function loadRepositories(selectedId) {
    repoSelect.innerHTML = '<option value="">Loading repositories...</option>';
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'get_repos' });
      
      if (response && response.status === 'success') {
        const repos = response.repos;
        repoSelect.innerHTML = '<option value="">Select a repository</option>';
        
        repos.forEach(repo => {
          const option = document.createElement('option');
          option.value = repo.full_name;
          option.textContent = repo.full_name;
          if (selectedId === repo.full_name) option.selected = true;
          repoSelect.appendChild(option);
        });
      } else {
        throw new Error(response?.message || 'Failed to fetch repositories');
      }
    } catch (error) {
      console.error(error);
      repoSelect.innerHTML = '<option value="">Error loading repos</option>';
    }
  }

  // --- Listeners ---

  // Connect GitHub
  loginBtn.addEventListener('click', async () => {
    loginBtn.disabled = true;
    const loader = loginBtn.querySelector('.spinner');
    loader.style.display = 'inline-block';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'login' });
      if (response && response.status === 'success') {
        showToast('Connected to GitHub workspace!', 'success');
        await updateUIState();
      } else {
        showToast(response?.message || 'Authorization failed', 'error');
      }
    } catch (err) {
      showToast('Connection failed.', 'error');
    } finally {
      loginBtn.disabled = false;
      loader.style.display = 'none';
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    if (confirm('Disconnect from your GitHub session?')) {
      const response = await chrome.runtime.sendMessage({ action: 'logout' });
      if (response && response.status === 'success') {
        showToast('Logged out successfully', 'info');
        await updateUIState();
      }
    }
  });

  // Repository Picker
  repoSelect.addEventListener('change', async (e) => {
    const selectedRepo = e.target.value;
    await chrome.storage.local.set({ githubRepo: selectedRepo });
    if (selectedRepo) {
      showToast(`Sync target: ${selectedRepo.split('/')[1]}`, 'success');
    }
  });

  // Refresh Repositories list
  refreshReposBtn.addEventListener('click', async () => {
    const { githubRepo } = await chrome.storage.local.get(['githubRepo']);
    refreshReposBtn.classList.add('rotating');
    await loadRepositories(githubRepo);
    setTimeout(() => refreshReposBtn.classList.remove('rotating'), 500);
    showToast('Repository list synced', 'info');
  });

  // Folder Customization Save
  saveStructureBtn.addEventListener('click', async () => {
    const customPath = folderInput.value.trim();
    if (customPath.length === 0) {
      showToast('Path template cannot be empty.', 'error');
      return;
    }
    await chrome.storage.local.set({ folderStructure: customPath });
    showToast('Folder template updated!', 'success');
  });

  // Auto-Sync Configuration Toggle
  autoSyncToggle.addEventListener('change', async (e) => {
    const autoSync = e.target.checked;
    await chrome.storage.local.set({ autoSync });
    showToast(autoSync ? 'Auto-sync active' : 'Auto-sync paused', 'info');
  });

  // Manual Sync Solution in Active Tab
  pushManualBtn.addEventListener('click', async () => {
    pushManualBtn.disabled = true;
    const loader = pushManualBtn.querySelector('.spinner');
    loader.style.display = 'inline-block';

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) {
        showToast('No active tab found.', 'error');
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'MANUAL_PUSH' }, (response) => {
        pushManualBtn.disabled = false;
        loader.style.display = 'none';

        if (chrome.runtime.lastError) {
          showToast('Unsupported page or extension needs reload.', 'error');
        } else if (response && response.status === 'success') {
          showToast('Active solution successfully synced!', 'success');
        } else {
          showToast(response?.message || 'Sync failed.', 'error');
        }
      });
    } catch (err) {
      showToast('Manual push failed', 'error');
      pushManualBtn.disabled = false;
      loader.style.display = 'none';
    }
  });

  // Process retry offline queue
  retryQueueBtn.addEventListener('click', async () => {
    retryQueueBtn.disabled = true;
    const loader = retryQueueBtn.querySelector('.spinner');
    loader.style.display = 'inline-block';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'retry_queue' });
      if (response && response.status === 'success') {
        showToast(`Queue processed. ${response.queueCount} items left.`, 'info');
        await updateUIState();
      } else {
        showToast(response?.message || 'Process error', 'error');
      }
    } catch (e) {
      showToast('Process failure.', 'error');
    } finally {
      retryQueueBtn.disabled = false;
      loader.style.display = 'none';
    }
  });



  // Initial render
  await updateUIState();

  // Storage listener for active updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.githubToken || changes.githubUser || changes.githubRepo || changes.stats || changes.lastSynced || changes.syncQueue || changes.syncHistory) {
      updateUIState();
    }
  });
});
