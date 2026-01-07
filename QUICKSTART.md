# 🚀 Quick Start Guide - Consul AI

Welcome to Consul! This guide will help you set up and run the project in minutes.

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
- ✅ **Python 3.9+** - [Download here](https://www.python.org/)
- ✅ **Google Gemini API Key** - [Get it here](https://makersuite.google.com/app/apikey)

## 🎯 Setup (2 Methods)

### Method 1: Automatic Setup (Recommended)

Run the setup script:

```bash
./setup.sh
```

Then:
1. Edit `.env.local` and add your `GEMINI_API_KEY`
2. Run `npm run dev`
3. Open http://localhost:3000

### Method 2: Manual Setup

1. **Install Node.js dependencies**
   ```bash
   npm install
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your GEMINI_API_KEY
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to: http://localhost:3000

## 🎨 Project Structure

```
AIForLearning/
│
├── 📁 api/                    # Python FastAPI Backend
│   └── index.py               # All API endpoints
│
├── 📁 app/                    # Next.js Frontend
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home page
│   ├── globals.css            # Global styles
│   ├── study-buddy/           # Study Buddy feature
│   ├── polisher/              # Text polisher feature
│   ├── shark-tank/            # Investor feedback feature
│   ├── subject-vault/         # Knowledge storage feature
│   └── fact-check/            # Fact-checking feature
│
├── 📁 components/             # Reusable UI Components
│   ├── Sidebar.tsx
│   ├── LoadingSpinner.tsx
│   ├── LoadingSkeleton.tsx
│   └── MarkdownRenderer.tsx
│
├── 📄 vercel.json             # Vercel deployment config
├── 📄 requirements.txt        # Python dependencies
├── 📄 package.json            # Node.js dependencies
├── 📄 tailwind.config.ts      # Tailwind CSS config
└── 📄 .env.local              # Environment variables
```

## 🛠️ Available Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🌟 Features Overview

1. **📚 Study Buddy**
   - Summarize long texts and PDFs
   - Extract key points automatically
   - Perfect for students and researchers

2. **✨ Polisher**
   - Convert casual text to Business English
   - Improve clarity and professionalism
   - Ideal for emails and reports

3. **📈 Shark Tank**
   - Get investor-style feedback
   - Practice your pitch
   - Prepare for real investor meetings

4. **🗄️ Subject Vault**
   - Store knowledge in AI memory
   - Query with natural language
   - RAG-powered search

5. **✅ Fact Check**
   - Verify claims and statements
   - Google Search grounding
   - Combat misinformation

## 🚀 Deploying to Vercel

### Quick Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variable
vercel env add GEMINI_API_KEY

# Deploy to production
vercel --prod
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📚 Documentation

- **[README.md](README.md)** - Full project documentation
- **[API.md](API.md)** - API endpoint documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide

## ⚙️ Configuration

### Environment Variables

Create `.env.local` with:

```env
GEMINI_API_KEY=your_api_key_here
```

### Getting Your Gemini API Key

1. Visit https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key to `.env.local`

## 🎨 Customization

### Colors

Edit `tailwind.config.ts` to change the color scheme:

```typescript
colors: {
  primary: "#D63384",      // Main pink color
  background: "#FFF0F5",   // Lavender blush background
  // Add more colors...
}
```

### Fonts

Change the font in `app/layout.tsx`:

```typescript
import { Inter, Nunito } from "next/font/google";
const nunito = Nunito({ subsets: ["latin"] });
```

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill the process on port 3000
npx kill-port 3000
# Or use a different port
PORT=3001 npm run dev
```

### Python dependencies failing
```bash
# Upgrade pip
pip install --upgrade pip

# Install dependencies one by one
pip install fastapi google-generativeai python-multipart uvicorn
```

### API not responding
1. Check `.env.local` has valid `GEMINI_API_KEY`
2. Restart the dev server
3. Check browser console for errors

### Build errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Rebuild
npm run build
```

## 📞 Getting Help

- **Issues**: Open an issue on GitHub
- **Questions**: Check [API.md](API.md) for endpoint documentation
- **Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 Tips for Success

✨ **Best Practices:**
- Keep your API key secure (never commit to Git)
- Test all features before deploying
- Monitor Vercel logs for errors
- Use loading states for better UX
- Handle errors gracefully

🎯 **Performance:**
- AI responses take 3-10 seconds
- Always show loading indicators
- Consider caching frequent queries
- Monitor Gemini API quota

🔒 **Security:**
- Never expose API keys in frontend code
- Validate all user inputs
- Implement rate limiting for production
- Use HTTPS in production

## 🎉 You're Ready!

Run `npm run dev` and start exploring the features at http://localhost:3000

Happy coding! 🚀

---

**Made with ❤️ using:**
- Next.js 14
- FastAPI
- Google Gemini AI
- Tailwind CSS
- TypeScript
