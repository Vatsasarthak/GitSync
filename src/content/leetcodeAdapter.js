// src/content/leetcodeAdapter.js

class LeetCodeAdapter extends window.PlatformAdapter {
  constructor() {
    super('LeetCode');
    this.hasAutoSynced = false;
    this.isSyncing = false;
  }

  detectPlatform() {
    return window.location.hostname.includes('leetcode.com');
  }

  detectAcceptedSubmission(callback) {
    const observer = new MutationObserver(() => {
      // Clear expectation if the problem slug has changed
      try {
        const currentSlug = this.extractProblemData().slug;
        if (this.submissionExpected && currentSlug && this.submissionExpectedSlug && currentSlug !== this.submissionExpectedSlug) {
          this.submissionExpected = false;
        }
      } catch (e) {}

      if (this.hasAutoSynced || this.isSyncing) return;
      if (!this.submissionExpected) return;

      // Clean up data-gitsync-seen from elements that no longer contain success text
      document.querySelectorAll('[data-gitsync-seen]').forEach(el => {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        if (!text.includes('accepted')) {
          el.removeAttribute('data-gitsync-seen');
        }
      });

      // Check for success indicators
      const successElement = 
        document.querySelector('[data-e2e-locator="submission-result"]:not([data-gitsync-seen])') ||
        document.querySelector('.text-green-s:not([data-gitsync-seen])') ||
        document.querySelector('.text-sd-green-500:not([data-gitsync-seen])') ||
        Array.from(document.querySelectorAll('span, div')).find(el => 
          el.innerText === 'Accepted' && !el.hasAttribute('data-gitsync-seen')
        );

      if (successElement) {
        const text = successElement.innerText.trim();
        if (text.includes('Accepted') || text === 'Accepted') {
          this.hasAutoSynced = true;
          this.isSyncing = true;
          this.submissionExpected = false; // Reset expectation

          setTimeout(() => {
            try {
              const data = this.extractProblemData();
              callback(data);
            } catch(e) {
              console.error("LeetCode Sync error: ", e);
            } finally {
              this.isSyncing = false;
            }
          }, 3000);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  markExistingSuccess() {
    const selectors = ['[data-e2e-locator="submission-result"]', '.text-green-s', '.text-sd-green-500'];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.setAttribute('data-gitsync-seen', 'true'));
    });
    Array.from(document.querySelectorAll('span, div')).forEach(el => {
      if (el.innerText === 'Accepted') {
        el.setAttribute('data-gitsync-seen', 'true');
      }
    });
  }

  isSubmitClick(e) {
    const target = e.target;
    if (!target) return false;
    
    // Explicitly ignore run code button
    if (target.closest('[data-cy="run-code-btn"]')) {
      return false;
    }
    
    // Check for LeetCode specific submit buttons
    if (target.closest('[data-cy="submit-code-btn"]') || target.closest('[data-e2e-locator="console-submit-button"]')) {
      return true;
    }
    
    const text = (target.innerText || target.value || '').trim().toLowerCase();
    if (text === 'submit') {
      return true;
    }
    
    const btn = target.closest('button');
    if (btn) {
      const btnText = (btn.innerText || btn.value || '').trim().toLowerCase();
      if (btnText === 'submit') {
        return true;
      }
    }
    
    return false;
  }

  isSubmitKeydown(e) {
    // LeetCode uses Ctrl + Enter or Cmd + Enter for submit
    return (e.ctrlKey || e.metaKey) && e.key === 'Enter';
  }

  extractCode() {
    // Monaco editor (LeetCode's primary)
    const lines = document.querySelectorAll('.monaco-editor .view-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }
    
    // Fallback: search for textarea inside editor container
    const ta = document.querySelector('.monaco-editor textarea');
    if (ta && ta.value) {
      return ta.value;
    }

    return "// Code could not be extracted automatically. Please check LeetCode layout changes.";
  }

  extractProblemData() {
    const data = super.extractProblemData();
    data.code = this.extractCode();

    // 1. Slug
    const urlParts = window.location.pathname.split('/');
    const problemsIndex = urlParts.indexOf('problems');
    if (problemsIndex !== -1 && urlParts[problemsIndex + 1]) {
      data.slug = urlParts[problemsIndex + 1];
    } else {
      data.slug = urlParts.filter(Boolean)[1] || 'leetcode-problem';
    }

    // 2. Title
    const docTitle = document.title;
    if (docTitle && docTitle.toLowerCase().includes('leetcode')) {
      // e.g. "Counting Bits - LeetCode" or "Counting Bits - LeetCode Description"
      data.title = docTitle.split('-')[0].trim();
    } else {
      const titleEl = 
        document.querySelector('div[class*="text-title-large"]') ||
        document.querySelector('.css-v3d350');
      if (titleEl) {
        data.title = titleEl.innerText.replace(/^\d+\.\s*/, '').trim(); // Remove leading number e.g. "1. Two Sum"
      } else {
        data.title = data.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    // 3. Difficulty
    const diffEl = 
      document.querySelector('div[class*="text-difficulty-"]') ||
      document.querySelector('span[class*="text-difficulty-"]') ||
      document.querySelector('.css-10o4wqw') ||
      Array.from(document.querySelectorAll('div, span')).find(el => 
        (el.innerText === 'Easy' || el.innerText === 'Medium' || el.innerText === 'Hard') && el.innerText.length < 10
      );
    if (diffEl) {
      data.difficulty = diffEl.innerText.trim();
    } else {
      data.difficulty = 'Unknown';
    }

    // 4. Description
    const descEl = 
      document.querySelector('[data-track-load="description_content"]') ||
      document.querySelector('.content__u3e1') ||
      document.querySelector('.question-content__JfgR');
    if (descEl) {
      const clone = descEl.cloneNode(true);
      clone.querySelectorAll('script, style, iframe, button').forEach(el => el.remove());
      data.description = clone.innerHTML.trim();
    } else {
      data.description = "Problem description could not be extracted automatically.";
    }

    // 5. Language
    const langBtn = 
      document.querySelector('button[id*="headlessui-listbox-button"]') ||
      document.querySelector('.ant-select-selection-selected-value') ||
      Array.from(document.querySelectorAll('button')).find(btn => 
        btn.innerText.match(/^(C\+\+|Java|Python|Python3|JavaScript|TypeScript|C|Go|C#|C-Sharp)/i)
      );
    data.language = langBtn ? langBtn.innerText.trim() : 'Unknown';

    // 6. Tags
    const tags = document.querySelectorAll('a[href*="/tag/"]');
    data.tags = Array.from(tags).map(t => t.innerText.trim()).filter(Boolean);

    return data;
  }
}

window.LeetCodeAdapter = LeetCodeAdapter;
