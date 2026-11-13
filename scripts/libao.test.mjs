import test from 'node:test';
import assert from 'node:assert/strict';
import {destinations,guideAnswer,pageHelp,tours,gatePassed,quietPage} from '../src/features/libao/guide.ts';
import {queueQuestion,takeQuestion} from '../src/features/libao/handoff.ts';
import {parseHash,pageNames} from '../src/utils/router.ts';
import {beginListening,voiceError} from '../src/features/libao/voice.ts';

test('Specific requests beat generic how-to language and follow-up keeps the selected destination',()=>{
 const photo=guideAnswer('照片转绣稿怎么用','home');assert.equal(photo.links[0].href,'#create');assert.equal(photo.tour,'photo');
 const follow=guideAnswer('那怎么操作？','home','',photo);assert.equal(follow.links[0].href,'#create');assert.match(follow.text,/使用权限/);
 assert.equal(guideAnswer('图片在哪里上传','home').links[0].href,'#create');
 assert.equal(guideAnswer('试戴在哪里','home').links[0].href,'#face');
 assert.equal(guideAnswer('第一次来，带我逛逛','home').tour,'visit');
 assert.match(guideAnswer('照片会上传服务器吗','home').text,/本机处理/);
 assert.deepEqual(new Set(destinations.map(item=>item.page)),new Set(Object.keys(pageNames)));
});

test('Speech uses explicit one-shot Chinese recognition and ignores late results after disposal',()=>{
 let instance,ended=0;const texts=[],statuses=[];
 class Recognition {constructor(){instance=this;}start(){this.started=true;}stop(){this.stopped=true;}abort(){this.aborted=true;}}
 const session=beginListening(Recognition,{text:value=>texts.push(value),status:value=>statuses.push(value),end:()=>ended++});
 assert(instance.started);assert.equal(instance.lang,'zh-CN');assert.equal(instance.continuous,false);
 instance.onresult({resultIndex:0,results:[{isFinal:false,0:{transcript:'未完成'}}]});assert.equal(texts.length,0);
 instance.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'  我想找纹样  '}}]});assert.deepEqual(texts,['我想找纹样']);
 session.stop();assert(instance.stopped);instance.onend();assert.equal(ended,1);assert.match(statuses.at(-1),/修改/);
 const late=instance.onresult;session.dispose();late({resultIndex:0,results:[{isFinal:true,0:{transcript:'不应该出现'}}]});assert.equal(texts.length,1);assert(instance.aborted);
});

test('Speech errors, unavailable permissions and timeout return to typing without loops',t=>{
 t.mock.timers.enable({apis:['setTimeout']});let instance,ended=0,status='';
 class Recognition {constructor(){instance=this;}start(){}stop(){}abort(){this.aborted=true;}}
 const callbacks={text:()=>assert.fail('Must not fabricate transcript'),status:value=>status=value,end:()=>ended++};
 const first=beginListening(Recognition,callbacks);instance.onerror({error:'not-allowed'});assert.equal(ended,1);assert.match(status,/授权/);first.dispose();
 const second=beginListening(Recognition,callbacks);t.mock.timers.tick(20001);assert(instance.aborted);assert.equal(ended,2);assert.match(status,/到时/);second.dispose();
 assert.match(voiceError('network'),/连不上/);assert.match(voiceError('no-speech'),/没有听清楚/);
});

test('Libao routes follow the current studio and Xiaoli destinations',()=>{
 for(const item of destinations){assert(pageNames[item.page]);assert.equal(parseHash(item.href).page,item.page);}
 assert.equal(guideAnswer('故事译绣在哪里','home').links[0].href,'#create/text');
 assert.equal(guideAnswer('小梨在哪里','home').links[0].href,'#xiaoli');
 assert.equal(guideAnswer('我想用照片做绣稿','home').links[0].href,'#create');
 assert.equal(guideAnswer('去玩游戏','home').links[0].href,'#game');
 assert.equal(guideAnswer('东方色谱在哪','home').links[0].href,'#palette');
});
test('Libao offers a handoff instead of inventing cultural facts or sending automatically',()=>{
 const q='滚针和散套针有什么区别？';const reply=guideAnswer(q,'home');
 assert.equal(reply.handoff,q);assert.equal(reply.links.length,0);
 queueQuestion(q);assert.equal(takeQuestion(),q);assert.equal(takeQuestion(),'');
 queueQuestion('长'.repeat(700));assert.equal(takeQuestion().length,500);
 const unknown=guideAnswer('火星天气','home');assert.match(unknown.text,/不确定/);assert(!unknown.handoff);
});
test('Tours remain short and each uses a real current route; no arbitrary navigation input',()=>{
 assert.equal(Object.keys(tours).length,3);
 for(const tour of Object.values(tours)){
  assert(tour.steps.length>=3&&tour.steps.length<=5);
  for(const step of tour.steps){assert(pageNames[parseHash(step.route).page]);assert(step.target);}
 }
 assert.equal(tours.learn.steps.at(-1).route,'#guide/practice-demo-gun-basic');
});
test('Tour task gates never claim a failed or unperformed operation is complete',()=>{
 const empty={imageReady:false,generated:false,answered:false,played:false};
 for(const gate of ['image','generated','answer','played'])assert.equal(gatePassed(gate,empty),false);
 assert.equal(gatePassed('generated',{...empty,imageReady:true}),false);
 assert.equal(gatePassed('generated',{...empty,generated:true}),true);
 assert.equal(gatePassed('answer',{...empty,answered:true}),true);
 assert.equal(gatePassed('played',{...empty,played:true}),true);
 assert.equal(gatePassed(undefined,empty),true);
});
test('Page guidance respects the two studio modes and hides on active game/camera pages',()=>{
 assert.match(pageHelp('create','text').text,/故事/);assert.match(pageHelp('create').text,/使用权限/);
 for(const page of ['game','ar','face'])assert(quietPage(page));
 for(const page of ['home','xiaoli','guide','create'])assert(!quietPage(page));
 assert.match(guideAnswer('照片会保存吗','create').text,/云存档/);
});
