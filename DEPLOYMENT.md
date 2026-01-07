# Deployment Guide for Consul

## Deploy to Vercel

### Method 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? Yes
   - Which scope? (Select your account)
   - Link to existing project? No
   - What's your project's name? consul (or your preferred name)
   - In which directory is your code located? ./
   - Want to override settings? No

4. **Set Environment Variables**
   ```bash
   vercel env add GEMINI_API_KEY
   ```
   
   Paste your Gemini API key when prompted.

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Method 2: Using Vercel Dashboard

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure**
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `pip install -r requirements.txt && next build`
   - Output Directory: .next

4. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add `GEMINI_API_KEY` with your API key
   - Save

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

## Environment Variables Required

- `GEMINI_API_KEY`: Your Google Gemini API key (required)

Get your API key from: https://makersuite.google.com/app/apikey

## Vercel Configuration

The `vercel.json` file is already configured with:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ],
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.9"
    }
  }
}
```

## Testing Your Deployment

After deployment, test each endpoint:

1. Visit your deployed URL
2. Navigate through each feature:
   - Study Buddy
   - Polisher
   - Shark Tank
   - Subject Vault
   - Fact Check

## Troubleshooting

### API endpoints not working

1. Check that `GEMINI_API_KEY` is set in Vercel environment variables
2. Verify the API key is valid
3. Check Vercel Function logs for errors

### Python dependencies issues

1. Ensure `requirements.txt` is in the root directory
2. Check that all dependencies are compatible with Python 3.9
3. Review build logs in Vercel dashboard

### Next.js build errors

1. Clear build cache: `vercel --force`
2. Check Node.js version compatibility
3. Verify all TypeScript files compile locally

## Custom Domain

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 48 hours)

## Monitoring

- View logs: `vercel logs <deployment-url>`
- Monitor in Vercel Dashboard: Analytics → Overview

## Updating Your Deployment

Push changes to your Git repository, and Vercel will automatically redeploy:

```bash
git add .
git commit -m "Update features"
git push
```

Or use CLI:

```bash
vercel --prod
```

## Performance Tips

1. Enable Vercel Analytics in Project Settings
2. Use Edge Functions for faster response times (if needed)
3. Monitor API usage and rate limits
4. Consider adding caching for frequently accessed data

---

Need help? Check [Vercel Documentation](https://vercel.com/docs) or open an issue.
