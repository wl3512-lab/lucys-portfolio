// The freshly rendered workshop idle and the saved-frame contact-sheet viewer.
(function () {
  'use strict';
  document.querySelectorAll('[data-creature-loop]').forEach(function (host) {
    var canvas=host.querySelector('canvas');
    if (!canvas) return;
    var ctx=canvas.getContext('2d'), mq=matchMedia('(prefers-reduced-motion: reduce)');
    var near=false,frame=-1,data=null,sheet=null,loading=null;
    function paint(i) {
      if (!data || !sheet || i===frame) return;
      frame=i;var w=data.cell[0],h=data.cell[1];
      ctx.clearRect(0,0,w,h);ctx.drawImage(sheet,(i%data.cols)*w,Math.floor(i/data.cols)*h,w,h,0,0,w,h);
      host.dataset.loopFrame=String(i);
    }
    function sync() {
      if (mq.matches) { host.classList.remove('is-looping');host.dataset.loopState='still';return; }
      host.classList.toggle('is-looping',!!sheet);
      host.dataset.loopState=sheet?'pointer':'loading';
    }
    function load() {
      if (loading || mq.matches || !near) {sync();return;}
      var base=host.getAttribute('data-creature-loop');
      loading=fetch(base+'idle.json').then(function(r){if(!r.ok)throw Error('idle unavailable');return r.json();}).then(function(d){data=d;return new Promise(function(resolve,reject){var im=new Image();im.onload=function(){resolve(im);};im.onerror=reject;im.src=base+d.sheet;});}).then(function(im){sheet=im;canvas.width=data.cell[0];canvas.height=data.cell[1];ctx.imageSmoothingEnabled=false;paint(0);host.setAttribute('aria-valuemax',String(data.frames-1));host.setAttribute('aria-valuenow','0');sync();}).catch(function(){host.classList.remove('is-looping');host.dataset.loopState='still';});
    }
    function scrub(clientX) {
      if (!sheet || !data || mq.matches) return;
      var box=host.getBoundingClientRect(),t=Math.max(0,Math.min(1,(clientX-box.left)/box.width));
      var i=Math.round(t*(data.frames-1));paint(i);host.setAttribute('aria-valuenow',String(i));
      host.setAttribute('aria-valuetext','Frame '+(i+1)+' of '+data.frames);
    }
    host.addEventListener('pointermove',function(e){scrub(e.clientX);});
    host.addEventListener('keydown',function(e){if(!data||mq.matches)return;var next=frame;if(e.key==='ArrowRight'||e.key==='ArrowUp')next=Math.min(data.frames-1,frame+4);else if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=Math.max(0,frame-4);else if(e.key==='Home')next=0;else if(e.key==='End')next=data.frames-1;else return;e.preventDefault();paint(next);host.setAttribute('aria-valuenow',String(next));host.setAttribute('aria-valuetext','Frame '+(next+1)+' of '+data.frames);});
    var io=new IntersectionObserver(function(es){near=es[es.length-1].isIntersecting;if(near)load();sync();},{rootMargin:'0px',threshold:0});io.observe(host);
    mq.addEventListener('change',function(){if(!mq.matches&&near)load();sync();});
  });

  var viewer=document.querySelector('.fa-viewer');
  if (!viewer) return;
  var figures=Array.from(document.querySelectorAll('.fa-sheet')),filters=Array.from(document.querySelectorAll('[data-frame-filter]'));
  var active=null,opener=null,picture=viewer.querySelector('.fa-view-body img'),title=viewer.querySelector('#fa-view-title'),body=viewer.querySelector('.fa-view-body');
  var status=document.querySelector('.fa-status');
  function available(){return figures.filter(function(f){return !f.hidden;});}
  function show(figure){
    active=figure;var im=figure.querySelector('img');picture.src=im.getAttribute('src');picture.alt=im.alt;picture.width=Number(im.getAttribute('width'));picture.height=Number(im.getAttribute('height'));
    title.textContent=figure.querySelector('figcaption b').textContent+' · '+figure.querySelector('figcaption span').textContent;
    viewer.querySelector('[data-frame-download]').href=im.getAttribute('src');body.scrollTo(0,0);
    var list=available(),i=list.indexOf(active);viewer.querySelector('[data-frame-prev]').disabled=i<=0;viewer.querySelector('[data-frame-next]').disabled=i>=list.length-1;
  }
  function next(d){var list=available(),i=list.indexOf(active)+d;if(list[i])show(list[i]);}
  figures.forEach(function(f){f.querySelector('[data-frame-open]').addEventListener('click',function(e){opener=e.currentTarget;show(f);viewer.showModal();});});
  filters.forEach(function(b){b.addEventListener('click',function(){var group=b.getAttribute('data-frame-filter');filters.forEach(function(f){f.setAttribute('aria-pressed',String(f===b));});figures.forEach(function(f){f.hidden=group!=='all'&&f.getAttribute('data-frame-group')!==group;});status.textContent='Showing '+available().length+' contact sheets'+(group==='all'?'.':' · '+b.firstChild.textContent.trim()+'.');});});
  viewer.querySelector('[data-frame-close]').addEventListener('click',function(){viewer.close();});
  viewer.querySelector('[data-frame-prev]').addEventListener('click',function(){next(-1);});viewer.querySelector('[data-frame-next]').addEventListener('click',function(){next(1);});
  viewer.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();next(1);}if(e.key==='ArrowLeft'){e.preventDefault();next(-1);}});
  viewer.addEventListener('click',function(e){if(e.target===viewer)viewer.close();});viewer.addEventListener('close',function(){if(opener)opener.focus();});
})();
