/* The supplied track plays through a small, warm cabin speaker mix. */
window.QuarterVehicleRadio=class QuarterVehicleRadio {
 static async create(){const radio=new this();await radio.prepare();return radio;}
 constructor(){this.audio=new Audio();this.audio.loop=true;this.audio.preload='auto';this.active=false;this.enabled=true;this.ready=false;this.context=new (window.AudioContext||window.webkitAudioContext)();
  this.source=this.context.createMediaElementSource(this.audio);this.low=this.context.createBiquadFilter();this.low.type='lowpass';this.low.frequency.value=4800;this.low.Q.value=.65;this.high=this.context.createBiquadFilter();this.high.type='highpass';this.high.frequency.value=95;this.high.Q.value=.6;
  this.compressor=this.context.createDynamicsCompressor();this.compressor.threshold.value=-20;this.compressor.ratio.value=2.4;this.compressor.knee.value=18;this.gain=this.context.createGain();this.gain.gain.value=0;this.source.connect(this.high).connect(this.low).connect(this.compressor).connect(this.gain).connect(this.context.destination);
  document.getElementById('sound').addEventListener('click',()=>{this.enabled=QUARTER_AUDIO.snapshot().enabled;this.sync();});document.addEventListener('visibilitychange',()=>this.sync());
  const badge=document.createElement('div');badge.id='vehicleRadio';badge.textContent='RADIO  ·  AAJA RE';badge.hidden=true;badge.style.cssText='position:fixed;top:92px;right:24px;font:600 11px Arial;letter-spacing:2px;color:#fff;text-shadow:0 1px 4px #000;pointer-events:none;z-index:12';document.body.append(badge);this.badge=badge;
 }
 async prepare(){await QuarterAssets.load('assets/radio-data.js');this.audio.src=QUARTER_RADIO_AUDIO;await new Promise((resolve,reject)=>{this.audio.addEventListener('canplay',resolve,{once:true});this.audio.addEventListener('error',()=>reject(Error('Vehicle radio could not decode Aaja Re')), {once:true});this.audio.load();});this.ready=true;}
 unlock(){return this.context.resume();}
 enter(){this.active=true;QUARTER_AUDIO.inVehicle=true;QUARTER_AUDIO.mix();this.sync();}
 leave(){this.active=false;QUARTER_AUDIO.inVehicle=false;QUARTER_AUDIO.mix();this.sync();}
 sync(){const audible=this.active&&this.enabled&&!document.hidden;clearTimeout(this.stopTimer);this.badge.hidden=!this.active||!this.enabled;this.gain.gain.cancelScheduledValues(this.context.currentTime);this.gain.gain.setTargetAtTime(audible?.10:0,this.context.currentTime,.16);if(audible){this.context.resume();this.audio.play().catch(()=>{});}else this.stopTimer=setTimeout(()=>this.audio.pause(),650);}
 snapshot(){return {track:'Aaja Re',active:this.active,enabled:this.enabled,ready:this.ready,paused:this.audio.paused,time:this.audio.currentTime,duration:this.audio.duration,loop:this.audio.loop,gain:this.gain.gain.value,context:this.context.state,speakerHz:[95,4800]};}
};
