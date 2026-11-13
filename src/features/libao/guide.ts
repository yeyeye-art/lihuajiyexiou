import {pageNames} from '../../utils/router.ts';

export interface Destination {page:string; href:string; description:string}
export const destinations:Destination[]=[
  {page:'home',href:'#home',description:'回到首页，查看主要体验入口。'},
  {page:'about',href:'#about',description:'查看功能边界、资料来源和隐私说明。'},
  {page:'library',href:'#library',description:'按题材、地区与资料类型查找纹样，查看来源。'},
  {page:'create',href:'#create',description:'照片转化和故事译绣在同一个工坊，选择一种方式开始。'},
  {page:'palette',href:'#palette',description:'查看东方色谱与配色资料。数字色值不等于实物绣线配方。'},
  {page:'xiaoli',href:'#xiaoli',description:'问针法、工艺与刺绣知识，回答附有资料出处。'},
  {page:'game',href:'#game',description:'进入六大绣境，选择章节和关卡。'},
  {page:'ar',href:'#ar',description:'阅读针法教学、查看数字示意；相机体验需要设备支持和你的授权。'},
  {page:'gallery',href:'#gallery',description:'浏览文创展示和资料，再进入试搭体验。'},
  {page:'guide',href:'#guide',description:'浏览刺绣文化百科、学习路线和数字针迹实验室。'},
  {page:'profile',href:'#profile',description:'查看本机学习记录与已有账号、云存档入口。'},
  {page:'face',href:'#face',description:'选择文创物件试搭；使用相机需要你的授权。'},
  {page:'search',href:'#search',description:'搜索绣品、针法和灵感资料。'},
  {page:'exhibit',href:'#exhibit',description:'查看梨花新绣的展陈内容。'},
  {page:'collaborate',href:'#collaborate',description:'了解如何通过公开仓库参与协作修改。'},
];
export const destinationName=(item:Destination)=>pageNames[item.page]||item.page;
export interface Help {text:string; links:Destination[]; handoff?:string;tour?:TourId}
const links=(...pages:string[])=>pages.flatMap(page=>destinations.filter(d=>d.page===page));
export function pageHelp(page:string,param=''):Help{
  const descriptions:Record<string,string>={
    home:'先选一件想做的事：找纹样、做绣稿，或者学一种针法。我可以带你走一小段，也可以直接带你去入口。',
    library:'输入题材或名称，再按资料类型和地区筛选。打开喜欢的纹样后，先查看来源和使用说明。',
    create:param==='text'?'写下故事，在故事译绣中选择纹样，再继续制作参考稿。照片转化就在同一页的另一个选项里。':'选择有权使用的图片，调整线色和线距，确认使用权限后生成参考稿。也可以先用页面中的示例。结果只留在当前页面，请及时下载。',
    palette:'从色谱中选择颜色或配色资料。显示的是数字参考色，实际绣线还需要看材料和光线。',
    xiaoli:'把具体问题写给小梨。点回答中的〔数字〕查看出处；不明白时可选“太复杂”，想练习时可选“想看示范”。',
    guide:'可以按主题浏览百科，也可以打开学习路线或数字针迹实验室。想直接提问，去“问问小梨”。',
    gallery:'这里是文创展示资料，可以查看细节和来源；没有购买、支付流程。',
    profile:'本机学习记录与云存档是不同的保存方式。请以页面显示的登录和同步结果为准。',
    ar:'按页面提示选择针法或体验。只有进入相机体验并授权后才使用摄像头；不支持时仍可阅读资料。',
    face:'先选展示物件，再按页面提示进行试搭。相机是否可用取决于设备与授权。',
    game:'选择绣境、章节和可玩的关卡。玩游戏时我会隐藏，避免挡住棋盘。',
    search:'在搜索框输入绣品、针法或灵感关键词，再打开对应结果查看资料。',
    exhibit:'浏览梨花新绣的展陈内容，再根据页面入口查看相关文创资料。',
    collaborate:'这里介绍项目协作方式。修改公开代码需要通过 GitHub 仓库提交，没有站内假登录。',
  };
  return {text:descriptions[page]||'告诉我你想找什么，我会提供网站上真实存在的入口。',links:page==='create'?links('library','palette'):page==='guide'?links('xiaoli','ar'):links('library','create','xiaoli')};
}
export function guideAnswer(raw:string,page:string,param='',previous?:Help):Help{
  const question=raw.trim().slice(0,500),q=question.toLowerCase().replace(/\s/g,'');
  if(!q)return pageHelp(page,param);
  if(/^(你好|您好|你是谁|梨宝|hello|hi)[！!。？?]*$/.test(q))return {text:'我是梨宝，帮你找到入口、看懂页面和走完一段操作。刺绣知识可以交给小梨。',links:links('library','create','xiaoli')};
  if(/^(那|这个|它|然后|接下来|那这个|那它)?(呢|怎么用|怎么操作|怎么开始|怎么做|下一步)[？?。！!]*$/.test(q)&&previous?.links.length===1){
    const destination=previous.links[0];
    return {...pageHelp(destination.page,destination.href==='#create/text'?'text':''),links:[destination],tour:destination.href==='#create'?'photo':undefined};
  }
  if(/第一次|新手|带我(逛|看看|参观)|导览/.test(q))return {...pageHelp('home'),tour:'visit'};
  if(/失败|打不开|没反应|不能|无法/.test(q))return {text:'先看当前页面的错误提示：资料未加载可尝试重试；生成参考稿前需要确认图片使用权限；相机需要设备支持和授权。我不会代替你修改权限或清除存档。',links:links('about','profile','xiaoli')};
  if(/保存|隐私|上传.*(服务器|云端|吗)|数据/.test(q))return {text:'照片转化在浏览器本机处理，当前照片和参考稿刷新后会清除，请先下载。学习记录和游戏云存档各有自己的保存方式，不能把它们都当作临时数据。',links:links('create','profile')};
  if(/小梨|问答|百科/.test(q))return {text:'小梨在独立的“问问小梨”页面，专门讲解刺绣知识。你也可以先浏览百科。',links:links('xiaoli','guide')};
  if(/针法|苏绣|湘绣|蜀绣|粤绣|滚针|散套|历史|沈寿|为什么|怎么绣/.test(q))return {text:'这个问题适合请小梨结合资料讲解。我可以把原问题放进她的输入框，由你确认后发送。',links:[],handoff:question};
  if(/故事|文字/.test(q))return {text:'故事译绣和照片转化是同一个工坊里的两个功能。',links:[{page:'create',href:'#create/text',description:'打开故事译绣'}]};
  const mapping:[RegExp,string][]=[[/照片|绣稿|上传|图片转|工坊/,'create'],[/颜色|配色|色谱|色卡/,'palette'],[/纹样|图案|花纹|灵感/,'library'],[/游戏|玩|三消|关卡|绣境地图/,'game'],[/试搭|试戴/,'face'],[/相机|扫描|(?:^|[^a-z])ar(?:$|[^a-z])|增强现实/,'ar'],[/文创|绣馆/,'gallery'],[/记录|账号|云存档|登录/,'profile'],[/首页|主页/,'home'],[/搜索|查找/,'search'],[/协作|贡献|开源/,'collaborate'],[/新绣|展陈/,'exhibit']];
  const found=mapping.find(([pattern])=>pattern.test(q));
  if(found){const target=links(found[1]);const how=/怎么|教我|步骤/.test(q);return {text:how?pageHelp(found[1]).text:target[0].description,links:target,tour:found[1]==='create'?'photo':undefined};}
  if(/这[一]?页|这里|当前|怎么用|怎么开始/.test(q))return pageHelp(page,param);
  return {text:'还不确定你想找哪个功能。可以说“找纹样”“用照片做绣稿”“去玩游戏”，或把刺绣问题交给小梨。',links:links('library','create','xiaoli')};
}

export type TourId='visit'|'photo'|'learn';
export type Gate='image'|'generated'|'answer'|'played';
export interface GuideStep {route:string;target:string;title:string;text:string;next?:string;gate?:Gate}
export const tours:Record<TourId,{title:string;steps:GuideStep[]}>= {
  visit:{title:'第一次逛梨花季',steps:[
    {route:'#home',target:'.hero-cta',title:'从一件想做的事开始',text:'首页的“开始译绣”进入创作工坊。我们先去看能作为灵感的纹样资料。',next:'去看纹样'},
    {route:'#library',target:'.filter-bar',title:'找到喜欢的纹样',text:'这里可以搜索题材，按资料类型和地区筛选。每份资料的来源和使用说明需要分别查看。',next:'认识译绣工坊'},
    {route:'#create',target:'.studio-modes',title:'两种方式，一个工坊',text:'照片转化从图片开始；故事译绣从文字和已有纹样开始。切换功能时保留当前页面未完成的内容。',next:'认识小梨'},
    {route:'#xiaoli',target:'.xiaoli-dialogue-title',title:'问题交给小梨',text:'小梨负责讲刺绣知识，我负责带路。随时打开右下角梨宝，可以重新导览或查看这一页的用法。'},
  ]},
  photo:{title:'用照片制作绣稿',steps:[
    {route:'#create',target:'[data-guide="photo-source"]',title:'先选一张图片',text:'选择自己有权使用的图片，也可以用当前示例体验。图片读取成功后，再进入下一步；文件不会由梨宝上传。',next:'使用当前图片',gate:'image'},
    {route:'#create',target:'#create-form',title:'调整后实际生成',text:'调整名称、线色与线距，确认图片使用权限，再点击“生成工艺参考稿”。成功生成后才可以进入下一步。',next:'查看生成结果',gate:'generated'},
    {route:'#create',target:'#result .row',title:'保存你的参考稿',text:'结果已生成。可自行下载 SVG 绣稿或针路 CSV；结束导览不会替你下载，也不代表可以直接生产，请先试绣小样。'},
  ]},
  learn:{title:'跟小梨学一种针法',steps:[
    {route:'#xiaoli',target:'.xiaoli-dialogue form',title:'先问滚针怎么理解',text:'我已把问题放入输入框，请确认后点击发送。小梨给出有出处的滚针回答后，我们继续。',next:'阅读小梨的回答',gate:'answer'},
    {route:'#xiaoli',target:'.xiaoli-messages',title:'读回答，也看出处',text:'点〔数字〕可展开来源。这里的数字针法示意用于理解路径，不能替代真实刺绣教学。下一步带你打开滚针练习。',next:'打开滚针示范'},
    {route:'#guide/practice-demo-gun-basic',target:'#lab-ordinary-controls',title:'亲自看一针怎样走',text:'点击“播放”或“下一针”，观察滚针路径。出现实际播放进度后可结束导览；这只记录导览完成，不代表掌握了针法。',gate:'played'},
  ]},
};
export interface GateSnapshot {imageReady:boolean;generated:boolean;answered:boolean;played:boolean}
export function gatePassed(gate:Gate|undefined,snapshot:GateSnapshot):boolean{
  return !gate||({image:snapshot.imageReady,generated:snapshot.generated,answer:snapshot.answered,played:snapshot.played})[gate];
}
export const gateHints:Record<Gate,string>={image:'图片尚未读取成功，请重新选择图片或等候加载。',generated:'还没有生成结果。请在表单中确认使用权限，并实际点击生成；若失败，请查看表单里的提示。',answer:'还没有收到滚针资料回答。请确认问题后发送，资料加载失败时可在小梨页面重试。',played:'还没有实际播放进度。请等待练习载入，点击“播放”或“下一针”。'};
export const quietPage=(page:string)=>['game','ar','face'].includes(page);
