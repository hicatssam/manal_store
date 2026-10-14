(() => {
  'use strict';
  const S=window.Store,$=id=>document.getElementById(id);
  S.verifyAdmin().then(active=>{if(active)location.replace('./admin.html')});
  $('adminAuthForm').addEventListener('submit',async event=>{
    event.preventDefault();
    const button=$('adminAuthSubmit');
    if(button.disabled)return;
    button.disabled=true;
    button.setAttribute('aria-busy','true');
    $('adminAuthError').textContent='';
    try {
      const values=Object.fromEntries(new FormData(event.target));
      await S.loginAdmin(values.username,values.password);
      location.replace('./admin.html');
    } catch(error) {
      $('adminAuthError').textContent=error.message;
    } finally {
      button.disabled=false;
      button.removeAttribute('aria-busy');
    }
  });
  $('showAdminPassword').addEventListener('click',()=>{
    const password=$('adminPassword'),visible=password.type==='password';
    password.type=visible?'text':'password';
    $('showAdminPassword').textContent=visible?'إخفاء':'إظهار';
    $('showAdminPassword').setAttribute('aria-pressed',String(visible));
  });
})();