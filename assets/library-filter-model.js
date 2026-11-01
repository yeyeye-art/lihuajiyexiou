/**
 * Presentation-only search taxonomy for the existing unified 祥云纹样库.
 * Do not mutate source culture fields or invent cultural attribution.
 * Historical/legacy region names are mapped only when the equivalence is explicit.
 */
export const REGION_GROUPS=[
 {label:'中国与东亚',regions:['中国传统','东亚邻邦']},
 {label:'亚洲与丝路',regions:['东南亚','南亚','中亚','波斯与西亚']},
 {label:'地中海与欧洲',regions:['埃及与地中海','欧洲']},
 {label:'非洲与美洲',regions:['非洲','美洲']},
 {label:'跨区域与待细分',regions:['藏地与喜马拉雅','其他文化与待细分']}
];
const REGION_ALIASES=Object.freeze({
 '南亚织绣':'南亚',
 '东南亚织绣':'东南亚',
 '中亚与丝路':'中亚',
 '欧洲与其他传统':'其他文化与待细分',
 '藏地与喜马拉雅':'藏地与喜马拉雅'
});
export function canonicalRegion(record){
 const name=String(record?.region||'').trim();
 return REGION_ALIASES[name]||name||'其他文化与待细分';
}

export const STYLE_GROUPS=[
 {label:'造型与呈现方式',styles:[
  {value:'element',label:'独立基础元素'},
  {value:'basic',label:'简约传统纹样'},
  {value:'archive',label:'复合装饰纹样'},
  {value:'museum',label:'馆藏原作参考'}]},
 {label:'图案与装饰语言',styles:[
  {value:'floral',label:'花卉与枝叶'},
  {value:'animal',label:'鸟兽与鱼虫'},
  {value:'nature',label:'云水与自然'},
  {value:'geometry',label:'几何与线条'},
  {value:'border',label:'连续纹与边饰'},
  {value:'symbol',label:'传统符号与装饰母题'}]}
];
const KEYWORDS={
 floral:/莲|荷|梅|牡丹|玫瑰|菊|花|叶|草|藤|枝|石榴|葡萄|果实|棕榈|植物|flor(?:al|a|istic)?|flower|lotus|petal|leaf|leaves|vine|foliage|botanic|blossom|grape|pomegranate|palmette|tendril/i,
 animal:/鸟|鹤|凤|蝶|鱼|虫|鹿|狮|象|马|孔雀|羽|龙|兽|bird|crane|phoenix|fish|butterfly|insect|feather|lion|deer|dragon|peacock|animal|faunal/i,
 nature:/祥云|云纹|云朵|云气|云水|水波|波浪|海浪|山形|火焰|太阳|月|雨滴|天象|cloud|wave|water|mountain|flame|sunburst|sun disk|raindrop/i,
 geometry:/回纹|几何|菱|格|星|连珠|圆点|条纹|网格|锯齿|螺旋|三角|八角|六角|线条|geo(?:metric|metry)?|diamond|lozenge|star|stripe|lattice|zigzag|spiral|square|circle|octagon|interlace/i,
 border:/边饰|边框|连续|重复|角隅|角纹|镶边|带状|织锦|花边|纹带|border|band|lace|repeat|continuous|trim|edging|frieze/i,
 symbol:/如意|八宝|结纹|福|寿|文化符号|曼荼罗|吉祥|回教星纹|徽记|圣树|ruyi|boteh|paisley|adinkra|mandala|emblem|symbol|knot|sigil/i
};
const searchText=row=>[row?.title,row?.originalTitle,row?.motifClass,row?.motif,row?.searchTerms,Array.isArray(row?.tags)?row.tags.join(' '):'',row?.description].filter(Boolean).join(' ');
export function matchesMotifStyle(row,value){
 if(!value)return true;
 if(value==='element')return row?.isBasicElement===true;
 if(value==='basic')return row?.collection==='basic'||row?.isBasicElement===true;
 if(value==='archive')return row?.collection==='archive'&&!row?.isWorldMotif;
 if(value==='museum')return row?.isWorldMotif===true;
 const rx=KEYWORDS[value];
 if(!rx)return false;
 if(value==='border'&&row?.elementForm==='repeatable')return true;
 if(row?.motifClass==='花卉枝叶果实'&&value==='floral')return true;
 if(row?.motifClass==='鸟兽鱼虫羽毛'&&value==='animal')return true;
 if(row?.motifClass==='自然云水天象'&&value==='nature')return true;
 if(row?.motifClass==='基础几何结构'&&value==='geometry')return true;
 if(row?.motifClass==='连续纹与边饰'&&value==='border')return true;
 if(row?.motifClass==='文化符号'&&value==='symbol')return true;
 return rx.test(searchText(row));
}
export function matchesMotifKeyword(row,keyword){
 const q=String(keyword||'').trim().toLocaleLowerCase();
 if(!q)return true;
 return [row?.id,row?.title,row?.originalTitle,row?.region,canonicalRegion(row),row?.culture,row?.motif,row?.description,row?.source,row?.sourcePlatform,row?.museumObjectId,row?.accession,row?.date,row?.technique,row?.batch,row?.searchTerms,row?.motifClass,row?.elementForm,JSON.stringify(row?.tags||[])]
  .join(' ').toLocaleLowerCase().includes(q);
}
export function filteredMotifs(rows,{keyword='',region='',style=''}={}){
 return rows.filter(row=>(!region||canonicalRegion(row)===region)&&matchesMotifStyle(row,style)&&matchesMotifKeyword(row,keyword));
}
