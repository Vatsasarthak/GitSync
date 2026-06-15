// src/utils/slugify.js

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/GeeksforGeeks/i, '')
    .replace(/LeetCode/i, '')
    .replace(/CodeChef/i, '')
    .replace(/Codeforces/i, '')
    .replace(/HackerRank/i, '')
    .replace(/Practice/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { slugify, cleanTitle };
} else {
  self.slugify = slugify;
  self.cleanTitle = cleanTitle;
}
