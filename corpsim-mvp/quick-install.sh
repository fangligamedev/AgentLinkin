#!/bin/bash
# Quick install for other AI agents
# Run: curl -fsSL https://raw.githubusercontent.com/fangligamedev/AgentLinkin/feature/corp-simulator-slg/corpsim-mvp/quick-install.sh | bash

set -e

echo "🦞 CorpSim Quick Installer"
echo ""

# Detect shell
SHELL_NAME=$(basename "$SHELL")
echo "Detected shell: $SHELL_NAME"

# Install
curl -fsSL https://raw.githubusercontent.com/fangligamedev/AgentLinkin/feature/corp-simulator-slg/corpsim-mvp/install.sh | bash

# Add to shell profile if needed
if ! command -v corpsim &> /dev/null; then
    echo ""
    echo "Adding corpsim to your PATH..."
    
    case "$SHELL_NAME" in
        zsh)
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
            echo "✅ Added to ~/.zshrc"
            echo "   Run: source ~/.zshrc"
            ;;
        bash)
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
            echo "✅ Added to ~/.bashrc"
            echo "   Run: source ~/.bashrc"
            ;;
        *)
            echo "⚠️  Please add to your shell profile:"
            echo "   export PATH=\"$HOME/.local/bin:\$PATH\""
            ;;
    esac
fi

echo ""
echo "🎮 To start playing:"
echo "   1. corpsim config   # Optional: customize your agent"
echo "   2. corpsim start    # Start the game"
echo "   3. Open http://localhost:3003"
echo ""
echo "Enjoy! 🚀"
