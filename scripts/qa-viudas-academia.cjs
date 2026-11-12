const path=require('path');
// Palabras sueltas en la ultima linea de una guia de neety.com/academia (lead-magnet-web §7).
// Uso: node scripts/qa-viudas-academia.cjs <ruta al repo landing> <slug> [simulaciones.json]
// Mide, con la guia ABIERTA (pase del gate), la ultima linea de cada parrafo y celda a 1440 y a 390;
// avisa por debajo del 40% del ancho. Con simulaciones.json ([{find, html, html2?}]) prueba textos
// nuevos sobre la pagina viva antes de tocar Sanity.
let chromium; for (const c of [path.join(process.argv[2],'node_modules/playwright'),'playwright']) { try { ({chromium}=require(c)); break } catch {} }
const SLUG = process.argv[3];
const sims = process.argv[4] ? JSON.parse(require('fs').readFileSync(process.argv[4],'utf8')) : [];
(async()=>{
  const b=await chromium.launch();
  for (const [nom,vp] of [['1440',{width:1440,height:900}],['390',{width:390,height:844}]]) {
    const ctx=await b.newContext({viewport:vp});
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('neety:academia-pass', String(Date.now()+30*864e5)); }catch(e){} });
    const p=await ctx.newPage(); await p.goto('https://neety.com/academia/'+SLUG+'?v='+Date.now(),{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
    const res = await p.evaluate((sims)=>{
      // simulaciones: reemplaza el HTML del elemento que contiene `find`
      for (const s of sims) {
        const el=[...document.querySelectorAll('main p, main td, main li p, main h3')].find(e=>e.textContent.includes(s.find));
        if (!el) { continue; }
        if (s.html2 !== undefined) { const c=el.cloneNode(); c.innerHTML=s.html2; el.after(c); }
        el.innerHTML=s.html;
      }
      const out=[];
      for (const el of document.querySelectorAll('main p, main td')) {
        const t=el.textContent.trim(); if (t.length<40) continue;
        const r=document.createRange(); r.selectNodeContents(el);
        const rects=[...r.getClientRects()].filter(x=>x.width>1);
        const lines={}; for (const x of rects){ const k=Math.round(x.top/4); (lines[k]=lines[k]||[]).push(x); }
        const ks=Object.keys(lines).map(Number).sort((a,b)=>a-b); if (ks.length<2) continue;
        const last=lines[ks[ks.length-1]]; const L=Math.min(...last.map(x=>x.left)), R=Math.max(...last.map(x=>x.right));
        const W=el.getBoundingClientRect().width; const cs=getComputedStyle(el); const inner=W-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
        const ratio=(R-L)/inner;
        if (ratio<0.4 && el.closest('article, [class*="max-w"]') && !el.closest('footer') && !el.closest('a')) out.push({lineas:ks.length, ultima:Math.round(ratio*100)+'%', texto:t.slice(0,50)+' … '+t.slice(-40)});
      }
      return out;
    }, sims);
    console.log('== '+nom); for (const r of res) console.log(JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
