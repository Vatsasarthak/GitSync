
// content.js

let isSyncing = false;
let hasAutoSynced = false;

// Debug logger
async function log(message, ...args) {
  try {
    if (!chrome.storage || !chrome.storage.local) return;
    const { debugMode } = await chrome.storage.local.get(['debugMode']);
    if (debugMode) {
      console.log(`[GFG Sync] ${message}`, ...args);
    }
  } catch (err) {
    // Context invalidated, ignore logging
  }
}

// ✅ ON-SCREEN NOTIFICATION
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.padding = '12px 20px';
  toast.style.background = type === 'success' ? '#10b981' : (type === 'info' ? '#3b82f6' : '#ef4444');
  toast.style.color = '#fff';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '999999';
  toast.style.fontWeight = 'bold';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  toast.style.fontFamily = 'sans-serif';
  toast.style.fontSize = '14px';
  toast.style.transition = 'opacity 0.5s';
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// ✅ ROBUST CODE EXTRACTION (NEVER RETURNS NULL)
function extractCode() {
  log("Extracting code...");

  // Monaco editor (primary)
  let lines = document.querySelectorAll('.monaco-editor .view-line');
  if (lines.length > 0) {
    const code = Array.from(lines).map(l => l.textContent).join('\n').trim();
    if (code) return code;
  }

  // CodeMirror editor (common on GFG)
  lines = document.querySelectorAll('.CodeMirror-line');
  if (lines.length > 0) {
    const code = Array.from(lines).map(l => l.textContent).join('\n').trim();
    if (code) return code;
  }

  // CodeMirror 6 editor
  lines = document.querySelectorAll('.cm-line');
  if (lines.length > 0) {
    const code = Array.from(lines).map(l => l.textContent).join('\n').trim();
    if (code) return code;
  }

  // Ace editor (sometimes used)
  lines = document.querySelectorAll('.ace_line');
  if (lines.length > 0) {
    const code = Array.from(lines).map(l => l.textContent).join('\n').trim();
    if (code) return code;
  }

  // Generic fallback
  lines = document.querySelectorAll('.view-line');
  if (lines.length > 0) {
    const code = Array.from(lines).map(l => l.textContent).join('\n').trim();
    if (code) return code;
  }

  // Textarea (very important for GFG)
  const ta = document.querySelector('textarea');
  if (ta && ta.value && ta.value.trim().length > 0) {
    return ta.value;
  }

  // Hidden textareas fallback
  const allTA = document.querySelectorAll('textarea');
  for (let t of allTA) {
    if (t.value && t.value.length > 20) {
      return t.value;
    }
  }

  // 🚨 LAST RESORT FALLBACK
  log("⚠️ Code extraction failed, returning default string.");
  return "// Code could not be extracted automatically. Please check GFG layout changes.";
}

// ✅ PROBLEM DATA EXTRACTION
function extractProblemData() {
  log("Extracting problem data...");

  const data = {
    title: '',
    slug: '',
    description: '',
    difficulty: '',
    tags: [],
    code: '',
    language: ''
  };

  try {
    // 1. Get Slug from URL
    const urlParts = window.location.pathname.split('/');
    const slugIndex = urlParts.indexOf('problems');
    if (slugIndex !== -1 && urlParts[slugIndex + 1]) {
      data.slug = urlParts[slugIndex + 1];
    }

    // 2. Title
    const titleElement =
      document.querySelector('.problems_header_content__title h3') ||
      document.querySelector('.problems_header_content__title') ||
      document.querySelector('h3.problem-tab__name') ||
      document.querySelector('h1') ||
      document.querySelector('.problem-tab__name');

    if (titleElement) {
      data.title = titleElement.innerText.split('\n')[0].trim();
    } else if (data.slug) {
      data.title = data.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    } else {
      data.title = "GFG Problem";
    }

    // 3. Difficulty
    const difficultyElement = 
      document.querySelector('.problems_header_content__difficulty') ||
      Array.from(document.querySelectorAll('div')).find(el => el.innerText.match(/^(Easy|Medium|Hard)$/i));
    
    if (difficultyElement) {
      data.difficulty = difficultyElement.innerText.trim();
    } else {
      const bodyText = document.body.innerText;
      if (bodyText.includes("Hard")) data.difficulty = "Hard";
      else if (bodyText.includes("Medium")) data.difficulty = "Medium";
      else if (bodyText.includes("Easy")) data.difficulty = "Easy";
      else data.difficulty = "Unknown";
    }

    // 4. Description
    const desc =
      document.querySelector('.problems_problem_content__Xm_eO') ||
      document.querySelector('.problem-statement') ||
      document.querySelector('.problems_problem_content');

    if (desc) {
      data.description = desc.innerHTML;
    }

    // 5. Tags
    const tags = document.querySelectorAll('a[href*="tag"]');
    data.tags = Array.from(tags).map(t => t.innerText.trim()).filter(t => t.length > 0);

    // 6. Code
    data.code = extractCode();

    // 7. Language
    const lang =
      document.querySelector('.selected-value') ||
      document.querySelector('.language-selector') ||
      document.querySelector('.header-left .language-selector');

    data.language = lang ? lang.innerText.trim() : "unknown";

  } catch (err) {
    console.error("[GFG Sync ERROR] Extraction failed:", err);
  }

  return data;
}

// ✅ MAIN SYNC FUNCTION
async function syncSubmission(callback = null) {
  if (isSyncing) return;
  isSyncing = true;

  log("Waiting for editor load...");
  await new Promise(resolve => setTimeout(resolve, 4000)); // 🔥 important

  try {
    const problemData = extractProblemData();

    // 🚨 Abort if crucial data is missing
    if (!problemData.title || !problemData.code || problemData.code.startsWith("// Code could not be")) {
      console.error("❌ Title or Code missing. Sync aborted to prevent pushing empty files.");
      showToast("❌ GFG Sync: Code extraction failed. Sync aborted.", "error");
      isSyncing = false;
      return;
    }

    showToast("🚀 GFG Sync: Syncing submission to GitHub...", "info");

    chrome.runtime.sendMessage(
      {
        action: 'push_submission',
        data: problemData
      },
      (response) => {
        try {
          isSyncing = false;
          if (chrome.runtime.lastError) {
            console.error("❌ Runtime error:", chrome.runtime.lastError);
            if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Extension context invalidated')) {
              showToast("❌ GFG Sync: Extension updated! Please REFRESH (F5) this page.", "error");
            } else {
              showToast("❌ GFG Sync: Sync failed (Extension Error)", "error");
            }
            if (callback) callback({ status: 'error', message: chrome.runtime.lastError.message });
          } else {
            log("✅ Response:", response);
            if (response && response.status === 'success') {
               showToast("🔥 GFG Sync: Successfully Synced!", "success");
            } else {
               showToast(`❌ GFG Sync: ${response?.message || 'Failed'}`, "error");
            }
            if (callback) callback(response);
          }
        } catch (cbError) {
          // Context invalidated
          showToast("❌ GFG Sync: Extension updated! Please REFRESH (F5) this page.", "error");
        }
      }
    );
  } catch (err) {
    if (err.message && (err.message.includes("Extension context invalidated") || err.message.includes("Cannot read properties of undefined"))) {
      console.warn("⚠️ GFG Sync: Extension updated. Please REFRESH the page.");
      showToast("❌ GFG Sync: Extension updated! Please REFRESH (F5) this page.", "error");
    } else {
      console.error("❌ Sync exception:", err);
      showToast("❌ GFG Sync: Unexpected error occurred", "error");
    }
    isSyncing = false;
  }
}


// Manual push
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'MANUAL_PUSH') {
    log("Manual push triggered");
    syncSubmission(sendResponse);
    return true;
  }
});

// ✅ SUBMISSION DETECTION (ROBUST)
function setupObserver() {
  log("Watching for submission...");

  const observer = new MutationObserver(() => {
    if (hasAutoSynced) return; // Prevent multiple auto-syncs per page load

    const text = document.body.innerText.toLowerCase();

    if (
      text.includes("problem solved successfully") ||
      text.includes("all test cases passed") ||
      text.includes("correct answer")
    ) {
      if (!isSyncing) {
        log("✅ Submission detected");
        hasAutoSynced = true; // Lock it so it only syncs once!

        setTimeout(() => {
          syncSubmission();
        }, 2500);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Start observer
setTimeout(setupObserver, 2500);

