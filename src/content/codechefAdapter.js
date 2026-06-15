// src/content/codechefAdapter.js

class CodeChefAdapter extends window.PlatformAdapter {
  constructor() {
    super('CodeChef');
    this.hasAutoSynced = false;
    this.isSyncing = false;
  }

  detectPlatform() {
    return window.location.hostname.includes('codechef.com');
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
          !text.includes('accepted') &&
          !text.includes('correct answer')
        ) {
          el.removeAttribute('data-gitsync-seen');
        }
      });

      // CodeChef accepted checks
      const successEl = 
        document.querySelector('.submission-status-correct:not([data-gitsync-seen])') ||
        document.querySelector('[class*="accepted"]:not([data-gitsync-seen])') ||
        document.querySelector('[class*="status-correct"]:not([data-gitsync-seen])') ||
        Array.from(document.querySelectorAll('span, div')).find(el => {
          const t = el.innerText.trim().toLowerCase();
          return (t === 'accepted' || t === 'correct answer' || t === 'status: accepted') && !el.hasAttribute('data-gitsync-seen');
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
            console.error("CodeChef Sync error: ", e);
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
    const selectors = ['.submission-status-correct', '[class*="accepted"]', '[class*="status-correct"]'];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.setAttribute('data-gitsync-seen', 'true'));
    });
    Array.from(document.querySelectorAll('span, div')).forEach(el => {
      const t = el.innerText.trim().toLowerCase();
      if (t === 'accepted' || t === 'correct answer' || t === 'status: accepted') {
        el.setAttribute('data-gitsync-seen', 'true');
      }
    });
  }

  extractCode() {
    // Check Monaco view lines
    let lines = document.querySelectorAll('.monaco-editor .view-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }

    // Check CodeMirror lines
    lines = document.querySelectorAll('.CodeMirror-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }

    lines = document.querySelectorAll('.cm-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }

    // Textarea check
    const ta = document.querySelector('textarea');
    if (ta && ta.value && ta.value.trim().length > 0) {
      return ta.value;
    }

    return "// Code could not be extracted automatically. Please check CodeChef layout changes.";
  }

  extractProblemData() {
    const data = super.extractProblemData();
    data.code = this.extractCode();

    // 1. URL parsing for slug
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    // e.g. codechef.com/problems/FLOW001 or codechef.com/START98C/problems/FLOW001
    const problemsIndex = urlParts.indexOf('problems');
    if (problemsIndex !== -1 && urlParts[problemsIndex + 1]) {
      data.slug = urlParts[problemsIndex + 1];
      data.contest = problemsIndex > 0 ? urlParts[problemsIndex - 1] : 'Practice';
    } else {
      data.slug = urlParts[urlParts.length - 1] || 'codechef-problem';
      data.contest = 'Practice';
    }
    data.problemCode = data.slug.toUpperCase();

    // 2. Title
    const titleEl = 
      document.querySelector('h1[class*="problem-"]') ||
      document.querySelector('.problem-title') ||
      document.querySelector('#problem-title') ||
      document.querySelector('.problem-background h1');
    if (titleEl) {
      data.title = titleEl.innerText.replace(data.slug, '').replace(/[\(\)\[\]\-]/g, '').trim();
    } else {
      data.title = data.slug;
    }

    // 3. Difficulty
    const diffEl = 
      document.querySelector('[class*="difficulty"]') || 
      document.querySelector('.problem-difficulty') || 
      Array.from(document.querySelectorAll('span, div')).find(el => el.innerText.includes('Difficulty') && el.innerText.length < 30);
    if (diffEl) {
      data.difficulty = diffEl.innerText.replace(/Difficulty:\s*/i, '').trim();
    } else {
      data.difficulty = 'Practice';
    }

    // 4. Description
    const descEl = 
      document.querySelector('.problem-statement') ||
      document.querySelector('.problem-description') ||
      document.getElementById('problem-statement');
    if (descEl) {
      const clone = descEl.cloneNode(true);
      clone.querySelectorAll('script, style, button').forEach(el => el.remove());
      data.description = clone.innerHTML.trim();
    } else {
      data.description = "Problem description could not be extracted automatically.";
    }

    // 5. Language
    const langEl = 
      document.querySelector('.selected-language') ||
      document.querySelector('[class*="language-select"]') ||
      Array.from(document.querySelectorAll('span, button')).find(el => 
        el.innerText.match(/^(C\+\+|Java|Python|JavaScript|Go|C#|TypeScript)/i) && el.innerText.length < 15
      );
    data.language = langEl ? langEl.innerText.trim() : 'C++';

    return data;
  }
}

window.CodeChefAdapter = CodeChefAdapter;
