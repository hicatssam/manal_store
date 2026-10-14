(() => {
  'use strict';
  const S=window.Store,$=id=>document.getElementById(id),esc=S.escape;
  let category='الكل',query='',selectedProduct=null,selectedSize=null,authMode='login',activeModal=null,toastTimer,receiptPreviewUrl=null,afterAuth=null;
  const overlay=$('overlay');
  const getProduct=id=>S.read().products.find(p=>p.id===id);
  function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3300)}
  function open(id){close();activeModal=$(id);overlay.hidden=false;document.body.style.overflow='hidden';activeModal.classList.add('open');activeModal.setAttribute('aria-hidden','false')}
  function close(){document.querySelectorAll('.modal.open,.drawer.open').forEach(x=>{x.classList.remove('open');x.setAttribute('aria-hidden','true')});overlay.hidden=true;document.body.style.overflow='';activeModal=null;if(receiptPreviewUrl){URL.revokeObjectURL(receiptPreviewUrl);receiptPreviewUrl=null}}
  function renderCatalog(){
    const data=S.read(),products=S.visibleProducts(data),categories=['الكل',...data.categories.filter(c=>c.active).map(c=>c.name)];
    if(!categories.includes(category))category='الكل';
    $('categoryFilters').innerHTML=categories.map(c=>{const picture=c==='الكل'?'./assets/manalstorelogo.png':S.image(data.categories.find(x=>x.name===c)?.image);return `<button type="button" class="category-choice ${c===category?'active':''}" data-category="${esc(c)}"><span class="category-thumb"><img src="${esc(picture)}" alt="" loading="lazy"></span><span>${esc(c)}</span></button>`}).join('');
    const shown=products.filter(p=>(category==='الكل'||p.category===category)&&(!query||(p.name+' '+p.category).toLowerCase().includes(query.toLowerCase())));
    $('productResult').textContent=`${shown.length} قطع`;
    $('emptyProducts').hidden=shown.length!==0;
    $('productGrid').innerHTML=shown.map(p=>`<article class="product-card"><div class="product-image"><button class="product-visual-button" data-product="${esc(p.id)}" aria-label="عرض ${esc(p.name)}"><img src="${esc(S.image(p.image))}" alt="${esc(p.name)}" loading="lazy"></button>${S.stock(p)>0?'':'<span class="product-tag">نفد المخزون</span>'}<button class="product-quick" data-product="${esc(p.id)}">عرض التفاصيل والمقاسات</button></div><div class="product-info"><small class="category">${esc(p.category)}</small><h3>${esc(p.name)}</h3><div class="price">${S.money(p.price)}</div></div></article>`).join('');
  }
  function renderPromotions(){
    const data=S.read(),ads=data.promotions.filter(a=>a.active&&(!a.category||data.categories.some(c=>c.name===a.category&&c.active))).sort((a,b)=>a.position-b.position),hero=ads.find(a=>a.placement==='hero');
    $('heroPromotion').hidden=!hero;
    $('heroPromotion').innerHTML=hero?`<div class="hero-content container tone-${hero.tone}"><div class="hero-copy"><span class="eyebrow">MANAL STORE</span><h1>${esc(hero.title)}</h1><p>${esc(hero.description)}</p><button class="button button-dark" data-category="${esc(hero.category||'الكل')}">${esc(hero.button)} ←</button></div><div class="hero-visual"><img src="${esc(S.image(hero.image))}" alt="${esc(hero.title)}"></div></div>`:'';
    $('promotionCards').innerHTML=ads.filter(a=>a.placement==='card').map(a=>`<article class="promo-card tone-${a.tone}"><img src="${esc(S.image(a.image))}" alt="" loading="lazy"><div class="promo-copy"><h2>${esc(a.title)}</h2><p>${esc(a.description)}</p><button data-category="${esc(a.category||'الكل')}">${esc(a.button)} ←</button></div></article>`).join('');
    $('promotionCards').hidden=!$('promotionCards').childElementCount;
  }
  function renderProduct(id){
    const p=S.visibleProducts(S.read()).find(x=>x.id===id);if(!p)return notify('هذه القطعة غير متوفرة الآن.');
    selectedProduct=p.id;selectedSize=null;
    $('productModal').innerHTML=`<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="product-detail"><img src="${esc(S.image(p.image))}" alt="${esc(p.name)}"><div class="product-detail-content"><span class="eyebrow">${esc(p.category)}</span><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><div class="big-price">${S.money(p.price)}</div><strong>اختاري المقاس</strong><div class="size-group">${S.sizes.map(size=>`<button type="button" data-size="${size}" ${Number(p.stocks[size]||0)<1?'disabled':''}>${size}</button>`).join('')}</div><div id="stockHint" class="stock-hint">المقاسات غير المتوفرة معطّلة.</div><button id="addToCart" class="button button-dark wide">أضيفي إلى السلة</button><div class="detail-note">للاستفسار عن المقاس، تواصلي مع المتجر قبل الطلب.</div></div></div>`;
    open('productModal');
  }
  function cartLineItems(){return S.cart().map(i=>({...i,product:getProduct(i.productId)})).filter(x=>x.product)}
  function renderCart(){
    const lines=cartLineItems(),count=lines.reduce((n,x)=>n+x.qty,0);
    $('cartCount').textContent=count;$('cartCount').hidden=count===0;
    $('cartItemCount').textContent=count?`عدد القطع: ${count}`:'اختاري القطع التي تحبينها';
    $('cartItems').innerHTML=lines.length?lines.map(x=>{const available=Number(x.product.stocks[x.size]||0);return `<article class="cart-line"><img src="${esc(S.image(x.product.image))}" alt="${esc(x.product.name)}"><div class="cart-line-content"><div class="cart-item-heading"><h3>${esc(x.product.name)}</h3><button class="cart-remove-button" data-remove="${esc(x.productId)}" data-size="${esc(x.size)}" aria-label="إزالة ${esc(x.product.name)} من السلة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div><div class="cart-item-meta"><span>مقاس <bdi>${esc(x.size)}</bdi></span><small>${S.money(x.product.price)} للقطعة</small></div><div class="cart-item-bottom"><div class="qty-control" aria-label="كمية القطعة"><button data-qty="-1" data-id="${esc(x.productId)}" data-size="${esc(x.size)}" aria-label="إنقاص الكمية" ${x.qty<=1?'disabled':''}>−</button><span aria-live="polite">${x.qty}</span><button data-qty="1" data-id="${esc(x.productId)}" data-size="${esc(x.size)}" aria-label="زيادة الكمية" ${x.qty>=available?'disabled':''}>+</button></div><strong><bdi>${S.money(x.product.price*x.qty)}</bdi></strong></div>${available<x.qty?'<p class="cart-stock-warning">الكمية المطلوبة لم تعد متاحة؛ عدّلي السلة قبل الطلب.</p>':''}</div></article>`}).join(''):`<div class="cart-empty"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-1 12H5L4 8ZM9 8V6a3 3 0 0 1 6 0v2"/></svg></span><h3>سلتكِ فارغة الآن</h3><p>اختاري قطعة من التشكيلة وأضيفي مقاسكِ إلى السلة.</p><button class="button button-outline" data-continue-shopping>تصفحي التشكيلة</button></div>`;
    $('cartSubtotal').textContent=S.money(lines.reduce((n,x)=>n+x.product.price*x.qty,0));
    $('checkoutButton').disabled=!lines.length;
  }
  function authMarkup(mode){
    const isRegister=mode==='register';
    $('authModal').innerHTML=`<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="modal-pad"><span class="eyebrow">YOUR ACCOUNT</span><h2>${isRegister?'إنشاء حساب':'أهلًا بعودتكِ'}</h2><p>حسابكِ لمتابعة الطلبات والإشعارات على هذا المتصفح.</p><div class="auth-tabs"><button data-auth-tab="login" class="${!isRegister?'active':''}">تسجيل الدخول</button><button data-auth-tab="register" class="${isRegister?'active':''}">حساب جديد</button></div><form id="authForm"><div class="form-grid">${isRegister?`<div class="field full"><label for="authName">الاسم الكامل</label><input id="authName" name="name" autocomplete="name" required minlength="2"></div>`:''}${isRegister?`<div class="field full"><label for="authUsername">اسم المستخدم</label><input id="authUsername" name="username" dir="ltr" autocomplete="username" pattern="[A-Za-z0-9_.-]{3,32}" minlength="3" maxlength="32" required><small>حروف إنجليزية وأرقام أو . _ -</small></div><div class="field full"><label for="authEmail">البريد الإلكتروني</label><input id="authEmail" name="email" type="email" autocomplete="email" required></div>`:`<div class="field full"><label for="authIdentifier">اسم المستخدم أو البريد الإلكتروني</label><input id="authIdentifier" name="identifier" dir="ltr" autocomplete="username" required></div>`}${isRegister?`<div class="field full"><label for="authPhone">رقم الهاتف</label><input id="authPhone" name="phone" type="tel" lang="en" dir="ltr" autocomplete="tel" required minlength="7"></div>`:''}<div class="field full"><label for="authPassword">كلمة المرور</label><input id="authPassword" name="password" type="password" autocomplete="${isRegister?'new-password':'current-password'}" minlength="8" maxlength="128" required></div></div><p id="authError" class="form-error" role="alert"></p><button class="button button-dark wide" type="submit">${isRegister?'إنشاء الحساب':'دخول'}</button></form></div>`;
  }
  function openAuth(mode='login'){authMode=mode;authMarkup(mode);open('authModal')}
  function openAccount(){
    const u=S.currentUser();if(!u)return openAuth();
    const orders=S.read().orders.filter(o=>o.userId===u.id);
    $('accountModal').innerHTML=`<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="modal-pad"><span class="eyebrow">MY ACCOUNT</span><h2>مرحبًا، ${esc(u.name)}</h2><div class="account-actions"><small>${esc(u.username)} · ${esc(u.phone)}</small><button id="logoutButton" class="tiny-link">تسجيل الخروج</button></div><h3>طلباتي <span style="color:var(--muted);font-size:13px">(${orders.length})</span></h3>${orders.length?orders.map(o=>`<article class="order-card" id="order-${esc(o.id)}" tabindex="-1"><div class="order-card-top"><h3>${esc(o.id)}</h3><span class="status-badge ${o.status==='ملغي'?'red':o.status==='مكتمل'?'green':''}">${esc(o.status)}</span></div><p>${S.date(o.createdAt)} · ${o.items.reduce((n,x)=>n+x.qty,0)} قطع · ${S.money(o.total)}</p><p>التوصيل: ${esc(o.deliveryStatus)}${o.tracking?' · رقم التتبع: '+esc(o.tracking):''}</p><p>الدفع: ${esc(o.paymentStatus)}</p></article>`).join(''):'<p class="admin-empty">ما عندك طلبات بعد.</p>'}</div>`;
    open('accountModal');
  }
  function openCheckout(){
    if(!S.cart().length)return notify('سلتك فارغة.');
    if(!S.currentUser()){afterAuth='checkout';openAuth();notify('سجّلي الدخول أو أنشئي حسابًا لمتابعة طلبكِ.');return}
    const u=S.currentUser(),methods=S.read().paymentMethods.filter(m=>m.active),first=methods[0];
    const lines=cartLineItems(),subtotal=lines.reduce((n,x)=>n+x.product.price*x.qty,0);
    const choices=methods.map((m,i)=>`<label class='payment-option'><span class='payment-choice-icon'><img class='payment-logo-image' src='${esc(S.paymentIcon(m))}' data-fallback='./assets/payment-${m.kind==='cod'?'cash':'transfer'}.svg' alt='' referrerpolicy='no-referrer'></span><span class='payment-option-copy'><strong>${esc(m.name)}</strong><small>${m.kind==='cod'?'الدفع للمندوب عند الاستلام':'حوّلي المبلغ وأرفقي الإشعار'}</small></span><input type='radio' name='paymentMethodId' value='${esc(m.id)}' ${i===0?'checked':''} required aria-label='${esc(m.name)}'></label>`).join('');
    $('checkoutModal').innerHTML=`<button class='modal-close' data-close aria-label='إغلاق'>×</button><div class='modal-pad checkout-pad'><span class='eyebrow'>MANAL STORE</span><h2>إتمام الطلب</h2><p>راجعي بيانات التوصيل واختاري طريقة الدفع.</p>
      <div class='checkout-layout'><form id='checkoutForm' data-subtotal='${subtotal}'><input type='hidden' name='expectedTotal' value='${subtotal}'><h3 class='checkout-section-title'>بيانات التوصيل</h3><div class='form-grid'>
        <div class='field'><label for='customerName'>الاسم الكامل</label><input id='customerName' name='name' value='${esc(u?.name||'')}' autocomplete='name' required minlength='2'></div>
        <div class='field'><label for='customerPhone'>رقم الهاتف</label><input id='customerPhone' name='phone' type='tel' lang='en' dir='ltr' value='${esc(u?.phone||'')}' autocomplete='tel' required minlength='7'></div>
        <div class='field'><label for='region'>المحافظة</label><select id='region' name='region' required><option value=''>اختاري المحافظة</option>${Object.keys(S.deliveryFees).map(r=>`<option value='${esc(r)}'>${esc(r)}</option>`).join('')}</select></div>
        <div class='field full'><label for='address'>العنوان التفصيلي</label><input id='address' name='address' placeholder='المنطقة، الشارع، علامة قريبة' autocomplete='street-address' required minlength='5'></div>
      </div><fieldset class='payment-choice-fieldset'><legend class='checkout-section-title'>طريقة الدفع</legend>${choices||'<p class=checkout-unavailable>لا توجد طرق دفع متاحة الآن. تواصلي مع المتجر.</p>'}</fieldset>
      <div id='transferPanel' class='transfer-panel' ${first?.kind==='transfer'?'':'hidden'}><div class='transfer-account'><small>حوّلي إجمالي الطلب إلى</small><strong id='transferAccountName'>${esc(first?.kind==='transfer'?first.accountName:'')}</strong><div class='account-copy'><bdi id='transferAccountNumber'>${esc(first?.kind==='transfer'?first.accountNumber:'')}</bdi><button type='button' id='copyAccount'>نسخ الرقم</button></div><p id='transferInstructions'>${esc(first?.kind==='transfer'?first.instructions:'')}</p></div>
        <div class='field'><label for='receiptFile'>صورة إشعار الحوالة <span class='required-mark'>*</span></label><input id='receiptFile' type='file' accept='image/png,image/jpeg,image/webp' ${first?.kind==='transfer'?'required':''}><small>صورة واضحة بصيغة JPG أو PNG أو WebP، حتى 8 ميجابايت.</small></div>
        <div id='receiptPreview' class='receipt-preview' hidden><img id='receiptPreviewImage' alt='معاينة إشعار الحوالة'><span id='receiptFileName'></span></div>
        <div class='field'><label for='reference'>رقم مرجع الحوالة (اختياري)</label><input id='reference' name='reference' placeholder='إن توفر لديكِ رقم مرجعي'></div></div>
      <div class='field checkout-notes'><label for='notes'>ملاحظات إضافية (اختياري)</label><textarea id='notes' name='notes' rows='2'></textarea></div>
      <p id='checkoutError' class='form-error' role='alert'></p><button type='submit' class='button button-dark wide' ${methods.length?'':'disabled'}>تأكيد الطلب</button></form>
      <aside class='order-summary'><h3>ملخص الطلب</h3>${lines.map(x=>`<div class='summary-row'><span>${esc(x.product.name)} · ${esc(x.size)} × ${x.qty}</span><strong>${S.money(x.product.price*x.qty)}</strong></div>`).join('')}<div class='summary-row'><span>القطع</span><strong>${S.money(subtotal)}</strong></div><div class='summary-row'><span>التوصيل</span><strong id='deliveryAmount'>حددي المحافظة</strong></div><div class='summary-row total'><span>الإجمالي</span><strong id='checkoutTotal'>${S.money(subtotal)}</strong></div><p class='checkout-note'>نسخة تجريبية: الطلب والإشعار يُحفظان في هذا المتصفح فقط ولا يصلان إلى المتجر.</p></aside></div></div>`;
    open('checkoutModal');
  }
  function syncPaymentPanel(){
    const selected=document.querySelector('#checkoutForm input[name="paymentMethodId"]:checked');
    const method=S.read().paymentMethods.find(m=>m.id===selected?.value&&m.active);
    const transfer=method?.kind==='transfer',panel=$('transferPanel'),file=$('receiptFile');
    if(!panel||!file)return;
    panel.hidden=!transfer;file.required=transfer;
    if(transfer){$('transferAccountName').textContent=method.accountName;$('transferAccountNumber').textContent=method.accountNumber;$('transferInstructions').textContent=method.instructions||'استخدمي رقم الحساب الظاهر أعلاه، ثم أرفقي صورة إشعار الحوالة.'}
    else {file.value='';$('receiptPreview').hidden=true;if(receiptPreviewUrl){URL.revokeObjectURL(receiptPreviewUrl);receiptPreviewUrl=null}}
  }
  async function readReceipt(file){
    if(!file||!file.size)throw Error('أرفقي صورة إشعار الحوالة.');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8_000_000)throw Error('ارفعي صورة JPG أو PNG أو WebP أصغر من 8 ميجابايت.');
    const url=URL.createObjectURL(file),img=new Image();
    try{
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('تعذّر فتح صورة الإشعار.'));img.src=url});
      const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
      if(!canvas.width||!canvas.height)throw Error('صورة الإشعار غير صالحة.');
      const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
      let data=canvas.toDataURL('image/jpeg',.72);if(data.length>700000)data=canvas.toDataURL('image/jpeg',.52);
      if(data.length>700000)throw Error('الصورة كبيرة جدًا للحفظ في هذا المتصفح؛ جرّبي صورة أصغر.');
      return data;
    }finally{URL.revokeObjectURL(url)}
  }
  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-close]')){if(activeModal?.id==='authModal')afterAuth=null;return close()}
    if(e.target.closest('[data-continue-shopping]')){close();$('collection').scrollIntoView({behavior:'smooth',block:'start'});return}
    if(e.target.closest('#copyAccount')){try{await navigator.clipboard.writeText($('transferAccountNumber').textContent);notify('تم نسخ رقم الحساب.')}catch(_){notify('حددي رقم الحساب وانسخيه يدويًا.')}return}
    const cat=e.target.closest('[data-category]');if(cat){category=cat.dataset.category;renderCatalog();$('collection').scrollIntoView({behavior:'smooth',block:'start'});return}
    const tile=e.target.closest('[data-product]');if(tile)return renderProduct(tile.dataset.product);
    const size=e.target.closest('.size-group [data-size]');if(size){selectedSize=size.dataset.size;document.querySelectorAll('.size-group button').forEach(b=>b.classList.toggle('active',b===size));$('stockHint').textContent=`المتوفر من هذا المقاس: ${getProduct(selectedProduct).stocks[selectedSize]} قطعة`;return}
    if(e.target.closest('#addToCart')){if(!selectedSize)return notify('اختاري المقاس أولًا.');try{S.addToCart(selectedProduct,selectedSize);close();renderCart();notify('أضيفت القطعة إلى السلة.')}catch(err){notify(err.message)}return}
    const qty=e.target.closest('[data-qty]'),remove=e.target.closest('[data-remove]');
    if(qty||remove){const b=qty||remove,productId=b.dataset.id||b.dataset.remove;try{const line=S.cart().find(x=>x.productId===productId&&x.size===b.dataset.size);S.updateCart(productId,b.dataset.size,remove?0:(line?.qty||0)+Number(b.dataset.qty));renderCart()}catch(err){notify(err.message)}return}
    const tab=e.target.closest('[data-auth-tab]');if(tab){authMode=tab.dataset.authTab;authMarkup(authMode);return}
    if(e.target.closest('#logoutButton')){S.setSession(null);close();notify('تم تسجيل الخروج.');return}
  });
  document.addEventListener('error',e=>{const img=e.target;if(img.classList?.contains('payment-logo-image')&&img.dataset.fallback&&img.getAttribute('src')!==img.dataset.fallback)img.src=img.dataset.fallback},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(activeModal?.id==='authModal')afterAuth=null;close()}});
  document.addEventListener('submit',async e=>{
    if(e.target.id==='authForm'){
      e.preventDefault();const form=e.target,button=form.querySelector('button[type=submit]');button.disabled=true;
      try{const data=Object.fromEntries(new FormData(form));authMode==='register'?await S.register(data):await S.login(data.identifier,data.password);const next=afterAuth;afterAuth=null;close();notify('أهلًا بكِ!');if(next==='checkout')openCheckout();else if(next==='notifications')openNotifications();}catch(err){$('authError').textContent=err.message}finally{button.disabled=false}
    }
    if(e.target.id==='checkoutForm'){
      e.preventDefault();const button=e.target.querySelector('button[type=submit]');button.disabled=true;
      try{const data=Object.fromEntries(new FormData(e.target)),method=S.read().paymentMethods.find(m=>m.id===data.paymentMethodId&&m.active);if(method?.kind==='transfer')data.paymentReceipt=await readReceipt($('receiptFile').files[0]);const order=S.createOrder(data);renderCart();renderCatalog();$('orderSuccessModal').innerHTML=`<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="modal-pad"><span class="eyebrow">تم تسجيل الطلب</span><h2>شكرًا، ${esc(order.customer.name)}</h2><p>رقم طلبكِ <strong dir="ltr">${esc(order.id)}</strong></p><div class="order-summary"><p>الإجمالي: <strong>${S.money(order.total)}</strong></p><p>الدفع: ${esc(order.paymentMethodName)} · ${esc(order.paymentStatus)}</p><p>التوصيل إلى: ${esc(order.customer.region)}، ${esc(order.customer.address)}</p></div>${orderHelpMarkup(order)}<button class="button button-dark wide" data-close>متابعة التسوق</button></div>`;open('orderSuccessModal')}
      catch(err){$('checkoutError').textContent=err.message}finally{button.disabled=false}
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.name==='paymentMethodId')syncPaymentPanel();
    if(e.target.id==='receiptFile'){
      const file=e.target.files[0],preview=$('receiptPreview');if(receiptPreviewUrl){URL.revokeObjectURL(receiptPreviewUrl);receiptPreviewUrl=null}
      if(!file){preview.hidden=true;return}
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8_000_000){e.target.value='';preview.hidden=true;notify('ارفعي صورة JPG أو PNG أو WebP أصغر من 8 ميجابايت.');return}
      receiptPreviewUrl=URL.createObjectURL(file);$('receiptPreviewImage').src=receiptPreviewUrl;$('receiptFileName').textContent=file.name;preview.hidden=false;
    }
    if(e.target.id==='region'){const subtotal=Number($('checkoutForm').dataset.subtotal),fee=S.deliveryFees[e.target.value]||0;$('checkoutForm').elements.expectedTotal.value=Math.round((subtotal+fee)*100)/100;$('deliveryAmount').textContent=Object.hasOwn(S.deliveryFees,e.target.value)?(fee===0?'مجاني':S.money(fee)):'حددي المحافظة';$('checkoutTotal').textContent=S.money(subtotal+fee)}
  });
  $('searchToggle').onclick=()=>{$('siteSearch').focus()};
  $('mobileSearchButton').onclick=()=>{$('siteSearch').focus();window.scrollTo({top:0,behavior:'smooth'})};
  $('siteSearch').oninput=e=>{query=e.target.value.trim();renderCatalog()};
  $('clearSearch').onclick=()=>{$('siteSearch').value='';query='';renderCatalog()};
  $('cartButton').onclick=()=>{renderCart();open('cartDrawer')};
  $('mobileCartButton').onclick=()=>{renderCart();open('cartDrawer')};
  $('accountButton').onclick=openAccount;
  $('mobileAccountButton').onclick=openAccount;
  $('customerNotificationButton').onclick=openNotifications;
  $('mobileNotificationButton').onclick=openNotifications;
  $('checkoutButton').onclick=openCheckout;
  overlay.onclick=()=>{if(activeModal?.id==='authModal')afterAuth=null;close()};

  window.addEventListener('manal:update',()=>{renderCatalog();renderPromotions()});
  window.addEventListener('storage',()=>{renderCatalog();renderCart();renderPromotions()});
  function orderHelpMarkup(order=null){
    return `<section class="order-help"><h3>معلومات طلبكِ</h3><ol><li><strong>المقاس:</strong> راجعي المقاس المختار في تفاصيل الطلب.</li><li><strong>التوصيل:</strong> المحافظة والعنوان ورسوم التوصيل محفوظة مع الطلب.</li><li><strong>الدفع:</strong> ${order?.payment==='transfer'?'الحوالة قيد التحقق حتى تؤكد الإدارة استلامها.':'يظهر نوع الدفع وحالته ضمن تفاصيل الطلب.'}</li><li><strong>المتابعة:</strong> افتحي حسابي أو جرس الإشعارات لمتابعة أي تحديث.</li></ol><p class="help">هذه نسخة محلية؛ البيانات والإشعارات محفوظة في هذا المتصفح ولا تُرسل إلى أجهزة أخرى.</p></section>`;
  }
  function showOrderHelp(){
    $('orderHelpModal').innerHTML=`<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="modal-pad"><span class="eyebrow">MANAL STORE</span><h2>الطلب والتوصيل</h2>${orderHelpMarkup()}<button class="button button-dark wide" data-close>تمام</button></div>`;open('orderHelpModal');
  }
  function notificationMarkup(){
    const list=S.customerNotifications();
    return `<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="modal-pad"><span class="eyebrow">YOUR UPDATES</span><h2>إشعاراتكِ</h2><div class="customer-notification-heading"><p>تحديثات طلباتكِ وأحدث الموديلات.</p><button class="button button-outline" data-read-customer-notifications ${list.some(n=>!n.read)?'':'disabled'}>قراءة الكل</button></div><div class="customer-notification-list">${list.length?list.map(n=>`<button class="customer-notification ${n.read?'':'unread'}" data-customer-notification="${esc(n.id)}"><span class="customer-notification-symbol" aria-hidden="true">${n.type==='product'?'✦':'✓'}</span><span><strong>${esc(n.title)}</strong><span>${esc(n.message)}</span><small>${S.date(n.createdAt)}</small></span>${n.read?'':'<i aria-label="غير مقروء"></i>'}</button>`).join(''):'<div class="empty-state">إشعاراتكِ الجديدة رح تظهر هون.</div>'}</div><p class="help">تظهر إشعارات الحساب المسجل على هذا المتصفح.</p></div>`;
  }
  function openNotifications(){
    if(!S.currentUser()){afterAuth='notifications';return openAuth()}
    $('customerNotificationsModal').innerHTML=notificationMarkup();open('customerNotificationsModal');
  }
  function refreshCustomerUI(){
    const user=S.currentUser(),count=S.customerNotifications().filter(n=>!n.read).length;
    for(const id of ['customerNotificationCount','mobileNotificationCount']){$(id).textContent=count>99?'99+':count;$(id).hidden=!count}
    for(const id of ['customerNotificationButton','mobileNotificationButton'])$(id).setAttribute('aria-label',`إشعاراتي، ${count} غير مقروء`);
    $('accountButton').setAttribute('aria-label',user?'حساب '+user.name:'تسجيل الدخول');
    if(activeModal?.id==='customerNotificationsModal'){if(user)$('customerNotificationsModal').innerHTML=notificationMarkup();else close()}
    if(activeModal?.id==='accountModal'){if(user)openAccount();else close()}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-order-help]')){showOrderHelp();return}
    if(e.target.closest('[data-read-customer-notifications]')){S.markCustomerNotificationsRead();return}
    const button=e.target.closest('[data-customer-notification]');if(!button)return;
    const n=S.customerNotifications().find(n=>n.id===button.dataset.customerNotification);if(!n)return;
    S.markCustomerNotificationsRead(n.id);
    if(n.orderId){openAccount();const card=$('order-'+n.orderId);card?.scrollIntoView({block:'center'});card?.focus()}
    else if(n.productId){const p=S.visibleProducts(S.read()).find(p=>p.id===n.productId);if(p)renderProduct(p.id);else notify('هذا الموديل غير متاح حاليًا.')}
  });
  for(const event of ['storage','manal:update','manal:session','manal:customer-notifications'])window.addEventListener(event,refreshCustomerUI);
  refreshCustomerUI();
  window.ManalUI={open,close,notify};
  renderCatalog();renderCart();renderPromotions();
  function trackLocalVisit(pageView=false){
    try{
      let visitorId=localStorage.getItem('manal_visitor_id');
      if(!visitorId){visitorId='visitor-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));localStorage.setItem('manal_visitor_id',visitorId)}
      const device=/iPad|Tablet/i.test(navigator.userAgent)?'جهاز لوحي':/Mobi|Android|iPhone/i.test(navigator.userAgent)?'جوال':'كمبيوتر';
      const visit=S.recordVisit({sessionId:sessionStorage.getItem('manal_visit_session'),visitorId,path:location.pathname,device,pageView});sessionStorage.setItem('manal_visit_session',visit.id);
    }catch(_){}
  }
  trackLocalVisit(true);
  setInterval(()=>{if(document.visibilityState==='visible')trackLocalVisit()},60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')trackLocalVisit()});
})();
