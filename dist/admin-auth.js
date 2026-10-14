(() => {
  'use strict';
  const S=window.Store,$=id=>document.getElementById(id);
  if(S.currentAdmin()){location.replace('./admin.html');return}
  let setup;
  function render(){
    setup=S.read().admins.length===0;
    $('authHeading').textContent=setup?'إعداد حساب الإدارة':'أهلًا بعودتكِ';
    $('authDescription').textContent=setup?'أنشئي حساب الإدارة المحلي على هذا المتصفح.':'سجّلي الدخول لإدارة المنتجات والطلبات.';
    $('adminNameField').hidden=!setup;$('adminName').required=setup;
    $('adminConfirmField').hidden=!setup;$('adminConfirm').required=setup;
    $('adminPassword').autocomplete=setup?'new-password':'current-password';
    $('adminAuthSubmit').textContent=setup?'إنشاء حساب الإدارة':'دخول إلى اللوحة';
  }
  $('adminAuthForm').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('adminAuthSubmit');if(button.disabled)return;button.disabled=true;button.setAttribute('aria-busy','true');$('adminAuthError').textContent='';
    try {
      const input=Object.fromEntries(new FormData(event.target));
      if(setup&&input.password!==input.confirm)throw Error('كلمتا المرور غير متطابقتين.');
      if(setup)await S.setupAdmin(input);else await S.loginAdmin(input.username,input.password);
      location.replace('./admin.html');
    }catch(error){$('adminAuthError').textContent=error.message;render()}
    finally{button.disabled=false;button.removeAttribute('aria-busy')}
  });
  window.addEventListener('storage',render);render();
})();
