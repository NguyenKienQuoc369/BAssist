# Consul - AI Learning Assistant

A high-performance web application built with Next.js and FastAPI, deployed on Vercel. Consul provides AI-powered tools for learning, productivity, and business development.

## 🌟 Features

1. **Study Buddy** - Summarize text and PDFs for efficient learning
2. **Polisher** - Transform text into professional Business English
3. **Shark Tank** - Get tough investor feedback on business ideas
4. **Subject Vault** - RAG system for storing and retrieving knowledge
5. **Fact Check** - Verify information with Google Search-powered AI

## 🎨 Design

- **Primary Color**: #D63384 (Deep Pink)
- **Background**: #FFF0F5 (Lavender Blush)
- **Font**: Inter (Google Fonts)
- **Style**: Modern, clean, romantic yet professional

## 🏗️ Architecture

- **Frontend**: Next.js 14+ (TypeScript, Tailwind CSS)
- **Backend**: Python FastAPI (Vercel Serverless Functions)
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Google Gemini API Key

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AIForLearning
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## 🚀 Deployment to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   
   In your Vercel dashboard, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key

## 📁 Project Structure

```
AIForLearning/
├── api/
│   └── index.py          # FastAPI backend with all endpoints
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   ├── globals.css       # Global styles
│   ├── study-buddy/      # Study Buddy feature
│   ├── polisher/         # Polisher feature
│   ├── shark-tank/       # Shark Tank feature
│   ├── subject-vault/    # Subject Vault feature
│   └── fact-check/       # Fact Check feature
├── components/
│   ├── Sidebar.tsx       # Navigation sidebar
│   ├── LoadingSpinner.tsx
│   ├── LoadingSkeleton.tsx
│   └── MarkdownRenderer.tsx
├── vercel.json           # Vercel configuration
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies
└── tailwind.config.ts    # Tailwind configuration
```

## 🔧 API Endpoints

All endpoints are prefixed with `/api/`:

- `POST /api/study-buddy` - Summarize text
- `POST /api/polisher` - Polish text for business English
- `POST /api/shark-tank` - Get investor feedback
- `POST /api/subject-vault` - Store or query knowledge
- `POST /api/fact-check` - Verify information

## 🎯 Usage Examples

### Study Buddy
```javascript
const response = await fetch('/api/study-buddy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Your long text here...' })
});
```

### Polisher
```javascript
const response = await fetch('/api/polisher', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Text to polish...' })
});
```

## 🛠️ Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **FastAPI** - Python backend
- **Google Gemini API** - AI capabilities
- **Vercel** - Hosting and deployment
- **Lucide React** - Icons
- **React Markdown** - Markdown rendering

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

For issues and questions, please open an issue on GitHub.

---

Made with ❤️ using Next.js, FastAPI, and Google Gemini AI
