require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// 🔥 VERIFY ENVIRONMENT VARIABLES
const REQUIRED_ENV_VARS = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

console.log('--- Environment Configuration ---');
console.log(`PORT: ${process.env.PORT || 3000}`);
console.log(`GITHUB_CLIENT_ID: ${process.env.GITHUB_CLIENT_ID ? `✅ Loaded (${process.env.GITHUB_CLIENT_ID.substring(0, 4)}...)` : '❌ MISSING'}`);
console.log(`GITHUB_CLIENT_SECRET: ${process.env.GITHUB_CLIENT_SECRET ? `✅ Loaded (${process.env.GITHUB_CLIENT_SECRET.substring(0, 4)}...)` : '❌ MISSING'}`);
console.log('---------------------------------');

if (missingVars.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please ensure you have a .env file in the /server directory.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
  res.send('GFG Sync Auth Server is running!');
});

// OAuth Exchange: Code -> Access Token
app.post('/api/auth/github', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    const data = response.data;

    if (data.error) {
      console.error('GitHub OAuth Error:', data.error);
      console.error('Error Description:', data.error_description);
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('OAuth Exchange Error:', error.message);
    res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

// Proxy to fetch User Info (Security: keeps token usage server-side if needed, but here we just return user data)
app.get('/api/user', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: token,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('User Info Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
