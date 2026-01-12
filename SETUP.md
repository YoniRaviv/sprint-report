# Quick Setup Guide for Team Members

## First Time Setup

1. **Extract/Clone the project**
   ```bash
   cd sprint-report
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file** (optional)
   ```bash
   cp .env.example .env.local  # If .env.example exists
   # Or create .env.local manually
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to the URL shown in terminal (usually http://localhost:3000)

## What You Need

- **Node.js 18+** - Check with `node --version`
- **npm** - Comes with Node.js
- **Jira Account** - Your company Jira credentials
- **(Optional) AI Access** - Gemini API key or Ollama for AI summaries

## Common Issues

**Port already in use?**
- Change `APP_ORIGIN` in `.env.local` or free port 3000

**Can't connect to Jira?**
- Check your Jira domain URL
- Ensure you have API access permissions
- Try reconnecting via "Reconnect Jira" button

**Dependencies won't install?**
- Try `npm install --legacy-peer-deps`
- Or use `npm ci` if package-lock.json exists

## Getting Help

Check the main README.md for detailed documentation.

