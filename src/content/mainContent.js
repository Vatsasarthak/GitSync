// src/content/mainContent.js

let activeAdapter = null;
let isSyncing = false;

// Debug logging
async function log(message, ...args) {
  try {
    const { debugMode } = await chrome.storage.local.get(['debugMode']);
    if (debugMode) {
      console.log(`[GitSync Content] ${message}`, ...args);
    }
  } catch (err) {
    // ignore
  }
}

// Injects GitSync custom overlay stylesheets if they do not already exist
function injectStylesIfNeeded() {
  if (document.getElementById('gitsync-styles')) return;
  const style = document.createElement('style');
  style.id = 'gitsync-styles';
  style.innerHTML = `
    .gitsync-toast {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      padding: 12px 20px !important;
      background: rgba(10, 15, 28, 0.85) !important;
      backdrop-filter: blur(12px) !important;
      -webkit-backdrop-filter: blur(12px) !important;
      color: #ffffff !important;
      border-radius: 12px !important;
      z-index: 9999999 !important;
      font-weight: 600 !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      opacity: 0 !important;
      transform: translateY(20px) scale(0.95) !important;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      pointer-events: auto !important;
    }
    .gitsync-toast.success { border-color: rgba(16, 185, 129, 0.45) !important; }
    .gitsync-toast.info { border-color: rgba(59, 130, 246, 0.45) !important; }
    .gitsync-toast.error { border-color: rgba(244, 63, 94, 0.45) !important; }
    .gitsync-toast.show {
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
    }
    .gitsync-modal {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 340px !important;
      background-color: rgba(10, 15, 28, 0.85) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border-radius: 16px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 20px 35px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
      color: #f8fafc !important;
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      padding: 20px !important;
      z-index: 9999998 !important;
      opacity: 0 !important;
      transform: translateY(30px) scale(0.95) !important;
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      box-sizing: border-box !important;
    }
    .gitsync-modal.show {
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
    }
    .gitsync-modal-btn-confirm {
      flex: 1 !important;
      background: linear-gradient(135deg, #10b981, #059669) !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      padding: 10px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .gitsync-modal-btn-confirm:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4) !important;
    }
    .gitsync-modal-btn-confirm:active {
      transform: scale(0.96) translateY(1px) !important;
    }
    .gitsync-modal-btn-dismiss {
      background: rgba(255, 255, 255, 0.04) !important;
      color: #cbd5e1 !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 8px !important;
      padding: 10px 16px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
    }
    .gitsync-modal-btn-dismiss:hover {
      background: rgba(255, 255, 255, 0.08) !important;
      color: white !important;
      border-color: rgba(255, 255, 255, 0.15) !important;
      transform: translateY(-1px) !important;
    }
    .gitsync-modal-btn-dismiss:active {
      transform: scale(0.96) !important;
    }
    .gitsync-modal-close-btn {
      background: none !important;
      border: none !important;
      color: #94a3b8 !important;
      cursor: pointer !important;
      padding: 2px !important;
      font-size: 18px !important;
      line-height: 1 !important;
      transition: color 0.2s !important;
    }
    .gitsync-modal-close-btn:hover {
      color: #f43f5e !important;
    }
    @keyframes gfg-spinner {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Gorgeous notification system (toasts)
function showToast(message, type = 'success') {
  injectStylesIfNeeded();

  // Remove existing toast if any
  const oldToast = document.getElementById('gitsync-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'gitsync-toast';
  toast.className = `gitsync-toast ${type}`;
  
  const icon = document.createElement('span');
  icon.style.display = 'flex';
  icon.style.alignItems = 'center';
  
  if (type === 'success') {
    try {
      const img = document.createElement('img');
      img.src = chrome.runtime.getURL('/icons/fire48.png');
      img.style.width = '20px';
      img.style.height = '20px';
      img.style.display = 'block';
      icon.appendChild(img);
    } catch (e) {
      icon.innerHTML = '🔥';
    }
  } else {
    icon.innerHTML = type === 'info' ? '🚀' : '❌';
  }
  
  const text = document.createElement('span');
  text.innerText = message;
  
  toast.appendChild(icon);
  toast.appendChild(text);
  document.body.appendChild(toast);
  
  // Trigger animation reflow and show
  toast.offsetHeight;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// Show premium confirmation card upon detecting accepted submission
function showSyncConfirmationCard(problemData) {
  injectStylesIfNeeded();

  // Check if confirmation modal already exists
  if (document.getElementById('gfg-sync-confirm-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'gfg-sync-confirm-modal';
  modal.className = 'gitsync-modal';

  // Build internal DOM
  modal.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #10b981; box-shadow: 0 0 10px #10b981;"></div>
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #10b981;">Accepted Solution</span>
        </div>
        <button id="gfg-sync-close" class="gitsync-modal-close-btn">&times;</button>
      </div>
      
      <div>
        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #f1f5f9; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${problemData.title}</h4>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">Sync code to GitHub repository?</p>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(255,255,255,0.02);">
        <span style="font-size: 11px; font-weight: 600; color: #cbd5e1; background: rgba(59,130,246,0.15); color: #60a5fa; border-radius: 4px; padding: 2px 6px;">${problemData.platform}</span>
        <span style="font-size: 11px; font-weight: 600; color: #cbd5e1; background: rgba(245,158,11,0.15); color: #fbbf24; border-radius: 4px; padding: 2px 6px;">${problemData.difficulty || 'DSA'}</span>
        <span style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-left: auto;">${problemData.language}</span>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button id="gfg-sync-confirm-btn" class="gitsync-modal-btn-confirm">
          <span>Sync Solution</span>
        </button>
        <button id="gfg-sync-dismiss-btn" class="gitsync-modal-btn-dismiss">
          Later
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fade In
  modal.offsetHeight;
  modal.classList.add('show');

  // Event handlers
  const closeBtn = document.getElementById('gfg-sync-close');
  const dismissBtn = document.getElementById('gfg-sync-dismiss-btn');
  const confirmBtn = document.getElementById('gfg-sync-confirm-btn');

  const removeModal = () => {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 500);
  };

  closeBtn.addEventListener('click', removeModal);
  dismissBtn.addEventListener('click', removeModal);

  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.7';
    confirmBtn.innerHTML = `
      <div style="width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: gfg-spinner 0.6s linear infinite;"></div>
      <span>Syncing...</span>
    `;

    try {
      await performSync(problemData);
    } finally {
      removeModal();
    }
  });
}

// Perform background message push and updates
async function performSync(problemData) {
  if (isSyncing) return;
  isSyncing = true;

  showToast("Syncing your solution to GitHub...", "info");

  // Clear pending submission from storage
  try {
    chrome.storage.local.remove(['pendingSubmission']);
  } catch (e) {}

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: 'push_submission',
        data: problemData
      },
      (response) => {
        isSyncing = false;
        try {
          if (chrome.runtime.lastError) {
            console.error("Sync Error:", chrome.runtime.lastError);
            showToast("Failed: Extension context invalid, please refresh.", "error");
          } else if (response && response.status === 'success') {
            showToast("Successfully synced to GitHub! 🥳", "success");
          } else {
            showToast(response?.message || "Sync failed", "error");
          }
        } catch (e) {
          showToast("Failed to connect to Extension, please reload page.", "error");
        }
        resolve(response);
      }
    );
  });
}

// Handles manual push messages from popup.js
async function handleManualPush(sendResponse) {
  if (!activeAdapter) {
    sendResponse({ status: 'error', message: 'No active coding platform detected on this page.' });
    return;
  }

  try {
    const data = activeAdapter.extractProblemData();
    data.isManual = true; // explicitly flag manual push to bypass autoSync settings checks if any
    
    if (activeAdapter.cachedData) {
      data.description = activeAdapter.cachedData.description || data.description;
      data.difficulty = activeAdapter.cachedData.difficulty && activeAdapter.cachedData.difficulty !== 'Unknown' ? activeAdapter.cachedData.difficulty : data.difficulty;
      data.title = activeAdapter.cachedData.title || data.title;
      data.tags = (activeAdapter.cachedData.tags && activeAdapter.cachedData.tags.length > 0) ? activeAdapter.cachedData.tags : data.tags;
    }

    if (!data.title || !data.code || data.code.startsWith("// Code could not be")) {
      sendResponse({ status: 'error', message: 'Failed to extract code or problem title from this page.' });
      return;
    }

    const response = await performSync(data);
    sendResponse(response);
  } catch (err) {
    console.error("Manual push failed:", err);
    sendResponse({ status: 'error', message: err.message });
  }
}

// Register manual push listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'MANUAL_PUSH') {
    handleManualPush(sendResponse);
    return true; // Keep channel open
  }
});

// Initialization
function init() {
  log("Initializing GitSync Engine...");

  const adapters = [
    new window.GFGAdapter(),
    new window.LeetCodeAdapter(),
    new window.CodeChefAdapter(),
    new window.CodeforcesAdapter(),
    new window.HackerRankAdapter()
  ];

  for (const adapter of adapters) {
    if (adapter.detectPlatform()) {
      activeAdapter = adapter;
      log(`Active platform detected: ${adapter.platformName}`);
      break;
    }
  }

  if (activeAdapter) {
    // Check if there is a pending submission in local storage
    try {
      chrome.storage.local.get(['pendingSubmission'], (result) => {
        const pending = result?.pendingSubmission;
        if (pending && pending.platform === activeAdapter.platformName) {
          const age = Date.now() - pending.timestamp;
          if (age < 60000) { // 60 seconds
            log("Found recent pending submission in storage. Restoring submissionExpected state.");
            activeAdapter.submissionExpected = true;
            activeAdapter.submissionExpectedUrl = pending.url;
            activeAdapter.submissionExpectedSlug = pending.slug;
          } else {
            // Clean up expired pending submission
            try {
              chrome.storage.local.remove(['pendingSubmission']);
            } catch (e) {}
          }
        }
      });
    } catch (e) {
      log("Error reading pending submission:", e);
    }

    // Early incremental cache capture
    const captureTimes = [2000, 5000, 10000];
    captureTimes.forEach(ms => {
      setTimeout(() => {
        try {
          const freshData = activeAdapter.extractProblemData();
          if (freshData.description && freshData.description.length > 50 && freshData.difficulty !== 'Unknown') {
            activeAdapter.cachedData = freshData;
            log(`✅ Early problem data cached at ${ms}ms:`, freshData.title);
          }
        } catch(e) {
          // ignore
        }
      }, ms);
    });

    // Start listening for accepted submissions
    activeAdapter.detectAcceptedSubmission(async (problemData) => {
      log("Accepted submission detected! Syncing automatically.");
      
      const freshData = activeAdapter.extractProblemData();
      if (activeAdapter.cachedData) {
        freshData.description = activeAdapter.cachedData.description || freshData.description;
        freshData.difficulty = activeAdapter.cachedData.difficulty && activeAdapter.cachedData.difficulty !== 'Unknown' ? activeAdapter.cachedData.difficulty : freshData.difficulty;
        freshData.title = activeAdapter.cachedData.title || freshData.title;
        freshData.tags = (activeAdapter.cachedData.tags && activeAdapter.cachedData.tags.length > 0) ? activeAdapter.cachedData.tags : freshData.tags;
      }

      try {
        await performSync(freshData);
      } catch (err) {
        log("Auto-sync execution failed:", err);
      }
    });

    // Reset auto-sync lock when user triggers a new submission (click or key shortcut)
    const resetSubmissionLock = () => {
      log("User triggered submission. Setting submissionExpected to true.");
      activeAdapter.submissionExpected = true;
      activeAdapter.submissionExpectedUrl = window.location.href;
      
      try {
        const problemData = activeAdapter.extractProblemData();
        activeAdapter.submissionExpectedSlug = problemData.slug;
        chrome.storage.local.set({
          pendingSubmission: {
            platform: activeAdapter.platformName,
            slug: problemData.slug,
            url: window.location.href,
            timestamp: Date.now()
          }
        });
      } catch (e) {
        log("Error setting pending submission:", e);
      }

      // Mark existing success elements as already seen to prevent premature sync triggers
      if (activeAdapter && typeof activeAdapter.markExistingSuccess === 'function') {
        try {
          activeAdapter.markExistingSuccess();
        } catch (e) {
          log("Error marking existing success elements:", e);
        }
      }

      // Start fallback timer to clear expectation in case submission fails silently or is cancelled
      if (activeAdapter.submissionTimeoutId) {
        clearTimeout(activeAdapter.submissionTimeoutId);
      }
      activeAdapter.submissionTimeoutId = setTimeout(() => {
        if (activeAdapter.submissionExpected) {
          log("Submission timeout reached. Resetting submissionExpected to false.");
          activeAdapter.submissionExpected = false;
          try {
            chrome.storage.local.remove(['pendingSubmission']);
          } catch (e) {}
        }
      }, 30000); // 30 seconds

      if (activeAdapter.hasAutoSynced) {
        log("New submit action detected! Resetting submission lock to allow re-sync.");
        activeAdapter.hasAutoSynced = false;
      }
    };

    document.addEventListener('click', (e) => {
      if (activeAdapter && typeof activeAdapter.isSubmitClick === 'function') {
        if (activeAdapter.isSubmitClick(e)) {
          resetSubmissionLock();
        }
      } else {
        const target = e.target;
        if (!target) return;

        const text = (target.innerText || target.value || '').toLowerCase().trim();
        const id = (target.id || '').toLowerCase();
        const className = (typeof target.className === 'string') ? target.className.toLowerCase() : '';

        if (
          text === 'submit' || 
          text.includes('submit code') ||
          id.includes('submit') || 
          className.includes('submit') ||
          target.closest('[data-cy="submit-code-btn"]') ||
          target.closest('[data-e2e-locator="console-submit-button"]')
        ) {
          resetSubmissionLock();
        }
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (activeAdapter && typeof activeAdapter.isSubmitKeydown === 'function') {
        if (activeAdapter.isSubmitKeydown(e)) {
          resetSubmissionLock();
        }
      } else {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          resetSubmissionLock();
        }
      }
    }, true);
  } else {
    log("No matching coding platform detected on this page.");
  }
}

// Run the initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
