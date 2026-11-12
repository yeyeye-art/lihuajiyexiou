# 开源范围与资源许可

小梨本轮新增的原创程序代码，由项目维护者授权按 [MIT License](licenses/XIAOLI-MIT.txt) 开源。以下范围可以在保留版权和许可声明的条件下使用、修改和再分发：

- `src/features/xiaoli/*.ts`
- `src/pages/Xiaoli.tsx`
- `src/components/XiaoliMetImage.tsx`
- `src/components/XiaoliReadAloud.tsx`
- `src/components/XiaoliEvidence.tsx`
- `src/styles/xiaoli.css`
- `scripts/prepare-xiaoli-voice.mjs`
- `scripts/validate-xiaoli-topics.mjs`
- `scripts/xiaoli-preview.test.mjs`
- `docs/xiaoli/` 中本项目原创说明与测试用例
- `content/xiaoli-topics.json` 中本项目原创的专题编排与转述（引用的资料仍应核对原始出处）
- `content/xiaoli-search-hints.json` 中本项目原创的检索问法

`content/xiaoli-source-excerpts.json` 中的来源短摘不在上述 MIT 授权内；文字权利属于原来源，保留链接与核对日期。

此授权不将整个历史仓库或其中的第三方资源自动改为 MIT。既有共同开发代码、未列出的历史文件及其修改，沿用原有权利状态；没有许可声明的内容不因公开可见而自动获得任意再授权。

图片、字体、图样、文创照片、3D模型、馆藏图像和数字针迹数据不在上述代码许可范围。请逐项查看原有来源、许可证与元数据。`assets/xiaoli-lessons/` 的图示来自现有数字练习数据，其素材权利沿用原数据说明。不要把博物馆公有领域图像的许可扩大解释为馆方文字、商标或所有馆藏图像的许可。

依赖库保持各自许可：MiniSearch 使用 MIT 许可，WebLLM与Qwen模型按上游说明，Three.js及其他第三方代码保留其原始声明，具体入口见 [小梨说明](docs/xiaoli/README.md)。语音运行库许可不等于训练数据许可；本机 Baker 中文试听包有非商业限制，不提交到仓库，普通网站构建也不包含其权重。


梨宝本轮新增的原创导览代码按 [MIT License](licenses/LIBAO-MIT.txt) 开源，范围为 `src/features/libao/`、`src/components/LibaoGuide.tsx`、`src/components/LibaoAvatar.tsx`、`src/styles/libao.css`、`scripts/libao.test.mjs`、`scripts/libao.acceptance.py` 和 `docs/libao/`。历史文件及其修改不因此改变许可；原梨宝模型也不在此代码授权范围。

Driver.js 固定为 1.12.1，使用 MIT 许可；版权声明同时保留在网站资源 `assets/licenses/driver-MIT.txt`。上游：https://github.com/nilbuild/driver.js 。
