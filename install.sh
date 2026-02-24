#!/bin/bash
set -e

# TKESIM Quick Install
# Usage: curl -fsSL https://raw.githubusercontent.com/vtfrc/tkesim/main/install.sh | sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════╗"
echo "║         TKESIM - Kafka Event Simulator       ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}>>> Installing TKESIM...${NC}"

# Check Node.js
if ! command -v node &>/dev/null; then
    echo -e "${RED}Error: Node.js >= 18 is required${NC}"
    echo "Install from: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js >= 18 required (found: $(node -v))${NC}"
    exit 1
fi

# Create temp dir
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo -e "${YELLOW}>>> Downloading TKESIM...${NC}"
git clone --depth 1 https://github.com/vtfrc/tkesim.git . 2>/dev/null || {
    echo -e "${RED}Failed to clone repo${NC}"
    exit 1
}

echo -e "${YELLOW}>>> Installing dependencies...${NC}"
npm ci 2>/dev/null || npm install

echo -e "${YELLOW}>>> Building...${NC}"
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
NEED_PATH=false
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    NEED_PATH=true
fi

echo -e ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TO START THE APP:${NC}"
echo ""
if [ "$NE_PATH" = true ]; then
    echo -e "  ${YELLOW}1. Add to PATH:${NC}"
    echo "     export PATH=\"\$HOME/.local/bin:\$PATH\""
    echo ""
fi
echo "  ${YELLOW}2. Run TKESIM:${NC}"
echo "     ${GREEN}tkesim${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  FOR LOCAL KAFKA (optional):${NC}"
echo ""
echo "  ${YELLOW}3. Start local Kafka:${NC}"
echo "     cd ~/.tkesim && docker compose up -d"
echo ""
echo "  ${YELLOW}4. In TKESIM, go to: Setup Local Kafka → Connect${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"