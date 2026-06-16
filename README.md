# 🚀 GitSync

> Automatically sync your coding solutions from **GeeksforGeeks, LeetCode, CodeChef, Codeforces, HackerRank** directly to GitHub—**no copy-paste, no manual work**. Just code, solve, and sync! ⚡

[![GitHub Stars](https://img.shields.io/github/stars/Vatsasarthak/GitSync?style=flat-square&color=yellow)](https://github.com/Vatsasarthak/GitSync)
[![GitHub Forks](https://img.shields.io/github/forks/Vatsasarthak/GitSync?style=flat-square)](https://github.com/Vatsasarthak/GitSync)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![GitHub Issues](https://img.shields.io/github/issues/Vatsasarthak/GitSync?style=flat-square)](https://github.com/Vatsasarthak/GitSync/issues)

---

## 🤔 The Problem

You're solving coding problems on **multiple platforms**—GeeksforGeeks, LeetCode, CodeChef, Codeforces, HackerRank. But your GitHub remains empty. Your portfolio doesn't reflect your effort. **Manual copy-paste?** Exhausting!

## ✨ The Solution: GitSync

GitSync **automatically** detects your accepted submissions, extracts the code, and commits it to GitHub with proper organization. Your GitHub portfolio stays **active and impressive** while you focus on **solving problems**.

---

## 🎯 Why GitSync?

| Feature | Before | After |
|---------|--------|-------|
| **Time to update GitHub** | 5-10 mins per solution | ~2 seconds (automatic) |
| **Portfolio visibility** | Empty/outdated | Fresh daily commits |
| **Multiple platforms** | Manual management | One-click sync |
| **Organization** | Scattered folders | Platform-organized structure |

---

## ✨ Core Features

- ✅ **Automatic Detection** - Detects accepted submissions in real-time
- ✅ **Multi-Platform Support** - GeeksforGeeks, LeetCode, CodeChef, Codeforces, HackerRank
- ✅ **Smart Organization** - Auto-creates folder structure by platform & difficulty
- ✅ **Duplicate Prevention** - Avoids pushing duplicate solutions
- ✅ **Offline Queue** - Works even when offline, syncs when back online
- ✅ **One-Click Setup** - GitHub OAuth integration, no complicated setup
- ✅ **Retry Mechanism** - Auto-retries failed syncs
- ✅ **Manual Sync** - Push solutions anytime with one click
- ✅ **Metadata Rich** - Problem description, difficulty, tags in commits

---

## 🔥 Supported Platforms

| Platform | Status | Auto-Detect | Manual Sync |
|----------|--------|-------------|------------|
| **GeeksforGeeks** | ✅ Active | ✅ Yes | ✅ Yes |
| **LeetCode** | ✅ Active | ✅ Yes | ✅ Yes |
| **CodeChef** | ✅ Active | ✅ Yes | ✅ Yes |
| **Codeforces** | ✅ Active | ✅ Yes | ✅ Yes |
| **HackerRank** | ✅ Active | ✅ Yes | ✅ Yes |

---

## 📂 Repository Structure

GitSync creates a clean, organized folder structure:

```
DSA/
├── LeetCode/
│   ├── Easy/
│   │   └── TwoSum.js
│   ├── Medium/
│   │   └── AddTwoNumbers.js
│   └── Hard/
│       └── MedianOfTwoSortedArrays.js
├── GeeksforGeeks/
│   ├── Arrays/
│   │   └── LargestElement.js
│   └── Strings/
│       └── Reverse.js
├── CodeChef/
├── Codeforces/
└── HackerRank/
```

---

## ⚡ How It Works

```
1. Install Extension
        ↓
2. Authenticate with GitHub (OAuth)
        ↓
3. Solve Problems (on any platform)
        ↓
4. Submit & Get Accepted
        ↓
5. GitSync Detects → Extracts → Checks → Pushes
        ↓
6. Your GitHub Profile Updates Automatically ✨
```

---

## 🛠️ Tech Stack

```
Frontend:
  • Chrome Extension (Manifest V3)
  • React/Vue.js for UI
  • Local Storage for cache

Backend:
  • Node.js + Express.js
  • GitHub REST API v3
  • OAuth 2.0 for authentication

Database:
  • SQLite (local sync queue)
  • Session storage for credentials
```

---

## 🚀 Quick Start

### 1. **Clone the Repository**
```bash
git clone https://github.com/Vatsasarthak/GitSync.git
cd GitSync
```

### 2. **Install Dependencies**
```bash
# Server setup
cd server
npm install

# Extension setup (if applicable)
cd ../extension
npm install
```

### 3. **Configure GitHub OAuth**
- Go to GitHub Settings → Developer settings → OAuth Apps
- Create a new OAuth App
- Set Authorization callback URL to: `http://localhost:3000/auth/callback`
- Copy `Client ID` and `Client Secret`

### 4. **Environment Variables**
```bash
# Create .env file
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=your_random_secret
```

### 5. **Start the Server**
```bash
npm start
# Server running on http://localhost:3000
```

### 6. **Install Extension**
- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension` folder

---

## 📸 Screenshots

### Dashboard
![Dashboard](assets/dashboard.png)

### Sync Success
![Success](assets/sync-success.png)

### Repository Structure
![Repository](assets/repository.png)

---

## 🗺️ Roadmap

- [ ] **Analytics Dashboard** - Track your coding progress
- [ ] **Streak Counter** - Daily coding streaks & statistics
- [ ] **Contest Tracking** - Track contest ratings & participation
- [ ] **Revision Planner** - Smart revision suggestions
- [ ] **VS Code Extension** - Sync from VS Code directly
- [ ] **Mobile App** - iOS & Android support
- [ ] **AI-powered Tags** - Auto-categorize problems
- [ ] **Collaborative Sync** - Team repositories support

---

## 🔒 Privacy & Security

- ✅ Your GitHub token is stored **locally** in your browser
- ✅ We never access your passwords
- ✅ OAuth 2.0 for secure authentication
- ✅ Zero tracking of your solutions
- ✅ Open-source for community audit

---

## 📊 Community Stats

- ⭐ **Stars**: 9+ and growing!
- 🍴 **Forks**: Welcome contributions
- 👥 **Contributors**: You can be next!
- 📌 **Active Development**: Regular updates

---

## 🤝 Contributing

We ❤️ contributions! Here's how to help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Areas We Need Help With:
- 🐛 **Bug fixes** - Report issues you find
- ✨ **New platforms** - Add support for more coding sites
- 📖 **Documentation** - Improve guides & tutorials
- 🎨 **UI/UX** - Enhance the extension interface
- 🧪 **Testing** - Write tests for features

---

## 📋 Guidelines

- Follow existing code style
- Write meaningful commit messages
- Test before submitting PR
- Update documentation if needed
- Be respectful & constructive

---

## ⭐ Show Your Support

If GitSync helps you build a better portfolio, consider:

1. **⭐ Star** this repository
2. **🔗 Share** with your coding friends
3. **💬 Feedback** in discussions/issues
4. **🐛 Report bugs** you discover
5. **💡 Suggest features** you'd love

---

## 🛠️ Troubleshooting

### Extension not detecting submissions?
- Ensure you're on a supported platform
- Check if OAuth token is valid
- Restart the browser
- Check browser console for errors

### GitHub sync failing?
- Verify GitHub OAuth credentials
- Check internet connection
- Ensure repository exists
- Check GitHub API rate limits

### Duplicate submissions?
- GitSync auto-detects duplicates
- Manual sync won't create duplicates
- Check repository for existing files

---

## 📧 Support & Contact

- 📝 **Issues**: [GitHub Issues](https://github.com/Vatsasarthak/GitSync/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Vatsasarthak/GitSync/discussions)
- 🐦 **Twitter**: Share your experience with #GitSync
- 📧 **Email**: sarthakvatsa@example.com

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Thanks to the **coding community** for inspiration
- Built with ❤️ for **students** and **developers**
- Special thanks to all **contributors** (present & future!)

---

## 📈 Project Growth

Help us grow! Share GitSync with:
- 👨‍💻 Coding groups on Discord
- 🎓 College coding clubs
- 💼 Developer communities
- 🐦 Twitter/LinkedIn
- 📱 Reddit communities (r/learnprogramming, etc.)

---

<div align="center">

### Built with ❤️ by [Sarthak Vatsa](https://github.com/Vatsasarthak)

**Made for students and developers who believe coding should be celebrated** 🎉

[⬆ Back to top](#-gitsync)

</div>
