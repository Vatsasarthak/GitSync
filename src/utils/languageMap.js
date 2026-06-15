// src/utils/languageMap.js

const LANGUAGE_EXT_MAP = {
  'java': 'java',
  'cpp': 'cpp',
  'c++': 'cpp',
  'python': 'py',
  'python3': 'py',
  'py': 'py',
  'javascript': 'js',
  'js': 'js',
  'typescript': 'ts',
  'ts': 'ts',
  'c': 'c',
  'go': 'go',
  'golang': 'go',
  'csharp': 'cs',
  'c#': 'cs'
};

function getFileExtension(language) {
  if (!language) return 'txt';
  const lang = language.toLowerCase().trim();
  
  // Direct match
  if (LANGUAGE_EXT_MAP[lang]) {
    return LANGUAGE_EXT_MAP[lang];
  }
  
  // Partial matches
  if (lang.includes('c++') || lang.includes('cpp') || lang.includes('g++') || lang.includes('clang++')) return 'cpp';
  if (lang.includes('java')) return 'java';
  if (lang.includes('python') || lang.includes('py')) return 'py';
  if (lang.includes('javascript') || lang.includes('js')) return 'js';
  if (lang.includes('typescript') || lang.includes('ts')) return 'ts';
  if (lang.includes('c#') || lang.includes('csharp')) return 'cs';
  if (lang.includes('golang') || lang.includes('go')) return 'go';
  if (lang.includes('clang') || lang === 'c') return 'c';
  
  return 'txt';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getFileExtension };
} else {
  self.getFileExtension = getFileExtension;
}
