#!/bin/sh
# TKESIM Quick Install
# Usage: curl -fsSL https://raw.githubusercontent.com/vtfrc/tkesim/master/install.sh | sh

echo "╔════════════════════════════════════════════╗"
echo "║         TKESIM - Kafka Event Simulator       ║"
echo "╚════════════════════════════════════════════╝"

echo ">>> Installing TKESIM..."

# Check Node.js
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
    echo "Error: Node.js >= 18 is required"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

NODE_V=$(node -v 2>/dev/null)
MAJOR_VER=$(echo "$NODE_V" | tr -d 'v' | cut -d'.' -f1)

if [ -z "$MAJOR_VER" ] || [ "$MAJOR_VER" -lt 18 ]; then
    echo "Error: Node.js >= 18 required (found: $NODE_V)"
    exit 1
fi

echo "Node.js $NODE_V detected. OK."

# Create temp dir
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo ">>> Downloading TKESIM..."
git clone --depth 1 https://github.com/vtfrc/tkesim.git . >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Failed to clone repo"
    exit 1
fi

echo ">>> Installing dependencies..."
npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1

echo ">>> Building..."
npm run build >/dev/null 2>&1

# Install to ~/.tkesim
INSTALL_DIR="$HOME/.tkesim"
mkdir -p "$INSTALL_DIR"
cp -r dist "$INSTALL_DIR/"
cp package.json "$INSTALL_DIR/"
cp -r node_modules "$INSTALL_DIR/"
cp docker-compose.yml "$INSTALL_DIR/" 2>/dev/null

# Create simple launcher using alias approach
cat > "$INSTALL_DIR/tkesim.sh" << 'WRAPPER'
#!/bin/sh
cd "$HOME/.tkesim" && exec node dist/index.js "$@"
WRAPPER
chmod +x "$INSTALL_DIR/tkesim.sh"

# Create symlink in PATH
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/tkesim.sh" "$BIN_DIR/tkesim"

cd /
rm -rf "$TEMP_DIR"

echo ""
echo "Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TO USE TKESIM:"
echo ""
echo "  tkesim"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FOR LOCAL KAFKA:"
echo ""
echo "  cd ~/.tkesim && docker compose up -d"
echo "  Then in TKESIM: Setup Local Kafka"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"