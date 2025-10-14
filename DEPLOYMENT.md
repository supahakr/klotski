# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy your Klotski State-Space Graph Visualization to GitHub Pages.

## Prerequisites

- A GitHub account
- Git installed on your computer
- The klotski project folder

## Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Name it: `klotski` (or any name you prefer)
4. Keep it **Public** (required for free GitHub Pages)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click **"Create repository"**

## Step 2: Initialize Git in Your Project

Open Terminal/Command Prompt and navigate to your klotski folder:

```bash
cd /Users/kevinluo/Desktop/klotski
```

Initialize Git and make your first commit:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit: Klotski 3D state-space visualization"

# Rename branch to main (if needed)
git branch -M main
```

## Step 3: Link to GitHub and Push

Replace `YOUR_USERNAME` with your GitHub username:

```bash
# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/klotski.git

# Push to GitHub
git push -u origin main
```

## Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** (top menu)
3. Click **"Pages"** in the left sidebar
4. Under **"Source"**, select:
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **"Save"**

## Step 5: Wait and Access

1. Wait 1-2 minutes for deployment
2. Your site will be live at:
   ```
   https://YOUR_USERNAME.github.io/klotski/
   ```

## ✨ What Will Load

When users visit your site:
- The saved `klotski_graph_layout.json` will load automatically
- They'll see your pre-computed Klotski graph with the optimized layout
- They can:
  - Interact with the 3D graph
  - Click nodes to see board states
  - Drag pieces to navigate states
  - Create their own puzzles
  - Generate new graphs

## 📝 Updating Your Site

Whenever you make changes:

```bash
# Add changed files
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

GitHub Pages will automatically update in 1-2 minutes!

## 🎨 Customization Tips

### Update the Saved Graph
To update the default graph that loads:
1. Generate your desired graph in the app
2. Click "Export for CUDA"
3. Replace `klotski_graph_layout.json` with the new file
4. Commit and push the changes

### Change the Title
Edit line 9 in `index.html`:
```html
<title>Your Custom Title</title>
```

### Add a Description
Edit line 609 in `index.html` to add a subtitle or description.

## 🐛 Troubleshooting

### Page Shows 404
- Wait 2-3 minutes after enabling Pages
- Check that the branch and folder are correct in Settings → Pages

### Saved Graph Doesn't Load
- Make sure `klotski_graph_layout.json` is in the root folder
- Check browser console (F12) for error messages
- Verify the JSON file is valid

### Graph Looks Wrong
- The JSON file might be corrupted
- Try exporting a new graph layout
- Make sure you didn't edit the JSON manually

## 📊 Performance Note

Your current saved graph has **25,955 states**. This works great in modern browsers! Users on older devices may experience slower loading.

For best performance, recommend users to:
- Use Chrome or Firefox on desktop
- Enable hardware acceleration in browser settings
- Close other tabs/applications

---

## 🎉 You're Done!

Your Klotski visualization is now live and accessible to anyone!

Share your link:
- On social media
- In academic papers
- With colleagues
- In your portfolio

Enjoy! 🎮

