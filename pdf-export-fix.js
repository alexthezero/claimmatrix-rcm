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

  function waitForImages(doc){
    const images=[...doc.images];
    return Promise.all(images.map(img=>{
      if(img.complete)return Promise.resolve();
      return new Promise(resolve=>{
        img.addEventListener('load',resolve,{once:true});
        img.addEventListener('error',resolve,{once:true});
      });
    }));
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
      status.style.cssText='font:600 12px/1.4 system-ui,sans-serif;color:#d9e4ea;margin-left:8px;';
      status.setAttribute('aria-live','polite');

      if(printButton)toolbar.insertBefore(downloadButton,printButton);
      else toolbar.insertBefore(downloadButton,toolbar.firstChild);
      toolbar.appendChild(status);

      const style=doc.createElement('style');
      style.textContent='@media print{#downloadPdf,#pdfStatus{display:none!important}} .page{break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}.pdf-exporting .pages{padding:0!important}.pdf-exporting .page{margin:0!important;box-shadow:none!important}';
      doc.head.appendChild(style);

      downloadButton.addEventListener('click',async()=>{
        if(downloadButton.disabled)return;
        downloadButton.disabled=true;
        downloadButton.textContent='Generating PDF…';
        status.textContent='Preparing claim PDF…';
        const exactForm=Boolean(doc.querySelector('.actual-cms1500'));
        try{
          const html2pdf=await loadPdfEngine(previewWindow);
          await waitForImages(doc);
          if(doc.fonts?.ready)await doc.fonts.ready;
          const base=safeFilename(doc.title);
          const stamp=new Date().toISOString().slice(0,10);
          const filename=`${base}-${stamp}.pdf`;

          if(exactForm)doc.body.classList.add('pdf-exporting');
          const worker=html2pdf()
            .set({
              margin:exactForm?0:[0.18,0.18,0.18,0.18],
              filename,
              image:{type:'jpeg',quality:0.99},
              html2canvas:{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0},
              jsPDF:{unit:'in',format:'letter',orientation:'portrait',compress:true},
              pagebreak:{mode:['css','legacy'],avoid:['tr','.field-block']}
            })
            .from(pages);

          await worker.save();
          status.textContent=exactForm?'Exact letter-size CMS-1500 PDF generated.':'PDF generated.';
        }catch(error){
          console.error('ClaimMatrix PDF export failed',error);
          status.textContent='PDF generation failed. Use Print as a fallback.';
          try{previewWindow.alert('ClaimMatrix could not generate the PDF file. Please try again, or use Print as a fallback.');}catch(_){/* no-op */}
        }finally{
          doc.body.classList.remove('pdf-exporting');
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
