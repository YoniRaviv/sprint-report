# Sprint Report Generator

A personal Jira sprint report tool that connects to your Jira board, previews sprint statistics, and exports clean PDF reports with optional AI-powered analysis.

## Features

- 🔐 **Secure Jira Authentication** - OAuth-based Atlassian authentication
- 📊 **Sprint Analytics** - View task counts, time estimates, story points, and status distributions
- 🤖 **AI-Powered Summaries** - Optional AI analysis using Gemini (cloud) or Ollama (local)
- 📄 **PDF Export** - Generate professional PDF reports with sprint data and AI insights
- 🎨 **Modern UI** - Clean, responsive interface built with React and TypeScript

## Prerequisites

- Node.js 18+ and npm
- Jira account with API access
- (Optional) Gemini API key or Ollama installation for AI summaries

## Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
# App origin (used for cookies and redirects)
APP_ORIGIN=http://localhost:3000

# Atlassian OAuth
ATLASSIAN_CLIENT_ID=your-client-id
ATLASSIAN_CLIENT_SECRET=your-client-secret
ATLASSIAN_REDIRECT_URI=http://localhost:3000/api/auth/atlassian/callback
SESSION_SECRET=dev-session-secret

# AI (optional)
GEMINI_API_KEY=your-gemini-api-key-here
OLLAMA_URL=http://localhost:11434
```

## Running the Application

```bash
npm run dev
```

The application will be available at:
- **App**: http://localhost:3000

## Usage

1. **Connect to Jira**
   - Click "Connect Jira" button
   - Authorize the application with your Atlassian account
   - Select your Jira domain when prompted

2. **Select Board and Sprint**
   - Choose a Scrum board from the dropdown
   - Select a sprint (active sprints are auto-selected)

3. **Generate AI Summary** (Optional)
   - Click "Generate AI Summary" to get AI-powered insights
   - Requires Gemini API key or Ollama installation

4. **Export PDF**
   - Review the sprint preview
   - Click "Generate PDF" to download the report

## AI Summary Setup

### Option 1: Gemini (Cloud - Recommended)
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Add `GEMINI_API_KEY=your-key` to `.env.local`
3. Restart the server

### Option 2: Ollama (Local)
1. Install from [ollama.ai](https://ollama.ai)
2. Run `ollama pull llama3.2`
3. Start with `ollama serve`
4. The server will automatically detect Ollama

### Option 3: Rule-based (Fallback)
If no AI providers are available, the app uses rule-based analysis automatically.

## Project Structure

```
sprint-report/
├── app/                 # Next.js App Router (pages + API routes)
├── components/          # UI components (client-side)
├── lib/                 # Shared logic (auth, Jira, AI, utils, stores)
├── types/               # Shared TypeScript types
└── public/              # Static assets
```

## Available Scripts

- `npm run dev` - Start Next.js dev server (app + API)
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## Security Notes

- Authentication tokens are stored securely in `.auth-store.json` (gitignored)
- Never commit `.env.local` or `.auth-store.json` files
- The `.gitignore` file is configured to exclude sensitive data

## Troubleshooting

### Connection Issues
- Ensure your Jira domain is correct
- Check that you have API access permissions
- Verify the app is running on http://localhost:3000

### AI Summary Not Working
- Check that your API key is set correctly in `.env.local`
- For Ollama, ensure it's running and accessible
- Check server logs for error messages

### PDF Export Issues
- Ensure you have a sprint selected
- Check browser console for errors
- Verify PDF generation libraries are installed

## Technologies Used

- **Framework**: Next.js 15 (App Router), React 19, TypeScript, SCSS Modules
- **State Management**: Zustand, TanStack Query
- **PDF Generation**: @react-pdf/renderer
- **AI**: Google Gemini API, Ollama (local), rule-based fallback

## Future Enhancements

### Team Lead Dashboard
A dedicated view for team leaders to:
- View aggregated sprint summaries across all team members
- Compare individual performance metrics
- Identify team-wide patterns and blockers
- Generate consolidated team reports

### Interactive Data Visualization
Enhanced analytics with visual insights:
- Sprint velocity trends over time
- Story points vs time spent comparison charts
- Workflow efficiency metrics (cycle time, lead time)
- Issue type distribution graphs
- Team capacity and burndown charts
- Quality metrics (bug rates, QA returns over time)

## License

Open source

