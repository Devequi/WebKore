import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import { initialLegalDocuments } from '../../shared/legalDocuments.js';
import { criteriaFor } from '../../shared/evaluations.js';
const coach = { id:'coach', name:'Rafael Almeida', role:'coach', email:'coach@example.invalid' };
const athlete = { id:'athlete', name:'Marina Costa', role:'athlete', email:'athlete@example.invalid', birthDate:'2000-01-01' };
const teams = ['A','B'].map(id => ({id, name:'Equipe '+id, modality:'Futsal', coachId:coach.id, code:'QA-'+id}));
const documents = initialLegalDocuments.map(d=>({...d,id:d.type+'-'+d.version,publishedAt:'2026-11-01T12:00:00Z',contentHash:'qa'}));
const legal = {documents,pending:[],consents:[],history:[]};
let role='coach', empty=false;
let loading=true, releaseSession;
const sessionGate = new Promise(resolve => { releaseSession=resolve; });
const trainings = [1,2].map(day=>({id:'training-'+day,teamId:'A',date:'2026-11-1'+day,type:'Misto',athletes:{athlete:{
  role:'OUTFIELD',modality:'Futsal',position:'Ala',present:true,evaluationSource:'AVERAGE',finalScore:7+day,
  ratings:Object.fromEntries(criteriaFor(teams[0],'OUTFIELD','QUALITATIVE').map(c=>[c.name,7+day]))
}}}));
const vite = await createServer({ server:{host:'127.0.0.1',port:0} });
let browser;
try {
  await vite.listen();
  const origin = vite.resolvedUrls.local[0];
  browser = await chromium.launch({headless:true,...(process.platform === 'win32' ? {channel:'msedge'} : {})});
  const context = await browser.newContext({reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('webkore-auth-token-v1','qa-token'));
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**', async route=>{
    if(loading) await sessionGate;
    const pathname=new URL(route.request().url()).pathname;
    const state={users:[coach,athlete],teams:empty?[]:teams,memberships:empty?[]:[{id:'m',teamId:'A',athleteId:athlete.id,status:'approved',position:'Ala'}],trainings:empty?[]:trainings,teamRankings:{}};
    const data=pathname.endsWith('/legal/me')?legal:pathname.endsWith('/legal/documents')?{documents}:{user:role==='coach'?coach:athlete,state,legal};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  async function goto(path='/coach/teams/A') {
    await page.goto(origin+'?qa='+role+'-'+empty+'#'+path);
    await page.locator('.app-shell,.lobby-page').first().waitFor();
    await page.locator('.athlete-loading').waitFor({state:'hidden'});
  }
  async function noOverflow() { assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); }
  await mkdir('test-results/sidebar',{recursive:true});
  await page.goto(origin+'?qa=loading#/coach/teams/A');
  await page.getByText('Restaurando sessão...', {exact:true}).waitFor();
  assert.equal(await page.locator('.sidebar').count(),0);
  loading=false; releaseSession();
  await page.locator('.sidebar').waitFor();
  console.log('PASS restoring session');
  for(const width of [320,390,768,1059,1060,1440,1920]) {
    await page.setViewportSize({width,height:900}); await goto();
    if(width>=1060) {
      const sidebar=page.getByRole('complementary',{name:'Menu lateral'});
      assert.deepEqual(await sidebar.locator('.sidebar-group-title').allTextContents(),['Principal','Treinamento','Gerenciamento']);
      assert.equal(await sidebar.locator('.nav-item').count(),9);
      assert.equal(await sidebar.locator('.sidebar-brand img').getAttribute('src'),'/icons/logoWK.png');
      const expanded=await page.locator('.main-content').boundingBox();
      await page.getByRole('button',{name:'Recolher menu lateral'}).click();
      await expect.poll(async () => (await page.locator('.main-content').boundingBox()).width).toBeGreaterThan(expanded.width);
      const collapsed=await page.locator('.main-content').boundingBox();
      assert.ok(collapsed.width>expanded.width && collapsed.x<expanded.x, JSON.stringify({width,expanded,collapsed}));
      assert.equal(await sidebar.locator('.sidebar-group-title').count(),0);
      const active=sidebar.getByRole('button',{name:'Visão geral',exact:true});
      await active.focus(); await page.mouse.move(width-5,5);
      assert.equal(await page.getByRole('tooltip').textContent(),'Visão geral');
      await page.keyboard.press('Escape'); assert.equal(await page.getByRole('tooltip').count(),0);
      await page.screenshot({path:'test-results/sidebar/collapsed-'+width+'.png',fullPage:true});
      await page.getByRole('button',{name:'Expandir menu lateral'}).click();
      await page.screenshot({path:'test-results/sidebar/expanded-'+width+'.png',fullPage:true});
    } else {
      assert.equal(await page.locator('aside.sidebar').count(),0);
      const opener=page.getByRole('button',{name:'Abrir menu'});
      await opener.click();
      const dialog=page.getByRole('dialog'); await dialog.waitFor();
      assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
      await page.keyboard.press('Escape'); assert.equal(await dialog.isVisible(),false);
      await opener.click(); const drawerBox=await dialog.boundingBox(); await page.mouse.click(drawerBox.x+drawerBox.width+12,400); assert.equal(await dialog.isVisible(),false);
      await opener.click();
      await page.screenshot({path:'test-results/sidebar/drawer-'+width+'.png',fullPage:true});
      await dialog.getByRole('button',{name:'Atletas',exact:true}).click();
      assert.equal(await dialog.isVisible(),false); assert.ok(page.url().endsWith('/coach/teams/A/athletes'));
      assert.notEqual(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
      await opener.click(); await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')!==null),true);
      await page.keyboard.press('Escape');
    }
    await noOverflow(); console.log('PASS responsive/collapse/drawer '+width+'px');
  }
  await page.setViewportSize({width:390,height:568}); await goto();
  await page.getByRole('button',{name:'Abrir menu'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Meu Perfil',exact:true}).click();
  assert.equal(await page.getByRole('dialog').isVisible(),false);
  assert.ok(page.url().endsWith('/perfil'));
  console.log('PASS short mobile viewport and footer navigation');
  await page.setViewportSize({width:1440,height:900}); await goto();
  const nav=page.locator('aside.sidebar');
  for(const [label,suffix] of [['Atletas','/athletes'],['Solicitações','/requests'],['Treinos','/trainings'],['Avaliações','/evaluations'],['Configurações','/settings'],['Visão geral','']]) {
    await nav.getByRole('button',{name:label,exact:true}).click();
    assert.ok(page.url().endsWith('/coach/teams/A'+suffix));
    await page.locator('.athlete-loading').waitFor({state:'hidden'});
    await page.reload(); await page.locator('.sidebar').waitFor();
    assert.equal(await page.locator('.sidebar [aria-current="page"]').textContent(),label);
    assert.equal(await page.locator('.sidebar-team strong').textContent(),'Equipe A');
  }
  await page.getByRole('button',{name:'Trocar equipe: Equipe A'}).click();
  assert.ok(page.url().endsWith('/coach/teams'));
  await page.locator('.team-card').filter({hasText:'Equipe B'}).getByRole('button',{name:'Gerenciar',exact:true}).click();
  assert.ok(page.url().endsWith('/coach/teams/B'));
  assert.equal(await page.locator('.sidebar-team strong').textContent(),'Equipe B');
  await page.reload(); await page.locator('.sidebar-team').waitFor();
  assert.equal(await page.locator('.sidebar-team strong').textContent(),'Equipe B');
  await nav.getByRole('button',{name:'Meu Perfil',exact:true}).click(); assert.ok(page.url().endsWith('/perfil'));
  await page.locator('.profile-page').waitFor();
  await nav.getByRole('button',{name:'Minhas equipes',exact:true}).click(); assert.ok(page.url().endsWith('/coach/teams'));
  console.log('PASS all coach routes, reload and existing team-switch flow');
  empty=true; await goto('/perfil');
  assert.equal(await nav.locator('.nav-item').count(),3);
  assert.equal(await page.locator('.sidebar-team strong').textContent(),'Selecionar equipe');
  await goto('/coach/teams/A'); await page.getByText('Página indisponível',{exact:true}).waitFor();
  console.log('PASS no team and forbidden team');
  empty=false; role='athlete'; await goto('/athlete/teams/A');
  assert.equal(await page.locator('.coach-navigation').count(),0);
  assert.equal(await page.locator('aside.sidebar .nav-item').count(),3);
  await goto('/coach/teams/A'); await page.getByText('Esta página não está disponível para seu perfil.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Configurações',exact:true}).count(),0);
  console.log('PASS athlete unchanged and coach permission guard');
  role='coach'; await goto();
  await nav.getByRole('button',{name:'Sair',exact:true}).click();
  await page.locator('.auth-form').waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('webkore-auth-token-v1')),null);
  console.log('PASS existing logout flow');
  assert.deepEqual(errors,[]);
} finally { await browser?.close(); await vite.close(); }
