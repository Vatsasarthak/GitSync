// src/content/codeforcesAdapter.js

class CodeforcesAdapter extends window.PlatformAdapter {
  constructor() {
    super('Codeforces');
    this.hasAutoSynced = false;
    this.isSyncing = false;
  }

  detectPlatform() {
    return window.location.hostname.includes('codeforces.com');
  }

  detectAcceptedSubmission(callback) {
    // Watch status table verdicts
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

      const acceptedSpan = 
        document.querySelector('.verdict-accepted:not([data-gitsync-seen])') ||
        document.querySelector('span.verdict-accepted:not([data-gitsync-seen])') ||
        Array.from(document.querySelectorAll('span')).find(el => 
          el.innerText.trim().toLowerCase() === 'accepted' && !el.hasAttribute('data-gitsync-seen')
        );

      if (acceptedSpan) {
        this.hasAutoSynced = true;
        this.isSyncing = true;
        this.submissionExpected = false; // Reset expectation

        setTimeout(() => {
          try {
            const data = this.extractProblemData();
            callback(data);
          } catch(e) {
            console.error("Codeforces Sync error: ", e);
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
    const selectors = ['.verdict-accepted', 'span.verdict-accepted'];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.setAttribute('data-gitsync-seen', 'true'));
    });
    Array.from(document.querySelectorAll('span')).forEach(el => {
      if (el.innerText.trim().toLowerCase() === 'accepted') {
        el.setAttribute('data-gitsync-seen', 'true');
      }
    });
  }

  extractCode() {
    // Primary: if we are viewing a submission page, grab code from pre block
    const preBlock = 
      document.getElementById('program-source-text') ||
      document.querySelector('pre.prettyprint') ||
      document.querySelector('.source-code');
    if (preBlock) {
      return preBlock.innerText.trim();
    }

    // Fallback: If they are on a submit page, extract from their textarea
    const ta = document.getElementById('sourceCodeTextarea') || document.querySelector('textarea#editor');
    if (ta && ta.value) {
      return ta.value.trim();
    }

    // fallback to Monaco/CodeMirror if present
    const lines = document.querySelectorAll('.monaco-editor .view-line, .CodeMirror-line, .cm-line');
    if (lines.length > 0) {
      return Array.from(lines).map(l => l.textContent).join('\n').trim();
    }

    return "// Code could not be extracted automatically. Please view submission details first.";
  }

  extractProblemData() {
    const data = super.extractProblemData();
    data.code = this.extractCode();

    // Parse URL for Contest ID and Problem Index
    const urlParts = window.location.pathname.split('/').filter(Boolean);
    // e.g. codeforces.com/contest/1800/problem/A or codeforces.com/problemset/problem/1800/A
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
    } else {
      // Look for a table row context
      const cell = document.querySelector('td[data-problemId]');
      if (cell) {
        contestId = cell.innerText.trim().match(/^\d+/)?.[0] || 'Unknown';
        problemIndex = cell.innerText.trim().replace(/^\d+/, '') || 'A';
      }
    }

    data.contestId = contestId;
    data.problemIndex = problemIndex.toUpperCase();
    data.slug = `${contestId}-${problemIndex}`.toLowerCase();

    // 2. Title
    const titleEl = 
      document.querySelector('.problem-statement .title') ||
      document.querySelector('div.title') ||
      document.querySelector('.problem-name');
    if (titleEl) {
      // Remove leading indexing (e.g. "A. Problem Name" -> "Problem Name")
      data.title = titleEl.innerText.replace(/^[A-Z0-9\.\s\-]+/i, '').trim();
    } else {
      data.title = `Problem ${problemIndex}`;
    }

    // 3. Difficulty/Rating
    const ratingEl = Array.from(document.querySelectorAll('span.tag-box')).find(el => el.innerText.trim().startsWith('*'));
    if (ratingEl) {
      data.rating = ratingEl.innerText.replace('*', '').trim();
      data.difficulty = data.rating;
    } else {
      data.difficulty = 'Unknown';
      data.rating = 'Unknown';
    }

    // 4. Description
    const descEl = document.querySelector('.problem-statement');
    if (descEl) {
      const clone = descEl.cloneNode(true);
      clone.querySelectorAll('.header, script, style').forEach(el => el.remove());
      data.description = clone.innerHTML.trim();
    } else {
      data.description = "Problem description could not be extracted automatically.";
    }

    // 5. Language
    const langCell = document.querySelector('td[class*="lang"]');
    if (langCell) {
      data.language = langCell.innerText.trim();
    } else {
      const selectEl = document.querySelector('select[name="programTypeId"]');
      if (selectEl) {
        data.language = selectEl.options[selectEl.selectedIndex].text.trim();
      } else {
        data.language = 'C++';
      }
    }

    return data;
  }
}

window.CodeforcesAdapter = CodeforcesAdapter;
