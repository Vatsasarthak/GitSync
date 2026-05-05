# GFG Sync - Setup Instructions

Welcome to **GFG Sync**, a Chrome extension that automatically synchronizes your GeeksforGeeks submissions to a GitHub repository!

## Prerequisites

1.  A GitHub account.
2.  Google Chrome (or a Chromium-based browser).

## Step 1: Create a GitHub Repository

1.  Go to [GitHub](https://github.com/new) and log in.
2.  Create a new repository (e.g., `gfg-solutions`). It can be public or private.
3.  Check the box to **"Add a README file"** (Important for the initial structure).
4.  Click **Create repository**.

## Step 2: Generate a Personal Access Token (PAT)

1.  Go to your GitHub [Personal Access Tokens page](https://github.com/settings/tokens).
2.  Click **Generate new token (classic)**.
3.  Give it a note (e.g., "GFG Sync Extension").
4.  Set the expiration to your preference (e.g., "No expiration" or "90 days").
5.  Under **Select scopes**, check the box for **`repo`** (Full control of private repositories).
6.  Scroll down and click **Generate token**.
7.  **Copy the generated token immediately.** You won't be able to see it again.

## Step 3: Install the Extension Locally

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** using the toggle switch in the top right corner.
3.  Click the **Load unpacked** button in the top left.
4.  Select the folder where you extracted/saved the GFG Sync project files (the folder containing `manifest.json`).
5.  The extension should now appear in your list of extensions. Pin it to your toolbar for easy access.

## Step 4: Configure the Extension

1.  Click the **GFG Sync** icon in your Chrome toolbar.
2.  In the popup, paste your GitHub Personal Access Token.
3.  Enter your Repository Name in the format `username/repo` (e.g., `johndoe/gfg-solutions`).
4.  Ensure **Auto-Sync Submissions** is toggled ON.
5.  Click **Save Settings**.

## Usage

1.  Navigate to any problem on [GeeksforGeeks Practice](https://practice.geeksforgeeks.org/explore?page=1&sortBy=submissions).
2.  Write your solution and click **Submit**.
3.  Once the "Problem Solved Successfully" message appears, the extension will automatically extract your code, the problem description, and push it directly to your GitHub repository!
4.  It will categorize it automatically in folders like `GFG/Topic/Difficulty/Problem-Name.ext`.
5.  Your repository's `README.md` will also automatically update with your streak and solved counts!

## Troubleshooting

-   **Code not syncing:** GeeksforGeeks updates their layout frequently. If auto-sync fails, click the extension icon and try the **"Push Current Problem"** manual button after a successful submission.
-   **Bad Credentials error:** Ensure your Personal Access Token is correct and hasn't expired.
-   **Repository Not Found:** Ensure the repository format is exactly `username/reponame` and that your token has `repo` scope permissions.
