#!/bin/bash

# --- Configuration ---
REMOTE_USER="master_xtnwzxcnvz"
REMOTE_HOST="45.63.111.250"
REMOTE_DIR="applications/mmyumexwhx/public_html/"
LOCAL_DIST_DIR="dist"

# --- Check if dist directory exists ---
if [ ! -d "$LOCAL_DIST_DIR" ]; then
  echo "Error: Directory '$LOCAL_DIST_DIR' not found."
  echo "Make sure you are in the project root and have run 'npm run build'."
  exit 1
fi

# --- Check if dist directory is empty ---
if [ -z "$(ls -A $LOCAL_DIST_DIR)" ]; then
   echo "Warning: '$LOCAL_DIST_DIR' directory is empty. Nothing to upload."
   exit 0
fi

echo "Deploying contents of '$LOCAL_DIST_DIR' to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# --- Deploy using scp ---
# Copies the *contents* of the dist directory recursively
# You will likely be prompted for the password unless SSH keys are configured.
scp -r "$LOCAL_DIST_DIR"/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

# Check if scp was successful
if [ $? -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed."
  exit 1
fi

exit 0