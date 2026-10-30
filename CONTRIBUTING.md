# 梨花季 (lihuaji) · 团队协作与 GitHub CLI 开发指引

欢迎加入 **梨花季·译绣** 项目协作！本项目致力于苏绣非遗技艺、传统纹样与现代数字互动的静态化展示。

为了保障高效协作与代码质量，本项目采用 **100% 静态架构 + GitHub Actions 自动化持续交付**。推荐团队成员全程使用 **GitHub CLI (`gh`)** 进行命令行协作。

---

## 🚀 快速上手流程 (GitHub CLI 驱动)

### 1. 环境准备与账号授权
确保本地已安装 [GitHub CLI](https://cli.github.com/) 和 Node.js (推荐 v20+)：

```bash
# macOS
brew install gh

# Windows (winget)
winget install --id GitHub.cli

# 授权登录 (选择 GitHub.com -> HTTPS/SSH -> 浏览器或 Token 授权)
gh auth login
```

### 2. 克隆项目与初始化
使用 `gh repo clone` 快速拉取代码：

```bash
# 克隆仓库
gh repo clone yeyeye-art/lihuajiyexiou
cd lihuajiyexiou

# 安装依赖
npm install

# 启动本地开发服务 (支持 Vite HMR 热更新)
npm run dev
```
本地预览地址：`http://localhost:5173`

---

## 🛠️ 分支管理与日常开发规范

### 1. 新建 Feature 特性分支
**严禁直接向 `main` 分支提交未验证代码。** 请基于最新的 `main` 创建独立分支：

```bash
git checkout main
git pull origin main

# 创建并切换到新功能分支 (推荐命名: feat/xxx, fix/xxx, docs/xxx)
git checkout -b feat/your-feature-name
```

*(可选)* 如果在 GitHub 上建立了关联 Issue，可一键挂载：
```bash
gh issue develop <issue-number> --checkout
```

---

## 🚦 本地守门员检查（提交前必跑）

在将代码推送到远端前，**必须在本地通过以下三道自动化验证**，确保 CI 流水线不会被阻断：

```bash
# 1. TypeScript 类型严格检查
npm run typecheck

# 2. 单元测试套件 (59 项核心业务逻辑测试)
npm test

# 3. 静态构建与全量数据一致性检查
npm run build
```

> ### ⚠️ 静态架构开发铁律
> 1. **零后端依赖**：本项目托管于免费 GitHub Pages，**严禁引入任何真实后端接口 (`/api/*`)、本地服务依赖 (`localhost:3000`) 或反代穿透隧道 (`trycloudflare.com`)**。
> 2. **全量相对路径**：必须支持 `/lihuajiyexiou/` 级联二级目录部署，所有图片、音频与资源引用必须通过相对路径或 Vite `base: '/lihuajiyexiou/'` 解析。
> 3. **数据一致性**：若涉及文化知识、纹样出处变动，必须具有真实的官方文献/馆藏来源（CC0/公有领域）。

---

## 📤 提交与发起 Pull Request (PR)

本地构建与测试全部通过后，使用 `gh` 提交并创建 PR：

```bash
# 1. 暂存并提交代码
git add .
git commit -m "feat(module): 简要描述你的改动"

# 2. 推送分支
git push -u origin feat/your-feature-name

# 3. 命令行一键创建 PR
gh pr create --title "feat(module): 简要描述你的改动" --body "详细说明本次改动内容，已通过本地 npm test 和 npm run build 验证。"
```

---

## 🔍 CI 监控与合并发布

### 1. 监控 GitHub Actions 状态
无需切到浏览器，在终端实时查看 PR 的 CI 构建进度：

```bash
# 查看 PR 当前检查状态
gh pr checks

# 实时追踪 Actions 日志
gh run watch
```

### 2. 合并与自动化发布 (项目负责人或评审后执行)
PR 审核通过且 CI 全部打绿勾（Pass）后合并：

```bash
# 采用 squash 变基合并并自动清理远端和本地分支
gh pr merge --squash --delete-branch
```

**自动上线**：分支合并到 `main` 后，GitHub Actions 部署工作流会自动触发，部署成功后可在 [生产站点](https://yeyeye-art.github.io/lihuajiyexiou/) 查看最新上线效果。

---

## 📌 GitHub CLI 常用命令速查手册

| 命令 | 用途说明 |
| :--- | :--- |
| `gh repo clone <repo>` | 快速克隆仓库至本地 |
| `gh issue list` | 查看当前待办任务列表 |
| `gh issue create` | 交互式创建新的 Issue 任务 |
| `gh pr list` | 查看当前开放的 Pull Request |
| `gh pr checkout <PR号>` | 命令行快速签出协作者的 PR 进行本地联调 |
| `gh pr diff` | 在终端对比当前 PR 的代码变更 |
| `gh repo view --web` | 一键在默认浏览器打开 GitHub 仓库主页 |
| `gh workflow run deploy.yml` | 手动触发 GitHub Pages 重新部署 |
