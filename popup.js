document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  const patInput = document.getElementById('pat-input');
  const repoInput = document.getElementById('repo-input');
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  const saveBtn = document.getElementById('save-btn');
  const clearTokenBtn = document.getElementById('clear-token-btn');
  const pushManualBtn = document.getElementById('push-manual-btn');
  const retryQueueBtn = document.getElementById('retry-queue-btn');
  const statusMsg = document.getElementById('status-message');
  
  const totalSolvedEl = document.getElementById('total-solved');
  const currentStreakEl = document.getElementById('current-streak');
  const queueCountEl = document.getElementById('queue-count');
  const lastSyncedEl = document.getElementById('last-synced');

  const debugToggle = document.getElementById('debug-toggle');
  const debugLogs = document.getElementById('debug-logs');

  let debugMode = false;

  // Load saved settings
  function loadUI() {
    chrome.storage.local.get(['githubPat', 'githubRepo', 'autoSync', 'stats', 'syncQueue', 'lastSynced', 'debugMode'], (result) => {
      if (result.githubPat) patInput.value = result.githubPat;
      if (result.githubRepo) repoInput.value = result.githubRepo;
      if (result.autoSync !== undefined) autoSyncToggle.checked = result.autoSync;
      
      if (result.stats) {
        totalSolvedEl.textContent = result.stats.totalSolved || 0;
        currentStreakEl.textContent = result.stats.streak || 0;
        
        const today = new Date().toDateString();
        const streakIcon = document.querySelector('.streak-icon');
        if (result.stats.lastSolveDate === today) {
          if (streakIcon) streakIcon.classList.add('fire-animation');
        } else {
          if (streakIcon) streakIcon.classList.remove('fire-animation');
        }
      }

      if (result.syncQueue) {
         queueCountEl.textContent = result.syncQueue.length;
         if (result.syncQueue.length > 0) {
            showStatus(`⏳ Pending sync: ${result.syncQueue.length} (offline or failed earlier)`, 'warning');
         }
      }

      if (result.lastSynced) {
         lastSyncedEl.textContent = result.lastSynced;
      }

      if (result.debugMode) {
         debugToggle.checked = true;
         debugMode = true;
         debugLogs.style.display = 'block';
         debugLogs.textContent = `Queue Size: ${result.syncQueue?.length || 0}\nLast Sync: ${result.lastSynced || 'None'}`;
      } else {
         debugToggle.checked = false;
         debugMode = false;
         debugLogs.style.display = 'none';
      }
    });
  }

  loadUI();

  // Listen for background updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.stats) {
        totalSolvedEl.textContent = changes.stats.newValue.totalSolved || 0;
        currentStreakEl.textContent = changes.stats.newValue.streak || 0;
        
        const today = new Date().toDateString();
        const streakIcon = document.querySelector('.streak-icon');
        if (changes.stats.newValue.lastSolveDate === today) {
          if (streakIcon) streakIcon.classList.add('fire-animation');
        } else {
          if (streakIcon) streakIcon.classList.remove('fire-animation');
        }
      }
      if (changes.syncQueue) {
         queueCountEl.textContent = changes.syncQueue.newValue.length;
         if (changes.syncQueue.newValue.length > 0) {
            showStatus(`⏳ Pending sync: ${changes.syncQueue.newValue.length} (offline or failed earlier)`, 'warning');
         }
      }
      if (changes.lastSynced) {
         lastSyncedEl.textContent = changes.lastSynced.newValue;
      }
    }
  });

  // Handle Debug Toggle
  debugToggle.addEventListener('change', () => {
     debugMode = debugToggle.checked;
     chrome.storage.local.set({ debugMode });
     debugLogs.style.display = debugMode ? 'block' : 'none';
     loadUI();
  });

  // Handle Clear Token
  clearTokenBtn.addEventListener('click', () => {
      chrome.storage.local.remove(['githubPat'], () => {
         patInput.value = '';
         showStatus('✅ Token cleared from storage.', 'success');
      });
  });

  // Save settings with Token Validation
  saveBtn.addEventListener('click', async () => {
    const pat = patInput.value.trim();
    const repo = repoInput.value.trim();
    const autoSync = autoSyncToggle.checked;

    if (!pat || !repo) {
      showStatus('❌ Please enter both PAT and Repository.', 'error');
      return;
    }

    if (!repo.includes('/')) {
      showStatus('❌ Repository must be username/repo', 'error');
      return;
    }

    setLoading(saveBtn, true);
    showStatus('⏳ Validating token...', 'info');

    try {
      // Validate Token via GitHub API
      const response = await fetch('https://api.github.com/user', {
        headers: {
           'Authorization': `token ${pat}`,
           'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
         if (response.status === 401) {
             throw new Error("Invalid token or insufficient permissions");
         }
         throw new Error(`API Error: ${response.status}`);
      }

      // If valid, save to storage
      await chrome.storage.local.set({ githubPat: pat, githubRepo: repo, autoSync: autoSync });
      showStatus('✅ GitHub connected successfully', 'success');

    } catch (err) {
      console.error("[GFG Sync ERROR]", err);
      showStatus(`❌ ${err.message}`, 'error');
    } finally {
      setLoading(saveBtn, false);
    }
  });

  // Push manually
  pushManualBtn.addEventListener('click', () => {
    setLoading(pushManualBtn, true);
    showStatus('⏳ Requesting manual push...', 'info');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('geeksforgeeks.org/problems/')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "MANUAL_PUSH" }, (response) => {
          setLoading(pushManualBtn, false);
          
          if (chrome.runtime.lastError) {
             showStatus('❌ Please refresh the GeeksforGeeks page.', 'error');
          } else if (response && response.status === 'success') {
             showStatus('✅ Sync successful!', 'success');
             loadUI(); // Refresh stats
          } else if (response && response.status === 'queued') {
             showStatus(`⏳ Queued: ${response.message || 'Offline/Rate Limited'}`, 'info');
             loadUI();
          } else {
             const errMsg = response?.message || 'Push failed.';
             if (errMsg.includes('403') || errMsg.includes('permission')) {
                 showStatus('❌ Token does not have required repo permissions', 'error');
             } else {
                 showStatus(`❌ GitHub Error: ${errMsg}`, 'error');
             }
          }
        });
      } else {
        setLoading(pushManualBtn, false);
        showStatus('❌ Not on a GeeksforGeeks problem page.', 'error');
      }
    });
  });

  // Retry Queue
  retryQueueBtn.addEventListener('click', () => {
     setLoading(retryQueueBtn, true);
     showStatus('⏳ Processing queue...', 'info');
     
     chrome.runtime.sendMessage({ action: "PROCESS_QUEUE" }, (response) => {
        setLoading(retryQueueBtn, false);
        if (response && response.status === 'success') {
           showStatus('✅ Queue processed successfully!', 'success');
           loadUI();
        } else if (response && response.status === 'empty') {
           showStatus('✅ Queue is already empty.', 'success');
        } else {
           const errMsg = response?.message || 'Queue failed';
           if (errMsg.includes('403')) {
               showStatus('⚠️ GitHub rate limit reached or missing permissions. Retrying later...', 'error');
           } else {
               showStatus(`❌ Queue Error: ${errMsg}`, 'error');
           }
           loadUI();
        }
     });
  });

  // Utils
  function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-message show';
    if (type === 'success') statusMsg.classList.add('status-success');
    else if (type === 'error') statusMsg.classList.add('status-error');
    else if (type === 'info') statusMsg.classList.add('status-info');
    else if (type === 'warning') statusMsg.style.color = 'var(--warning-color)';
    
    // Don't auto-clear warnings about queue
    if (type !== 'warning') {
        setTimeout(() => {
          if (statusMsg.textContent === message) {
              statusMsg.classList.remove('show');
              setTimeout(() => {
                  if (!statusMsg.classList.contains('show')) {
                      statusMsg.textContent = '';
                      statusMsg.className = 'status-message';
                  }
              }, 300); // Wait for transition
          }
        }, 5000);
    }
  }

  function setLoading(btn, isLoading) {
     const loader = btn.querySelector('.loader') || btn; 
     if (btn.querySelector('.loader')) {
         btn.querySelector('.loader').style.display = isLoading ? 'inline-block' : 'none';
     }
     btn.disabled = isLoading;
  }
});
