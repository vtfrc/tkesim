#!/bin/sh
# TKESIM Quick Install
# Usage: curl -fsSL https://raw.githubusercontent.com/vtfrc/tkesim/master/install.sh | sh

echo "╔════════════════════════════════════════════╗"
echo "║         TKESIM - Kafka Event Simulator       ║"
echo "╚════════════════════════════════════════════╝"

echo ">>> Installing TKESIM..."

# Check Node.js - use which for portability
NODE_PATH=$(which node 2>/dev/null)
if [ -z "$NODE_PATH" ]; then
    echo "Error: Node.js >= 18 is required"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

# Get node version
NODE_V=$(node -v 2>/dev/null)
if [ -z "$NODE_V" ]; then
    echo "Error: Node.js version unknown"
    exit 1
fi

# Extract major version number
case "$NODE_V" in
    v[0-9]*)
        MAJOR_VER=$(echo "$NODE_V" | tr -d 'v' | cut -d'.' -f1)
        ;;
    *)
        MAJOR_VER=$(echo "$NODE_V" | grep -oE '[0-9]+' | head -1)
        ;;
esac

# Check if major version is numeric and >= 18
if [ -z "$MAJOR_VER" ] || ! echo "$MAJOR_VER" | grep -qE '^[0-9]+$'; then
    echo "Error: Cannot parse Node.js version (got: $NODE_V)"
    exit 1
fi

if [ "$MAJOR_VER" -lt 18 ]; then
    echo "Error: Node.js >= 18 required (found: $NODE_V)"
    exit 1
fi

echo "Node.js $NODE_V detected. OK."

# Create temp dir
TEMP_DIR=$(mktemp -d)
if [ -z "$TEMP_DIR" ]; then
    echo "Error: Cannot create temp directory"
    exit 1
fi

cd "$TEMP_DIR"

echo ">>> Downloading TKESIM..."
git clone --depth 1 https://github.com/vtfrc/tkesim.git . >/dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Failed to clone repo"
    cd /
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo ">>> Installing dependencies..."
npm ci >/dev/null 2>&1 || npm install >/dev/null 2>&1

echo ">>> Building..."
npm run build >/dev/null 2>&1

# Create wrapper script
INSTALL_DIR="$HOME/.tkesim"
mkdir -p "$INSTALL_DIR"
cp -r dist package.json node_modules "$INSTALL_DIR/" 2>/dev/null

# Create symlink
BIN_DIR="$HOME/.local/bin"
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/tkesim" << 'WRAPPER'
#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
node "$SCRIPT_DIR/dist/index.js" "$@"
WRAPPER
chmod +x "$BIN_DIR/tkesim"

# Cleanup
cd /
rm -rf "$TEMP_DIR"

# Check PATH
NEED_PATH="false"
case ":$PATH:" in
    *":$HOME/.local/bin:"*) NEED_PATH="false" ;;
    *) NEED_PATH="true" ;;
esac

echo ""
echo "Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  TO START THE APP:"
echo ""
if [ "$NEED_PATH" = "true" ]; then
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
echo "  4. In TKESIM: Setup Local Kafka -> Connect"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"