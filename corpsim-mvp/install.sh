#!/bin/bash
# CorpSim Skill Installer
# Usage: ./install.sh [install-dir]

set -e

SKILL_NAME="corpsim"
SKILL_VERSION="0.1.0"
REPO_URL="https://github.com/fangligamedev/AgentLinkin.git"
BRANCH="feature/corp-simulator-slg"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🦞 Installing CorpSim Skill v${SKILL_VERSION}..."

# Determine install directory
if [ -n "$1" ]; then
    INSTALL_DIR="$1"
elif [ -n "$OPENCLAW_SKILLS_DIR" ]; then
    INSTALL_DIR="$OPENCLAW_SKILLS_DIR/${SKILL_NAME}"
else
    INSTALL_DIR="$HOME/.openclaw/skills/${SKILL_NAME}"
fi

echo "📁 Install directory: ${INSTALL_DIR}"

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v git &> /dev/null; then
    echo "${RED}❌ Error: git is required${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "${RED}❌ Error: Node.js is required${NC}"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "${YELLOW}⚠️  Warning: Node.js 18+ recommended (found $(node --version))${NC}"
fi

# Remove existing installation
if [ -d "$INSTALL_DIR" ]; then
    echo "🗑️  Removing existing installation..."
    rm -rf "$INSTALL_DIR"
fi

# Clone repository
echo "📥 Cloning repository..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"

# Navigate to corpsim-mvp
cd "$INSTALL_DIR/corpsim-mvp"

# Install dependencies
echo "📦 Installing dependencies..."
if command -v npm &> /dev/null; then
    npm install
elif command -v yarn &> /dev/null; then
    yarn install
else
    echo "${RED}❌ Error: npm or yarn is required${NC}"
    exit 1
fi

# Create openclaw command symlink
BIN_DIR="$HOME/.local/bin"
if [ ! -d "$BIN_DIR" ]; then
    mkdir -p "$BIN_DIR"
fi

cat > "$BIN_DIR/corpsim" << 'EOF'
#!/bin/bash
# CorpSim launcher

SKILL_DIR="${OPENCLAW_SKILLS_DIR:-$HOME/.openclaw/skills}/corpsim/corpsim-mvp"

case "$1" in
    start)
        echo "🚀 Starting CorpSim..."
        cd "$SKILL_DIR" && npm run dev
        ;;
    stop)
        echo "🛑 Stopping CorpSim..."
        pkill -f "next dev -p 3003"
        ;;
    config)
        echo "⚙️  Opening configuration..."
        ${EDITOR:-nano} "$SKILL_DIR/src/data/initialData.ts"
        ;;
    status)
        if lsof -ti:3003 > /dev/null 2>&1; then
            echo "✅ CorpSim is running on http://localhost:3003"
        else
            echo "❌ CorpSim is not running"
        fi
        ;;
    update)
        echo "🔄 Updating CorpSim..."
        cd "$SKILL_DIR" && git pull && npm install
        ;;
    help|--help|-h)
        echo "CorpSim - Company Simulation Game"
        echo ""
        echo "Usage: corpsim [command]"
        echo ""
        echo "Commands:"
        echo "  start    Start the game server"
        echo "  stop     Stop the game server"
        echo "  config   Edit configuration"
        echo "  status   Check server status"
        echo "  update   Update to latest version"
        echo "  help     Show this help"
        echo ""
        echo "Open http://localhost:3003 after starting"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'corpsim help' for usage"
        exit 1
        ;;
esac
EOF

chmod +x "$BIN_DIR/corpsim"

# Add to PATH if needed
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "${YELLOW}⚠️  Add to your shell profile:${NC}"
    echo "   export PATH=\"$BIN_DIR:\$PATH\""
    echo ""
fi

# Success message
echo ""
echo "${GREEN}✅ CorpSim Skill installed successfully!${NC}"
echo ""
echo "🎮 Quick Start:"
echo "   corpsim start    # Start the game"
echo "   corpsim config   # Customize your agent"
echo "   corpsim status   # Check status"
echo "   corpsim help     # Show help"
echo ""
echo "🌐 Then open: http://localhost:3003"
echo ""
echo "📚 Documentation:"
echo "   SKILL.md         # Skill documentation"
echo "   README.md        # Game guide"
echo "   DEPLOYMENT.md    # Deployment guide"
echo ""
