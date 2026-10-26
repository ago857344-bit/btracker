#!/bin/bash
set -e

# BTracker macOS Auto-Installer
# Bypasses browser quarantine flags without requiring Apple Developer ID

echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║        BTracker macOS Auto-Installer      ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""

APP_NAME="BTracker"
DOWNLOAD_URL="${BTRACKER_URL:-https://btracker.app/downloads/BTracker-macOS.zip}"

# Determine target directory
TARGET_DIR="/Applications"
if [ ! -w "$TARGET_DIR" ]; then
    TARGET_DIR="$HOME/Applications"
    mkdir -p "$TARGET_DIR"
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "⏳ Downloading BTracker for macOS..."
curl -fSL --progress-bar "$DOWNLOAD_URL" -o "$TMP_DIR/BTracker.zip" || {
    echo "❌ Download failed. Please check your internet connection."
    exit 1
}

echo "📦 Installing to $TARGET_DIR/$APP_NAME.app..."
unzip -q "$TMP_DIR/BTracker.zip" -d "$TMP_DIR"

if [ -d "$TMP_DIR/$APP_NAME.app" ]; then
    # Strip any quarantine flags so Gatekeeper allows immediate launch
    xattr -cr "$TMP_DIR/$APP_NAME.app" 2>/dev/null || true
    
    rm -rf "$TARGET_DIR/$APP_NAME.app"
    cp -R "$TMP_DIR/$APP_NAME.app" "$TARGET_DIR/"
    
    echo "✅ Successfully installed BTracker to $TARGET_DIR/$APP_NAME.app!"
    echo "🚀 Launching BTracker..."
    open "$TARGET_DIR/$APP_NAME.app"
else
    echo "❌ Error: App bundle not found in archive."
    exit 1
fi
