// src/adapters/platformAdapter.js

class PlatformAdapter {
  constructor(platformName) {
    this.platformName = platformName;
    this.submissionExpected = false;
    this.submissionExpectedUrl = '';
    this.submissionExpectedSlug = '';
  }

  // Parses the problem slug from the URL in a lightweight manner
  getSlugFromUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const urlParts = pathname.split('/').filter(Boolean);
      
      if (this.platformName === 'Codeforces') {
        let contestId = 'Unknown';
        let problemIndex = 'A';
        if (urlParts.includes('contest')) {
          const idx = urlParts.indexOf('contest');
          contestId = urlParts[idx + 1] || 'Unknown';
          problemIndex = urlParts[urlParts.length - 1] || 'A';
        } else if (urlParts.includes('problemset')) {
          const idx = urlParts.indexOf('problem');
          contestId = urlParts[idx + 1] || 'Unknown';
          problemIndex = urlParts[idx + 2] || 'A';
        }
        return `${contestId}-${problemIndex}`.toLowerCase();
      }
      
      if (this.platformName === 'HackerRank') {
        const idx = urlParts.indexOf('challenges');
        if (idx !== -1 && urlParts[idx + 1]) {
          return urlParts[idx + 1].toLowerCase();
        }
        return (urlParts[urlParts.length - 1] || '').toLowerCase();
      }
      
      // GFG, LeetCode, CodeChef
      const idx = urlParts.indexOf('problems');
      if (idx !== -1 && urlParts[idx + 1]) {
        return urlParts[idx + 1].toLowerCase();
      }
      return (urlParts[urlParts.length - 1] || '').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  // Detects if the current webpage corresponds to this platform
  detectPlatform() {
    return false;
  }

  // Watches for when a submission is successfully solved/accepted
  // Calls callback(problemData) upon success detection
  detectAcceptedSubmission(callback) {
    throw new Error('detectAcceptedSubmission not implemented');
  }

  // Marks existing success elements on the page as already seen to avoid false triggers
  markExistingSuccess() {
    // Default implementation, overridden by subclasses
  }

  // Returns true if click event represents a submit action
  isSubmitClick(e) {
    const target = e.target;
    if (!target) return false;

    // Helper to safely execute closest query if the method exists
    const getClosest = (el, selector) => {
      return (el && typeof el.closest === 'function') ? el.closest(selector) : null;
    };

    // Helper to check if an element is a Run/Compile/Test element to reject it early
    const isRunOrCompile = (el) => {
      if (!el) return false;
      const text = (el.innerText || el.textContent || el.value || '').toLowerCase();
      if (text.includes('run') || text.includes('compile') || text.includes('test') || text.includes('custom')) {
        return true;
      }
      const id = (el.id || '').toLowerCase();
      if (id.includes('run') || id.includes('compile') || id.includes('test')) {
        return true;
      }
      const className = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (className.includes('run') || className.includes('compile') || className.includes('test')) {
        return true;
      }
      return false;
    };

    if (
      isRunOrCompile(target) || 
      isRunOrCompile(getClosest(target, 'button')) || 
      isRunOrCompile(getClosest(target, '[class*="button"]')) || 
      isRunOrCompile(getClosest(target, '[class*="btn"]'))
    ) {
      return false;
    }

    // Check if the element matches standard Submit patterns
    const isSubmitMatch = (el) => {
      if (!el) return false;
      const text = (el.innerText || el.textContent || el.value || '').toLowerCase().trim();
      const id = (el.id || '').toLowerCase();
      const className = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      
      return (
        text === 'submit' || 
        text.includes('submit code') ||
        id.includes('submit') || 
        className.includes('submit') ||
        getClosest(el, '[data-cy="submit-code-btn"]') ||
        getClosest(el, '[data-e2e-locator="console-submit-button"]')
      );
    };

    if (
      isSubmitMatch(target) || 
      isSubmitMatch(getClosest(target, 'button')) || 
      isSubmitMatch(getClosest(target, '[class*="button"]')) || 
      isSubmitMatch(getClosest(target, '[class*="btn"]'))
    ) {
      return true;
    }

    return false;
  }

  // Returns true if keydown event represents a submit action
  isSubmitKeydown(e) {
    // Default to false. Individual adapters override this if they support submit shortcuts (e.g. LeetCode)
    return false;
  }

  // Extracts information about the problem (title, difficulty, etc.)
  extractProblemData() {
    return {
      platform: this.platformName,
      title: '',
      slug: '',
      description: '',
      difficulty: '',
      tags: [],
      code: '',
      language: '',
      url: window.location.href,
      submittedAt: new Date().toISOString().split('T')[0]
    };
  }

  // Robustly extracts the source code from the editor
  extractCode() {
    return '';
  }
}

// Bind to window so other adapters can extend it in sequential content script load context
window.PlatformAdapter = PlatformAdapter;
