// Shared by GitHub Pages' citation-only guide and the optional Cloudflare model backend.
// This does NOT prove historical accuracy; it prevents obvious topic drift and unsupported
// answer generation when the curated corpus contains no subject or claimed fact.
const tidy=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s，。？！、“”《》：；,.!?()（）【】\-]+/g,'');
const subjects=[
 '苏绣','湘绣','粤绣','蜀绣','广绣','潮绣','顾绣','京绣','汴绣','羌绣','苗绣','马尾绣','水族马尾绣',
 '乱针绣','仿真绣','精微绣','双面绣','散套针','套针','滚针','打籽','平绣','刺绣','绣市','绣谱',
 '沈寿','杨守玉','丁佩','韩希孟','镇湖','苏州','苏绣研究所','顾文霞','姚建萍','姚惠芬',
 '巴勒斯坦','兹米扬涅','黎族','Chakan','Altiță','Antep','Kebaya','Zmijanje','Al Talli',
 '塔吉克斯坦','土耳其','印度','日本','四大名绣','大都会博物馆','馆藏编号'
];
const broad=new Set(['刺绣','苏州','印度','日本','绣谱','博物馆']);
const common=/^(清代|明代|元代|宋代|唐代|近代|现代|古代|传统|当代|中国|世界|文化|历史|年代|时期|起源|源流|由来|哪年|几年|什么|如何|怎么|为什么|哪些|那个|什么样|有哪些|有什么|有哪些|哪个|哪位|什么时候|谁|时间|地点|位置|是|的|吗|么|呢|吧|与|和|及|还|了|又|比较|区别|不同|差异|针法|特点|材料|方法|在哪里|在哪|在哪儿|属于|被|认定|列入|非遗|名录|意义|人物|有哪些|可以|简单|介绍|告诉我|讲讲|请问|你好|一下|请|问|我想知道|请介绍|我想了解|继续|详细|一点|到底|是否|曾经|在|有|它们|他们|那个|这个|关于|背景|故事|什么时候|开创|创制|怎么做|怎么绣|绣品|多少|类别|工艺|博物馆|实物|技术|请你|分别|各自|以及|发展|相关|记载|记录|官方|资料|体现|之中|这件|这些|那些|主要|特色|各有什么|又如何|能否|谈谈|和其他)$/;
const modifiers=['丝线','底布','材料','工艺','针法','年代','起源','历史','非遗','传承','创制','制法','特点','区别','图案','产地','馆藏','代表','文化','发展','意义','用途','影响','光影','技艺','保存','作者','刺绣','绣品','名录','源流','造型','双面','证明','证据','哪年','哪位','什么时候','传统'];
const family=subjects.filter(x=>x!=='刺绣').sort((a,b)=>b.length-a.length);
export function explicitEmbroiderySubjects(question){
 const text=tidy(question),found=[];
 for(const label of family){
  const needle=tidy(label);
  if(needle.length>1&&text.includes(needle)&&!found.some(name=>tidy(name).includes(needle)))found.push(label);
 }
 return found;
}
function corpusText(row){return tidy([row.title,row.summary,row.region,row.period,...(row.keywords||[]),...(row.facts||[])].join(' '))}
export function assessEvidenceCoverage(question,records,{minHits=1}={}){
 const q=tidy(question),names=explicitEmbroiderySubjects(question);
 if(q.length<2||q.length>320)return {allowed:false,reason:'question-length',anchors:names,records:[]};
 // Proper subject required for cultural answers. Generic words "history" and "museum"
 // are not evidence of which object or tradition the visitor is asking about.
 const specific=names.filter(x=>!broad.has(x));
 if(!specific.length)return {allowed:false,reason:'no-specific-embroidery-subject',anchors:names,records:[]};
 const matched=records.filter(row=>specific.some(x=>corpusText(row).includes(tidy(x))));
 if(matched.length<minHits)return {allowed:false,reason:'no-documented-subject',anchors:specific,records:[]};
 // Reject explicit dates, institutions, prizes, and unknown proper names unless they
 // occur in material documenting the requested subject. This is deliberately conservative.
 const supporting=matched.map(corpusText);
 const dateMatch=String(question).match(/(?:19|20)\d{2}年?/g)||[];
 for(const date of dateMatch){
  if(!supporting.some(s=>s.includes(tidy(date))))return {allowed:false,reason:'date-not-in-sources',anchors:specific,records:[]};
 }
 const remain=tidy(question)
  .replace(/(请问|请你|我想知道|我想了解|告诉我|可以|能否|是不是|是不是在|为什么|什么时候|什么|怎么|如何|有哪些|有什么|区别|比较|对比|分别|各自|历史|来源|起源|发源|来历|年代|针法|绣法|工艺|传统|特色|特点|非遗|名录|属于|是什么|有哪些|什么时候|那个|哪位|什么样|一件|这件|有哪些|怎样|为啥|是否|究竟|存在|争议|年份|创制|制作|谁|在|了|有|的|与|和|是|吗|呢|呀|啊|请|问|第|几|个|位|种|年|可以|请介绍|详细|介绍|说说|讲讲|理解|朝代|哪个|于|影响|发展|贡献|价值|对|与|具体|作品|两个|说法|应|怎样|针对|一下|那|他|她|它们|她们|他们|又|以及|其它|其他|各|都|这些|那些|那个|这个|关于|上面|刚才|相关|证据|多少|请帮我|真实|具体|方面)/g,'');
 let remainder=remain;
 for(const s of names)remainder=remainder.replaceAll(tidy(s),'');
 for(const m of modifiers)remainder=remainder.replaceAll(tidy(m),'');
 // Only long residuals indicate unsupported specific facts, rather than minor particles.
 const residual=remainder.match(/[\u3400-\u9fff]{2,}|[a-z]{4,}|\d{3,}/gi)||[];
 const unexplained=residual.filter(t=>!common.test(t)&&!supporting.some(doc=>doc.includes(tidy(t))));
 if(unexplained.length)return {allowed:false,reason:'specific-claim-not-in-sources',detail:unexplained.slice(0,3),anchors:specific,records:[]};
 return {allowed:true,reason:'documented',anchors:specific,records:matched};
}
