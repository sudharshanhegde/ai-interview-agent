#!/bin/bash
# Pre-deployment checklist script

echo "🚀 AI Interviewer - Pre-Deployment Checklist"
echo "=============================================="
echo

# Check if required files exist
echo "📁 Checking required files..."
files=("server.js" "index.html" "script.js" "package.json" ".gitignore")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - Found"
    else
        echo "❌ $file - Missing"
    fi
done
echo

# Check .env file (should exist locally but not be committed)
echo "🔐 Checking environment setup..."
if [ -f ".env" ]; then
    echo "✅ .env file exists locally"
    if grep -q "GEMINI_API_KEY" .env; then
        echo "✅ GEMINI_API_KEY found in .env"
    else
        echo "❌ GEMINI_API_KEY not found in .env"
    fi
else
    echo "❌ .env file not found"
fi
echo

# Check .gitignore
echo "🛡️ Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore; then
        echo "✅ .env is ignored"
    else
        echo "❌ .env not in .gitignore"
    fi
    if grep -q "node_modules" .gitignore; then
        echo "✅ node_modules is ignored"
    else
        echo "❌ node_modules not in .gitignore"
    fi
else
    echo "❌ .gitignore file not found"
fi
echo

# Check package.json
echo "📦 Checking package.json..."
if [ -f "package.json" ]; then
    if grep -q '"start": "node server.js"' package.json; then
        echo "✅ Start script configured correctly"
    else
        echo "❌ Start script not found or incorrect"
    fi
else
    echo "❌ package.json not found"
fi
echo

echo "🎯 Deployment Readiness Summary:"
echo "================================"
echo "1. Create GitHub repository"
echo "2. Upload your code (without .env)"
echo "3. Deploy on Render"
echo "4. Set GEMINI_API_KEY environment variable on Render"
echo "5. Test your deployed application"
echo
echo "📚 See DEPLOYMENT.md for detailed instructions"
echo "🚀 Good luck with your deployment!"
