# Render Deployment Guide for AI Interviewer

## 🚀 Step-by-Step Deployment to Render

### Prerequisites

- GitHub account
- Render account (free tier available)
- Your project files ready

---

## 📁 Step 1: Prepare Your Project Files

Your project should have these files:

```
ai-interviewer/
├── server.js          # Backend server
├── index.html         # Frontend interface
├── script.js          # Frontend JavaScript
├── package.json       # Dependencies
├── .gitignore         # Git ignore file
├── .env               # Environment file (NOT uploaded)
└── README.md          # Documentation
```

**✅ Files Created:**

- ✅ `.gitignore` - Protects sensitive files
- ✅ `package.json` - Updated for deployment

---

## 🔐 Step 2: Environment Variables

**IMPORTANT:** Your `.env` file will NOT be uploaded (it's in .gitignore)

You'll need to set environment variables on Render:

- `GEMINI_API_KEY` = Your Google Gemini API key

---

## 📂 Step 3: Upload to GitHub

### Option A: Using GitHub Desktop (Easier)

1. Download and install GitHub Desktop
2. Create new repository: "ai-interviewer"
3. Add your project folder
4. Commit and publish to GitHub

### Option B: Using Command Line

```bash
cd c:\interviewAgent\ai-interviewer
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-interviewer.git
git push -u origin main
```

---

## 🌐 Step 4: Deploy on Render

### 4.1 Create New Web Service

1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository

### 4.2 Configure Deployment Settings

```
Name: ai-interviewer
Environment: Node
Region: Choose closest to you
Branch: main
Build Command: npm install
Start Command: npm start
```

### 4.3 Set Environment Variables

In Render dashboard:

1. Go to "Environment" tab
2. Add environment variable:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** Your actual API key (without quotes)

### 4.4 Deploy

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. You'll get a URL like: `https://ai-interviewer-xyz.onrender.com`

---

## 🔧 Important Render Configuration

### Auto-Deploy

- ✅ Enabled by default
- Any push to GitHub main branch triggers new deployment

### Free Tier Limitations

- App "sleeps" after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free (enough for personal use)

### Custom Domain (Optional)

- Available on paid plans
- Can use your own domain name

---

## 🧪 Step 5: Test Your Deployment

1. **Visit your Render URL**
2. **Test the interface:**

   - Should see AI Interviewer interface
   - Paste a test resume
   - Start interview
   - Answer questions
   - Verify scoring works

3. **Check logs** in Render dashboard if issues occur

---

## 🐛 Troubleshooting

### Common Issues:

#### Build Fails

```
Error: Cannot find module...
Solution: Check package.json dependencies
```

#### Environment Variable Issues

```
Error: API key not valid
Solution: Double-check GEMINI_API_KEY in Render settings
```

#### App Won't Start

```
Error: Port binding
Solution: Ensure server.js uses process.env.PORT
```

### Check Your server.js:

```javascript
const PORT = process.env.PORT || 3000;
```

---

## 📱 Step 6: Share Your App

Once deployed successfully:

- ✅ Share the Render URL with others
- ✅ Add URL to your resume/portfolio
- ✅ Test with different resumes and backgrounds

---

## 🔄 Step 7: Updates and Maintenance

### To Update Your App:

1. Make changes locally
2. Test locally: `node server.js`
3. Commit to GitHub: `git add . && git commit -m "Update" && git push`
4. Render auto-deploys the changes

### Monitor Usage:

- Check Render dashboard for usage stats
- Monitor logs for errors
- Update dependencies occasionally

---

## 💡 Pro Tips

### Performance:

- Keep your app "warm" by pinging it occasionally
- Consider upgrading to paid plan for always-on service

### Security:

- Never commit .env files
- Use strong API keys
- Monitor API usage in Google Cloud Console

### Backup:

- Keep your code in GitHub
- Document your environment variables
- Export important configurations

---

## 🎯 Final Checklist

Before deploying:

- [ ] .gitignore file created
- [ ] .env file NOT in repository
- [ ] package.json has correct start script
- [ ] Code works locally
- [ ] GitHub repository created
- [ ] Gemini API key ready
- [ ] Render account created

After deploying:

- [ ] Environment variables set on Render
- [ ] App builds successfully
- [ ] App starts without errors
- [ ] Interview flow works end-to-end
- [ ] Scoring and feedback working

---

**🚀 Your AI Interviewer will be live and ready to help people practice interviews worldwide!**
