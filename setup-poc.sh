#!/bin/bash

# CrimeMiner AI - Setup Script for Proof of Concept
# This script installs the necessary dependencies for the proof-of-concept scripts

echo "Setting up CrimeMiner AI Proof of Concept..."

# Create necessary directories
mkdir -p sample-data
mkdir -p reference-output

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env file from .env.example. Please update with your API keys."
  else
    echo "ERROR: .env.example file not found. Please create a .env file manually."
    exit 1
  fi
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if sample files exist
if [ ! -f sample-data/sample-interview.txt ]; then
  echo "WARNING: sample-data/sample-interview.txt not found."
  echo "Please create this file or copy an existing text file to this location."
fi

echo "Checking for OpenAI API key..."
if grep -q "OPENAI_API_KEY=your_openai_api_key_here" .env; then
  echo "WARNING: OpenAI API key not set in .env file."
  echo "Please update your .env file with a valid OpenAI API key for transcription features."
fi

echo ""
echo "Setup complete! You can now run the proof-of-concept scripts:"
echo ""
echo "  Reference System:  npm run reference-poc"
echo "  Transcription:     npm run transcription-poc"
echo "  Batch Processing:  npm run batch-poc"
echo ""
echo "Make sure to update your .env file with the necessary API keys."
echo ""

# Make the script executable
chmod +x setup-poc.sh 