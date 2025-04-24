#!/bin/bash
# Script to deploy reference data to the correct location on the web server
# Usage: ./deploy-reference-data.sh [destination_path]

# Default destination path if not provided
DEST_PATH=${1:-"./dist/reference"}

# Source path for reference data
SOURCE_PATH="../sanctissimissa-reference"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_PATH"

# Copy the reference data to the destination
echo "Copying reference data from $SOURCE_PATH to $DEST_PATH..."
cp -r "$SOURCE_PATH/web" "$DEST_PATH/"

echo "Reference data deployed successfully to $DEST_PATH"
echo "Make sure this folder is accessible at /reference on your web server."
