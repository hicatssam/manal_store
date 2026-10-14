import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const callbacks={},microtasks=[];let observerCallback,visibleDialog=null;
const document={activeElement:null,querySelector:()=>visibleDialog,addEventListener:(type,fn)=>callbacks[type]=fn,body:{}};
function element(tagName,attrs={}){
  const attributes=new Map(Object.entries(attrs));
  return {tagName,attributes,isConnected:true,disabled:false,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),hasAttribute:k=>attributes.has(k),getAttribute:k=>attributes.get(k),matches:selector=>['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(tagName),closest:()=>null,getClientRects:()=>[{}],focus(){document.activeElement=this}};
}
const opener=element('BUTTON'),close=element('BUTTON',{'data-close':''}),input=element('INPUT'),submit=element('BUTTON',{type:'submit'}),heading=element('H2');
document.activeElement=opener;
const form=element('FORM');form.id='authForm';form.querySelector=()=>submit;
const dialog=element('DIV');dialog.id='authModal';dialog.querySelector=()=>heading;dialog.querySelectorAll=()=>[close,input,submit];dialog.contains=el=>[close,input,submit,dialog].includes(el);
const context={document,Map,Set,queueMicrotask:fn=>microtasks.push(fn),requestAnimationFrame:fn=>fn(),MutationObserver:class{constructor(fn){observerCallback=fn}observe(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../dist/ui.js',import.meta.url),'utf8'),context);

visibleDialog=dialog;observerCallback();assert.equal(document.activeElement,input);assert.equal(dialog.attributes.get('aria-labelledby'),'authModalHeading');
let prevented=0;document.activeElement=submit;callbacks.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented++}});assert.equal(document.activeElement,close);
callbacks.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented++}});assert.equal(document.activeElement,submit);assert.equal(prevented,2);
callbacks.submit({target:form});submit.disabled=true;while(microtasks.length)microtasks.shift()();assert.equal(submit.attributes.get('data-busy'),'true');
submit.disabled=false;observerCallback();assert.equal(submit.hasAttribute('data-busy'),false);assert.equal(form.hasAttribute('aria-busy'),false);
callbacks.submit({target:form});while(microtasks.length)microtasks.shift()();assert.equal(submit.hasAttribute('data-busy'),false);
visibleDialog=null;observerCallback();assert.equal(document.activeElement,opener);
console.log('PASS Dialog focus, Tab cycle, asynchronous and synchronous submit states, and focus restoration.');
