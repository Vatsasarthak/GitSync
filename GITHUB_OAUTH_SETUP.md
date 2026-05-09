# GFG Sync - GitHub OAuth Setup Guide

To use the new "Login with GitHub" feature, you need to set up a GitHub OAuth Application and a backend server.

## 1. Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. **Application Name**: `GFG Sync`
4. **Homepage URL**: `https://github.com/Vatsasarthak/GFGSync` (or your repo URL)
5. **Authorization callback URL**: 
   `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
   *To find your Extension ID: Go to `chrome://extensions`, enable "Developer mode", and look for GFG Sync.*
6. Click **Register application**.
7. Copy the **Client ID**.
8. Click **Generate a new client secret** and copy it immediately.

## 2. Setup Backend Server
1. Navigate to the `server` directory.
2. Create a `.env` file from the `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and paste your `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the server:
   ```bash
   npm start
   ```
   *The server will run on `http://localhost:3000`.*

## 3. Update Extension Code
1. Open `background.js`.
2. Replace `'YOUR_GITHUB_CLIENT_ID'` with your actual Client ID at the top of the file.
3. If you deploy your backend to production, update `BACKEND_URL` in `background.js` as well.

## 4. Load/Reload Extension
1. Go to `chrome://extensions`.
2. Click **Reload** on GFG Sync.
3. Click the extension icon and click **Login with GitHub**.

---

## Deployment (Production)
For a real production environment:
1. Deploy the `server` folder to a platform like **Heroku**, **Render**, or **Railway**.
2. Update the `Authorization callback URL` in your GitHub OAuth App settings to match your production Extension ID.
3. Update the `BACKEND_URL` in `background.js` to your hosted server URL.
4. Update `manifest.json` host permissions to include your production backend domain.
