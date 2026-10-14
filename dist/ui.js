/* Shared interaction details for the storefront and administration. */
(() => {
  'use strict';
  let activeDialog=null,opener=null;
  const busyForms=new Map();
  const handledForms=new Set(['authForm','checkoutForm','productForm','paymentMethodForm','mediaForm','orderForm','deliveryFeesForm']);
  function focusable(dialog){
    return [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled):not([type=hidden]),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>!el.closest('[hidden]')&&el.getClientRects().length);
  }
  function updateDialogs(){
    const next=document.querySelector('.modal.open,.drawer.open');
    if(next!==activeDialog){
      if(next){
        if(!activeDialog)opener=document.activeElement;
        activeDialog=next;next.setAttribute('tabindex','-1');
        const heading=next.querySelector('h2');if(heading){if(!heading.id)heading.id=next.id+'Heading';next.setAttribute('aria-labelledby',heading.id)}
        requestAnimationFrame(()=>{if(activeDialog!==next)return;const controls=focusable(next),input=controls.find(el=>['INPUT','SELECT','TEXTAREA'].includes(el.tagName));(input||controls.find(el=>!el.hasAttribute('data-close'))||next).focus()});
      }else{
        activeDialog=null;const target=opener?.isConnected?opener:document.querySelector('#pageTitle, main h2');opener=null;if(target?.isConnected)requestAnimationFrame(()=>{if(!activeDialog){if(!target.matches('button,a,input,select,textarea'))target.setAttribute('tabindex','-1');target.focus()}});
      }
    }else if(next&&!next.contains(document.activeElement)){
      requestAnimationFrame(()=>{if(activeDialog===next&&!next.contains(document.activeElement))(focusable(next)[0]||next).focus()});
    }
  }
  function settleButtons(){
    for(const [button,form] of busyForms){if(!button.isConnected||!button.disabled){button.removeAttribute('data-busy');button.removeAttribute('aria-busy');form.removeAttribute('aria-busy');busyForms.delete(button)}}
  }
  document.addEventListener('submit',event=>{
    const form=event.target;if(!handledForms.has(form.id))return;const button=form.querySelector('[type=submit]');if(!button||button.disabled)return;
    button.setAttribute('data-busy','true');button.setAttribute('aria-busy','true');form.setAttribute('aria-busy','true');busyForms.set(button,form);queueMicrotask(settleButtons);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||!activeDialog)return;
    const controls=focusable(activeDialog);if(!controls.length){event.preventDefault();activeDialog.focus();return}
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&(document.activeElement===first||!activeDialog.contains(document.activeElement))){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&(document.activeElement===last||!activeDialog.contains(document.activeElement))){event.preventDefault();first.focus()}
  });
  const observer=new MutationObserver(()=>{updateDialogs();settleButtons()});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','disabled']});
  updateDialogs();
})();
