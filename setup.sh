#!/bin/bash
# Setup script for local development

echo "🚀 Setting up Realtor HQ..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
else
  echo "✓ Dependencies already installed"
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
  echo "⚙️  Creating .env.local..."
  cp .env.local.example .env.local
  echo "⚠️  Please update .env.local with your API keys"
else
  echo "✓ .env.local exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your API keys"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
