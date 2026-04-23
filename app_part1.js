/* MindfulAI v3 - Real-Time Mental Health Chatbot */
'use strict';
const $ = id => document.getElementById(id);
const nowTime = () => new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
const todayStr = () => new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});

function showToast(msg,type='info',dur=3200){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;t.style.borderColor=type==='warn'?'rgba(248,113,113,0.5)':'rgba(130,180,255,0.3)';
  t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),dur);
}
window.scrollToSection=function(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});};
