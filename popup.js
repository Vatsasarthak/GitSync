// popup.js

document.addEventListener('DOMContentLoaded', async () => {
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
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    } else {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // --- State Management ---
  async function updateUIState() {
    const data = await chrome.storage.local.get(['githubToken', 'githubUser', 'githubRepo', 'stats', 'lastSynced', 'autoSync', 'debugMode']);
    
    const activeRepo = data.githubRepo;

    // Update Stats
    const stats = data.stats || {};
    totalSolvedEl.textContent = stats.totalSolved || 0;
    currentStreakEl.textContent = stats.streak || 0;
    lastSyncedEl.textContent = data.lastSynced || 'None';

    // Update Toggles
    autoSyncToggle.checked = data.autoSync !== false;
    debugToggle.checked = !!data.debugMode;
    debugLogs.style.display = data.debugMode ? 'block' : 'none';

    if (data.githubToken) {
      // Logged In
      authSection.style.display = 'none';
      mainSection.style.display = 'block';
      
      const user = data.githubUser;
      if (user) {
        userAvatar.src = user.avatar || user.avatar_url;
        userName.textContent = user.name || user.login;
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
      showToast('Failed to load repositories', 'error');
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
      const response = await chrome.runtime.sendMessage({ action: 'login' });
      if (response && response.status === 'success') {
        showToast('Successfully connected to GitHub!', 'success');
        await updateUIState();
      } else {
        showToast(response?.message || 'Login failed', 'error');
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
      const response = await chrome.runtime.sendMessage({ action: 'logout' });
      if (response && response.status === 'success') {
        showToast('Logged out successfully', 'info');
        await updateUIState();
      }
    }
  });

  // Repo Select
  repoSelect.addEventListener('change', async (e) => {
    const selectedRepo = e.target.value;
    await chrome.storage.local.set({ githubRepo: selectedRepo });
    if (selectedRepo) {
      showToast(`Target set to ${selectedRepo.split('/')[1]}`, 'success');
    }
  });

  // Refresh Repos
  refreshReposBtn.addEventListener('click', async () => {
    const { githubRepo } = await chrome.storage.local.get(['githubRepo']);
    refreshReposBtn.classList.add('rotating');
    await loadRepositories(githubRepo);
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
      const response = await chrome.runtime.sendMessage({ action: 'push_current' });
      if (response && response.status === 'success') {
        showToast('Code synced successfully!', 'success');
      } else {
        showToast(response?.message || 'Manual push coming soon!', 'info');
      }
    } catch (err) {
      showToast('Push failed', 'error');
    } finally {
      pushManualBtn.disabled = false;
      loader.style.display = 'none';
    }
  });

  // Process Queue
  retryQueueBtn.addEventListener('click', async () => {
    retryQueueBtn.disabled = true;
    const loader = retryQueueBtn.querySelector('.spinner');
    loader.style.display = 'inline-block';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'retry_queue' });
      showToast(response?.message || 'Processing engine ready', 'info');
    } finally {
      retryQueueBtn.disabled = false;
      loader.style.display = 'none';
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
    if (changes.githubToken || changes.githubUser || changes.githubRepo || changes.stats || changes.lastSynced) {
      updateUIState();
    }
  });
});
