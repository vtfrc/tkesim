#!/bin/bash
set -e

# Configuration
REPO_URL="https://github.com/vtfrc/tkesim.git"
INSTALL_DIR="$HOME/.tkesim"
BIN_DIR="/usr/local/bin"
EXECUTABLE_NAME="tkesim"

echo -e "\033[0;34m>>> Installing TKESIM...\033[0m"

# 1. Check for Node.js
if ! command -v node &>/dev/null; then
  echo -e "\033[0;31mError: Node.js is not installed. Please install Node.js >= 18 first.\033[0m"
  exit 1
fi

# 2. Clone/Update Repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "\033[0;33mUpdating existing installation in $INSTALL_DIR...\033[0m"
    cd "$INSTALL_DIR"
    # Reset local changes (like package-lock.json) to avoid merge conflicts
    git fetch --all
    git reset --hard origin/master || git reset --hard origin/main
else
    echo -e "\033[0;33mCloning repository to $INSTALL_DIR...\033[0m"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 3. Install Dependencies & Build
echo -e "\033[0;33mInstalling dependencies and building...\033[0m"
npm install
npm run build

# 4. Create Symlink
echo -e "\033[0;33mLinking executable...\033[0m"
if [ -w "$BIN_DIR" ]; then
  ln -sf "$INSTALL_DIR/dist/index.js" "$BIN_DIR/$EXECUTABLE_NAME"
  chmod +x "$INSTALL_DIR/dist/index.js"
  echo -e "\033[0;32m✓ Successfully installed to $BIN_DIR/$EXECUTABLE_NAME\033[0m"
else
  echo -e "\033[0;31mWarning: No write access to $BIN_DIR. Trying local bin...\033[0m"
  mkdir -p "$HOME/.local/bin"
  ln -sf "$INSTALL_DIR/dist/index.js" "$HOME/.local/bin/$EXECUTABLE_NAME"
  chmod +x "$INSTALL_DIR/dist/index.js"
  echo -e "\033[0;32m✓ Installed to $HOME/.local/bin/$EXECUTABLE_NAME\033[0m"
  echo "Make sure $HOME/.local/bin is in your PATH."
fi

echo -e "\033[0;32m>>> Installation Complete! Type '$EXECUTABLE_NAME' to start.\033[0m"
