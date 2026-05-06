# 🚀 GFG Sync

Automatically sync your **GeeksforGeeks submissions** directly to GitHub with a single click.  
A Chrome Extension built to simplify DSA tracking, repository management, and coding consistency.

---

# ✨ Features

✅ Detects successful GFG submissions automatically  
✅ Pushes solutions directly to GitHub  
✅ Organizes problems by Topic & Difficulty  
✅ Creates separate files for every question  
✅ Supports manual push for reliability  
✅ Lightweight and easy to use  
✅ Clean repository structure  

---

# 🎥 Demo

> Replace the video link below with your actual uploaded demo video.

## 📸 Extension Preview

![GFG Sync Demo](assets/Screenshot%202026-05-07%20015856.png)

---

## 🎬 Full Video Demo

https://github.com/user-attachments/assets/your-video-link.mp4

---

# 🖼️ Screenshots

## Extension Popup UI

![Popup UI](assets/Screenshot%202026-05-07%20015856.png)

---

## Auto Sync in Action

![Sync Demo](assets/Screenshot%202026-05-07%20024549.png)

---

## GitHub Repository Structure

![Repo Structure](assets/Screenshot%202026-05-07%20024627.png)

---

# ⚙️ Tech Stack

- Chrome Extension (Manifest V3)
- JavaScript
- GitHub REST API
- DOM Manipulation
- Monaco Editor Extraction

---

# 📂 Repository Structure

```bash
GFG/
 ├── Arrays/
 ├── Bit-Manipulation/
 ├── Dynamic-Programming/
 ├── Linked-List/
 └── ...
```

Each question gets pushed separately with:

- Problem Name
- Difficulty
- Clean Solution File
- Organized Folder Structure

---

# 🛠️ Installation Guide

## Prerequisites

1. A GitHub account  
2. Google Chrome / Chromium Browser  

---

## Step 1: Create a GitHub Repository

1. Go to:
   https://github.com/new

2. Create a new repository  
   Example:
   `gfg-solutions`

3. Add a README file

4. Click:
   ✅ Create Repository

---

## Step 2: Generate GitHub Personal Access Token

1. Open:
   https://github.com/settings/tokens

2. Click:
   `Generate new token (classic)`

3. Select scope:
   ✅ `repo`

4. Generate token and copy it.

---

## Step 3: Install Extension

1. Open Chrome and navigate to:

```text
chrome://extensions/
```

2. Enable:
   ✅ Developer Mode

3. Click:
   ✅ Load Unpacked

4. Select the folder containing:
   `manifest.json`

---

## Step 4: Configure Extension

1. Click the GFG Sync extension icon

2. Paste your GitHub Personal Access Token

3. Enter repository name:

```text
username/repository-name
```

Example:

```text
Vatsasarthak/gfg-solutions
```

4. Enable:
   ✅ Auto Sync

5. Click:
   ✅ Save Settings

---

# 🚀 Usage

1. Open any GeeksforGeeks problem

2. Solve the problem

3. Click:
   ✅ Submit

4. After successful submission:
   ✅ Solution gets pushed automatically to GitHub

---

# 📦 Example Generated Structure

```bash
GFG/
 ├── Arrays/
 │    ├── Easy/
 │    ├── Medium/
 │    └── Hard/
 │
 ├── Trees/
 ├── Graphs/
 └── DP/
```

---

# 🔥 Challenges Solved

- Dynamic GFG editor handling
- Accurate submission detection
- GitHub API integration
- Preventing duplicate commits
- Reliable code extraction

---

# 🧪 Current Status

🚧 Beta Version

Currently improving:

- Better UI/UX
- Cleaner repository structure
- Faster syncing
- Improved extraction reliability

---

# 📌 Future Improvements

- GitHub OAuth Login
- Better analytics
- Multi-language support
- Extension Store Release
- Smart README generation

---

# 🤝 Contributing

Contributions, suggestions, and feedback are welcome!

Feel free to fork the repository and submit a PR.

---

# 👨‍💻 Author

### Sarthak Vatsa

🔗 GitHub:
https://github.com/Vatsasarthak

---

# ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub!

---
