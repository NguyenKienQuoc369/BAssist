#!/bin/bash

# Start development servers for BAssist AI

echo "🚀 Starting BAssist AI development servers..."

# Activate virtual environment and start FastAPI backend
echo "Starting FastAPI backend on port 8000..."
source venv/bin/activate
export GEMINI_API_KEY=AIzaSyBTQHmDdmP55MGmfTyxEokC-T6583Mpx-0
uvicorn api.index:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start Next.js frontend
echo "Starting Next.js frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are running:"
echo "   - Backend (FastAPI): http://127.0.0.1:8000"
echo "   - Frontend (Next.js): http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
