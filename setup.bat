@echo off
REM Setup script for local development (Windows)

echo.
echo 🚀 Setting up Realtor HQ...
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    call npm install
) else (
    echo ✓ Dependencies already installed
)

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo ⚙️  Creating .env.local...
    copy .env.local.example .env.local
    echo ⚠️  Please update .env.local with your API keys
) else (
    echo ✓ .env.local exists
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env.local with your API keys
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo.
pause
