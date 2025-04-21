#!/bin/bash
# fetch_missing_references.sh
# Fetches missing Divinum Officium reference files required by the importer
set -e

BASE_DIR="sanctissimissa-reference/web/www"
UPSTREAM="https://raw.githubusercontent.com/DivinumOfficium/divinum-officium/master/web/www"

# List of files to fetch
FILES=(
  "missa/Latin/Tempora/Pasc0-0.txt"
  "missa/English/Tempora/Pasc0-0.txt"
  "missa/Latin/Ordo/Ordo.txt"
  "missa/English/Ordo/Ordo.txt"
)

for REL_PATH in "${FILES[@]}"; do
  LOCAL_PATH="$BASE_DIR/$REL_PATH"
  DIR_PATH=$(dirname "$LOCAL_PATH")
  mkdir -p "$DIR_PATH"
  echo "Fetching $REL_PATH..."
  curl -fsSL "$UPSTREAM/$REL_PATH" -o "$LOCAL_PATH"
done

echo "All missing reference files have been fetched."
