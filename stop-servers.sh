#!/bin/bash

# Kill any existing Node.js processes
echo "Stopping all Node.js processes..."
pkill -f "node" || true

echo "All servers have been stopped." 