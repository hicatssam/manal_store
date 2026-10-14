(() => {
  'use strict';
  let installPrompt = null;
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });

  function showInstructions() {
    const appleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const steps = appleDevice
      ? ['افتحي المتجر في <strong>Safari</strong>.', 'اضغطي زر <strong>المشاركة</strong> ثم <strong>إضافة إلى الشاشة الرئيسية</strong>.', 'اختاري <strong>إضافة</strong> ليظهر التطبيق على هاتفك.']
      : ['افتحي المتجر في <strong>Chrome</strong> أو متصفح يدعم تثبيت التطبيقات.', 'افتحي قائمة المتصفح <strong>⋮</strong> واختاري <strong>تثبيت التطبيق</strong> أو <strong>إضافة إلى الشاشة الرئيسية</strong>.'];
    document.getElementById('installModal').innerHTML = `<button class="modal-close" data-close aria-label="إغلاق">×</button><div class="modal-pad"><span class="eyebrow">MANAL STORE APP</span><h2>حمّلي تطبيق منال</h2><p>افتحي المتجر من الشاشة الرئيسية مثل أي تطبيق.</p><ol class="install-steps">${steps.map(step => `<li>${step}</li>`).join('')}</ol></div>`;
    window.ManalUI.open('installModal');
  }

  async function installApp() {
    if (installed()) {
      window.ManalUI.notify('التطبيق مثبت على جهازك بالفعل.');
      return;
    }
    if (!installPrompt) {
      showInstructions();
      return;
    }
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') window.ManalUI.notify('سيظهر التطبيق على شاشتك الرئيسية.');
  }

  document.getElementById('installButton').addEventListener('click', installApp);
  document.getElementById('mobileInstallButton').addEventListener('click', installApp);
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    window.ManalUI.notify('تم تثبيت تطبيق منال.');
  });

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
