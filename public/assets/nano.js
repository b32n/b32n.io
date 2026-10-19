/* Nanobot swarm: tiny particles that keep coming together to build something.
   <canvas class="swarm" data-shapes="word:b32n,grid,graph" data-count="1400" data-layout="hero|full" data-caption="#id"> */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PALETTE = [[47,91,255],[18,181,203],[25,195,154],[12,18,34]];
  const LABELS = { grid:'assembling · spindle', graph:'assembling · mindmaps', orb:'assembling · open data', plus:'assembling · next', key:'assembling · your keys' };

  function lerpColor(t){ // blue -> cyan -> mint
    const a = t < .55 ? PALETTE[0] : PALETTE[1], b = t < .55 ? PALETTE[1] : PALETTE[2];
    const u = t < .55 ? t/.55 : (t-.55)/.45;
    return a.map((v,i)=>Math.round(v+(b[i]-v)*u));
  }

  // --- shape painters: draw solid ink on an offscreen canvas of size w*h ---
  const painters = {
    word(ctx,w,h,arg){
      const text = arg || 'b32n';
      let size = h*.62; ctx.font = `600 ${size}px "Space Grotesk", system-ui, sans-serif`;
      const m = ctx.measureText(text).width; if (m > w*.92) { size *= (w*.92)/m; ctx.font = `600 ${size}px "Space Grotesk", system-ui, sans-serif`; }
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,w/2,h/2);
    },
    grid(ctx,w,h){ // a spreadsheet / document: Spindle
      const s = Math.min(w,h)*.78, x0=(w-s)/2, y0=(h-s*.8)/2, cols=5, rows=6, cw=s/cols, rh=s*.8/rows;
      ctx.lineWidth = Math.max(2, s*.012);
      ctx.strokeRect(x0,y0,s,s*.8);
      for(let c=1;c<cols;c++){ctx.beginPath();ctx.moveTo(x0+c*cw,y0);ctx.lineTo(x0+c*cw,y0+s*.8);ctx.stroke();}
      for(let r=1;r<rows;r++){ctx.beginPath();ctx.moveTo(x0,y0+r*rh);ctx.lineTo(x0+s,y0+r*rh);ctx.stroke();}
      ctx.fillRect(x0,y0,s,rh); // header row
      ctx.fillRect(x0+2*cw+cw*.12,y0+3*rh+rh*.25,cw*.76,rh*.5); // a selected cell
    },
    graph(ctx,w,h){ // linked cards: Mindmaps
      const s=Math.min(w,h), cx=w/2, cy=h/2;
      const nodes=[[0,0,.12],[-.3,-.24,.07],[.32,-.2,.08],[-.34,.22,.075],[.28,.27,.065],[0,-.4,.05],[.02,.4,.05]];
      ctx.lineWidth=Math.max(2,s*.012);
      const E=[[0,1],[0,2],[0,3],[0,4],[1,5],[2,5],[3,6],[4,6],[1,3]];
      E.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(cx+nodes[a][0]*s,cy+nodes[a][1]*s);ctx.lineTo(cx+nodes[b][0]*s,cy+nodes[b][1]*s);ctx.stroke();});
      nodes.forEach(([x,y,r])=>{ctx.beginPath();ctx.arc(cx+x*s,cy+y*s,r*s,0,7);ctx.fill();});
    },
    orb(ctx,w,h){ // a globe of open data
      const r=Math.min(w,h)*.38, cx=w/2, cy=h/2; ctx.lineWidth=Math.max(2,r*.035);
      ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.stroke();
      for(const k of [.35,.7]){ctx.beginPath();ctx.ellipse(cx,cy,r*k,r,0,0,7);ctx.stroke();}
      for(const k of [-.5,0,.5]){const y=cy+k*r, hw=Math.sqrt(1-k*k)*r;ctx.beginPath();ctx.moveTo(cx-hw,y);ctx.lineTo(cx+hw,y);ctx.stroke();}
    },
    key(ctx,w,h){ // take control of your data
      const s=Math.min(w,h), cx=w/2-s*.18, cy=h/2; ctx.lineWidth=s*.07;
      ctx.beginPath();ctx.arc(cx,cy,s*.17,0,7);ctx.stroke();
      ctx.fillRect(cx+s*.16,cy-s*.035,s*.42,s*.07);
      ctx.fillRect(cx+s*.42,cy,s*.06,s*.13);ctx.fillRect(cx+s*.52,cy,s*.06,s*.09);
    },
    plus(ctx,w,h){ const s=Math.min(w,h)*.5, t=s*.2; ctx.fillRect(w/2-t/2,h/2-s/2,t,s); ctx.fillRect(w/2-s/2,h/2-t/2,s,t); },
  };

  function sample(name,w,h,n){
    const [kind,arg] = name.split(':');
    const c = document.createElement('canvas'); c.width=Math.max(10,w|0); c.height=Math.max(10,h|0);
    const ctx = c.getContext('2d'); ctx.fillStyle=ctx.strokeStyle='#000';
    (painters[kind]||painters.plus)(ctx,c.width,c.height,arg);
    const d = ctx.getImageData(0,0,c.width,c.height).data, pts=[];
    const step = Math.max(2, Math.sqrt((c.width*c.height)/(n*6))|0);
    for(let y=0;y<c.height;y+=step) for(let x=0;x<c.width;x+=step) if(d[(y*c.width+x)*4+3]>128) pts.push([x+(Math.random()-.5)*step*.7,y+(Math.random()-.5)*step*.7]);
    for(let i=pts.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[pts[i],pts[j]]=[pts[j],pts[i]];}
    return pts;
  }

  function Swarm(canvas){
    const shapes=(canvas.dataset.shapes||'word:b32n').split(',').map(s=>s.trim());
    const layout=canvas.dataset.layout||'full';
    const caption=canvas.dataset.caption?document.querySelector(canvas.dataset.caption):null;
    const ctx=canvas.getContext('2d');
    let W=0,H=0,dpr=1,P=[],targets=[],shapeIx=0,phase='form',t0=0,visible=true,raf=0;
    const pointer={x:-1e4,y:-1e4};
    const N=()=>{const base=+canvas.dataset.count||900;return layout==='hero'?Math.round(base*Math.min(1,(W*H)/(1280*720))**.5):base;};

    function region(){
      if(layout==='hero'){
        if(W>900) return {x:W*.5,y:H*.12,w:W*.46,h:H*.76};
        return {x:W*.08,y:H*.04,w:W*.84,h:H*.4};
      }
      const pad=Math.min(W,H)*.08; return {x:pad,y:pad,w:W-pad*2,h:H-pad*2};
    }
    function buildTargets(){
      const r=region(), n=P.length;
      const pts=sample(shapes[shapeIx],r.w,r.h,n);
      targets=P.map((_,i)=>{const p=pts.length?pts[i%pts.length]:[Math.random()*r.w,Math.random()*r.h];return [r.x+p[0],r.y+p[1]];});
      if(caption){const k=shapes[shapeIx].split(':')[0];caption.textContent=LABELS[k]||'assembling · b32n';}
    }
    function scatterTargets(){
      const r=region();
      targets=P.map(p=>[p.x+(Math.random()-.5)*r.w*.5,p.y+(Math.random()-.5)*r.h*.5]);
    }
    function resize(){
      const b=canvas.getBoundingClientRect(); dpr=Math.min(2,devicePixelRatio||1);
      W=b.width; H=b.height; canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      const n=N();
      while(P.length<n){const t=Math.random();P.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:0,r:.8+Math.random()*1.5,c:lerpColor(t),t,ph:Math.random()*6.28,k:.012+Math.random()*.02});}
      P.length=n;
      buildTargets();
      if(reduce){P.forEach((p,i)=>{p.x=targets[i][0];p.y=targets[i][1];});draw(0);}
    }
    function step(now){
      const age=now-t0;
      if(phase==='form'&&age>5200){phase='scatter';t0=now;scatterTargets();}
      else if(phase==='scatter'&&age>1100){phase='form';t0=now;shapeIx=(shapeIx+1)%shapes.length;buildTargets();}
      const r=region(); const sx=(r.x+r.w/2)/W;
      for(let i=0;i<P.length;i++){
        const p=P[i],tg=targets[i];
        let ax=(tg[0]-p.x)*p.k, ay=(tg[1]-p.y)*p.k;
        ax+=Math.cos(now*.0011+p.ph)*.06; ay+=Math.sin(now*.0013+p.ph)*.06;
        const dx=p.x-pointer.x, dy=p.y-pointer.y, d2=dx*dx+dy*dy;
        if(d2<9000){const f=(9000-d2)/9000*1.6;const d=Math.sqrt(d2)||1;ax+=dx/d*f;ay+=dy/d*f;}
        p.vx=(p.vx+ax)*.86; p.vy=(p.vy+ay)*.86; p.x+=p.vx; p.y+=p.vy;
      }
      void sx;
    }
    function draw(now){
      ctx.clearRect(0,0,W,H);
      for(const p of P){
        const sp=Math.min(1,Math.hypot(p.vx,p.vy)/3);
        const a=.55+.4*(1-sp);
        ctx.fillStyle=`rgba(${p.c[0]},${p.c[1]},${p.c[2]},${a})`;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.283);ctx.fill();
        if(sp>.25){ctx.strokeStyle=`rgba(${p.c[0]},${p.c[1]},${p.c[2]},${.18*sp})`;ctx.lineWidth=p.r;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*3,p.y-p.vy*3);ctx.stroke();}
      }
    }
    function loop(now){ if(!t0) t0=now; step(now); draw(now); raf=visible?requestAnimationFrame(loop):0; }

    const host=canvas.closest('[data-swarm-host]')||canvas.parentElement;
    host.addEventListener('pointermove',e=>{const b=canvas.getBoundingClientRect();pointer.x=e.clientX-b.left;pointer.y=e.clientY-b.top;});
    host.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1e4;});
    new ResizeObserver(()=>resize()).observe(canvas);
    if(!reduce){
      new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!raf)raf=requestAnimationFrame(loop);}).observe(canvas);
      document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible&&!raf)raf=requestAnimationFrame(loop);});
    }
  }

  const start=()=>document.querySelectorAll('canvas.swarm').forEach(c=>Swarm(c));
  let started=false;const go=()=>{if(!started){started=true;start();}};
  (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(go);setTimeout(go,1500);

  // nav border + reveal on scroll
  const nav=document.querySelector('.nav');
  const onScroll=()=>nav&&nav.classList.toggle('scrolled',scrollY>8); addEventListener('scroll',onScroll,{passive:true}); onScroll();
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
})();
