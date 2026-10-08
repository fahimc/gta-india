/* Small map and contextual prompts. Settings live in a pause panel. */
window.QuarterHUD=class QuarterHUD {
 constructor(){this.map=document.getElementById('minimap');this.ctx=this.map.getContext('2d');this.clock=0;this.menu=document.getElementById('pauseMenu');this.button=document.getElementById('menuButton');this.button.onclick=()=>this.toggle();window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!e.repeat){this.toggle();e.preventDefault();}});document.getElementById('resume').onclick=()=>this.toggle(false);}
 toggle(open=!this.open){this.open=open;this.menu.hidden=!open;this.button.setAttribute('aria-expanded',String(open));if(window.STREET){STREET.paused=open;STREET.clearInput?.();}}
 update(dt,position,heading,crowd,traffic,drive,nearHero){this.clock+=dt;if(this.clock<.1)return;this.clock=0;const c=this.ctx,n=180,scale=.95;c.clearRect(0,0,n,n);c.fillStyle='#1e2728';c.fillRect(0,0,n,n);c.save();c.translate(90,90);
  const line=(x1,z1,x2,z2)=>{c.beginPath();c.moveTo((x1-position.x)*scale,-(z1-position.z)*scale);c.lineTo((x2-position.x)*scale,-(z2-position.z)*scale);c.stroke();};
  c.strokeStyle='#a6aaa0';c.lineWidth=8;const i=Math.floor(position.x/80),j=Math.floor((position.z+16)/80);for(let k=-2;k<=2;k++){line((i+k)*80,position.z-100,(i+k)*80,position.z+100);line(position.x-100,(j+k)*80-16,position.x+100,(j+k)*80-16);}
  c.fillStyle='#d7bc81';for(const a of traffic.agents){c.fillRect((a.x-position.x)*scale-2,-(a.z-position.z)*scale-2,4,4);}c.fillStyle='#dbded6';for(const a of crowd.agents)if(a.visible){c.beginPath();c.arc((a.x-position.x)*scale,-(a.z-position.z)*scale,1.5,0,Math.PI*2);c.fill();}
  c.rotate(heading);c.fillStyle='#fff';c.strokeStyle='#162522';c.lineWidth=2;c.beginPath();c.moveTo(0,-8);c.lineTo(-5,6);c.lineTo(0,3);c.lineTo(5,6);c.closePath();c.fill();c.stroke();c.restore();
  const prompt=document.getElementById('interaction');prompt.hidden=!(drive||nearHero);prompt.innerHTML='<kbd>E</kbd> '+(drive?'Leave rickshaw':'Enter rickshaw');document.getElementById('streetName').textContent='OLD QUARTER';
 }
};
