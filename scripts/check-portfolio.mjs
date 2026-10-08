import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,channel:'msedge'});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin = process.env.PORTFOLIO_TEST_URL || 'http://127.0.0.1:3000';
async function capturePublic(name){const height=await page.evaluate(()=>document.documentElement.scrollHeight);const step=page.viewportSize().height*.7;for(let y=0;y<height;y+=step){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(130);}await page.waitForTimeout(1000);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`artifacts/${name}.png`,fullPage:true});}
try {
 await mkdir('artifacts',{recursive:true});
 await page.goto(origin,{waitUntil:'networkidle'});await page.locator('.pk-scroll-ready').waitFor();assert.equal(await page.locator('.pk-section').count(),7);await capturePublic('portfolio-desktop');
 await page.goto(`${origin}/studio`,{waitUntil:'networkidle'});await page.getByText('All changes saved',{exact:true}).waitFor({state:'attached'});await page.screenshot({path:'artifacts/studio-desktop.png'});
 assert.equal(await page.locator('.pk-dock-section').count(),7);
 await page.getByRole('button',{name:'Edit hero.title',exact:true}).click();await page.getByRole('textbox',{name:'Edit hero.title',exact:true}).fill('MY PORTFOLIO');await page.getByRole('button',{name:'Save text',exact:true}).click();
 await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();assert.equal((await page.locator('.pk-hero-title').innerText()).trim(),'PORTFOLIO');
 await page.getByRole('button',{name:'Redo (Ctrl+Shift+Z)',exact:true}).click();assert.equal((await page.locator('.pk-hero-title').innerText()).trim(),'MY PORTFOLIO');
 await page.reload({waitUntil:'networkidle'});await page.getByText('All changes saved',{exact:true}).waitFor({state:'attached'});assert.equal((await page.locator('.pk-hero-title').innerText()).trim(),'MY PORTFOLIO');
 await page.getByRole('button',{name:'Move hero section down',exact:true}).click();assert.match(await page.locator('.pk-dock-section-label').first().innerText(),/About/);
 await page.getByRole('button',{name:'Hide impact section',exact:true}).click();await page.getByRole('button',{name:'Publish Live',exact:false}).click();
 const live=await context.newPage();await live.goto(origin,{waitUntil:'networkidle'});await live.locator('.pk-scroll-ready').waitFor();await live.waitForTimeout(300);assert.equal(await live.locator('#impact').count(),0);assert.equal((await live.locator('.pk-hero-title').innerText()).trim(),'MY PORTFOLIO');await live.close();
 await page.getByRole('button',{name:'Quick drawer for works',exact:true}).click();await page.locator('.pk-organizer-card summary').first().click();await page.getByRole('button',{name:'Move to bottom row',exact:true}).first().click();await page.waitForFunction(()=>{const d=JSON.parse(localStorage.getItem('pk-studio-draft-v1'));return d.works.top.length===3&&d.works.bottom.length===5;});
 await page.getByRole('button',{name:'Close organizer',exact:true}).click();
 await page.getByRole('button',{name:'Restore default portfolio data',exact:true}).click();await page.getByRole('button',{name:'Publish Live',exact:false}).click();
 await page.getByRole('button',{name:'mobile viewport',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.pk-preview-frame').offsetWidth===390);assert.equal(await page.locator('.pk-preview-frame').evaluate(el=>el.offsetWidth),390);
 await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await page.getByText('All changes saved',{exact:true}).waitFor({state:'attached'});await page.screenshot({path:'artifacts/studio-mobile.png'});
 await page.goto(origin,{waitUntil:'networkidle'});await page.locator('.pk-scroll-ready').waitFor();await capturePublic('portfolio-mobile');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
 assert.deepEqual(errors,[]);console.log('PASS: rendering, inline editing, undo/redo, reload persistence, section order/visibility, local publish, row transfer, responsive widths.');console.log('Screenshots: artifacts/portfolio-desktop.png, studio-desktop.png, portfolio-mobile.png, studio-mobile.png');
} finally {await browser.close();}





