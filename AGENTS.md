# 梨花季静态站维护
此仓库只包含可由GitHub Pages运行的静态文化展示与协作版本。所有资源用相对路径，必须支持 /lihuajiyexiou/ 子目录。不要加入 /api、localhost、临时隧道、服务器机密或假登录。保持素材出处与许可，不添加购买/支付流程。修改后运行 node scripts/build.mjs，验证手机布局和受影响的交互；在特性分支开发，运行 npm run typecheck、npm test、npm run build；通过 PR 合并 main 后触发 Pages 工作流。

2026-10-31 用户明确授权恢复既有联网功能：允许原 Supabase 真实账号、云存档、好友联机，以及已配置的文献问答服务。不得引入假接口、泄露服务端密钥、替换或清空历史数据；没有配置的大模型问答必须如实显示为资料检索。
