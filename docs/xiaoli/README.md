# 小梨免费对话预览

这是独立的 `#xiaoli` 体验页，保留百科、东方色谱、绣境奇遇及原有真实联网功能。功能分支不自动发布正式站点。不需要 API 密钥或付费账号。

## 已实现

- 默认使用原有 **155 条**可溯源刺绣资料。此版本没有新增未经核验的文化事实，也没有宣称知识数量已扩大。
- 问候、资料不足提示、出处展开、简单/详细讲解、上一问的简化追问、针法课堂入口。
- 对话仅在当前页面内存保存；可选择仅在本机记住讲解偏好。重新聊、停止和离开页面会终止相关任务，不清理游戏存档。
- 可选 WebLLM + Qwen2.5-0.5B 本机推理。用户主动启用后下载约 300MB；使用 Web Worker、2048 上下文、90 秒超时和内存释放。关闭模型恢复小梨 3D 形象，避免两者竞争显存。
- 输出检查引用编号、来源已有数字、明显新增的绝对化表述，以及将来源中不明确的起源说成确定结论的情况。不通过就回退资料摘要。**这些规则不是语义事实核验，模型回答仍须核对出处。**
- 可选本机 WASM 中文语音，同一女声提供舒缓/明快两种语速。生成后点击播放器，不自动播放；可朗读上一条回答。
- 语音训练数据有非商业限制，仅在本机做研究试听；普通构建排除整个声音目录，Git 忽略模型权重。

## 运行

使用 Node 24（与项目 CI 一致），安装依赖后：

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

部署 `_site`；二级路径为 `/lihuajiyexiou/`，预览路由为 `#xiaoli`。普通构建不含本机试听权重，文字功能和用户自行启用的浏览器模型可用。不要把本机研究试听包当作已许可商用的配音包发布。

仅本机非商业试听：

```powershell
npm run prepare:xiaoli-voice
$env:VITE_XIAOLI_VOICE='true'
npm run build
Remove-Item Env:VITE_XIAOLI_VOICE
```

准备脚本从官方 release 下载、核对 SHA-256、保留运行库许可证与模型来源；也接受已有归档路径。需要系统自带 `tar`。不将本机预览服务地址写入网页产品代码。

## 隐私与离线边界

本机模型问答不发送给大模型 API，声音文本也不上传。首次模型下载连接 Hugging Face/MLC 官方托管域名，主站已有云存档等功能保持原配置。启用模型需要 WebGPU；不支持或失败时继续资料问答。缓存可由“清理此模型的下载缓存”删除，不影响游戏数据。浏览器可能自动回收缓存，不能承诺永久离线可用。

## 验证范围

`evaluation-cases.json` 的 100 条覆盖真实资料检索、主题追问、问候、资料不足和越界问题，由 `scripts/xiaoli-preview.test.mjs` 执行。它们不是 100 道大模型质量评测。另有浏览器中真实下载/推理、WASM 合成 WAV、桌面和 390px 手机检查。

本机是 8GB RAM、GTX1050 2GB 设备，小模型实际回答需要数十秒，引用缺失会回退；不等同豆包或大型云模型。自然度需要用户试听判断。本阶段没有完整语音识别、免手持通话或精确口型同步。后续知识扩展应从授权的博物馆/非遗资料逐条补齐出处，而不是把模型生成内容直接写成知识库。

## 借鉴与许可

- [WebLLM](https://github.com/mlc-ai/web-llm)：Apache-2.0；项目固定 `@mlc-ai/web-llm@0.2.87`，用户点击后才加载推理代码和权重。
- [Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct)：Apache-2.0；运行时使用官方 MLC 目录中的 `Qwen2.5-0.5B-Instruct-q4f32_1-MLC`。
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)：Apache-2.0 运行库；固定 v2.0.1 WASM release。
- [Matcha Chinese Baker 模型说明](https://huggingface.co/csukuangfj/matcha-icefall-zh-baker)：DataBaker 训练数据标注仅非商业使用，不能因运行库开源就推断声音可商用。
- 原项目文化资料、3D 模型和美术资源沿用原始来源与授权范围；本功能不改变其许可。
