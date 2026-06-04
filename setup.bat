@echo off
REM Lab Management System - Setup Script for Windows
REM This script helps you set up the project quickly

echo =================================
echo Lab Management System - Setup
echo =================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo + Node.js is installed
node -v
echo + NPM is installed
npm -v
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo X Failed to install dependencies
    pause
    exit /b 1
)

echo + Dependencies installed
echo.

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo + .env file created
    echo ! Please edit .env file and set your configuration
) else (
    echo + .env file already exists
)
echo.

REM Create necessary directories
echo Creating directories...
if not exist data mkdir data
if not exist logs mkdir logs
echo + Directories created
echo.

REM Success message
echo =================================
echo Setup completed successfully!
echo =================================
echo.
echo Next steps:
echo 1. Edit .env file if needed
echo 2. Run 'npm start' to start the server
echo 3. Open http://localhost:3000 in your browser
echo.
echo Default login:
echo   Admin: admin / admin123
echo   User:  user / user123
echo.
echo For more information, see README.md
echo =================================
echo.
pause
