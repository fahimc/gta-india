window.QuarterFrontEnd={
 init(){
  const el=id=>document.getElementById(id),panel=el('frontPanel');let lastFocus;
  const close=()=>{panel.hidden=true;lastFocus?.focus();};
  const sync=()=>{for(const id of ['quality','wet','light'])el('front-'+id).textContent=el(id).textContent;};
  const preferences=()=>({quality:el('quality').textContent,wet:el('wet').getAttribute('aria-pressed')==='true',warm:el('light').getAttribute('aria-pressed')==='true'});
  try{const saved=JSON.parse(localStorage.getItem('quarter-display')||'null');if(saved){if(['Cinematic','Performance'].includes(saved.quality)&&saved.quality!==preferences().quality)el('quality').click();if(typeof saved.wet==='boolean'&&saved.wet!==preferences().wet)el('wet').click();if(typeof saved.warm==='boolean'&&saved.warm!==preferences().warm)el('light').click();}}catch(_){}
  for(const id of ['quality','wet','light'])el(id).addEventListener('click',()=>{try{localStorage.setItem('quarter-display',JSON.stringify(preferences()));}catch(_){}});
  function open(section){lastFocus=document.activeElement;sync();el('frontDisplay').hidden=section!=='display';el('frontControls').hidden=section!=='controls';el('frontPanelTitle').textContent=section==='display'?'Set the mood.':'Know the streets.';panel.hidden=false;el('frontClose').focus();}
  el('frontSettings').onclick=()=>open('display');el('frontHelp').onclick=()=>open('controls');el('frontClose').onclick=close;
  for(const id of ['quality','wet','light'])el('front-'+id).onclick=()=>{el(id).click();sync();};
  panel.onclick=e=>{if(e.target===panel)close();};
  document.addEventListener('keydown',e=>{if(panel.hidden)return;if(e.key==='Escape'){close();e.stopImmediatePropagation();e.preventDefault();}if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button')].filter(b=>!b.closest('[hidden]'));const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}},true);
  // Modal choices are wired after scene creation; boot keeps primary entry disabled.
  el('frontSettings').disabled=el('frontHelp').disabled=false;sync();
  el('enterGame').setAttribute('aria-label','Enter Old Quarter');el('interface').inert=true;
  el('enterGame').addEventListener('click',()=>{const wait=setInterval(()=>{if(!STREET.started)return;clearInterval(wait);el('interface').inert=false;el('loader').inert=true;},50);setTimeout(()=>clearInterval(wait),15000);});
 }
};
