#!/bin/bash
# Script to set up the development environment by creating a symbolic link to the reference data
# This allows access to the reference data during local development

# Path to the reference data folder
REFERENCE_PATH="../sanctissimissa-reference"

# Path where the symlink should be created (inside the public folder for dev server)
SYMLINK_PATH="./public/reference"

# Check if reference data exists
if [ ! -d "$REFERENCE_PATH" ]; then
  echo "Error: Reference data folder not found at $REFERENCE_PATH"
  exit 1
fi

# Create symlink if it doesn't exist
if [ ! -L "$SYMLINK_PATH" ]; then
  echo "Creating symbolic link from $SYMLINK_PATH to $REFERENCE_PATH..."
  mkdir -p "$(dirname "$SYMLINK_PATH")"
  ln -s "$(realpath "$REFERENCE_PATH")" "$SYMLINK_PATH"
  echo "Symbolic link created successfully."
else
  echo "Symbolic link already exists at $SYMLINK_PATH"
fi

echo "Development environment setup complete."
echo "Reference data should now be accessible at http://localhost:PORT/reference/ during development."
