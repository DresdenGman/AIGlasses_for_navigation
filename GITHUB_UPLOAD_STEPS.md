# 一步步发布到 GitHub 指南

这是详细的步骤指南，帮助你将项目上传到 GitHub。

## 📋 准备工作

### 步骤 1: 检查 Git 是否安装

打开终端（Terminal），输入：

```bash
git --version
```

如果显示版本号（如 `git version 2.x.x`），说明已安装。如果没有，需要先安装 Git。

**macOS 安装 Git:**
```bash
# 使用 Homebrew（如果已安装）
brew install git

# 或者下载安装包
# 访问: https://git-scm.com/download/mac
```

### 步骤 2: 配置 Git（首次使用需要）

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱@example.com"
```

例如：
```bash
git config --global user.name "Zhang San"
git config --global user.email "zhangsan@example.com"
```

这个信息会显示在你的提交记录中。

## 🚀 开始上传流程

### 步骤 3: 进入项目目录

打开终端，输入：

```bash
cd "/Users/a24300/Documents/Dresdon(2)/AIGlasses_for_navigation"
```

### 步骤 4: 初始化 Git 仓库

```bash
git init
```

你会看到：
```
Initialized empty Git repository in /Users/a24300/Documents/Dresdon(2)/AIGlasses_for_navigation/.git/
```

### 步骤 5: 安装 Git LFS（用于大文件）

Git LFS 用于处理大文件（如模型文件）。

```bash
# macOS 安装 Git LFS
brew install git-lfs

# 如果使用其他方式安装，访问: https://git-lfs.github.com/
```

然后初始化：

```bash
git lfs install
```

### 步骤 6: 添加所有文件到 Git

```bash
git add .
```

这个命令会将所有文件添加到暂存区。

**查看要提交的文件：**
```bash
git status
```

你会看到所有被添加的文件列表。

### 步骤 7: 创建第一次提交

```bash
git commit -m "Initial commit: AI Intelligent Blind Glasses System

- Complete documentation in English
- System architecture and design
- Model download instructions
- Full feature documentation"
```

你会看到类似这样的输出：
```
[main (root-commit) xxxxxxx] Initial commit: AI Intelligent Blind Glasses System
 X files changed, X insertions(+)
```

### 步骤 8: 在 GitHub 上创建仓库

1. **登录 GitHub**
   - 访问: https://github.com
   - 如果没有账号，先注册

2. **创建新仓库**
   - 点击右上角的 `+` 号
   - 选择 `New repository`

3. **填写仓库信息**
   - **Repository name**: `AIGlasses_for_navigation`
   - **Description**: `AI Intelligent Blind Glasses System - Navigation and assistance for visually impaired`
   - **Visibility**: 
     - 选择 `Public`（公开，适合展示项目）
     - 或 `Private`（私有，只有你能看到）
   - **⚠️ 重要**: 
     - ❌ **不要**勾选 "Add a README file"
     - ❌ **不要**勾选 "Add .gitignore"
     - ❌ **不要**勾选 "Choose a license"
     - （因为我们已经有了这些文件）

4. **点击 `Create repository`**

5. **复制仓库地址**
   - 创建后，GitHub 会显示仓库地址
   - 类似: `https://github.com/你的用户名/AIGlasses_for_navigation.git`
   - **复制这个地址**，下一步需要用到

### 步骤 9: 连接本地仓库到 GitHub

将 GitHub 的地址添加为远程仓库：

```bash
git remote add origin https://github.com/你的用户名/AIGlasses_for_navigation.git
```

**替换 `你的用户名` 为你的 GitHub 用户名**

例如：
```bash
git remote add origin https://github.com/zhangsan/AIGlasses_for_navigation.git
```

**验证连接：**
```bash
git remote -v
```

应该显示：
```
origin  https://github.com/你的用户名/AIGlasses_for_navigation.git (fetch)
origin  https://github.com/你的用户名/AIGlasses_for_navigation.git (push)
```

### 步骤 10: 重命名主分支为 main（如果需要）

```bash
git branch -M main
```

### 步骤 11: 上传到 GitHub

```bash
git push -u origin main
```

**第一次推送会要求身份验证：**

**方法 1: Personal Access Token（推荐）**
1. GitHub 会提示输入用户名和密码
2. 密码使用 Personal Access Token，不是 GitHub 密码
3. 创建 Token:
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 点击 "Generate new token"
   - 选择权限: 至少勾选 `repo`
   - 复制生成的 token（只显示一次）
   - 在终端粘贴 token 作为密码

**方法 2: SSH（更安全，后续更便捷）**
如果你想使用 SSH：

1. 生成 SSH 密钥：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```
按回车使用默认设置

2. 复制公钥：
```bash
cat ~/.ssh/id_ed25519.pub
```

3. 添加到 GitHub:
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - 粘贴公钥内容

4. 使用 SSH 地址：
```bash
git remote set-url origin git@github.com:你的用户名/AIGlasses_for_navigation.git
git push -u origin main
```

### 步骤 12: 验证上传成功

1. 刷新 GitHub 页面
2. 你应该能看到所有文件
3. README.md 会自动显示在仓库主页

## 🎉 完成！

恭喜！你的项目已经成功上传到 GitHub 了！

## 📝 后续操作建议

### 1. 设置仓库描述和主题

在 GitHub 仓库页面：
- 点击 ⚙️ Settings
- 在 About 部分添加主题标签：
  - `computer-vision`
  - `accessibility`
  - `yolo`
  - `navigation`
  - `assistive-technology`

### 2. 创建 Release（可选）

1. 点击右侧 `Releases`
2. 点击 `Create a new release`
3. 填写：
   - Tag: `v1.0.0`
   - Title: `v1.0.0 - Initial Release`
   - Description: 描述主要功能
4. 点击 `Publish release`

### 3. 后续更新项目

如果以后要更新文件：

```bash
# 1. 进入项目目录
cd "/Users/a24300/Documents/Dresdon(2)/AIGlasses_for_navigation"

# 2. 添加修改的文件
git add .

# 3. 提交更改
git commit -m "描述你的更改"

# 4. 推送到 GitHub
git push
```

## ❓ 常见问题

### Q: 提示 "remote origin already exists"
**A:** 删除旧的远程仓库，重新添加：
```bash
git remote remove origin
git remote add origin https://github.com/你的用户名/AIGlasses_for_navigation.git
```

### Q: 提示 "Authentication failed"
**A:** 使用 Personal Access Token 而不是密码，或设置 SSH 密钥

### Q: 提示 "Large files detected"
**A:** 确保 Git LFS 已安装并初始化：
```bash
git lfs install
git lfs track "*.pt"
git add .gitattributes
git commit -m "Add LFS tracking"
```

### Q: 想修改提交信息
**A:** 
```bash
git commit --amend -m "新的提交信息"
git push --force
```

## 🆘 需要帮助？

如果遇到问题，可以：
1. 查看 GitHub 官方文档
2. 检查终端错误信息
3. 询问技术支持

---

**准备好了吗？让我们开始！** 🚀
