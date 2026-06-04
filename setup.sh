#!/bin/bash

# Lab Management System - Setup Script
# This script helps you set up the project quickly

echo "================================="
echo "Lab Management System - Setup"
echo "================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo "✓ NPM version: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  Please edit .env file and set your configuration"
else
    echo "✓ .env file already exists"
fi
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p logs
echo "✓ Directories created"
echo ""

# Success message
echo "================================="
echo "✅ Setup completed successfully!"
echo "================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file if needed"
echo "2. Run 'npm start' to start the server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Default login:"
echo "  Admin: admin / admin123"
echo "  User:  user / user123"
echo ""
echo "For more information, see README.md"
echo "================================="
