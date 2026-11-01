# 梨花季 · 东方色谱资料来源与数字取色方法（2026-10-20）

## 当前实际入库

| 数据类 | 原始条目 | 取色/编排 | 授权属性 |
|---|---:|---|---|
| 梨花季品牌色 | 6 色 | 保留原始品牌配色 | 项目现有设计 |
| Chinese Traditional Colors（传统色社区整理） | 161 色 | 保留中文色名与HEX；不导入图片/第三方描述或页面代码 | MIT |
| Radix Colors（现代设计系统） | 31 个系列、每系列 12 色 = 372 色 | 保留开源标准 HEX，并按系列组建 124 套六色搭配 | MIT |
| Cleveland Museum of Art（CMA） | 100 件逐件 CC0 的开放藏品 | 每件从原站许可并本地保存的**缩略图**量化得到 6 个屏幕参考色，合计 600 条颜色与 100 套六色方案 | CC0 图片，单独核对原记录 |
| 故事译绣原有配色 | 4 套 | 保留既有6色方案，优先作为默认候选 | 项目已有创作 |

基于上述方法，当前数据文件包含 1139 条颜色记录（会存在相同HEX来自不同作品）和 224 套新增六色组合；加上故事译绣原有4套，为 **228套可供纹样编辑的配色**。独立 HEX 总数由页面动态从两份 JSON 计算，不能用总条目数冒充“不同色值数量”。

## 特别重要的区别

1. **不是馆方官方色卡。** CMA 官方提供的是开放藏品图像及作品信息。本项目从逐项核实为 CC0 的现有数字图像做数学提取，不代表馆方认证、文物原貌校准、历史颜料复原或苏绣线色号。
2. **传统色为社区资料。** Chinese Traditional Colors 的色名、RGB/HEX 由开源维护者整理，不能标为国家标准、权威博物馆命名或传统配色学的唯一依据。
3. **Radix 是现代设计系统。** 它的色阶用于屏幕UI和现代设计，与中国古代纹样的颜色研究不是同一性质；我们的六色搭配是站内二次编排而非 Radix 官方预设配色。
4. **苏绣生产另需实物验证。** 屏幕HEX受色域、设备与环境影响，不等于真丝绣线物理色，不能直接对应厂商色号或自动生成可靠工艺方案。
5. **不宣称图像或传统色的著作权归属。** 软件代码、第三方数据、原作品图像和本项目的编排分别归属不同来源。

## 准确来源

### 1. 中华传统色资料

- 数据仓库：https://github.com/zerosoul/chinese-colors
- 数据文件：`src/assets/colors.json`
- 源代码与内容开源协议：https://github.com/zerosoul/chinese-colors/blob/master/LICENSE
- 名称与HEX来自社区整理的 161 个颜色；本次仅转成 `{id,name,hex,group,source,sourceUrl,license}`，未将第三方配色解释、海报和品牌视觉复制过来。
- **MIT LICENSE NOTICE（须随相关数据保留）**

```
MIT License

Copyright (c) 2019 Tristan Yang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 2. Radix Colors

- 仓库：https://github.com/radix-ui/colors
- 来源文件：https://github.com/radix-ui/colors/blob/main/src/light.ts
- 许可：https://github.com/radix-ui/colors/blob/main/LICENSE
- 31 个非 alpha 的 **sRGB HEX** 基础色阶，每个系列包含 12 色。排除透明度版和 display-p3 版，避免不可直接复制为6位 HEX 的资源。本站配色方案按色阶与对比色组合，不是 Radix 官方调色板系列。
- **MIT LICENSE NOTICE（须随相关数据保留）**

```
MIT License

Copyright (c) 2021-2022 Modulz
Copyright (c) 2022-Present WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 3. 克利夫兰艺术博物馆开放藏品

- 官方介绍：https://www.clevelandart.org/open-access
- 版权政策：https://www.clevelandart.org/terms-and-conditions
- 开放数据API：https://openaccess-api.clevelandart.org/
- 本项目使用 `content/patterns.json` 中现有的 **source=克利夫兰艺术博物馆 且 license=CC0** 条目。每条含原作链接、馆藏编号、许可与图片路径。
- 并未从博物馆网页抓取受限内容，也没有假定整站所有图片都有 CC0 授权。
- 提取脚本：`scripts/build-color-atlas-museum.py`；Python Pillow 中的 MEDIANCUT 颜色量化，短边图像缩至180像素内，再根据颜色占比和颜色距离选取6个色块，跳过近乎纯白背景和极黑色。**结果受数字图像、灯光、缩略图与算法影响，不可用于历史色彩断代。**
- 可溯源数据：`content/color-atlas-museum.json` 里每套保留 `artwork.accession`、`artwork.url`、`artwork.imagePath`、`artwork.license` 和数字提取说明。可点击每套卡片的“查看原始出处”复核。

## 网页接入点

- 色彩资料：`content/color-atlas-design.json`、`content/color-atlas-museum.json`
- 展示：`assets/color-atlas-page.js`、`assets/color-atlas.css`、`#palette`
- 生成可选预设：`assets/palette-presets.js`、`assets/museum-palette-presets.js`
- 故事纹样修改：`assets/engine.js`、`assets/story-page.js`
- **不改变**图片转数字绣稿用的独立 216 色 `digitalPalette`；其目的仍是图像近似色匹配，不应把界面扩展色卡直接当成新增工业线号或厂商色表。
