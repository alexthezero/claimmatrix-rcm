(()=>{
  'use strict';
  // claim-forms.js is the next synchronous script in index.html. Load the
  // actual-form exporter on the next task so its controls can bind to the
  // completed claim-form UI and intercept the legacy preview exporter.
  window.setTimeout(()=>{
    if(document.querySelector('script[data-claimmatrix-official-forms]'))return;
    const script=document.createElement('script');
    script.src='official-forms.js';
    script.dataset.claimmatrixOfficialForms='true';
    script.onerror=()=>{
      const message=document.getElementById('message');
      if(message)message.textContent='Actual claim-form PDF engine could not be loaded.';
    };
    document.body.appendChild(script);
  },0);
})();
