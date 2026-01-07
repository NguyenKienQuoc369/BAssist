#!/bin/bash

echo "🚀 Setting up Consul - AI Learning Assistant"
echo "============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"
echo ""

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Node.js dependencies installed successfully"
else
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local and add your GEMINI_API_KEY"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local and add your GEMINI_API_KEY"
echo "2. Get your API key from: https://makersuite.google.com/app/apikey"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "Happy coding! 🎉"
