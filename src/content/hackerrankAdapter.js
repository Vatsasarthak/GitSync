// src/content/hackerrankAdapter.js

class HackerRankAdapter extends window.PlatformAdapter {
  constructor() {
    super('HackerRank');
    this.hasAutoSynced = false;
    this.isSyncing = false;
  }

  detectPlatform() {
    return window.location.hostname.includes('hackerrank.com');
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
        if (
          !text.includes('congratulations') &&
          !text.includes('passed')
        ) {
          el.removeAttribute('data-gitsync-seen');
        }
      });

      const successEl = 
        document.querySelector('.congrats-heading:not([data-gitsync-seen])') ||
        document.querySelector('.congrats-wrapper:not([data-gitsync-seen])') ||
        document.querySelector('.congrats-status-text:not([data-gitsync-seen])') ||
        Array.from(document.querySelectorAll('h1, h2, h3, span, div')).find(el => {
          const text = el.innerText.trim().toLowerCase();
          return text.includes('congratulations') && text.includes('passed') && !el.hasAttribute('data-gitsync-seen');
        });

      if (successEl) {
        this.hasAutoSynced = true;
        this.isSyncing = true;
        this.submissionExpected = false; // Reset expectation

        setTimeout(() => {
          try {
            const data = this.extractProblemData();
            callback(data);
          } catch(e) {
            console.error("HackerRank Sync error: ", e);
          } finally {
            this.isSyncing = false;
          }
        }, 3000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  markExistingSuccess() {
    const selectors = ['.congrats-heading', '.congrats-wrapper', '.congrats-status-text'];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.setAttribute('data-gitsync-seen', 'true'));
    });
    Array.from(document.querySelectorAll('h1, h2, h3, span, div')).forEach(el => {
      const text = el.innerText.trim().toLowerCase();
      if (text.includes('congratulations') && text.includes('passed')) {
        el.setAttribute('data-gitsync-seen', 'true');
      }
    });
  }

  extractCode() {
    // Monaco editor check
    let lines = document.querySelectorAll('.monaco-editor .view-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }

    // CodeMirror check
    lines = document.querySelectorAll('.CodeMirror-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }

    // fallback to textareas
    const ta = document.querySelector('textarea.custominput') || document.querySelector('.editor-container textarea');
    if (ta && ta.value) {
      return ta.value.trim();
    }

    return "// Code could not be extracted automatically. Please check HackerRank layout changes.";
  }

  extractProblemData() {
    const data = super.extractProblemData();
    data.code = this.extractCode();

    // 1. Slug
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    // e.g. hackerrank.com/challenges/two-sum/problem
    const challengesIndex = urlParts.indexOf('challenges');
    if (challengesIndex !== -1 && urlParts[challengesIndex + 1]) {
      data.slug = urlParts[challengesIndex + 1];
    } else {
      data.slug = urlParts[urlParts.length - 1] || 'hackerrank-challenge';
    }

    // 2. Title
    const titleEl = 
      document.querySelector('h1.ui-icon-label') ||
      document.querySelector('.challenge-title') ||
      document.querySelector('.main-header h1') ||
      document.querySelector('h1');
    if (titleEl) {
      data.title = titleEl.innerText.trim();
    } else {
      data.title = data.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // 3. Category
    const breadcrumbs = document.querySelectorAll('.breadcrumb-item-text, .page-header-breadcrumb a, .breadcrumb-item');
    if (breadcrumbs.length > 1) {
      // Breadcrumbs are usually: Practice > Algorithms > Warmup > Solve Challenge
      data.category = breadcrumbs[1].innerText.trim();
    } else {
      data.category = 'Algorithms';
    }
    data.difficulty = 'Practice';

    // 4. Description
    const descEl = 
      document.querySelector('.challenge-body-html') ||
      document.querySelector('.challenge-description') ||
      document.querySelector('.challenge_problem_statement');
    if (descEl) {
      const clone = descEl.cloneNode(true);
      clone.querySelectorAll('script, style, button').forEach(el => el.remove());
      data.description = clone.innerHTML.trim();
    } else {
      data.description = "Problem description could not be extracted automatically.";
    }

    // 5. Language
    const langSelect = 
      document.querySelector('.lang-selector') ||
      document.querySelector('[data-analytics="LanguageSelector"]') ||
      document.querySelector('.select-language');
    if (langSelect) {
      data.language = langSelect.innerText.trim();
    } else {
      const activeTab = document.querySelector('.editor-tab.active');
      if (activeTab) {
        data.language = activeTab.innerText.trim();
      } else {
        data.language = 'Python';
      }
    }

    return data;
  }
}

window.HackerRankAdapter = HackerRankAdapter;
