# GitHub Pages 迁移记录

目标仓库：`yeyeye-art/lihuajiyexiou`。
目标地址：<https://yeyeye-art.github.io/lihuajiyexiou/>。
源仓库：`javanokia/lihuaji`，迁移基线 `b9f124933267fcba0d6971916019ecc84be7339a`。

源仓库目前包含 4 个提交，只有 `main` 分支、没有标签和 LFS 文件。
迁移保留这份源仓库现有的完整历史，不代表恢复更早已经遗失的历史。
历史文档中的原提交、出处、验收日期与旧链接仍按原始证据保留。

## 部署配置

- Vite base 和 Service Worker scope 为 `/lihuajiyexiou/`。
- Manifest 的 id、scope、start_url 均相对 Manifest 所在目录解析。
- 继续使用 `#library`、`#ar` 形式的 Hash 路由。
- `npm run build` 发布目录为 `_site`，包含完整 `assets/` 和 `content/`。
- `.env.production` 及 CI 使用当前站点的相对素材与数据路径，不依赖旧素材站。
- 缓存使用 `lihuajiyexiou-v1-*` 命名空间；其他域名的 SW 与浏览器存储不会迁移到新域名。
- SW 的首页回退只覆盖应用入口，避免把 AR 或照片试搭的独立 HTML 替换为 React 首页。
- 编译后的 JSON 进入预缓存，独立 AR 脚本与相关素材按实际访问进行运行时缓存。
- 初次未加载的素材不承诺离线可用。旧域名学习记录不会自动复制到新域名。

## 本地验证（2026-10-30）

- `npm run typecheck`：通过。
- `npm test`：59 项通过，0 失败、0 跳过。
- `npm run build`：通过，包括文化来源、素材和新增 Pages 产物校验。
- `scripts/verify-pages.mjs`：核验 2420 个素材与数据文件的 SHA-256，与源文件逐字节一致；核验入口、Manifest、SW 与发布子目录。
- Chromium 真实浏览器：桌面首页、纹样库、AR、绣馆、故事译绣、学习记录及刷新通过；无页面脚本错误或站内资源失败。
- AR 嵌入页正确加载六层模型，展开成功；数字针迹实验室可推进到第 1 针。
- 390px 手机尺寸：首页、纹样库、AR 页面与 AR 嵌入页无横向溢出。
- 先访问再断网：首页、纹样库、AR 刷新及已缓存的展开与针迹操作通过。

第三方课程页面在切换页面时出现一次加载取消，不能据此确认课程站可用性。
本轮未验证手机物理摄像头和 WebXR 真机能力。
本地验收不等于公网发布；发布结果须以目标仓库对应提交的 Actions 和线上验收为准。

## 持续开发

使用特性分支提交 PR。合并前运行：

```sh
npm ci
npm run typecheck
npm test
npm run build
git diff --exit-code -- content/ contracts/
```

有意修改并已审核的数据应先纳入提交，再检查构建是否产生额外漂移。
Pages 的 Source 使用 GitHub Actions；部署工作流上传 `_site`。
协作者邀请必须由对方接受后才生效。
