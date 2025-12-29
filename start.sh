#!/bin/bash

# EDGAR Startup Script
# Starts both backend and frontend services

echo "🚀 Starting EDGAR..."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the edgar-modern root directory"
    exit 1
fi

# Start backend
echo "📦 Starting backend on http://localhost:8000..."
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ EDGAR is running!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/api/docs"
echo ""
echo "Login credentials:"
echo "  Username: demo"
echo "  Password: demo"
echo ""
echo "Press Ctrl+C to stop both services"

# Trap Ctrl+C and cleanup
trap "echo ''; echo '🛑 Stopping EDGAR...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait for user interrupt
wait
