/* Browser-only prototype. Data belongs to this browser and is not a shared store database. */
(() => {
  'use strict';
  const DATA_KEY = 'manal_store_data_v1';
  const CART_KEY = 'manal_store_cart_v1';
  const SESSION_KEY = 'manal_store_session_v2';
  const ADMIN_SESSION_KEY = 'manal_store_admin_session_v1';
  const sessions = globalThis.sessionStorage || localStorage;
  const sizes = ['36','38','40','42','44','46','48','50','52'];
  const DEFAULT_DELIVERY_FEES = {'غزة':15,'شمال غزة':20,'الوسطى':20,'خانيونس':25,'رفح':30};
  const seed = () => ({
    products:[
      {id:'p1',name:'قفطان سهرة أسود',category:'قفاطين',price:245,image:'./assets/dress-black.webp',description:'قفطان طويل بتفاصيل ذهبية ناعمة، مناسب للمناسبات والسهرات.',stocks:{'38':3,'40':4,'42':4,'44':3,'46':2,'48':1},active:true,featured:true,createdAt:Date.now()},
      {id:'p2',name:'فستان ساتان عاجي',category:'فساتين',price:220,image:'./assets/dress-ivory.webp',description:'فستان طويل بقماش ساتان انسيابي ولمسة ناعمة للمناسبات.',stocks:{'36':2,'38':3,'40':4,'42':4,'44':2,'46':1},active:true,featured:false,createdAt:Date.now()},
      {id:'p3',name:'القفطان الفستقي',category:'قفاطين',price:265,image:'./assets/dress-pistachio.webp',description:'قفطان مغربي باللون الفستقي وتطريز ذهبي بسيط.',stocks:{'38':2,'40':3,'42':4,'44':3,'46':2,'48':2},active:true,featured:false,createdAt:Date.now()}
    ], users:[], admins:[], customerNotifications:[], orders:[], notifications:[], visits:[], deliveryFees:{...DEFAULT_DELIVERY_FEES}, categories:[
      {id:'cat-kaftans',name:'قفاطين',image:'./assets/dress-black.webp',active:true},
      {id:'cat-dresses',name:'فساتين',image:'./assets/dress-ivory.webp',active:true}
    ], promotions:[
      {id:'ad-main',title:'إطلالتكِ لمناسبتكِ',description:'فساتين وقفاطين بتفاصيل مميزة، ومقاسات تختارين منها ما يناسبك.',button:'تسوقي الآن',image:'./assets/dress-black.webp',category:'',placement:'hero',tone:'dark',position:0,active:true},
      {id:'ad-kaftans',title:'قفاطين المناسبات',description:'تفاصيل تكمّل إطلالتكِ',button:'شاهدي التشكيلة',image:'./assets/dress-pistachio.webp',category:'قفاطين',placement:'card',tone:'light',position:1,active:true},
      {id:'ad-dresses',title:'اختاري فستانكِ',description:'المقاسات المتاحة داخل كل قطعة',button:'تسوقي الفساتين',image:'./assets/dress-ivory.webp',category:'فساتين',placement:'card',tone:'dark',position:2,active:true}
    ], paymentMethods:[
      {id:'pm-cod',name:'الدفع عند الاستلام',kind:'cod',accountName:'',accountNumber:'',instructions:'ادفعي للمندوب عند استلام الطلب.',active:true,createdAt:Date.now()}
    ]
  });
  const clone = x => JSON.parse(JSON.stringify(x));
  function read(){
    try { const value=JSON.parse(localStorage.getItem(DATA_KEY)); if(value&&Array.isArray(value.products)&&Array.isArray(value.orders)&&Array.isArray(value.users)){
      if(!Array.isArray(value.paymentMethods))value.paymentMethods=seed().paymentMethods;
      if(!Array.isArray(value.categories))value.categories=[...new Set(value.products.map(p=>p.category))].map((name,i)=>({id:'cat-migrated-'+i,name,image:value.products.find(p=>p.category===name)?.image||'',active:true}));
      if(!Array.isArray(value.promotions))value.promotions=seed().promotions;
      if(!Array.isArray(value.notifications))value.notifications=[];
      if(!Array.isArray(value.admins))value.admins=[];
      if(!Array.isArray(value.customerNotifications))value.customerNotifications=[];
      for(const u of value.users){if(!u.username)u.username='user_'+u.id.toLowerCase().replace(/[^a-z0-9]/g,'')}
      for(const p of value.products){if(p.announcedAt===undefined)p.announcedAt=p.active?p.createdAt||1:null}
      if(!Array.isArray(value.visits))value.visits=[];
      if(!value.deliveryFees||typeof value.deliveryFees!=='object'||Array.isArray(value.deliveryFees))value.deliveryFees={...DEFAULT_DELIVERY_FEES};
      return value;
    } } catch(_){}
    const value=seed(); localStorage.setItem(DATA_KEY,JSON.stringify(value)); return value;
  }
  function write(data,eventType='manal:update'){try{localStorage.setItem(DATA_KEY,JSON.stringify(data));window.dispatchEvent(new Event(eventType));}catch(_){throw Error('تعذّر حفظ البيانات. مساحة المتصفح قد تكون ممتلئة.');}}
  function cart(){try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch(_){return []}}
  function saveCart(items){localStorage.setItem(CART_KEY,JSON.stringify(items));window.dispatchEvent(new Event('manal:cart'))}
  const money = n => new Intl.NumberFormat('ar-PS-u-nu-latn',{maximumFractionDigits:2}).format(Number(n)||0)+' ₪';
  const date = t => new Intl.DateTimeFormat('ar-PS-u-nu-latn',{dateStyle:'medium',timeStyle:'short'}).format(new Date(t));
  const escape = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const image = v => /^(https?:\/\/|\.\/assets\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(String(v)) ? String(v) : './assets/dress-black.webp';
  const iconUrl = value => {try{const url=new URL(String(value||'').trim());return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch(_){return ''}};
  const paymentIcon = method => iconUrl(method?.iconUrl)||'./assets/payment-'+(method?.kind==='cod'?'cash':'transfer')+'.svg';
  const stock = p => Object.values(p.stocks||{}).reduce((a,b)=>a+(Number(b)||0),0);
  const currentUser = () => read().users.find(u=>u.id===sessions.getItem(SESSION_KEY)&&u.active)||null;
  function setSession(id){id?sessions.setItem(SESSION_KEY,id):sessions.removeItem(SESSION_KEY);window.dispatchEvent(new Event('manal:session'))}
  function id(prefix){return prefix+Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase()}
  function addNotification(data,input){
    data.notifications.unshift({id:id('n-'),type:input.type,title:input.title,message:input.message,orderId:input.orderId||null,visitId:input.visitId||null,read:false,createdAt:Date.now()});
    data.notifications=data.notifications.slice(0,300);
  }
  function markNotificationsRead(notificationId=null){requireAdmin();
    const data=read();let changed=false;
    for(const n of data.notifications){if(!n.read&&(!notificationId||n.id===notificationId)){n.read=true;changed=true}}
    if(changed)write(data,'manal:activity');
  }
  function recordVisit(input={}){
    const data=read(),now=Date.now();let visit=data.visits.find(v=>v.id===input.sessionId);
    const visitorId=/^[A-Za-z0-9-]{5,80}$/.test(String(input.visitorId||''))?String(input.visitorId):id('visitor-');
    const path=String(input.path||'/').split('?')[0].split('#')[0].slice(0,160),device=['جوال','كمبيوتر','جهاز لوحي'].includes(input.device)?input.device:'كمبيوتر';
    if(visit&&now-visit.lastSeenAt>30*60*1000)visit=null;
    if(visit){visit.lastSeenAt=now;visit.path=path.startsWith('/')?path:'/';if(input.pageView)visit.pageViews=(visit.pageViews||1)+1}
    else{
      visit={id:id('visit-'),visitorId,path:path.startsWith('/')?path:'/',device,pageViews:1,createdAt:now,lastSeenAt:now};data.visits.unshift(visit);data.visits=data.visits.slice(0,200);
      addNotification(data,{type:'visit',title:'زيارة جديدة للمتجر',message:'زائر '+visitorId.slice(-6)+' · '+device,visitId:visit.id});
    }
    write(data,'manal:activity');return clone(visit);
  }
  async function passwordHash(password,salt){
    if(!globalThis.crypto?.subtle) throw Error('تسجيل الدخول يحتاج تشغيل المشروع عبر خادم محلي أو HTTPS.');
    const key=await globalThis.crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
    const bits=await globalThis.crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:120000,hash:'SHA-256'},key,256);
    return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
  }
  const currentAdmin=()=>read().admins.find(a=>a.id===sessions.getItem(ADMIN_SESSION_KEY))||null;
  function requireAdmin(){if(!currentAdmin())throw Error('سجّلي الدخول إلى لوحة الإدارة أولًا.');}
  const validUsername=value=>/^[a-z0-9_.-]{3,32}$/.test(value);
  async function setupAdmin({name,username,password}){
    name=String(name||'').trim();username=String(username||'').trim().toLowerCase();password=String(password||'');
    if(read().admins.length)throw Error('حساب الإدارة مُعدّ مسبقًا على هذا المتصفح.');
    if(name.length<2||!validUsername(username)||password.length<8||password.length>128)throw Error('أدخلي الاسم، واسم مستخدم إنجليزي من 3–32 حرفًا، وكلمة مرور من 8–128 حرفًا.');
    const salt=id('s-'),hash=await passwordHash(password,salt),data=read();
    if(data.admins.length)throw Error('تم إعداد حساب الإدارة؛ استخدمي تسجيل الدخول.');
    const admin={id:id('admin-'),name,username,salt,hash,createdAt:Date.now()};
    data.admins.push(admin);write(data);sessions.setItem(ADMIN_SESSION_KEY,admin.id);return clone(admin);
  }
  async function loginAdmin(username,password){
    const admin=read().admins.find(a=>a.username===String(username||'').trim().toLowerCase());
    if(!admin||await passwordHash(String(password||''),admin.salt)!==admin.hash)throw Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
    if(!read().admins.some(a=>a.id===admin.id))throw Error('الحساب غير موجود.');
    sessions.setItem(ADMIN_SESSION_KEY,admin.id);return clone(admin);
  }
  function logoutAdmin(){sessions.removeItem(ADMIN_SESSION_KEY);window.dispatchEvent(new Event('manal:admin-session'));}
  async function register({name,username,email,phone,password}){
    name=String(name||'').trim();username=String(username||'').trim().toLowerCase();email=String(email||'').trim().toLowerCase();phone=String(phone||'').trim();password=String(password||'');
    if(name.length<2||!validUsername(username)||!/^\S+@\S+\.\S+$/.test(email)||phone.length<7||password.length<8||password.length>128)throw Error('أكملي بياناتك، واسم مستخدم إنجليزي من 3–32 حرفًا، وكلمة مرور من 8–128 حرفًا.');
    const duplicate=data=>data.users.some(u=>u.email===email||u.username===username);
    if(duplicate(read()))throw Error('اسم المستخدم أو البريد الإلكتروني مسجّل مسبقًا.');
    const salt=id('s-'),hash=await passwordHash(password,salt),data=read();
    if(duplicate(data))throw Error('اسم المستخدم أو البريد الإلكتروني مسجّل مسبقًا.');
    const user={id:id('u-'),name,username,email,phone,salt,hash,active:true,createdAt:Date.now()};
    data.users.push(user);write(data);setSession(user.id);return clone(user);
  }
  async function login(identifier,password){
    identifier=String(identifier||'').trim().toLowerCase();
    const user=read().users.find(u=>u.username===identifier||u.email===identifier);
    if(!user||await passwordHash(String(password||''),user.salt)!==user.hash)throw Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
    if(!read().users.find(u=>u.id===user.id)?.active)throw Error('هذا الحساب موقوف. تواصلي مع المتجر.');
    setSession(user.id);return clone(user);
  }
  function addCustomerNotification(data,input){
    data.customerNotifications.unshift({id:id('cn-'),...input,read:false,createdAt:Date.now()});
    const counts=new Map();data.customerNotifications=data.customerNotifications.filter(n=>{const count=(counts.get(n.userId)||0)+1;counts.set(n.userId,count);return count<=100});
  }
  function customerNotifications(){const user=currentUser();return user?read().customerNotifications.filter(n=>n.userId===user.id):[];}
  function markCustomerNotificationsRead(notificationId=null){
    const user=currentUser();if(!user)throw Error('سجّلي الدخول لمشاهدة إشعاراتك.');
    const data=read();for(const n of data.customerNotifications){if(n.userId===user.id&&(!notificationId||n.id===notificationId))n.read=true}write(data,'manal:customer-notifications');
  }
  function announceProduct(data,p){
    if(p.announcedAt||!p.active||!data.categories.some(c=>c.name===p.category&&c.active))return;
    p.announcedAt=Date.now();
    for(const u of data.users.filter(u=>u.active))addCustomerNotification(data,{userId:u.id,type:'product',title:'موديل جديد في منال ستور',message:p.name,productId:p.id});
  }
  function saveProduct(input,productId){requireAdmin();
    const data=read();const existing=data.products.find(p=>p.id===productId);
    const name=String(input.name||'').trim(),category=String(input.category||'').trim(),price=Number(input.price);
    if(name.length<3||!category||!Number.isFinite(price)||price<=0) throw Error('تحققي من الاسم، النوع، والسعر.');
    if(Math.abs(price*100-Math.round(price*100))>0.00001)throw Error('سعر البيع يقبل منزلتين عشريتين فقط.');
    if(!data.categories.some(c=>c.name===category))throw Error('اختاري فئة موجودة من قائمة الفئات.');
    const stocks={};for(const size of sizes){const value=Number(input.stocks?.[size]||0);if(!Number.isInteger(value)||value<0)throw Error('المخزون يجب أن يكون عددًا صحيحًا غير سالب.');if(value)stocks[size]=value}
    const product={id:existing?.id||id('p'),name,category,price,image:image(input.image),description:String(input.description||'').trim(),stocks,active:!!input.active,featured:!!input.featured,announcedAt:existing?.announcedAt||null,createdAt:existing?.createdAt||Date.now()};
    if(existing)Object.assign(existing,product);else data.products.unshift(product);
    announceProduct(data,existing||product);write(data);return clone(product);
  }
  function removeProduct(productId){requireAdmin();const data=read();if(data.orders.some(o=>o.items.some(x=>x.productId===productId)))throw Error('هذا المنتج مرتبط بطلبات؛ يمكنك إخفاؤه بدل حذفه.');data.products=data.products.filter(p=>p.id!==productId);write(data)}
  function setUserActive(userId,active){requireAdmin();const data=read(),u=data.users.find(x=>x.id===userId);if(!u)throw Error('الحساب غير موجود.');u.active=!!active;write(data)}
  function saveCategory(input,categoryId){requireAdmin();
    const data=read(),existing=data.categories.find(c=>c.id===categoryId),name=String(input.name||'').trim();
    if(name.length<2||name==='الكل')throw Error('أدخلي اسم فئة صالحًا.');
    if(data.categories.some(c=>c.name===name&&c.id!==categoryId))throw Error('هذه الفئة موجودة بالفعل.');
    if(existing&&existing.name!==name){data.products.filter(p=>p.category===existing.name).forEach(p=>p.category=name);data.promotions.filter(p=>p.category===existing.name).forEach(p=>p.category=name)}
    const category={id:existing?.id||id('cat-'),name,image:image(input.image),active:!!input.active};
    existing?Object.assign(existing,category):data.categories.push(category);for(const p of data.products.filter(p=>p.category===name))announceProduct(data,p);write(data);return clone(category);
  }
  function removeCategory(categoryId){requireAdmin();const data=read(),c=data.categories.find(c=>c.id===categoryId);if(!c)throw Error('الفئة غير موجودة.');if(data.products.some(p=>p.category===c.name))throw Error('انقلي منتجات هذه الفئة إلى فئة أخرى قبل حذفها.');data.promotions.filter(p=>p.category===c.name).forEach(p=>p.category='');data.categories=data.categories.filter(x=>x.id!==categoryId);write(data)}
  function savePromotion(input,promotionId){requireAdmin();
    const data=read(),existing=data.promotions.find(x=>x.id===promotionId),title=String(input.title||'').trim(),category=String(input.category||'');
    if(title.length<2||!['hero','card'].includes(input.placement)||!['dark','light'].includes(input.tone))throw Error('تحققي من عنوان الإعلان ومكانه وألوانه.');
    if(category&&!data.categories.some(c=>c.name===category))throw Error('الفئة المستهدفة غير موجودة.');
    const position=Number(input.position||0);if(!Number.isInteger(position)||position<0)throw Error('ترتيب الإعلان يجب أن يكون عددًا صحيحًا غير سالب.');
    const ad={id:existing?.id||id('ad-'),title,description:String(input.description||'').trim(),button:String(input.button||'تسوقي الآن').trim(),image:image(input.image),category,placement:input.placement,tone:input.tone,position,active:!!input.active};
    existing?Object.assign(existing,ad):data.promotions.push(ad);write(data);return clone(ad);
  }
  function removePromotion(promotionId){requireAdmin();const data=read();data.promotions=data.promotions.filter(x=>x.id!==promotionId);write(data)}
  const visibleProducts=data=>data.products.filter(p=>p.active&&data.categories.some(c=>c.name===p.category&&c.active));
  function savePaymentMethod(input,methodId){requireAdmin();
    const data=read(),existing=data.paymentMethods.find(m=>m.id===methodId);
    const name=String(input.name||'').trim(),kind=String(input.kind||''),accountName=String(input.accountName||'').trim(),accountNumber=String(input.accountNumber||'').trim(),instructions=String(input.instructions||'').trim();
    if(name.length<2||!['cod','transfer'].includes(kind))throw Error('اكتبي اسم طريقة الدفع وحددي نوعها.');
    if(kind==='transfer'&&(accountName.length<2||accountNumber.length<4))throw Error('أدخلي اسم صاحب الحساب ورقم الحساب أو الجوال.');
    if(kind==='cod'&&data.paymentMethods.some(m=>m.kind==='cod'&&m.id!==methodId))throw Error('طريقة الدفع عند الاستلام موجودة بالفعل؛ عدّليها بدل إضافة ثانية.');
    const rawIcon=String(input.iconUrl??existing?.iconUrl??'').trim(),paymentIconUrl=iconUrl(rawIcon);
    if(rawIcon&&!paymentIconUrl)throw Error('أدخلي رابط صورة مباشر يبدأ بـ https:// أو اتركيه فارغًا للأيقونة الافتراضية.');
    const method={id:existing?.id||id('pm-'),name,kind,iconUrl:paymentIconUrl,accountName:kind==='transfer'?accountName:'',accountNumber:kind==='transfer'?accountNumber:'',instructions,active:!!input.active,createdAt:existing?.createdAt||Date.now()};
    if(existing)Object.assign(existing,method);else data.paymentMethods.push(method);
    write(data);return clone(method);
  }
  function removePaymentMethod(methodId){requireAdmin();const data=read();data.paymentMethods=data.paymentMethods.filter(m=>m.id!==methodId);write(data)}
  function saveDeliveryFees(input){requireAdmin();
    const data=read(),fees={};
    for(const region of Object.keys(data.deliveryFees)){
      const raw=input[region],fee=Number(raw);
      if(raw==null||String(raw).trim()===''||!Number.isFinite(fee)||fee<0)throw Error('أدخلي تسعيرة صحيحة لكل محافظة؛ استخدمي 0 للتوصيل المجاني.');
      if(Math.abs(fee*100-Math.round(fee*100))>0.00001)throw Error('التسعيرة تقبل منزلتين عشريتين فقط.');
      fees[region]=Math.round(fee*100)/100;
    }
    data.deliveryFees=fees;write(data);return {...fees};
  }
  function addToCart(productId,size,qty=1){
    const p=read().products.find(x=>x.id===productId&&x.active);if(!p||!(Number(p.stocks[size])>0))throw Error('هذا المقاس غير متوفر.');
    const items=cart(),line=items.find(x=>x.productId===productId&&x.size===size),next=(line?.qty||0)+qty;
    if(!Number.isInteger(qty)||qty<1||!Number.isInteger(next)||next>Number(p.stocks[size])||!visibleProducts(read()).some(x=>x.id===p.id))throw Error('الكمية المطلوبة غير متوفرة.');
    line?line.qty=next:items.push({productId,size,qty:next});saveCart(items);
  }
  function updateCart(productId,size,qty){const items=cart(),line=items.find(x=>x.productId===productId&&x.size===size);if(!line)return;if(!Number.isInteger(qty))throw Error('الكمية يجب أن تكون عددًا صحيحًا.');if(qty<=0){saveCart(items.filter(x=>x!==line));return}const p=visibleProducts(read()).find(x=>x.id===productId);if(!p||qty>Number(p.stocks[size]||0))throw Error('الكمية المطلوبة غير متوفرة.');line.qty=qty;saveCart(items)}
  function createOrder(input){
    if(!currentUser())throw Error('سجّلي الدخول قبل تأكيد الطلب لمتابعته واستلام إشعاراته.');
    const data=read(),items=cart();if(!items.length)throw Error('السلة فارغة.');
    const name=String(input.name||'').trim(),phone=String(input.phone||'').trim(),region=String(input.region||''),address=String(input.address||'').trim();
    if(name.length<2||phone.length<7||!Object.hasOwn(data.deliveryFees,region)||address.length<5)throw Error('أكملي الاسم، الهاتف، المحافظة، والعنوان التفصيلي.');
    const method=data.paymentMethods.find(m=>m.id===String(input.paymentMethodId||'')&&m.active);
    if(!method)throw Error('اختاري طريقة دفع متاحة.');
    const payment=method.kind,receipt=String(input.paymentReceipt||'');
    if(payment==='transfer'&&(!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(receipt)||receipt.length>700000))throw Error('أرفقي صورة واضحة لإشعار الحوالة.');
    const totals=new Map();
    const lines=items.map(item=>{const p=visibleProducts(data).find(x=>x.id===item.productId),key=item.productId+'|'+item.size;totals.set(key,(totals.get(key)||0)+item.qty);if(!p||!Number.isInteger(item.qty)||item.qty<1||Number(p.stocks[item.size]||0)<totals.get(key))throw Error('تغيّر المخزون. راجعي السلة قبل إتمام الطلب.');return {productId:p.id,name:p.name,image:p.image,size:item.size,qty:item.qty,unitPrice:p.price}});
    const subtotal=Math.round(lines.reduce((sum,x)=>sum+x.qty*x.unitPrice,0)*100)/100,fee=data.deliveryFees[region];
    const total=Math.round((subtotal+fee)*100)/100;
    if(input.expectedTotal!=null&&(!Number.isFinite(Number(input.expectedTotal))||Math.abs(Number(input.expectedTotal)-total)>0.005))throw Error('تغيّر السعر أو رسوم التوصيل. أغلقي خطوة الطلب وافتحيها مجددًا لمراجعة الإجمالي.');
    for(const item of items){data.products.find(x=>x.id===item.productId).stocks[item.size]-=item.qty}
    const order={id:id('MS-'),userId:currentUser()?.id||null,customer:{name,phone,region,address,notes:String(input.notes||'').trim()},items:lines,subtotal,deliveryFee:fee,total,payment,paymentMethodId:method.id,paymentMethodName:method.name,paymentAccountName:method.accountName,paymentAccountNumber:method.accountNumber,paymentReference:payment==='transfer'?String(input.reference||'').trim():'',paymentReceipt:payment==='transfer'?receipt:'',paymentStatus:payment==='transfer'?'قيد التحقق':'غير مدفوع',status:'جديد',deliveryStatus:'بانتظار التجهيز',courier:'',tracking:'',createdAt:Date.now(),updatedAt:Date.now()};
    data.orders.unshift(order);addCustomerNotification(data,{userId:order.userId,type:'order',title:'تم تسجيل طلبكِ '+order.id,message:'طلبكِ الآن قيد المراجعة.',orderId:order.id});addNotification(data,{type:'order',title:'طلب جديد '+order.id,message:name+' · '+money(order.total)+' · '+method.name,orderId:order.id});write(data);saveCart([]);return clone(order);
  }
  function updateOrder(orderId,changes){requireAdmin();
    const data=read(),o=data.orders.find(x=>x.id===orderId);if(!o)throw Error('الطلب غير موجود.');
    const previous=JSON.stringify([o.status,o.deliveryStatus,o.paymentStatus,o.courier,o.tracking]);
    const statuses=['جديد','مؤكد','قيد التجهيز','تم الشحن','مكتمل','ملغي'];
    const deliveryStatuses=['بانتظار التجهيز','جاهز للتوصيل','مع المندوب','تم التسليم','تعذر التسليم'];
    const payments=['غير مدفوع','قيد التحقق','مدفوع'];
    if(o.status==='ملغي'&&changes.status!=='ملغي')throw Error('لا يمكن إعادة طلب ملغي؛ أنشئي طلبًا جديدًا.');
    if(o.status==='مكتمل'&&changes.status==='ملغي')throw Error('لا يمكن إلغاء طلب مكتمل.');
    if(!statuses.includes(changes.status)||!deliveryStatuses.includes(changes.deliveryStatus)||!payments.includes(changes.paymentStatus))throw Error('حالة غير صحيحة.');
    if(o.status==='مكتمل'&&changes.status!=='مكتمل')throw Error('الطلب مكتمل؛ لا يمكن إعادته إلى حالة سابقة.');
    const allowedDelivery={ 'جديد':['بانتظار التجهيز'], 'مؤكد':['بانتظار التجهيز','جاهز للتوصيل'], 'قيد التجهيز':['بانتظار التجهيز','جاهز للتوصيل'], 'تم الشحن':['مع المندوب','تعذر التسليم'], 'مكتمل':['تم التسليم'], 'ملغي':['بانتظار التجهيز','جاهز للتوصيل','تعذر التسليم'] };
    if(!allowedDelivery[changes.status].includes(changes.deliveryStatus))throw Error('حالة التوصيل لا تتوافق مع حالة الطلب؛ راجعي الخيارين.');
    if(changes.status==='مكتمل'&&(changes.deliveryStatus!=='تم التسليم'||changes.paymentStatus!=='مدفوع'))throw Error('إكمال الطلب يتطلب تسليم الطلب وتأكيد الدفع.');
    if(changes.status!=='ملغي'&&changes.deliveryStatus==='تم التسليم'&&changes.status!=='مكتمل')throw Error('عند تأكيد التسليم اختاري «مكتمل» وأكدي الدفع.');
    if(changes.status==='ملغي'&&(changes.deliveryStatus==='مع المندوب'||changes.deliveryStatus==='تم التسليم'))throw Error('اختاري حالة التوصيل الفعلية قبل إلغاء الطلب.');
    if(changes.status==='ملغي'&&o.status!=='ملغي'){for(const item of o.items){const p=data.products.find(x=>x.id===item.productId);if(p)p.stocks[item.size]=(Number(p.stocks[item.size])||0)+item.qty}}
    o.status=changes.status;o.deliveryStatus=changes.deliveryStatus;o.paymentStatus=changes.paymentStatus;o.courier=String(changes.courier||'').trim();o.tracking=String(changes.tracking||'').trim();o.updatedAt=Date.now();
    if(previous!==JSON.stringify([o.status,o.deliveryStatus,o.paymentStatus,o.courier,o.tracking])){addNotification(data,{type:'order',title:'تحديث الطلب '+o.id,message:o.customer.name+' · '+o.status+' · '+o.paymentStatus,orderId:o.id});if(o.userId)addCustomerNotification(data,{userId:o.userId,type:'order',title:'تحديث طلبكِ '+o.id,message:o.status+' · '+o.deliveryStatus+' · '+o.paymentStatus,orderId:o.id});}
    write(data);return clone(o);
  }
  const receiptImage=v=>/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(String(v||''))&&String(v).length<=700000?String(v):'';
  window.Store={currentAdmin,setupAdmin,loginAdmin,logoutAdmin,customerNotifications,markCustomerNotificationsRead,read,cart,saveCart,money,date,escape,image,iconUrl,paymentIcon,receiptImage,stock,sizes,markNotificationsRead,recordVisit,get deliveryFees(){return {...read().deliveryFees}},saveDeliveryFees,currentUser,setSession,register,login,saveProduct,removeProduct,setUserActive,saveCategory,removeCategory,savePromotion,removePromotion,visibleProducts,savePaymentMethod,removePaymentMethod,addToCart,updateCart,createOrder,updateOrder};
})();
