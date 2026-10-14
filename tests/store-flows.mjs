import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source=fs.readFileSync(new URL('../dist/data.js',import.meta.url),'utf8');
let passed=0;
function setup(initial,{authenticated=true}={}){
  const map=new Map(initial?Object.entries(initial):[]);
  const localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const sessionMap=new Map();const sessionStorage={getItem:k=>sessionMap.get(k)||null,setItem:(k,v)=>sessionMap.set(k,v),removeItem:k=>sessionMap.delete(k)};
  const context={window:{dispatchEvent(){}},localStorage,sessionStorage,Event:class{},crypto:webcrypto,TextEncoder,URL};
  context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
  const s=context.window.Store;
  if(authenticated){const data=s.read();data.admins=[{id:'test-admin',username:'admin',name:'إدارة'}];if(!data.users.some(u=>u.id==='test-customer'))data.users.push({id:'test-customer',username:'fixture_customer',name:'زبونة اختبار',email:'fixture@example.com',phone:'0599000000',active:true,createdAt:Date.now()});map.set('manal_store_data_v1',JSON.stringify(data));sessionMap.set('manal_store_admin_session_v1','test-admin');sessionMap.set('manal_store_session_v2','test-customer')}
  return {s,map,sessionMap};
}
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
const customer={name:'زبونة اختبار',phone:'0599000000',region:'غزة',address:'شارع البحر قرب المتجر',paymentMethodId:'pm-cod'};
const states=(status,deliveryStatus='بانتظار التجهيز',paymentStatus='غير مدفوع')=>({status,deliveryStatus,paymentStatus});

await test('Existing browser data migrates without losing products or orders',()=>{
  const {s}=setup(),data=s.read();delete data.categories;delete data.promotions;delete data.paymentMethods;
  const migrated=setup({manal_store_data_v1:JSON.stringify(data)}).s.read();
  assert.equal(migrated.products.length,3);assert.equal(migrated.categories.length,2);assert.equal(migrated.promotions.length,3);
});
await test('Category creation, product creation, price and size inventory',()=>{
  const {s}=setup();const c=s.saveCategory({name:'ترانشكوت',active:true});
  const p=s.saveProduct({name:'ترانشكوت أسود',category:c.name,price:179.5,stocks:{'40':2,'42':1},active:true});
  assert.equal(s.stock(p),3);assert.equal(p.price,179.5);assert.throws(()=>s.saveProduct({...p,category:'غير موجودة'}));assert.throws(()=>s.saveProduct({...p,stocks:{'40':-1}}));
});
await test('Category rename propagates to products and targeted advertisements',()=>{
  const {s}=setup(),c=s.read().categories[0];s.saveCategory({...c,name:'قفاطين مغربية'},c.id);
  assert.equal(s.read().products[0].category,'قفاطين مغربية');assert.equal(s.read().promotions[1].category,'قفاطين مغربية');assert.throws(()=>s.removeCategory(c.id));
});
await test('Hidden categories prevent browsing, cart additions and stale checkout',()=>{
  const {s}=setup(),c=s.read().categories[0];s.addToCart('p1','38');s.saveCategory({...c,active:false},c.id);
  assert.equal(s.visibleProducts(s.read()).length,1);assert.throws(()=>s.addToCart('p1','38'));assert.throws(()=>s.createOrder(customer));assert.equal(s.read().products[0].stocks['38'],3);
});
await test('Advertisements can be created, reordered, hidden and deleted',()=>{
  const {s}=setup();const ad=s.savePromotion({title:'تشكيلة جديدة',placement:'card',tone:'dark',position:4,category:'فساتين',active:true});
  s.savePromotion({...ad,active:false,position:2},ad.id);assert.equal(s.read().promotions.find(x=>x.id===ad.id).active,false);s.removePromotion(ad.id);assert.equal(s.read().promotions.length,3);
});
await test('Register, login, duplicate registration and account suspension',async()=>{
  const {s}=setup(),input={name:'اسم تجريبي',username:'customer_test',email:'client@example.com',phone:'0599000000',password:'longpassword123'};
  const user=await s.register(input);assert.equal(s.currentUser().id,user.id);s.setSession(null);await s.login(input.email,input.password);assert.equal(s.currentUser().id,user.id);
  await assert.rejects(()=>s.register(input));await assert.rejects(()=>s.login(input.email,'wrong'));s.setUserActive(user.id,false);assert.equal(s.currentUser(),null);await assert.rejects(()=>s.login(input.email,input.password));
});
await test('Cart quantity limits and order totals include delivery',()=>{
  const {s}=setup();s.addToCart('p1','38',2);assert.throws(()=>s.addToCart('p1','38',2));assert.throws(()=>s.updateCart('p1','38',1.5));const order=s.createOrder(customer);
  assert.equal(order.subtotal,490);assert.equal(order.total,505);assert.equal(s.read().products[0].stocks['38'],1);assert.equal(s.cart().length,0);assert.throws(()=>s.createOrder(customer));
});
await test('Bank transfer requires receipt and retains account snapshot',()=>{
  const {s}=setup();const method=s.savePaymentMethod({name:'بنك فلسطين',kind:'transfer',accountName:'منال',accountNumber:'0599111111',active:true});s.addToCart('p1','38');
  assert.throws(()=>s.createOrder({...customer,paymentMethodId:method.id}));assert.equal(s.read().products[0].stocks['38'],3);
  const receipt='data:image/jpeg;base64,AAAA',order=s.createOrder({...customer,paymentMethodId:method.id,paymentReceipt:receipt});s.removePaymentMethod(method.id);
  const saved=s.read().orders[0];assert.equal(saved.paymentReceipt,receipt);assert.equal(saved.paymentAccountNumber,'0599111111');assert.equal(saved.paymentStatus,'قيد التحقق');assert.equal(saved.id,order.id);
});
await test('Disabled payment method cannot be used at checkout',()=>{
  const {s}=setup(),method=s.read().paymentMethods[0];s.addToCart('p1','38');s.savePaymentMethod({...method,active:false},method.id);assert.throws(()=>s.createOrder(customer));assert.equal(s.read().products[0].stocks['38'],3);
});
await test('Order confirmation, preparation, shipping, payment and delivery',()=>{
  const {s}=setup();s.addToCart('p1','38');const order=s.createOrder(customer);
  s.updateOrder(order.id,states('مؤكد'));s.updateOrder(order.id,states('قيد التجهيز','جاهز للتوصيل'));assert.throws(()=>s.updateOrder(order.id,states('تم الشحن')));
  s.updateOrder(order.id,{...states('تم الشحن','مع المندوب'),courier:'مندوب تجريبي',tracking:'SHIP-1'});assert.throws(()=>s.updateOrder(order.id,states('مكتمل','تم التسليم')));
  const complete=s.updateOrder(order.id,states('مكتمل','تم التسليم','مدفوع'));assert.equal(complete.paymentStatus,'مدفوع');assert.equal(s.read().products[0].stocks['38'],2);assert.throws(()=>s.updateOrder(order.id,states('ملغي')));
});
await test('Cancellation returns stock exactly once and cannot reopen order',()=>{
  const {s}=setup();s.addToCart('p1','38',2);const order=s.createOrder(customer);s.updateOrder(order.id,states('ملغي'));s.updateOrder(order.id,states('ملغي'));
  assert.equal(s.read().products[0].stocks['38'],3);assert.throws(()=>s.updateOrder(order.id,states('جديد')));assert.throws(()=>s.removeProduct('p1'));
});
await test('Duplicate cart lines cannot oversell stock',()=>{
  const {s}=setup();s.saveCart([{productId:'p1',size:'38',qty:2},{productId:'p1',size:'38',qty:2}]);assert.throws(()=>s.createOrder(customer));assert.equal(s.read().products[0].stocks['38'],3);
});
await test('Storage failure leaves inventory and orders unchanged',()=>{
  const {s,map}=setup();s.addToCart('p1','38');const before=map.get('manal_store_data_v1'),set=map.set;map.set=()=>{throw Error('Quota exceeded')};assert.throws(()=>s.createOrder(customer));map.set=set;assert.equal(map.get('manal_store_data_v1'),before);
});
await test('Delivery pricing applies to new orders and preserves existing totals',()=>{
  const {s}=setup();s.addToCart('p1','38');const first=s.createOrder(customer);
  s.saveDeliveryFees({...s.deliveryFees,'غزة':22.5});s.addToCart('p1','38');const second=s.createOrder(customer);
  assert.equal(first.deliveryFee,15);assert.equal(s.read().orders.find(x=>x.id===first.id).total,260);assert.equal(second.deliveryFee,22.5);assert.equal(second.total,267.5);
  assert.throws(()=>s.saveDeliveryFees({...s.deliveryFees,'غزة':-1}));assert.throws(()=>s.saveDeliveryFees({...s.deliveryFees,'غزة':''}));assert.throws(()=>s.saveDeliveryFees({...s.deliveryFees,'غزة':1.005}));
});
await test('Free delivery and stale checkout price protection',()=>{
  const {s}=setup();s.saveDeliveryFees({...s.deliveryFees,'غزة':0});s.addToCart('p1','38');const free=s.createOrder({...customer,expectedTotal:245});assert.equal(free.deliveryFee,0);assert.equal(free.total,245);
  s.addToCart('p1','38');const product=s.read().products[0];s.saveProduct({...product,price:250},product.id);assert.throws(()=>s.createOrder({...customer,expectedTotal:245}));assert.equal(s.read().products[0].stocks['38'],2);assert.equal(s.read().orders.length,1);
});
await test('Payment icon links save, survive edits and reject unsafe URLs',()=>{
  const {s}=setup();const method=s.savePaymentMethod({name:'محفظة تجريبية',kind:'transfer',accountName:'منال',accountNumber:'0599000000',iconUrl:'https://images.example.com/wallet.svg',active:true});
  assert.equal(s.paymentIcon(method),'https://images.example.com/wallet.svg');
  const changed=s.savePaymentMethod({...method,name:'محفظة جديدة'},method.id);assert.equal(changed.iconUrl,method.iconUrl);
  const cleared=s.savePaymentMethod({...changed,iconUrl:''},method.id);assert.equal(s.paymentIcon(cleared),'./assets/payment-transfer.svg');
  assert.throws(()=>s.savePaymentMethod({...method,iconUrl:'javascript:alert(1)'},method.id));
  assert.throws(()=>s.savePaymentMethod({...method,iconUrl:'http://images.example.com/wallet.svg'},method.id));
  assert.throws(()=>s.savePaymentMethod({...method,iconUrl:'https://user:secret@example.com/icon.png'},method.id));
  assert.equal(s.paymentIcon({kind:'cod'}),'./assets/payment-cash.svg');
});
await test('Order notifications are atomic, readable and not duplicated by unchanged saves',()=>{
  const {s}=setup();s.addToCart('p1','38');const o=s.createOrder(customer);let n=s.read().notifications[0];assert.equal(n.orderId,o.id);assert.equal(n.read,false);assert.equal(n.type,'order');
  s.markNotificationsRead(n.id);assert.equal(s.read().notifications[0].read,true);
  s.updateOrder(o.id,states('مؤكد'));assert.equal(s.read().notifications.length,2);assert.equal(s.read().notifications[0].read,false);
  s.updateOrder(o.id,states('مؤكد'));assert.equal(s.read().notifications.length,2);s.markNotificationsRead();assert.ok(s.read().notifications.every(x=>x.read));
});
await test('Visitor heartbeats reuse a session without spamming notifications',()=>{
  const {s,map}=setup();const first=s.recordVisit({visitorId:'visitor-ABCDE',device:'جوال',path:'/?token=secret',pageView:true});assert.equal(first.path,'/');assert.equal(s.read().notifications.length,1);
  const heartbeat=s.recordVisit({sessionId:first.id,visitorId:first.visitorId,device:'جوال',path:'/'});assert.equal(heartbeat.id,first.id);assert.equal(s.read().notifications.length,1);assert.equal(heartbeat.pageViews,1);
  const reload=s.recordVisit({sessionId:first.id,visitorId:first.visitorId,path:'/',pageView:true});assert.equal(reload.pageViews,2);assert.equal(s.read().notifications.length,1);
  const data=s.read();data.visits[0].lastSeenAt=Date.now()-31*60*1000;map.set('manal_store_data_v1',JSON.stringify(data));
  const returning=s.recordVisit({sessionId:first.id,visitorId:first.visitorId,path:'/'});assert.notEqual(returning.id,first.id);assert.equal(s.read().notifications.length,2);
});
await test('Visitor and notification history stays bounded',()=>{
  const {s}=setup();for(let i=0;i<305;i++)s.recordVisit({visitorId:'visitor-'+i,path:'/'});
  assert.equal(s.read().visits.length,200);assert.equal(s.read().notifications.length,300);
});


await test('Administrator setup has no default password and supports separate login/logout',async()=>{
  const {s}=setup(undefined,{authenticated:false});assert.equal(s.currentAdmin(),null);
  assert.throws(()=>s.saveDeliveryFees(s.deliveryFees));
  const input={name:'مديرة المتجر',username:'manal.admin',password:'StrongLocalPassword123'};
  const admin=await s.setupAdmin(input);assert.equal(s.currentAdmin().id,admin.id);assert.equal(s.currentUser(),null);
  assert.ok(!JSON.stringify(s.read()).includes(input.password));await assert.rejects(()=>s.setupAdmin(input));
  s.logoutAdmin();assert.equal(s.currentAdmin(),null);await assert.rejects(()=>s.loginAdmin(input.username,'wrong-password'));
  await s.loginAdmin('MANAL.ADMIN',input.password);assert.equal(s.currentAdmin().id,admin.id);
});
await test('Customer username login is case-insensitive, unique and separate from admin login',async()=>{
  const {s}=setup(undefined,{authenticated:false});
  const input={name:'زبونة',username:'client.name',email:'client@example.com',phone:'0599999999',password:'ClientPassword123'};
  const user=await s.register(input);assert.equal(s.currentAdmin(),null);assert.throws(()=>s.saveProduct({}));
  s.setSession(null);await s.login('CLIENT.NAME',input.password);assert.equal(s.currentUser().id,user.id);
  await assert.rejects(()=>s.register({...input,email:'another@example.com',username:'CLIENT.NAME'}));
  await assert.rejects(()=>s.register({...input,username:'اسم عربي'}));
});
await test('Legacy email accounts and data migrate without losing order ownership',()=>{
  const {s}=setup(),data=s.read();delete data.users[0].username;delete data.admins;delete data.customerNotifications;
  const migrated=setup({manal_store_data_v1:JSON.stringify(data)},{authenticated:false}).s.read();
  assert.equal(migrated.users[0].id,'test-customer');assert.ok(migrated.users[0].username);assert.equal(migrated.admins.length,0);assert.equal(migrated.products.length,3);
});
await test('Checkout requires a logged-in customer and associates its notifications with that account',()=>{
  const {s}=setup();s.addToCart('p1','38');s.setSession(null);assert.throws(()=>s.createOrder(customer));assert.equal(s.read().orders.length,0);
  s.setSession('test-customer');const order=s.createOrder(customer);assert.equal(order.userId,'test-customer');assert.equal(s.customerNotifications().length,1);
  s.updateOrder(order.id,states('مؤكد'));assert.equal(s.customerNotifications().length,2);
  s.updateOrder(order.id,states('مؤكد'));assert.equal(s.customerNotifications().length,2);
  s.markCustomerNotificationsRead();assert.ok(s.customerNotifications().every(n=>n.read));
});
await test('Product announcements occur on first visibility, never hidden drafts or repeated edits',()=>{
  const {s}=setup();let p=s.saveProduct({name:'موديل جديد',category:'فساتين',price:100,stocks:{'40':1},active:false});
  assert.equal(s.customerNotifications().length,0);p=s.saveProduct({...p,active:true},p.id);assert.equal(s.customerNotifications().length,1);
  s.saveProduct({...p,price:110},p.id);s.saveProduct({...p,active:false},p.id);s.saveProduct({...p,active:true},p.id);assert.equal(s.customerNotifications().length,1);
  const cat=s.saveCategory({name:'فئة مخفية',active:false});const draft=s.saveProduct({name:'فستان مخفي',category:cat.name,price:80,stocks:{'40':1},active:true});
  assert.equal(s.customerNotifications().length,1);s.saveCategory({...cat,active:true},cat.id);assert.equal(s.customerNotifications().length,2);assert.equal(s.customerNotifications()[0].productId,draft.id);
});
await test('Customer notification reads do not alter other accounts or administrative notifications',async()=>{
  const {s}=setup();const other=await s.register({name:'زبونة أخرى',username:'other_client',email:'other@example.com',phone:'0598888888',password:'OtherPassword123'});
  s.saveProduct({name:'موديل للجميع',category:'فساتين',price:90,stocks:{'40':1},active:true});
  const own=s.customerNotifications()[0];s.setSession('test-customer');const first=s.customerNotifications()[0];assert.notEqual(own.id,first.id);
  s.markCustomerNotificationsRead(own.id);assert.equal(s.customerNotifications()[0].read,false);
  s.markCustomerNotificationsRead();s.setSession(other.id);assert.equal(s.customerNotifications()[0].read,false);
  s.addToCart('p1','38');const order=s.createOrder(customer);s.setSession('test-customer');assert.ok(s.customerNotifications().every(n=>n.orderId!==order.id));
  s.setSession(null);assert.equal(s.customerNotifications().length,0);
});
await test('Administrative mutations reject a missing admin session',()=>{
  const {s}=setup();s.logoutAdmin();
  for(const action of [()=>s.saveCategory({}),()=>s.removeCategory('id'),()=>s.savePromotion({}),()=>s.removePromotion('id'),()=>s.saveProduct({}),()=>s.removeProduct('p1'),()=>s.savePaymentMethod({}),()=>s.removePaymentMethod('pm-cod'),()=>s.saveDeliveryFees({}),()=>s.updateOrder('id',{}),()=>s.setUserActive('test-customer',false),()=>s.markNotificationsRead()]) assert.throws(action,/الإدارة/);
});
console.log(`\n${passed} store flow checks passed.`);
