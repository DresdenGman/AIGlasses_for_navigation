# GitHub Repository Setup Guide

This guide will help you upload and manage the AI Intelligent Blind Glasses System on GitHub.

## Prerequisites

- Git installed on your system
- GitHub account
- Git LFS installed (for large model files)

## Initial Setup

### 1. Initialize Git Repository

```bash
cd AIGlasses_for_navigation
git init
```

### 2. Install Git LFS

```bash
git lfs install
```

### 3. Configure Git LFS Tracking

The `.gitattributes` file is already configured to track large files. Verify it's in place:

```bash
cat .gitattributes
```

### 4. Configure Git User (if not already done)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Create GitHub Repository

### Option 1: Using GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `AIGlasses_for_navigation` (or your preferred name)
3. Description: "AI Intelligent Blind Glasses System - Navigation and assistance for visually impaired"
4. Choose Public or Private
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Option 2: Using GitHub CLI

```bash
gh repo create AIGlasses_for_navigation --public --description "AI Intelligent Blind Glasses System"
```

## Upload Project

### 1. Add Remote Repository

```bash
git remote add origin https://github.com/YOUR_USERNAME/AIGlasses_for_navigation.git
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Stage All Files

```bash
git add .
```

### 3. Create Initial Commit

```bash
git commit -m "Initial commit: AI Intelligent Blind Glasses System

- Complete system with blind path navigation
- Crosswalk assistance and traffic light detection
- Object recognition and search
- Real-time voice interaction
- Web monitoring interface
- Full documentation"
```

### 4. Push to GitHub

```bash
# For main branch
git branch -M main
git push -u origin main

# If your default branch is master
# git branch -M master
# git push -u origin master
```

### 5. Push Large Files (Git LFS)

If you're including model files, ensure they're tracked by LFS:

```bash
# Verify LFS tracking
git lfs ls-files

# If models are included, they should show "LFS" next to them
```

## Repository Settings

### Enable GitHub Pages (Optional)

1. Go to repository Settings
2. Navigate to Pages
3. Select source branch (usually `main`)
4. Select folder (usually `/docs`)
5. Save

### Set Up Branch Protection (Recommended)

1. Go to Settings → Branches
2. Add branch protection rule for `main`
3. Enable:
   - Require pull request reviews
   - Require status checks
   - Include administrators

### Add Topics/Tags

Add relevant topics to your repository:
- `computer-vision`
- `accessibility`
- `yolo`
- `navigation`
- `assistive-technology`
- `python`
- `fastapi`
- `websocket`

## Repository Structure

Your repository should have this structure:

```
AIGlasses_for_navigation/
├── README.md                    # Main documentation
├── LICENSE                      # MIT License
├── .gitignore                  # Git ignore rules
├── .gitattributes              # Git LFS configuration
├── configuration.json          # Configuration file
├── requirements.txt.example    # Python dependencies template
├── docs/                       # Documentation directory
│   ├── MODEL_DOWNLOAD.md      # Model download instructions
│   ├── CONTRIBUTING.md        # Contribution guidelines
│   ├── ARCHITECTURE.md        # System architecture
│   └── GITHUB_SETUP.md        # This file
├── model/                      # Model files (use LFS)
│   └── .gitkeep               # Keep directory in git
└── rebuild1002/               # Main code directory (when code is added)
    ├── app_main.py
    ├── navigation_master.py
    └── ... (other source files)
```

## Adding Model Files

### Important: Use Git LFS for Models

Model files should be tracked with Git LFS:

```bash
# Before adding model files
git lfs track "*.pt"
git lfs track "*.pth"
git lfs track "*.onnx"
git lfs track "*.task"

# Add model files
git add model/*.pt
git add model/*.task
git commit -m "Add model files via Git LFS"
git push origin main
```

### Alternative: Exclude Models

If you prefer not to include model files in the repository:

1. Add to `.gitignore`:
   ```
   model/*.pt
   model/*.pth
   model/*.onnx
   model/*.task
   ```

2. Provide download instructions in README pointing to ModelScope

## Releases

### Create a Release

1. Go to repository → Releases
2. Click "Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Description:
   ```markdown
   ## Features
   - Blind path navigation
   - Crosswalk assistance
   - Object recognition
   - Real-time voice interaction
   
   ## Installation
   See README.md for detailed installation instructions.
   
   ## Model Download
   Models are available on ModelScope: https://modelscope.cn/models/archifancy/AIGlasses_for_navigation
   ```
6. Upload release assets if needed
7. Publish release

## Continuous Integration (Optional)

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
    - name: Run tests
      run: |
        pytest
```

## Maintenance

### Regular Updates

```bash
# Pull latest changes
git pull origin main

# Make changes
git add .
git commit -m "Description of changes"
git push origin main
```

### Adding Collaborators

1. Go to Settings → Collaborators
2. Add collaborator by username or email
3. Choose permission level (Read, Write, or Admin)

## Troubleshooting

### Issue: Large File Upload Fails

**Solution:**
- Ensure Git LFS is installed and initialized
- Verify `.gitattributes` includes file patterns
- Check file size limits (GitHub allows up to 100MB, LFS required for larger)

### Issue: Push Rejected

**Solution:**
```bash
# If remote has changes you don't have
git pull --rebase origin main
git push origin main

# If force push needed (use carefully)
git push --force origin main
```

### Issue: LFS Files Not Uploading

**Solution:**
```bash
# Verify LFS is working
git lfs env

# Migrate existing files to LFS
git lfs migrate import --include="*.pt,*.pth" --everything
```

## Next Steps

1. ✅ Repository created and uploaded
2. ⬜ Add code files (if not included)
3. ⬜ Configure GitHub Pages (optional)
4. ⬜ Set up CI/CD (optional)
5. ⬜ Create first release
6. ⬜ Add collaborators (if needed)
7. ⬜ Promote repository (social media, forums, etc.)

## Useful Links

- [GitHub Documentation](https://docs.github.com/)
- [Git LFS Documentation](https://git-lfs.github.com/)
- [GitHub Markdown Guide](https://guides.github.com/features/mastering-markdown/)
- [ModelScope Repository](https://modelscope.cn/models/archifancy/AIGlasses_for_navigation)

Good luck with your repository! 🚀
