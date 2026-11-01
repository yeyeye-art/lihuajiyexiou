/**
 * libao-knowledge.js —— 梨宝引导知识库 & 问答引擎
 *
 * 目的：给梨宝灵宠一套"引导用户怎么用梨花季"的本地问答能力。
 * 纯静态、纯前端、关键词命中 → 返回介绍 / 指引 / 跳转建议。
 */

// ---------------------------------------------------------------------------
// 板块介绍：每个路由的用途 + 一句话说明
// ---------------------------------------------------------------------------
export const SITE_GUIDE = [
  {
    key: 'home',
    name: '首页',
    glyph: '🏠',
    href: '#home',
    desc: '梨花季·译绣的入口，一句话介绍和快捷入口。',
    keywords: ['首页', '主页', '开始', '从哪开始', 'home', '入口'],
  },
  {
    key: 'library',
    name: '灵感纹样',
    glyph: '🌸',
    href: '#library',
    desc: '600+ 苏绣纹样档案，按题材、针法、年代检索浏览。',
    keywords: ['灵感', '纹样', '图案', '花纹', '参考图', '图库', 'library', 'flower', '找纹样'],
  },
  {
    key: 'palette',
    name: '配色档案馆',
    glyph: '🎨',
    href: '#palette',
    desc: '苏绣传统线色卡，按色系、年代、工艺筛选，支持配色预览。',
    keywords: ['配色', '颜色', '色卡', '线色', '调色', '色彩', 'palette', '颜色搭配'],
  },
  {
    key: 'create',
    name: '译绣工坊',
    glyph: '🧵',
    href: '#create',
    desc: '上传图片 → 分色 → 自动生成针路 → 下载绣稿 SVG。全在本机处理。',
    keywords: ['译绣', '工坊', '生成绣稿', '图片转刺绣', '分色', '针路', 'create', '绣稿'],
  },
  {
    key: 'story',
    name: '故事译绣',
    glyph: '📖',
    href: '#story',
    desc: '从一段故事或关键词出发，AI 生成独特的故事纹样，再进译绣工坊细化。',
    keywords: ['故事', '故事译绣', 'AI 纹样', '生成纹样', 'story', '文字生成'],
  },
  {
    key: 'ar',
    name: 'AR 绣境体验',
    glyph: '👁️',
    href: '#ar',
    desc: '散套针数字显影、绣娘空间导览。需浏览器支持 WebXR，手机上更精彩。',
    keywords: ['ar', '增强现实', '绣境', '显影', '散套针', '导览', '相机', '扫描'],
  },
  {
    key: 'gallery',
    name: '梨花绣馆',
    glyph: '🏛️',
    href: '#gallery',
    desc: '75 件文创资料：眼罩、丝巾、团扇、手链……看传统手艺的当代表达。',
    keywords: ['绣馆', '文创', '商品', '眼罩', '丝巾', '团扇', 'gallery', '产品'],
  },
  {
    key: 'game',
    name: '绣镜奇遇',
    glyph: '🎮',
    href: '#game',
    desc: '六大绣境：三消、连连看、拼图、填色、绣样创作与记忆配对，共125关。',
    keywords: ['游戏', '小游戏', '三消', '花园', '玩', 'game', '消消乐', '地图'],
  },
  {
    key: 'guide',
    name: '苏绣知识库',
    glyph: '📚',
    href: '#guide',
    desc: '针法、流派、历史、工艺……刺绣百科。点右侧 3D 小梨顾问提问。',
    keywords: ['知识', '百科', '针法', '苏绣历史', '流派', 'guide', '问答', '小梨', '绣娘'],
  },
  {
    key: 'profile',
    name: '我的',
    glyph: '👤',
    href: '#profile',
    desc: '你译绣过的稿、生成的纹样、收藏的文创。本机保存，不上传。',
    keywords: ['我的', '个人', '收藏', '历史', '记录', 'profile', '账号'],
  },
  {
    key: 'about',
    name: '关于',
    glyph: 'ℹ️',
    href: '#about',
    desc: '梨花季·译绣是什么、怎么做的、数据处理方式。',
    keywords: ['关于', '介绍', '隐私', '功能说明', 'about'],
  },
  {
    key: 'collaborate',
    name: '协作修改',
    glyph: '🤝',
    href: '#collaborate',
    desc: '和朋友一起完善梨花季，提交建议、补充纹样档案。',
    keywords: ['协作', '贡献', '修改', '一起做', 'github', 'collaborate'],
  },
];

// ---------------------------------------------------------------------------
// 固定问答（Markdown 格式）
// ---------------------------------------------------------------------------
const FALLBACK_QA = [
  {
    keywords: ['你是谁', '你好', 'hi', 'hello', '介绍自己', '自我介绍', '功能'],
    answer:
      '嗨！我是 **梨宝** 🍐，梨花季·译绣的全站灵宠。\n\n' +
      '我可以：\n' +
      '- 🧭 告诉你每个板块是干什么的\n' +
      '- 💬 回答苏绣相关的问题\n' +
      '- 🎯 帮你跳到想去的页面\n\n' +
      '试试问我："怎么生成绣稿？"、"AR 怎么玩？"、"绣馆有什么？"',
  },
  {
    keywords: ['怎么用', '怎么玩', '怎么开始', '新手', '教程', '入门'],
    answer:
      '第一次来？推荐这条路线：\n\n' +
      '1. [去灵感纹样](#library) 看看 600+ 档案里喜欢哪种\n' +
      '2. [去译绣工坊](#create) 上传一张照片，生成专属绣稿\n' +
      '3. [去 AR 绣境](#ar) 看针法显影，手机上最有意思\n\n' +
      '想玩小游戏？[绣镜奇遇](#game) 等你哦 🎮',
  },
  {
    keywords: ['小梨', '绣娘', '顾问', '3d'],
    answer:
      '小梨在 **苏绣知识库** 页面右侧的 3D 顾问区哦！\n\n' +
      '她对苏绣知识特别熟，问她针法、流派、历史都可以。\n' +
      '[点我直接去苏绣知识库](#guide)，进去就能看到她啦 🍐',
    route: '#guide',
  },
  {
    keywords: ['梨宝', '你自己', '灵宠', '你'],
    answer:
      '我呀～我是 🍐 梨宝！梨花季·译绣的全站灵宠 + 引导助手。\n\n' +
      '我知道每个板块怎么用，有问题尽管问我！',
  },
  {
    keywords: ['上传', '图片', '隐私', '安全'],
    answer:
      '放心！梨花季 **所有图片都在你本机处理**，不上传任何服务器。\n\n' +
      '你看到的纹样生成、针路计算、分色都是浏览器里跑的，刷新页面就清空。',
  },
  {
    keywords: ['语音', '说话', '麦克风', '听'],
    answer:
      '点击我气泡里的 🎤 按钮，允许麦克风权限后就能说话啦！\n\n' +
      'Web Speech API 在 Chrome / Edge / Safari 桌面和移动端都支持。',
  },
  {
    keywords: ['谢谢', '感谢', '好', '棒'],
    answer: '不客气～有问题随时叫我 🍐 梨宝一直在右下角！',
  },
  {
    keywords: ['再见', '拜拜', 'bye'],
    answer: '👋 下次见！点我随时回来～',
  },
];

// ---------------------------------------------------------------------------
// 问答引擎：输入 → { answer, route? }
// answer 为 Markdown 格式，渲染层统一调用 renderMarkdown
// ---------------------------------------------------------------------------
export function askLibao(userText) {
  const text = (userText || '').trim().toLowerCase();
  if (!text) return { answer: '嗯？你想说什么？', route: null };

  // 1) 先匹配板块（最直接）
  for (const g of SITE_GUIDE) {
    if (g.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return {
        answer: `**${g.glyph} ${g.name}**\n\n${g.desc}\n\n[→ 去 ${g.name}](${g.href})`,
        route: g.href,
      };
    }
  }

  // 2) 固定问答
  for (const qa of FALLBACK_QA) {
    if (qa.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return { answer: qa.answer, route: qa.route || null };
    }
  }

  // 3) 兜底：推荐几个常用入口
  return {
    answer:
      '这个我还不太懂呢 😅 试试问我：\n\n' +
      '- "怎么生成绣稿" → [译绣工坊](#create)\n' +
      '- "AR 怎么玩" → [AR 绣境](#ar)\n' +
      '- "纹样图书馆" → [灵感纹样](#library)\n' +
      '- "绣馆有什么" → [梨花绣馆](#gallery)',
    route: null,
  };
}

// ---------------------------------------------------------------------------
// 首次欢迎语（Markdown 格式，由 renderMarkdown 渲染）
// ---------------------------------------------------------------------------
export const WELCOME_MSG =
  '嗨～我是 **🍐 梨宝**！梨花季·译绣的全站灵宠。\n\n' +
  '我可以：\n' +
  '- 🧭 告诉你每个板块是干啥的\n' +
  '- 💬 回答苏绣相关的问题\n' +
  '- 🎯 帮你跳到想去的地方\n\n' +
  '试试问我：';

// ---------------------------------------------------------------------------
// 语音识别可用性检测
// ---------------------------------------------------------------------------
export function speechRecognitionAvailable() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createSpeechRecognizer({ onResult, onError, onStart, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = 'zh-CN';
  rec.interimResults = true;
  rec.continuous = false;
  rec.onstart = () => onStart && onStart();
  rec.onend = () => onEnd && onEnd();
  rec.onerror = (e) => onError && onError(e);
  rec.onresult = (e) => {
    let final = '';
    let interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    onResult && onResult(final || interim);
  };
  return rec;
}

// ---------------------------------------------------------------------------
// 轻量 Markdown 渲染器（梨宝回复专用）
// 支持：**粗体**、*斜体*、-/*/1. 列表、[链接](url)、--- 分割线、换行
// ---------------------------------------------------------------------------
export function renderMarkdown(text) {
  if (!text) return '';
  let s = String(text);

  // 1) 转义 HTML 特殊字符（保留安全标签后面再反转）
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  s = s.replace(/[&<>]/g, (c) => ESC_MAP[c]);

  // 2) 处理链接 [text](url) — 先处理行内链接
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) =>
    `<a href="${href}">${label}</a>`);

  // 3) 行内样式 **粗体** → <b>；*斜体* → <i>
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');

  // 4) 分割线 ---
  s = s.replace(/^---\s*$/gm, '<hr>');

  // 5) 列表行：- xxx / * xxx / 1. xxx → 收集后包装成 <ul> / <ol>
  const lines = s.split('\n');
  const result = [];
  let listType = null; // 'ul' | 'ol' | null
  let listItems = [];

  function flushList() {
    if (!listType) return;
    result.push(`<${listType}>${listItems.join('')}</${listType}>`);
    listType = null;
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ulMatch = line.match(/^\s*[-*]\s+(.+)/);
    const olMatch = line.match(/^\s*\d+\.\s+(.+)/);

    if (ulMatch) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(`<li>${olMatch[1]}</li>`);
    } else if (line.trim() === '' || line.trim() === '<hr>') {
      flushList();
      if (line.trim() === '') result.push('');
      else result.push('<hr>');
    } else {
      flushList();
      result.push(line);
    }
  }
  flushList();

  // 6) 段落 → <p>
  let html = result
    .join('\n')
    .split(/\n{2,}/)
    .map((seg) => {
      seg = seg.trim();
      if (!seg) return '';
      if (seg.startsWith('<ul>') || seg.startsWith('<ol>') || seg.startsWith('<hr>')) return seg;
      // 单行列表后的独立段落
      if (seg.includes('<ul>') || seg.includes('<ol>')) return seg;
      return `<p>${seg.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('');

  return html;
}
