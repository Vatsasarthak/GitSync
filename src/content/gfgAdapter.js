// src/content/gfgAdapter.js

class GFGAdapter extends window.PlatformAdapter {
  constructor() {
    super('GeeksforGeeks');
    this.hasAutoSynced = false;
    this.isSyncing = false;
  }

  detectPlatform() {
    const host = window.location.hostname;
    return host.includes('geeksforgeeks.org');
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
          !text.includes("problem solved successfully") &&
          !text.includes("all test cases passed") &&
          !text.includes("correct answer")
        ) {
          el.removeAttribute('data-gitsync-seen');
        }
      });

      let successEl = null;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        const text = node.nodeValue.toLowerCase();
        if (
          text.includes("problem solved successfully") ||
          text.includes("all test cases passed") ||
          text.includes("correct answer")
        ) {
          if (node.parentElement && !node.parentElement.hasAttribute('data-gitsync-seen')) {
            successEl = node.parentElement;
            break;
          }
        }
      }

      if (successEl) {
        this.hasAutoSynced = true; // prevent double triggers on same page load
        this.isSyncing = true;
        this.submissionExpected = false; // Reset expectation
        
        setTimeout(() => {
          try {
            const data = this.extractProblemData();
            callback(data);
          } catch(e) {
            console.error("GFG Sync error: ", e);
          } finally {
            this.isSyncing = false;
          }
        }, 2500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  markExistingSuccess() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      const text = node.nodeValue.toLowerCase();
      if (
        text.includes("problem solved successfully") ||
        text.includes("all test cases passed") ||
        text.includes("correct answer")
      ) {
        if (node.parentElement) {
          node.parentElement.setAttribute('data-gitsync-seen', 'true');
        }
      }
    }
  }

  extractCode() {
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

    // Ace editor
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

    return "// Code could not be extracted automatically. Please check GFG layout changes.";
  }

  extractProblemData() {
    const data = super.extractProblemData();
    data.code = this.extractCode();

    // 1. Get Slug from URL
    const urlParts = window.location.pathname.split('/');
    const slugIndex = urlParts.indexOf('problems');
    if (slugIndex !== -1 && urlParts[slugIndex + 1]) {
      data.slug = urlParts[slugIndex + 1];
    } else {
      data.slug = window.location.pathname.split('/').filter(Boolean).pop();
    }

    // JSON Surgical State
    try {
      const nextData = document.getElementById('__NEXT_DATA__');
      if (nextData) {
        const json = JSON.parse(nextData.innerHTML);
        const pData = 
          json?.props?.pageProps?.problemData || 
          json?.props?.pageProps?.initialState?.problemData;
          
        if (pData) {
          data.title = pData.problem_name || '';
          data.difficulty = pData.difficulty || '';
          data.description = pData.problem_description || '';
          data.slug = pData.problem_slug || data.slug;
          
          const tags = pData.tags || [];
          data.tags = Array.isArray(tags) ? tags.map(t => typeof t === 'string' ? t : (t.name || '')) : [];
        }
      }
    } catch (e) {
      // ignore JSON failure
    }

    // DOM Fallback
    if (!data.title) {
      const titleElement =
        document.querySelector('[class*="problems_header_left_side_hash"]') ||
        document.querySelector('[class*="problems_title"]') ||
        document.querySelector('div[class*="problems_problem_title"] h3') ||
        document.querySelector('h3.problem-tab__name') ||
        document.querySelector('h1');
      if (titleElement) {
        data.title = titleElement.innerText.split('\n')[0].trim();
      } else {
        data.title = document.title.split(' | ')[0];
      }
    }
    data.title = data.title.replace(/GeeksforGeeks/i, '').replace(/Practice/i, '').replace(/\d+$/, '').trim();

    if (!data.difficulty) {
      const difficultyElement = 
        document.querySelector('[class*="problems_difficulty_value"]') ||
        document.querySelector('[class*="problems_difficulty"]') ||
        Array.from(document.querySelectorAll('div, span')).find(el => 
          el.innerText.match(/Difficulty:\s*(Easy|Medium|Hard|School|Basic)/i) && el.innerText.length < 50
        );
      if (difficultyElement) {
        data.difficulty = difficultyElement.innerText.replace(/Difficulty:\s*/i, '').trim();
      } else {
        const text = document.body.innerText;
        const match = text.match(/Difficulty:\s*(Easy|Medium|Hard|School|Basic)/i);
        data.difficulty = match ? match[1] : "Unknown";
      }
    }
    if (data.difficulty.includes('\n')) data.difficulty = data.difficulty.split('\n')[0].trim();

    if (!data.description) {
      const desc =
        document.querySelector('.problem-statement') ||
        document.querySelector('[class*="problems_problem_content"]') ||
        document.querySelector('[class*="problems_description"]');
      if (desc) {
        const statement = desc.querySelector('.problem-statement') || desc;
        const clone = statement.cloneNode(true);
        clone.querySelectorAll('script, style, iframe, button, .problems_header_content, .problems_footer_content').forEach(el => el.remove());
        data.description = clone.innerHTML.trim();
      } else {
        data.description = "Problem statement extraction failed. Please check GFG layout changes.";
      }
    }

    if (data.tags.length === 0) {
      const tags = document.querySelectorAll('a[href*="tag"]');
      data.tags = Array.from(tags).map(t => t.innerText.trim()).filter(t => t.length > 0);
    }

    // Language extraction
    const lang =
      document.querySelector('.selected-value') ||
      document.querySelector('.language-selector') ||
      document.querySelector('.header-left .language-selector');
    data.language = lang ? lang.innerText.trim() : "unknown";

    return data;
  }
}

window.GFGAdapter = GFGAdapter;
