#!/bin/bash

# Kill any existing Node.js processes
echo "Killing any existing Node.js processes..."
pkill -f "node" || true

# Wait a moment for processes to terminate
sleep 2

# Start the backend server
echo "Starting backend server on port 4000..."
cd "/Users/corneliusgeorge/CrimeMinerAI /crimeminer-ai-server" && PORT=4000 npm run dev &

# Wait for backend to initialize
sleep 5

# Start the frontend server
echo "Starting frontend server on port 3000..."
cd "/Users/corneliusgeorge/CrimeMinerAI /crimeminer-ai-web" && npm run dev &

echo "Both servers are starting up. You can access:"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:4000"
