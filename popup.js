// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- UI Elements ---
  const authSection = document.getElementById('auth-section');
  const mainSection = document.getElementById('main-section');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const repoSelect = document.getElementById('repo-select');
  const refreshReposBtn = document.getElementById('refresh-repos-btn');
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  const pushManualBtn = document.getElementById('push-manual-btn');
  const retryQueueBtn = document.getElementById('retry-queue-btn');
  const debugToggle = document.getElementById('debug-toggle');
  const debugLogs = document.getElementById('debug-logs');
  const toastContainer = document.getElementById('toast-container');

  // Stats
  const totalSolvedEl = document.getElementById('total-solved');
  const currentStreakEl = document.getElementById('current-streak');
  const queueCountEl = document.getElementById('queue-count');
  const lastSyncedEl = document.getElementById('last-synced');

  // Profile
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');

  // --- Animation Utilities ---
  function triggerStaggeredAnimations() {
    const elements = document.querySelectorAll('.staggered');
    elements.forEach((el, index) => {
      el.style.animationDelay = `${index * 0.08}s`;
    });
  }

  // --- Toast System ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${icon}" class="toast-icon"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // --- State Management ---
  async function updateUIState() {
    const data = await chrome.storage.local.get(['githubToken', 'user', 'githubUser', 'selectedRepo', 'githubRepo', 'stats', 'queue', 'lastSynced', 'autoSync', 'debugMode']);
    
    // Normalize repo selection (ensure both keys are in sync if one is missing)
    const activeRepo = data.githubRepo || data.selectedRepo;

    // Update Stats
    const stats = data.stats || {};
    totalSolvedEl.textContent = stats.totalSolved || 0;
    currentStreakEl.textContent = stats.streak || 0;
    queueCountEl.textContent = data.queue ? data.queue.length : 0;
    lastSyncedEl.textContent = data.lastSynced || 'None';

    // Update Toggles
    autoSyncToggle.checked = data.autoSync !== false;
    debugToggle.checked = !!data.debugMode;
    debugLogs.style.display = data.debugMode ? 'block' : 'none';

    if (data.githubToken) {
      // Logged In
      authSection.style.display = 'none';
      mainSection.style.display = 'block';
      
      const user = data.githubUser || data.user;
      if (user) {
        userAvatar.src = user.avatar || user.avatar_url;
        userName.textContent = user.name || user.login;
      } else {
        // Auto-recover user info if missing
        fetchUserInfo(data.githubToken);
      }

      await loadRepositories(activeRepo);
    } else {
      // Logged Out
      authSection.style.display = 'flex';
      mainSection.style.display = 'none';
    }

    triggerStaggeredAnimations();
  }

  // --- API Helpers ---
  async function loadRepositories(selectedId) {
    repoSelect.innerHTML = '<option value="">Loading repositories...</option>';
    
    try {
      const { githubToken } = await chrome.storage.local.get(['githubToken']);
      if (!githubToken) return;

      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch repositories');

      const repos = await response.json();
      repoSelect.innerHTML = '<option value="">Select a repository</option>';
      
      repos.forEach(repo => {
        const option = document.createElement('option');
        option.value = repo.full_name;
        option.textContent = repo.full_name;
        if (selectedId === repo.full_name) option.selected = true;
        repoSelect.appendChild(option);
      });
    } catch (error) {
      console.error(error);
      repoSelect.innerHTML = '<option value="">Error loading repos</option>';
      if (error.message.includes('401')) {
        showToast('GitHub session expired. Please logout and login again.', 'error');
      } else {
        showToast('Failed to load repositories', 'error');
      }
    }
  }

  async function fetchUserInfo(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (response.ok) {
        const user = await response.json();
        const githubUser = {
          login: user.login,
          avatar: user.avatar_url,
          name: user.name
        };
        await chrome.storage.local.set({ githubUser });
        userAvatar.src = githubUser.avatar;
        userName.textContent = githubUser.name || githubUser.login;
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  }

  // --- Event Listeners ---

  // Login
  loginBtn.addEventListener('click', async () => {
    loginBtn.disabled = true;
    const loader = loginBtn.querySelector('.spinner');
    const span = loginBtn.querySelector('span');
    
    loader.style.display = 'inline-block';
    span.style.opacity = '0.5';

    try {
      // Use the correct action name matching your background.js
      const response = await chrome.runtime.sendMessage({ action: 'login' });
      if (response && response.success) {
        showToast('Successfully connected to GitHub!', 'success');
        await updateUIState();
      } else {
        showToast(response?.error || 'Login failed', 'error');
      }
    } catch (err) {
      showToast('Connection error', 'error');
    } finally {
      loginBtn.disabled = false;
      loader.style.display = 'none';
      span.style.opacity = '1';
    }
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
      await chrome.storage.local.remove(['githubToken', 'user', 'selectedRepo']);
      showToast('Logged out successfully', 'info');
      await updateUIState();
    }
  });

  // Repo Select
  repoSelect.addEventListener('change', async (e) => {
    const selectedRepo = e.target.value;
    await chrome.storage.local.set({ 
      selectedRepo: selectedRepo,
      githubRepo: selectedRepo // Keep both in sync for background.js compatibility
    });
    if (selectedRepo) {
      showToast(`Target set to ${selectedRepo.split('/')[1]}`, 'success');
    }
  });

  // Refresh Repos
  refreshReposBtn.addEventListener('click', async () => {
    const { selectedRepo } = await chrome.storage.local.get(['selectedRepo']);
    refreshReposBtn.classList.add('rotating');
    await loadRepositories(selectedRepo);
    setTimeout(() => refreshReposBtn.classList.remove('rotating'), 500);
    showToast('Repository list updated', 'info');
  });

  // Auto-Sync Toggle
  autoSyncToggle.addEventListener('change', async (e) => {
    const autoSync = e.target.checked;
    await chrome.storage.local.set({ autoSync });
    showToast(autoSync ? 'Auto-sync enabled' : 'Auto-sync disabled', 'info');
  });

  // Manual Push
  pushManualBtn.addEventListener('click', async () => {
    pushManualBtn.disabled = true;
    const loader = pushManualBtn.querySelector('.spinner');
    loader.style.display = 'inline-block';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'pushCurrent' });
      if (response && response.success) {
        showToast('Code synced successfully!', 'success');
      } else {
        showToast(response?.error || 'Sync failed', 'error');
      }
    } catch (err) {
      showToast('Push failed: Check connection', 'error');
    } finally {
      pushManualBtn.disabled = false;
      loader.style.display = 'none';
      updateUIState();
    }
  });

  // Retry Queue
  retryQueueBtn.addEventListener('click', async () => {
    retryQueueBtn.disabled = true;
    const loader = retryQueueBtn.querySelector('.spinner');
    loader.style.display = 'inline-block';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'retryQueue' });
      if (response && response.success) {
        showToast(`Synced ${response.count} items!`, 'success');
      } else {
        showToast('Queue is empty or sync failed', 'info');
      }
    } finally {
      retryQueueBtn.disabled = false;
      loader.style.display = 'none';
      updateUIState();
    }
  });

  // Debug Toggle
  debugToggle.addEventListener('change', async (e) => {
    const debugMode = e.target.checked;
    await chrome.storage.local.set({ debugMode });
    debugLogs.style.display = debugMode ? 'block' : 'none';
  });

  // Initial Load
  await updateUIState();

  // Listen for storage changes to update UI in real-time
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.totalSolved || changes.currentStreak || changes.queue || changes.lastSynced) {
      updateUIState();
    }
    
    if (changes.logs && debugToggle.checked) {
      debugLogs.textContent = (changes.logs.newValue || []).join('\n');
      debugLogs.scrollTop = debugLogs.scrollHeight;
    }
  });

  // Periodically check queue size for animations
  setInterval(async () => {
    const { queue } = await chrome.storage.local.get(['queue']);
    const count = queue ? queue.length : 0;
    queueCountEl.textContent = count;
    if (count > 0) {
       queueCountEl.style.color = 'var(--warning-color)';
       queueCountEl.parentElement.querySelector('.stat-icon').classList.add('fire-animation');
    } else {
       queueCountEl.style.color = 'var(--text-color)';
       queueCountEl.parentElement.querySelector('.stat-icon').classList.remove('fire-animation');
    }
  }, 2000);
});
