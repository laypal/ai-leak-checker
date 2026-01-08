#!/bin/bash

# Icon Generation Script for AI Leak Checker
# 
# This script generates PNG icons from the SVG source.
# Requires: ImageMagick (convert command) or Inkscape
#
# Installation:
#   macOS:   brew install imagemagick
#   Ubuntu:  sudo apt install imagemagick
#   Windows: Download from https://imagemagick.org/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../public/icons"
SVG_SOURCE="$ICONS_DIR/icon.svg"

echo "Generating icons from $SVG_SOURCE..."

# Check for ImageMagick
if command -v convert &> /dev/null; then
    echo "Using ImageMagick..."
    
    for size in 16 32 48 128; do
        output="$ICONS_DIR/icon${size}.png"
        convert -background none -density 300 -resize ${size}x${size} "$SVG_SOURCE" "$output"
        echo "Created: icon${size}.png"
    done
    
# Check for Inkscape as fallback
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape..."
    
    for size in 16 32 48 128; do
        output="$ICONS_DIR/icon${size}.png"
        inkscape "$SVG_SOURCE" -w $size -h $size -o "$output"
        echo "Created: icon${size}.png"
    done
    
else
    echo "ERROR: Neither ImageMagick nor Inkscape found."
    echo ""
    echo "Please install one of:"
    echo "  - ImageMagick: brew install imagemagick (macOS) / apt install imagemagick (Ubuntu)"
    echo "  - Inkscape: brew install inkscape (macOS) / apt install inkscape (Ubuntu)"
    echo ""
    echo "Or convert manually using an online tool:"
    echo "  1. Open public/icons/icon.svg in a browser"
    echo "  2. Use a tool like https://svgtopng.com/"
    echo "  3. Save as icon16.png, icon32.png, icon48.png, icon128.png"
    exit 1
fi

echo ""
echo "✅ Icons generated successfully!"
echo ""
echo "Generated files:"
ls -la "$ICONS_DIR"/*.png 2>/dev/null || echo "No PNG files found"
