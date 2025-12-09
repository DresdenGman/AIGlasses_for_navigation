# Model Download Guide

This document provides detailed instructions for downloading the required model files for the AI Intelligent Blind Glasses System.

## Model Requirements

The system requires the following model files:

| Model File | Purpose | Size | Location |
|------------|---------|------|----------|
| `yolo-seg.pt` | Blind path segmentation | ~50MB | `model/` |
| `yoloe-11l-seg.pt` | Open vocabulary detection | ~80MB | `model/` |
| `shoppingbest5.pt` | Object recognition | ~30MB | `model/` |
| `trafficlight.pt` | Traffic light detection | ~20MB | `model/` |
| `hand_landmarker.task` | Hand detection | ~15MB | `model/` |

## Download Methods

### Method 1: ModelScope SDK (Recommended)

**Step 1: Install ModelScope**

```bash
pip install modelscope
```

**Step 2: Download All Models**

Download the complete model repository:

```bash
modelscope download --model archifancy/AIGlasses_for_navigation
```

This will download all files to the current directory. Move the model files to the `model/` directory:

```bash
mv *.pt model/
mv *.task model/
```

**Step 3: Download Specific Files**

If you only need specific model files, you can download them individually:

```bash
# Download to current directory
modelscope download --model archifancy/AIGlasses_for_navigation yolo-seg.pt --local_dir ./

# Download to model directory
modelscope download --model archifancy/AIGlasses_for_navigation yolo-seg.pt --local_dir ./model
```

**Step 4: Using Python SDK**

You can also use the Python SDK to download models:

```python
from modelscope import snapshot_download

# Download entire repository
model_dir = snapshot_download('archifancy/AIGlasses_for_navigation')

# Copy specific files to model directory
import shutil
import os

models = ['yolo-seg.pt', 'yoloe-11l-seg.pt', 'shoppingbest5.pt', 'trafficlight.pt']
for model in models:
    src = os.path.join(model_dir, model)
    dst = os.path.join('model', model)
    if os.path.exists(src):
        shutil.copy2(src, dst)
        print(f"Copied {model} to model/")
```

### Method 2: Git with LFS

**Step 1: Install Git LFS**

```bash
# macOS
brew install git-lfs

# Linux
sudo apt-get install git-lfs  # Ubuntu/Debian
sudo yum install git-lfs      # CentOS/RHEL

# Windows
# Download from https://git-lfs.github.com/
```

**Step 2: Initialize Git LFS**

```bash
git lfs install
```

**Step 3: Clone Repository**

```bash
git clone https://www.modelscope.cn/archifancy/AIGlasses_for_navigation.git
```

**Step 4: Copy Model Files**

After cloning, copy the model files to your project:

```bash
cp AIGlasses_for_navigation/*.pt model/
cp AIGlasses_for_navigation/*.task model/
```

**Skip LFS Files (Alternative)**

If you want to clone without downloading large files:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone https://www.modelscope.cn/archifancy/AIGlasses_for_navigation.git
```

Then download specific files later as needed.

### Method 3: Manual Download from ModelScope Website

1. Visit: https://modelscope.cn/models/archifancy/AIGlasses_for_navigation/summary
2. Navigate to the "Files" section
3. Download each model file manually
4. Place them in the `model/` directory

## Verifying Downloads

After downloading, verify that all required files are present:

```bash
# Check model directory
ls -lh model/

# Expected output:
# yolo-seg.pt (~50MB)
# yoloe-11l-seg.pt (~80MB)
# shoppingbest5.pt (~30MB)
# trafficlight.pt (~20MB)
# hand_landmarker.task (~15MB)
```

## Hand Landmarker Model

The `hand_landmarker.task` file can also be downloaded from MediaPipe:

```bash
wget -O model/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

## Troubleshooting

### Issue: ModelScope Download Fails

**Solution:**
- Check your internet connection
- Ensure ModelScope is installed: `pip install --upgrade modelscope`
- Try using VPN if accessing from outside China

### Issue: Git LFS Files Not Downloading

**Solution:**
```bash
# Re-initialize LFS
git lfs install

# Pull LFS files
git lfs pull
```

### Issue: Permission Denied

**Solution:**
```bash
# Ensure model directory exists and has write permissions
mkdir -p model
chmod 755 model
```

### Issue: Out of Disk Space

**Solution:**
- Total model size: ~195MB
- Ensure you have at least 500MB free space
- Clean up temporary files: `rm -rf /tmp/modelscope*`

## Model Updates

To update models to the latest version:

```bash
# Using ModelScope
modelscope download --model archifancy/AIGlasses_for_navigation --force

# Using Git
cd AIGlasses_for_navigation
git pull
git lfs pull
```

## Notes

- Model files are large and use Git LFS for version control
- Download speed may vary depending on your network connection
- Models are specific to this project and may not be compatible with other systems
- Keep model files in the `model/` directory as specified in the configuration

## Support

For issues with model downloads, please:
1. Check the [ModelScope documentation](https://modelscope.cn/docs)
2. Open an issue on GitHub
3. Contact the project maintainers

