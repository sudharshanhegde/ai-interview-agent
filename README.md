# AI Interviewer Project - User Guide

## 🚀 Quick Start Guide

### Prerequisites

- Node.js installed on your computer
- A valid Google Gemini API key

### Project Structure

```
ai-interviewer/
├── server.js          # Backend server (Express.js + Gemini AI)
├── index.html         # Frontend interface
├── script.js          # Frontend JavaScript
├── package.json       # Project dependencies
├── .env              # API key configuration
└── README.md         # This file
```

---

## 📋 How to Start the Project

### Step 1: Open Terminal

1. Open **PowerShell** or **Command Prompt**
2. Navigate to your project folder:
   ```powershell
   cd c:\interviewAgent\ai-interviewer
   ```

### Step 2: Start the Backend Server

Run this command to start the server:

```powershell
node server.js
```

**You should see:**

```
[dotenv@17.2.1] injecting env (1) from ai-interviewer\.env
Server is running on http://localhost:3000
```

**✅ Success!** Your backend is now running.

### Step 3: Open the Application

1. Open your web browser
2. Go to: `http://localhost:3000`
3. You'll see the AI Interviewer interface

---

## 🎯 How to Use the AI Interviewer

### Starting an Interview

1. **Paste Your Resume**: In the setup area, paste your resume or job description
2. **Click "Start Interview"**: The AI will generate 5 relevant questions
3. **Begin Answering**: The chat interface will appear with your first question

### During the Interview

1. **Read the Question**: AI asks interview questions based on your background
2. **Type Your Answer**: Use the input field at the bottom
3. **Click "Send"**: Submit your answer
4. **Get Feedback**: Receive instant scoring and feedback:
   - 🌟 Your Score: X/10
   - 💬 Feedback: Detailed analysis
   - 💡 Ideal Answer: Example of a strong response
5. **Continue**: Answer all 5 questions

### Completing the Interview

After the final question, you'll receive:

- 🎉 Congratulations message
- 🌟 Final Overall Score
- 📋 Overall Assessment
- Thank you message

---

## 🔧 Daily Usage Instructions

### Every Time You Want to Use the Project:

1. **Open Terminal/PowerShell**
2. **Navigate to project folder**:
   ```powershell
   cd c:\interviewAgent\ai-interviewer
   ```
3. **Start the server**:
   ```powershell
   node server.js
   ```
4. **Open browser** and go to `http://localhost:3000`
5. **Use the application** as described above
6. **When finished**, press `Ctrl+C` in terminal to stop the server

---

## 📊 What Output to Expect

### During Interview:

- **Progress tracking**: "Question X of 5"
- **Real-time scoring**: Score from 1-10 for each answer
- **Detailed feedback**: AI analysis of your response
- **Learning opportunities**: Ideal answer examples

### Final Results:

- **Average score**: Overall performance rating
- **Comprehensive feedback**: AI assessment of your interview skills
- **Areas for improvement**: Constructive suggestions

---

## 🛠️ Troubleshooting

### Server Won't Start

**Problem**: Error messages when running `node server.js`
**Solution**:

```powershell
# Install dependencies again
npm install
# Then try starting
node server.js
```

### API Key Issues

**Problem**: "API key not valid" errors
**Solution**: Check your `.env` file contains valid Gemini API key

### Port Already in Use

**Problem**: "Port 3000 already in use"
**Solution**:

```powershell
# Kill existing processes
taskkill /f /im node.exe
# Then restart
node server.js
```

### Browser Can't Connect

**Problem**: Browser shows "Can't reach this page"
**Solution**: Make sure server is running and go to exactly `http://localhost:3000`

---

## 🎮 Example Interview Session

1. **Paste resume**: "Software Developer with 3 years experience in React..."
2. **Start interview**: AI generates questions like:
   - "Tell me about your experience with React"
   - "Describe a challenging project you worked on"
   - "How do you handle debugging complex issues?"
3. **Answer questions**: Type thoughtful responses
4. **Get scored**: Receive 7/10, 8/10, etc. with feedback
5. **Complete interview**: Get final score like 7.6/10 with overall assessment

---

## 💡 Tips for Best Results

### Writing Good Answers:

- Be specific with examples
- Show problem-solving skills
- Demonstrate relevant experience
- Use professional language

### Technical Tips:

- Keep terminal open while using the app
- Use latest version of Chrome/Firefox
- Don't refresh the page during interview
- One interview session per browser tab

---

## 🔄 Quick Command Reference

```powershell
# Navigate to project
cd c:\interviewAgent\ai-interviewer

# Start server
node server.js

# Stop server (in terminal)
Ctrl+C

# Kill all node processes (if needed)
taskkill /f /im node.exe

# Reinstall dependencies (if issues)
npm install
```

---

## 🎯 Project Features Summary

- ✅ AI-powered interview questions based on your resume
- ✅ Real-time answer evaluation and scoring (1-10)
- ✅ Detailed feedback for each response
- ✅ Ideal answer examples for learning
- ✅ Progress tracking throughout interview
- ✅ Final comprehensive assessment
- ✅ Professional interview simulation
- ✅ Session management for multiple users

---

**Enjoy your AI-powered interview practice! 🚀**
