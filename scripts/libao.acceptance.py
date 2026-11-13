import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--url',required=True)
parser.add_argument('--output',default='outputs/libao')
parser.add_argument('--browser')
args=parser.parse_args()
base=args.url.split('#')[0]+'#home'
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
errors=[];checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.browser,headless=True,args=['--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000},service_workers='block',reduced_motion='reduce');page.set_default_timeout(30000)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base,wait_until='domcontentloaded',timeout=90000)
 page.locator('.hero-cta').wait_for(timeout=60000)
 page.get_by_role('button',name='打开梨宝导览',exact=True).wait_for()
 assert page.locator('.driver-popover').count()==0
 page.get_by_role('button',name='打开梨宝导览',exact=True).click()
 page.get_by_role('button',name='第一次逛梨花季',exact=False).wait_for()
 page.screenshot(path=str(out/'desktop-panel.png'),full_page=True)
 page.get_by_role('button',name='第一次逛梨花季',exact=False).click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('1/4')")
 page.screenshot(path=str(out/'visit-step1.png'),full_page=True)
 page.locator('.driver-popover-next-btn').click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('2/4')")
 assert page.evaluate("location.hash==='#library'")
 page.locator('.driver-popover-next-btn').click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('3/4')")
 page.locator('.driver-popover-next-btn').click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('4/4')")
 page.locator('.driver-popover-next-btn').click()
 page.locator('.libao-panel').wait_for();assert page.locator('.driver-popover').count()==0
 checks.append('visit tour crosses 4 real routes and completes without claiming user tasks')
 # Hand off the exact question, without auto-sending it.
 page.locator('#libao-question').fill('散套针怎么绣？');page.get_by_role('button',name='找入口',exact=True).click();page.get_by_role('button',name='把原问题交给小梨',exact=True).click()
 page.wait_for_function("document.querySelector('#xiaoli-question')?.value==='散套针怎么绣？'")
 assert page.locator('.xiaoli-message.user').count()==0
 checks.append('handoff preserves exact question in input and does not auto-send')
 # Photo guide: requires a real successful generation, and download remains the visitor's action.
 page.get_by_role('button',name='打开梨宝导览',exact=True).click();page.get_by_role('button',name='用照片制作绣稿',exact=False).click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('1/3')")
 page.wait_for_function("document.querySelector('#source-preview')?.naturalWidth>0")
 page.locator('.driver-popover-next-btn').click();page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('2/3')")
 page.locator('.driver-popover-next-btn').click();assert '2/3' in page.locator('.driver-popover-title').inner_text()
 page.keyboard.press('ArrowRight');assert '2/3' in page.locator('.driver-popover-title').inner_text()
 page.locator('#create-form input[name=size]').fill('5');page.locator('#create-form input[name=spacing]').fill('1.5');page.locator('#create-form input[type=checkbox]').check()
 page.locator('#generate').click();page.locator('#result #save-svg').wait_for(timeout=90000)
 page.locator('.driver-popover-next-btn').click();page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('3/3')")
 with page.expect_download() as download:page.locator('#save-svg').click()
 assert download.value.suggested_filename.endswith('.svg')
 page.screenshot(path=str(out/'photo-result.png'),full_page=True)
 page.locator('.driver-popover-next-btn').click();page.locator('.libao-panel').wait_for()
 checks.append('photo tour blocks next and keyboard skip before actual generation; real SVG download works')
 # Learning guide: user sends question, gets sources, then really advances stitch playback.
 page.get_by_role('button',name='跟小梨学一种针法',exact=False).click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('1/3')")
 assert page.locator('#xiaoli-question').input_value()=='滚针怎么理解？'
 page.locator('.driver-popover-next-btn').click();assert '1/3' in page.locator('.driver-popover-title').inner_text()
 page.get_by_role('button',name='发送 ↗',exact=True).click();page.locator('[data-libao-topic=gun][data-libao-answer]').last.wait_for()
 page.locator('.driver-popover-next-btn').click();page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('2/3')")
 page.locator('.driver-popover-next-btn').click();page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('3/3')")
 page.locator('.driver-popover-next-btn').click();assert page.locator('.driver-popover').count()==1
 page.wait_for_function("document.querySelector('#lab-play')?.disabled===false",timeout=90000)
 page.locator('#lab-next').click();assert float(page.locator('#lab-scrubber').input_value())>0
 page.locator('.driver-popover-next-btn').click();page.locator('.libao-panel').wait_for()
 checks.append('learning tour requires a new cited gun answer and real stitch progress before completion')
 # Safe exit and keyboard close.
 page.get_by_role('button',name='第一次逛梨花季',exact=False).click();page.locator('.driver-popover-title').wait_for()
 page.get_by_role('button',name='停止导览',exact=True).first.click();page.locator('.libao-panel').wait_for();assert page.locator('.driver-overlay').count()==0
 page.keyboard.press('Escape');assert page.locator('.libao-panel').count()==0
 assert page.get_by_role('button',name='打开梨宝导览',exact=True).evaluate('(e)=>document.activeElement===e')
 checks.append('stop removes overlay; panel Escape restores launcher keyboard focus')
 # Phone panel stays inside safe area; quiet preference persists without touching game data.
 page.set_viewport_size({'width':390,'height':844});page.evaluate("localStorage.setItem('libao-test-progress','keep')")
 page.get_by_role('button',name='打开梨宝导览',exact=True).click();box=page.locator('.libao-panel').bounding_box()
 assert box['x']>=0 and box['x']+box['width']<=390 and box['y']>=0 and box['y']+box['height']<844-65
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.screenshot(path=str(out/'mobile-panel.png'),full_page=True)
 page.get_by_role('button',name='免打扰 · 收起形象',exact=True).click();page.reload(wait_until='domcontentloaded')
 page.get_by_role('button',name='打开梨宝导览',exact=True).wait_for()
 assert page.locator('.libao-avatar').count()==0
 assert page.evaluate("localStorage.getItem('libao-test-progress')==='keep'")
 page.get_by_role('button',name='打开梨宝导览',exact=True).click();page.get_by_role('button',name='恢复梨宝形象',exact=True).click()
 for route in ['game','ar','face']:
  page.goto(base.split('#')[0]+'#'+route,wait_until='domcontentloaded');page.wait_for_function('(p)=>document.body.dataset.page===p',arg=route)
  page.locator('.libao-guide').wait_for(state='detached')
 page.goto(base,wait_until='domcontentloaded');page.get_by_role('button',name='打开梨宝导览',exact=True).wait_for()
 checks.append('mobile panel fits; quiet preference persists; game/camera pages hide guide; stored progress preserved')
 # Mobile tour targets and controls remain within the viewport.
 page.get_by_role('button',name='打开梨宝导览',exact=True).click();page.get_by_role('button',name='第一次逛梨花季',exact=False).click()
 for index in range(1,5):
  page.wait_for_function("(n)=>document.querySelector('.driver-popover-title')?.textContent.includes(n+'/4')",arg=index)
  box=page.locator('.driver-popover').bounding_box()
  assert box['x']>=-1 and box['x']+box['width']<=391 and box['y']>=-1 and box['y']+box['height']<=845,box
  if index==2:page.screenshot(path=str(out/'mobile-tour.png'),full_page=True)
  page.locator('.driver-popover-next-btn').click()
 page.locator('.libao-panel').wait_for()
 checks.append('all four intro steps and controls fit 390px mobile viewport')
 # Missing target is a recoverable error, never a fake centered explanation.
 hidden=page.add_style_tag(content='body[data-page=library] .filter-bar{display:none!important}')
 page.get_by_role('button',name='第一次逛梨花季',exact=False).click();page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('1/4')")
 page.locator('.driver-popover-next-btn').click();page.get_by_role('button',name='重试这一步',exact=True).wait_for(timeout=25000)
 assert page.locator('.driver-popover').count()==0
 hidden.evaluate('(e)=>e.remove()');page.get_by_role('button',name='重试这一步',exact=True).click()
 page.wait_for_function("document.querySelector('.driver-popover-title')?.textContent.includes('2/4')")
 page.keyboard.press('Escape');page.locator('.libao-panel').wait_for();assert page.locator('.driver-overlay').count()==0
 checks.append('missing target times out honestly, retries correct step and Escape releases overlay')
 assert not errors,errors
 (out/'result.json').write_text(json.dumps({'passed':True,'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False))
 (out/'partial.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
 b.close()
