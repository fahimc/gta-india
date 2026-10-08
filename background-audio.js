/* Decode during loading; the entry gesture starts sound before the visual fade. */
(()=>{
 const audio=new Audio();audio.loop=true;audio.volume=.32;audio.preload='auto';
 const button=document.getElementById('sound');let enabled=true,started=false,prepared=false,pending;
 function show(){button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'Mute background sound':'Enable background sound');button.style.opacity=enabled?'1':'.55';}
 function prepare(){if(!pending)pending=QuarterAssets.load('assets/background-data.js').then(()=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Background sound is still loading. Try entering again.')),30000);
  const ready=()=>{clearTimeout(timer);prepared=true;resolve();};audio.addEventListener('canplay',ready,{once:true});audio.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Background sound could not be decoded.'));},{once:true});
  audio.src=window.QUARTER_BACKGROUND_AUDIO;audio.load();if(audio.readyState>=3)ready();
 }));return pending;}
 async function start(){await prepare();if(enabled){await audio.play();started=true;}show();}
 button.addEventListener('click',()=>{enabled=!enabled;if(!enabled)audio.pause();else if(window.STREET?.started)start().catch(()=>{});show();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else if(started&&enabled)audio.play().catch(()=>{});});
 window.QUARTER_AUDIO={audio,prepare,start,inVehicle:false,duckVoice:false,mix(){audio.volume=this.duckVoice?.12:this.inVehicle?.28:.32;},snapshot:()=>({enabled,started,prepared,loop:audio.loop,paused:audio.paused,time:audio.currentTime,duration:audio.duration,volume:audio.volume})};show();prepare().catch(()=>{});
})();
