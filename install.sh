#!/bin/bash
set -e

# TKESIM Quick Install
# Usage: curl -fsSL https://raw.githubusercontent.com/vtfrc/tkesim/main/install.sh | sh

echo "╔════════════════════════════════════════════╗"
echo "║         TKESIM - Kafka Event Simulator     ║"
echo "╚════════════════════════════════════════════╝"

echo ">>> Installing TKESIM..."

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "Error: Node.js >= 18 is required"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION_NUM=$(node -v 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -z "$NODE_VERSION_NUM" ] || [ "$NODE_VERSION_NUM" -lt 18 ]; then
    echo "Error: Node.js >= 18 required (found: $(node -v))"
    exit 1
fi

echo "Node.js $(node -v) detected. OK."

# Create temp dir
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo ">>> Downloading TKESIM..."
git clone --depth 1 https://github.com/vtfrc/tkesim.git . 2>/dev/null || {
    echo "Failed to clone repo"
    exit 1
}

echo ">>> Installing dependencies..."
npm ci 2>/dev/null || npm install

echo ">>> Building..."
npm run build 2>/dev/null

# Create wrapper script
INSTALL_DIR="$HOME/.tkesim"
mkdir -p "$INSTALL_DIR"
cp -r dist package.json node_modules "$INSTALL_DIR/" 2>/dev/null

# Create symlink
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/tkesim" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
node "$SCRIPT_DIR/dist/index.js" "$@"
EOF
chmod +x "$BIN_DIR/tkesim"

# Cleanup
cd /
rm -rf "$TEMP_DIR"

# Check PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    NEED_PATH=true
else
    NEED_PATH=false
fi

echo ""
echo "✓ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TO START THE APP:"
echo ""
if [ "$NEED_PATH" = true ]; then
    echo "  1. Add to PATH:"
    echo "     export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
fi
echo "  2. Run TKESIM:"
echo "     tkesim"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FOR LOCAL KAFKA (optional):"
echo ""
echo "  3. Start local Kafka:"
echo "     cd ~/.tkesim && docker compose up -d"
echo ""
echo "  4. In TKESIM: Setup Local Kafka → Connect"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"