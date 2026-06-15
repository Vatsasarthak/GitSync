// src/github/fileUploader.js

async function uploadToGitHub(pat, repo, path, content, message) {
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  let sha = null;

  // Check existing file
  const getRes = await fetch(apiUrl, {
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
  }

  // Base64 encoding
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const encodedContent = btoa(binary);

  const body = {
    message: message,
    content: encodedContent
  };

  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${pat}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putRes.ok) {
    let err = {};
    try {
      err = await putRes.json();
    } catch(e) {}
    
    if (putRes.status === 404) {
      throw new Error(`404 Not Found: Check if repository '${repo}' exists.`);
    } else if (putRes.status === 403 || putRes.status === 401) {
      throw new Error(`${putRes.status} Unauthorized: Check your token permissions.`);
    }
    throw new Error(`${putRes.status} ${err.message || 'Unknown error'}`);
  }

  return true;
}

function generateReadmeContent(data) {
  const dateStr = data.submittedAt || new Date().toISOString().split('T')[0];
  const problemLink = data.url || '#';
  const difficulty = data.difficulty || 'Unknown';
  
  return `# ${data.title}

Platform: ${data.platform}  
Difficulty: ${difficulty}  
Language: ${data.language}  
Problem Link: ${problemLink}  
Submitted At: ${dateStr}

---

## Description

${data.description && data.description.trim() ? data.description : 'Problem description could not be extracted automatically.'}
`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { uploadToGitHub, generateReadmeContent };
} else {
  self.uploadToGitHub = uploadToGitHub;
  self.generateReadmeContent = generateReadmeContent;
}
