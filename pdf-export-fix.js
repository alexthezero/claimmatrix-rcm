(()=>{
  'use strict';

  const nativeOpen=window.open.bind(window);

  function loadPdfEngine(targetWindow){
    if(targetWindow.html2pdf)return Promise.resolve(targetWindow.html2pdf);
    return new Promise((resolve,reject)=>{
      const existing=targetWindow.document.getElementById('claimmatrix-html2pdf');
      if(existing){
        existing.addEventListener('load',()=>resolve(targetWindow.html2pdf),{once:true});
        existing.addEventListener('error',()=>reject(new Error('PDF engine failed to load')),{once:true});
        return;
      }
      const script=targetWindow.document.createElement('script');
      script.id='claimmatrix-html2pdf';
      script.src='https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.2/dist/html2pdf.bundle.min.js';
      script.async=true;
      script.onload=()=>targetWindow.html2pdf?resolve(targetWindow.html2pdf):reject(new Error('PDF engine unavailable'));
      script.onerror=()=>reject(new Error('PDF engine failed to load'));
      targetWindow.document.head.appendChild(script);
    });
  }

  function safeFilename(title='claim'){
    return title
      .replace(/Claim Preview/i,'')
      .replace(/[^a-z0-9]+/gi,'-')
      .replace(/^-|-$/g,'')
      .toLowerCase()||'claim';
  }

  function enhancePreview(previewWindow){
    try{
      const doc=previewWindow.document;
      const toolbar=doc.querySelector('.toolbar');
      const pages=doc.querySelector('.pages');
      if(!toolbar||!pages||doc.getElementById('downloadPdf'))return;

      const printButton=doc.getElementById('printPreview');
      if(printButton)printButton.textContent='Print';

      const downloadButton=doc.createElement('button');
      downloadButton.id='downloadPdf';
      downloadButton.className='primary';
      downloadButton.type='button';
      downloadButton.textContent='Download PDF';

      const status=doc.createElement('span');
      status.id='pdfStatus';
      status.style.cssText='font:600 12px/1.4 system-ui,sans-serif;color:#334155;margin-left:8px;';
      status.setAttribute('aria-live','polite');

      if(printButton)toolbar.insertBefore(downloadButton,printButton);
      else toolbar.insertBefore(downloadButton,toolbar.firstChild);
      toolbar.appendChild(status);

      const style=doc.createElement('style');
      style.textContent='@media print{#downloadPdf,#pdfStatus{display:none!important}} .page{break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}';
      doc.head.appendChild(style);

      downloadButton.addEventListener('click',async()=>{
        if(downloadButton.disabled)return;
        downloadButton.disabled=true;
        downloadButton.textContent='Generating PDF…';
        status.textContent='Preparing claim PDF…';
        try{
          const html2pdf=await loadPdfEngine(previewWindow);
          const base=safeFilename(doc.title);
          const stamp=new Date().toISOString().slice(0,10);
          const filename=`${base}-${stamp}.pdf`;

          const worker=html2pdf()
            .set({
              margin:[0.18,0.18,0.18,0.18],
              filename,
              image:{type:'jpeg',quality:0.98},
              html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false},
              jsPDF:{unit:'in',format:'letter',orientation:'portrait',compress:true},
              pagebreak:{mode:['css','legacy'],avoid:['tr','.field-block']}
            })
            .from(pages);

          await worker.save();
          status.textContent='PDF generated.';
        }catch(error){
          console.error('ClaimMatrix PDF export failed',error);
          status.textContent='PDF generation failed. Use Print as a fallback.';
          try{previewWindow.alert('ClaimMatrix could not generate the PDF file. Please try again, or use Print as a fallback.');}catch(_){/* no-op */}
        }finally{
          downloadButton.disabled=false;
          downloadButton.textContent='Download PDF';
        }
      });
    }catch(error){
      console.error('ClaimMatrix preview enhancement failed',error);
    }
  }

  window.open=function(...args){
    const previewWindow=nativeOpen(...args);
    if(!previewWindow)return previewWindow;

    try{
      const doc=previewWindow.document;
      const nativeClose=doc.close.bind(doc);
      doc.close=function(){
        nativeClose();
        previewWindow.setTimeout(()=>enhancePreview(previewWindow),0);
      };
    }catch(error){
      console.warn('ClaimMatrix could not attach direct PDF export to this preview window',error);
    }

    return previewWindow;
  };
})();
