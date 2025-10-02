#!/bin/bash

# Quick deployment script
echo "Deploying to GitHub Pages..."

# Add all files
git add .

# Commit with timestamp
git commit -m "Deploy: $(date)"

# Push to main branch
git push origin main

echo "Deployment complete!"