"""Browser UI checks with an explicitly simulated Speech API; not a microphone quality test."""
import argparse,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

parser=argparse.ArgumentParser()
parser.add_argument('--url',required=True)
parser.add_argument('--output',default='outputs/libao-voice')
parser.add_argument('--browser')
args=parser.parse_args()
base=args.url.split('#')[0]+'#home'
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
mock="""(()=>{
window.voiceProbe={starts:0,aborts:0,spoken:[],cancelled:0};
class Recognition{
 constructor(){window.testRecognition=this;}
 start(){window.voiceProbe.starts++;}
 stop(){this.onend?.();}
 abort(){window.voiceProbe.aborts++;this.onend?.();}
}
window.SpeechRecognition=Recognition;
window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
const synth=new EventTarget();
synth.getVoices=()=>[{name:'Test Chinese (simulated)',voiceURI:'test-local-zh',lang:'zh-CN',localService:true}];
synth.speak=item=>{window.voiceProbe.spoken.push(item.text);item.onstart?.();};
synth.cancel=()=>window.voiceProbe.cancelled++;
Object.defineProperty(window,'speechSynthesis',{value:synth});
})();"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.browser,headless=True,args=['--enable-unsafe-swiftshader'])
 context=b.new_context(viewport={'width':1440,'height':1000},service_workers='block',reduced_motion='reduce')
 context.add_init_script(mock)
 page=context.new_page();page.set_default_timeout(60000);page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(base,wait_until='domcontentloaded');page.locator('.hero-cta').wait_for()
 welcome=page.get_by_role('complementary',name='梨宝迎宾');welcome.wait_for()
 assert page.locator('.driver-overlay').count()==0
 assert page.evaluate('window.voiceProbe.starts===0 && window.voiceProbe.spoken.length===0')
 assert not welcome.evaluate('(e)=>e.contains(document.activeElement)')
 page.screenshot(path=str(out/'desktop-welcome.png'))
 page.get_by_role('button',name='先自己看看',exact=True).click()
 page.reload(wait_until='domcontentloaded');page.locator('.hero-cta').wait_for();page.wait_for_timeout(1500)
 assert page.locator('.libao-welcome').count()==0
 checks.append('Welcome appears without taking focus, navigation or microphone; dismissal persists')
 page.get_by_role('button',name='打开梨宝导览',exact=True).click()
 page.get_by_text('和梨宝说话',exact=True).click()
 listen=page.get_by_role('button',name='按一下说话',exact=True)
 expect(listen).to_be_disabled()
 page.get_by_label('我了解并愿意使用浏览器语音识别',exact=True).check()
 listen.click();assert page.evaluate('window.voiceProbe.starts===1')
 page.evaluate("window.testRecognition.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'我想用照片做绣稿'}}]});window.testRecognition.onend()")
 expect(page.locator('#libao-question')).to_have_value('我想用照片做绣稿')
 assert page.locator('.libao-answer a[href="#create"]').count()==1
 page.get_by_role('button',name='找入口',exact=True).click()
 expect(page.locator('.libao-answer')).to_contain_text('一步步教我')
 assert page.evaluate("location.hash==='#home'")
 page.locator('#libao-question').fill('那怎么操作？');page.get_by_role('button',name='找入口',exact=True).click()
 expect(page.locator('.libao-answer')).to_contain_text('调整线色和线距')
 checks.append('Simulated speech requires consent, creates editable text, and waits for explicit submit/navigation; follow-up works')
 # Error restores the microphone button, and typed guidance remains available.
 listen.click();page.evaluate("window.testRecognition.onerror({error:'not-allowed'});window.testRecognition.onend()")
 expect(page.locator('.libao-voice')).to_contain_text('麦克风未获授权')
 expect(listen).to_be_enabled()
 listen.click();page.get_by_text('听梨宝讲 · 设备朗读',exact=True).click()
 page.get_by_role('button',name='朗读这条回答',exact=True).click()
 assert page.evaluate('window.voiceProbe.aborts>0 && window.voiceProbe.spoken.length===1')
 page.get_by_role('button',name='停止朗读',exact=True).click()
 assert page.evaluate('window.voiceProbe.cancelled>0')
 listen.click();before=page.evaluate('window.voiceProbe.aborts')
 page.get_by_role('button',name='收起',exact=True).click()
 assert page.evaluate('window.voiceProbe.aborts')>before
 checks.append('Simulated permission errors recover; starting playback ends recording; close aborts recording and cleans listeners')
 page.get_by_role('button',name='打开梨宝导览',exact=True).click()
 page.get_by_text('每一页有什么',exact=True).click()
 assert page.locator('.libao-directory nav a').count()==15
 page.set_viewport_size({'width':390,'height':844})
 box=page.locator('.libao-panel').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390 and box['y']>=0
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.screenshot(path=str(out/'mobile-guide.png'))
 # In unsupported browsers the guide remains fully usable.
 unavailable=b.new_context(viewport={'width':390,'height':844},service_workers='block',reduced_motion='reduce')
 unavailable.add_init_script("Object.defineProperty(window,'SpeechRecognition',{value:undefined});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined});")
 mobile=unavailable.new_page();mobile.set_default_timeout(60000)
 mobile.goto(base,wait_until='domcontentloaded');mobile.locator('.hero-cta').wait_for();mobile.locator('.libao-welcome').wait_for()
 box=mobile.locator('.libao-welcome').bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=390
 mobile.screenshot(path=str(out/'mobile-welcome.png'))
 mobile.get_by_role('button',name='我想找个功能',exact=True).click();mobile.get_by_text('和梨宝说话',exact=True).click()
 expect(mobile.locator('.libao-voice')).to_contain_text('此浏览器没有语音输入')
 mobile.locator('#libao-question').fill('我想玩游戏');mobile.get_by_role('button',name='找入口',exact=True).click()
 expect(mobile.locator('.libao-answer a')).to_have_attribute('href','#game')
 mobile.locator('.libao-answer a').click();mobile.locator('.libao-guide').wait_for(state='detached')
 checks.append('Mobile welcome/panel fit; every named route listed; unsupported recognition falls back to text; game hides guide')
 assert not errors,errors
 result={'passed':True,'checks':checks,'errors':errors,'speechAPI':'simulated; real microphone, service availability and listening quality require device acceptance'}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(result,ensure_ascii=False));b.close()
