/* Browsers unlock audio on the first game input; one element loops throughout. */
(()=>{
 const audio=new Audio();audio.loop=true;audio.volume=.32;audio.preload='none';
 const button=document.getElementById('sound');let enabled=true,started=false;
 const show=()=>{button.setAttribute('aria-pressed',String(enabled&&started));button.setAttribute('aria-label',enabled&&started?'Mute background sound':'Enable background sound');button.style.opacity=enabled&&started?'1':'.65';};
 async function start(){if(!enabled||document.hidden)return;try{await QuarterAssets.load('assets/background-data.js');if(!audio.src)audio.src=window.QUARTER_BACKGROUND_AUDIO;await audio.play();started=true;}catch(_){started=false;}show();}
 button.addEventListener('click',()=>{enabled=! (enabled&&started);if(enabled)start();else{audio.pause();show();}});
 window.addEventListener('pointerdown',e=>{if(e.target!==button)start();});window.addEventListener('keydown',start);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else if(started&&enabled)start();});
 window.QUARTER_AUDIO={audio,snapshot:()=>({enabled,started,loop:audio.loop,paused:audio.paused,time:audio.currentTime,duration:audio.duration,volume:audio.volume})};show();
})();
