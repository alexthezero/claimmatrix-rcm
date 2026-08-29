(()=>{
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const val=id=>$('#'+id)?.value?.trim?.()||'';
  const upper=v=>String(v||'').trim().toUpperCase();
  const digits=v=>String(v||'').replace(/\D/g,'');
  const money=v=>Number(v||0).toFixed(2);
  const message=text=>{ const el=$('#message'); if(el) el.textContent=text; };

  let pdfLibPromise;
  const loadPdfLib=()=>pdfLibPromise||(pdfLibPromise=import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm'));

  function currentMode(){ return document.body.dataset.claimMode==='institutional'?'institutional':'professional'; }

  function addTemplateControls(){
    const profGrid=$('#professionalDetails .claim-detail-grid');
    const instGrid=$('#institutionalDetails .claim-detail-grid');

    if(profGrid&&!$('#cm-cms1500-template')){
      const wrap=document.createElement('div');
      wrap.className='cf-field span2 official-template-field';
      wrap.innerHTML=`<span>Actual CMS-1500 (02/12) PDF <em>Required for export</em></span>
        <input id="cm-cms1500-template" type="file" accept="application/pdf,.pdf">
        <small>Choose a genuine blank CMS-1500 02/12 PDF. ClaimMatrix keeps that PDF as the artwork and only writes your claim data into its numbered boxes. The file never leaves this browser.</small>
        <div class="template-tools"><a href="https://www.cms.gov/medicare/cms-forms/cms-forms/downloads/cms1500.pdf" target="_blank" rel="noopener">CMS reference PDF</a><span>Reference downloads may contain SAMPLE artwork and are not guaranteed acceptable for paper submission.</span></div>`;
      profGrid.prepend(wrap);
    }

    if(instGrid&&!$('#cm-ub04-template')){
      const wrap=document.createElement('div');
      wrap.className='cf-field span2 official-template-field';
      wrap.innerHTML=`<span>Authorized UB-04 / CMS-1450 PDF <em>Required for export</em></span>
        <input id="cm-ub04-template" type="file" accept="application/pdf,.pdf">
        <small>Choose the genuine blank UB-04 PDF your organization is authorized to use. ClaimMatrix fills that document locally; the AHA/NUBC artwork is not redistributed by this public prototype.</small>`;
      instGrid.prepend(wrap);
    }

    const note=$('.export-note');
    if(note){
      note.innerHTML='<strong>Actual-form export</strong><span>ClaimMatrix no longer recreates the claim form in HTML. Export uses the blank PDF you select as the original artwork and writes data directly onto it. Paper claims still need payer-compliant OCR stock, scale, and print settings.</span>';
    }
  }

  function syncExportUi(){
    const mode=currentMode();
    const button=$('#exportClaim');
    if(button) button.textContent=mode==='professional'?'Generate actual CMS-1500 PDF':'Generate actual UB-04 PDF';
    const route=$('#formRoute');
    if(route) route.textContent=mode==='professional'?'Professional → actual CMS-1500 (02/12) PDF':'Institutional → actual UB-04 / CMS-1450 PDF';
  }

  function collectLines(mode){
    return $$('#lineBody tr.service-row').map((row,index)=>{
      const id=row.dataset.id;
      const get=k=>row.querySelector(`[data-k="${k}"]`)?.value?.trim?.()||'';
      const base={
        id,index:index+1,code:upper(get('code')),m1:upper(get('m1')),m2:upper(get('m2')),
        units:Number(get('units')||0),dx:get('dx'),charge:Number(get('charge')||0)
      };
      if(mode==='professional'){
        const meta=$(`[data-prof-line="${CSS.escape(id)}"]`);
        const p=k=>meta?.querySelector(`[data-prof="${k}"]`)?.value?.trim?.()||'';
        return {...base,from:p('from')||val('dos'),to:p('to')||p('from')||val('dos'),pos:upper(p('pos')||val('pos')),m3:upper(p('m3')),m4:upper(p('m4')),emg:upper(p('emg')),renderNpi:digits(p('renderNpi')||val('npi'))};
      }
      const meta=$(`[data-inst-line="${CSS.escape(id)}"]`);
      const p=k=>meta?.querySelector(`[data-inst="${k}"]`)?.value?.trim?.()||'';
      return {...base,revenue:upper(p('revenue')),description:p('description'),serviceDate:p('serviceDate')||val('dos'),noncovered:Number(p('noncovered')||0)};
    });
  }

  function collectData(){
    const mode=currentMode();
    const relationship=val('cf-relationship')||'self';
    const patient={last:val('last'),first:val('first'),mi:val('cf-patient-mi'),dob:val('dob'),sex:val('cf-sex'),address:val('cf-patient-address'),city:val('cf-patient-city'),state:val('cf-patient-state'),zip:val('cf-patient-zip'),phone:val('cf-patient-phone')};
    const self=relationship==='self';
    const insured={
      last:val('cf-insured-last')||(self?patient.last:''),first:val('cf-insured-first')||(self?patient.first:''),mi:val('cf-insured-mi')||(self?patient.mi:''),
      address:val('cf-insured-address')||(self?patient.address:''),city:val('cf-insured-city')||(self?patient.city:''),state:val('cf-insured-state')||(self?patient.state:''),zip:val('cf-insured-zip')||(self?patient.zip:''),phone:val('cf-insured-phone')||(self?patient.phone:'')
    };
    return {
      mode,payer:val('payer'),memberId:val('member'),dos:val('dos'),pos:val('pos'),billingNpi:digits(val('npi')),insuranceType:val('cf-insurance-type'),relationship,
      patient,insured,policyGroup:val('cf-policy-group'),planName:val('cf-plan-name'),otherInsuredName:val('cf-other-insured-name'),otherInsuredPolicy:val('cf-other-insured-policy'),
      billing:{name:val('cf-billing-name'),taxId:val('cf-taxid'),taxType:val('cf-taxid-type'),address:val('cf-billing-address'),city:val('cf-billing-city'),state:val('cf-billing-state'),zip:val('cf-billing-zip'),phone:val('cf-billing-phone')},
      diagnoses:$$('.dxcode').map((input,index)=>({pointer:index+1,code:upper(input.value)})).filter(x=>x.code),
      professional:{employment:val('cf-employment'),autoAccident:val('cf-auto-accident'),autoState:val('cf-auto-state'),otherAccident:val('cf-other-accident'),otherClaimId:val('cf-other-claim-id'),resubmissionCode:val('cf-resubmission-code'),originalRef:val('cf-original-ref'),referringName:val('cf-referring-name'),referringNpi:digits(val('cf-referring-npi')),priorAuth:val('cf-prior-auth'),facility:{name:val('cf-facility-name'),address:val('cf-facility-address'),city:val('cf-facility-city'),state:val('cf-facility-state'),zip:val('cf-facility-zip'),npi:digits(val('cf-facility-npi'))},assignment:val('cf-assignment'),patientSignature:val('cf-patient-signature'),insuredSignature:val('cf-insured-signature'),providerSignDate:val('cf-provider-sign-date')},
      institutional:{patientControl:val('cf-patient-control'),medicalRecord:val('cf-medical-record'),typeBill:val('cf-type-bill'),taxId:val('cf-inst-taxid')||val('cf-taxid'),statementFrom:val('cf-statement-from'),statementThrough:val('cf-statement-through'),admitDate:val('cf-admit-date'),admitHour:val('cf-admit-hour'),admissionType:val('cf-admission-type'),admissionSource:val('cf-admission-source'),dischargeHour:val('cf-discharge-hour'),dischargeStatus:val('cf-discharge-status'),conditionCodes:val('cf-condition-codes'),occurrenceCodes:val('cf-occurrence-codes'),occurrenceSpans:val('cf-occurrence-spans'),valueCodes:val('cf-value-codes'),principalDx:val('cf-principal-dx'),admittingDx:val('cf-admitting-dx'),externalCause:val('cf-external-cause'),drg:val('cf-drg'),attendingNpi:digits(val('cf-attending-npi')),attendingName:val('cf-attending-name'),operatingNpi:digits(val('cf-operating-npi')),operatingName:val('cf-operating-name'),remarks:val('cf-remarks')},
      lines:collectLines(mode)
    };
  }

  function templateFile(mode){ return $(mode==='professional'?'#cm-cms1500-template':'#cm-ub04-template')?.files?.[0]||null; }

  function validate(data,file){
    const missing=[];
    const need=(value,label,target)=>{ if(!String(value??'').trim()) missing.push({label,target}); };
    if(!file) missing.push({label:data.mode==='professional'?'Actual CMS-1500 PDF':'Authorized UB-04 PDF',target:data.mode==='professional'?'cm-cms1500-template':'cm-ub04-template'});
    need(data.payer,'Payer','payer'); need(data.memberId,'Member ID','member'); need(data.patient.first,'Patient first name','first'); need(data.patient.last,'Patient last name','last'); need(data.patient.dob,'Date of birth','dob');
    need(data.patient.address,'Patient address','cf-patient-address'); need(data.patient.city,'Patient city','cf-patient-city'); need(data.patient.state,'Patient state','cf-patient-state'); need(data.patient.zip,'Patient ZIP','cf-patient-zip');
    need(data.billing.name,'Billing provider name','cf-billing-name'); need(data.billing.address,'Billing provider address','cf-billing-address'); need(data.billing.city,'Billing provider city','cf-billing-city'); need(data.billing.state,'Billing provider state','cf-billing-state'); need(data.billing.zip,'Billing provider ZIP','cf-billing-zip'); need(data.billingNpi,'Billing NPI','npi');
    if(!data.diagnoses.length) missing.push({label:'At least one diagnosis',target:'dx1'});
    if(!data.lines.length) missing.push({label:'At least one service line',target:'addLine'});
    if(data.mode==='professional'){
      need(data.insuranceType,'Insurance program','cf-insurance-type'); need(data.dos,'Date of service','dos'); need(data.pos,'Place of service','pos');
      data.lines.forEach((line,i)=>{ need(line.code,`Line ${i+1} procedure code`,null); if(!(line.units>0))missing.push({label:`Line ${i+1} units`}); if(!(line.charge>0))missing.push({label:`Line ${i+1} charge`}); need(line.dx,`Line ${i+1} diagnosis pointer`,null); });
    }else{
      need(data.institutional.typeBill,'Type of bill','cf-type-bill'); need(data.institutional.statementFrom,'Statement from date','cf-statement-from'); need(data.institutional.statementThrough,'Statement through date','cf-statement-through'); need(data.institutional.principalDx,'Principal diagnosis','cf-principal-dx');
      data.lines.forEach((line,i)=>{ need(line.revenue,`Line ${i+1} revenue code`,null); if(!(line.charge>0))missing.push({label:`Line ${i+1} charge`}); });
      if(data.lines.length>22) missing.push({label:'UB-04 export currently supports 22 revenue lines per page',target:'servicePanel'});
    }
    return missing;
  }

  function focusMissing(item){
    if(!item?.target)return;
    const el=$('#'+CSS.escape(item.target));
    el?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>el?.focus?.(),250);
  }

  function dateParts(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return {mm:'',dd:'',yy:'',yyyy:''};
    const [yyyy,mm,dd]=value.split('-'); return {mm,dd,yy:yyyy.slice(-2),yyyy};
  }

  function personName(p){ return [p.last,p.first,p.mi].filter(Boolean).join(', '); }
  function addressLine(obj){ return [obj.city,obj.state,obj.zip].filter(Boolean).join(' '); }
  function dxLetters(pointerString){
    return String(pointerString||'').split(',').map(x=>Number(x.trim())).filter(n=>n>=1&&n<=12).map(n=>String.fromCharCode(64+n)).join('');
  }

  function makeGridWriter(page,font){
    const {width,height}=page.getSize();
    const sx=width/612, sy=height/792;
    const x0=24*sx, y0=780*sy, cw=7.2*sx, rh=12*sy;
    return (text,row,col,max=80,size=9.2)=>{
      const clean=upper(text).slice(0,max);
      if(!clean)return;
      page.drawText(clean,{x:x0+(col-1)*cw,y:y0-(row-1)*rh,size:size*Math.min(sx,sy),font});
    };
  }

  function fillCms1500(page,font,data,serviceLines){
    const put=makeGridWriter(page,font);
    put(data.payer,2,41,31);
    const typeMap={'medicare':1,'medicaid':8,'tricare':15,'champva':24,'group health plan':31,'feca black lung':39,'other':45};
    put('X',8,typeMap[String(data.insuranceType).toLowerCase()]||45,1);
    put(data.memberId,8,50,17);
    put(personName(data.patient),10,1,28);
    const dob=dateParts(data.patient.dob); put(dob.mm,10,31,2);put(dob.dd,10,34,2);put(dob.yyyy,10,37,4); if(data.patient.sex==='M')put('X',10,42,1);if(data.patient.sex==='F')put('X',10,47,1);
    put(personName(data.insured),10,50,28);
    put(data.patient.address,12,1,28);
    const relMap={self:33,spouse:38,child:42,other:47}; put('X',12,relMap[data.relationship]||47,1);
    put(data.insured.address,12,50,28);
    put(data.patient.city,14,1,20);put(data.patient.state,14,26,2);put(data.insured.city,14,50,20);put(data.insured.state,14,74,2);
    put(data.patient.zip,16,1,10); const pp=digits(data.patient.phone);put(pp.slice(0,3),16,15,3);put(pp.slice(3,10),16,19,7);
    put(data.insured.zip,16,50,10); const ip=digits(data.insured.phone);put(ip.slice(0,3),16,65,3);put(ip.slice(3,10),16,69,7);
    put(data.otherInsuredName,18,1,28);put(data.policyGroup,18,50,30);put(data.otherInsuredPolicy,20,1,28);
    put('X',20,data.professional.employment==='Y'?35:41,1);put('X',22,data.professional.autoAccident==='Y'?35:41,1);if(data.professional.autoAccident==='Y')put(data.professional.autoState,22,45,2);put('X',24,data.professional.otherAccident==='Y'?35:41,1);
    put(data.planName,24,50,30);put(data.otherInsuredName? 'X':'X',26,data.otherInsuredName?52:57,1);
    if(data.professional.patientSignature)put('SIGNATURE ON FILE',29,7,17); if(data.professional.insuredSignature)put('SIGNATURE ON FILE',29,55,17);
    put(data.professional.referringName,34,4,25);put(data.professional.referringNpi,34,33,15);
    data.diagnoses.slice(0,12).forEach((dx,i)=>{ const col=3+13*(i%4),row=38+Math.floor(i/4);put(dx.code,row,col,8); });
    put('0',37,42,1); put(data.professional.resubmissionCode,38,50,10);put(data.professional.originalRef,38,62,15);put(data.professional.priorAuth,40,50,28);

    serviceLines.forEach((line,i)=>{
      const row=44+i*2; const from=dateParts(line.from),to=dateParts(line.to);
      put(from.mm,row,1,2);put(from.dd,row,4,2);put(from.yy,row,7,2);put(to.mm,row,10,2);put(to.dd,row,13,2);put(to.yy,row,16,2);
      put(line.pos,row,19,2);put(line.emg,row,22,1);put(line.code,row,25,7);
      put([line.m1,line.m2,line.m3,line.m4].filter(Boolean).join(' '),row,33,12);put(dxLetters(line.dx),row,45,4);
      put(money(line.charge).replace('.', ' '),row,50,8);put(String(line.units),row,59,3);put(line.renderNpi,row,68,10);
    });

    put(data.billing.taxId,56,1,15);put('X',56,data.billing.taxType==='SSN'?17:19,1);put('X',56,data.professional.assignment==='N'?43:38,1);
    const total=serviceLines.reduce((s,l)=>s+Number(l.charge||0),0);put(money(total).replace('.', ' '),56,52,8);
    const phone=digits(data.billing.phone);put(phone.slice(0,3),57,66,3);put(phone.slice(3,6),57,70,3);put(phone.slice(6,10),57,74,4);
    const fac=data.professional.facility;put(fac.name,58,23,25);put(data.billing.name,58,50,25);put(fac.address,59,23,25);put(data.billing.address,59,50,25);
    put('SIGNATURE ON FILE',60,1,20);put(addressLine(fac),60,23,27);put(addressLine(data.billing),60,50,27);
    const sign=dateParts(data.professional.providerSignDate||data.dos);put([sign.mm,sign.dd,sign.yy].filter(Boolean).join(' '),61,6,10);put(fac.npi,61,23,10);put(data.billingNpi,61,50,10);
  }

  function makeAbsoluteWriter(page,font){
    const {width,height}=page.getSize(); const sx=width/612,sy=height/792;
    return (text,x,top,max=60,size=7.5)=>{ const clean=upper(text).slice(0,max); if(!clean)return; page.drawText(clean,{x:x*sx,y:height-top*sy,size:size*Math.min(sx,sy),font}); };
  }

  function fillUb04(page,font,data){
    const put=makeAbsoluteWriter(page,font),inst=data.institutional;
    put(data.billing.name,28,35,32,8);put(data.billing.address,28,47,32,7);put(addressLine(data.billing),28,59,32,7);put(data.billing.phone,28,71,18,7);
    put(inst.patientControl,340,42,18);put(inst.medicalRecord,430,42,18);put(inst.typeBill,532,42,5);put(inst.taxId,440,63,18);put(inst.statementFrom,490,63,10);put(inst.statementThrough,548,63,10);
    put(personName(data.patient),28,92,34,8);put(data.patient.address,28,106,34,7);put(addressLine(data.patient),28,120,34,7);
    put(data.patient.dob,300,92,10);put(data.patient.sex,366,92,1);put(inst.admitDate,403,92,10);put(inst.admitHour,469,92,2);put(inst.admissionType,497,92,1);put(inst.admissionSource,530,92,1);put(inst.dischargeHour,558,92,2);put(inst.dischargeStatus,580,92,2);
    String(inst.conditionCodes||'').split(',').map(upper).filter(Boolean).slice(0,11).forEach((code,i)=>put(code,300+i*25,145,2));
    const occ=String(inst.occurrenceCodes||'').split(/\n+/).filter(Boolean);occ.slice(0,4).forEach((line,i)=>put(line.replace(/\|/g,' '),34+(i%2)*150,185+Math.floor(i/2)*24,22,7));
    const spans=String(inst.occurrenceSpans||'').split(/\n+/).filter(Boolean);spans.slice(0,2).forEach((line,i)=>put(line.replace(/\|/g,' '),334,185+i*24,34,7));
    const values=String(inst.valueCodes||'').split(/\n+/).filter(Boolean);values.slice(0,12).forEach((line,i)=>put(line.replace(/\|/g,' '),34+(i%3)*185,244+Math.floor(i/3)*16,26,7));

    const rowTop=322,rowH=13.45;
    data.lines.slice(0,22).forEach((line,i)=>{
      const top=rowTop+i*rowH; put(line.revenue,31,top,4,7);put(line.description,68,top,28,6.5);put([line.code,line.m1,line.m2].filter(Boolean).join(' '),265,top,18,6.5);put(line.serviceDate,366,top,10,6.5);put(String(line.units),432,top,6,6.5);put(money(line.charge),478,top,12,6.5);if(line.noncovered)put(money(line.noncovered),550,top,10,6.5);
    });
    const total=data.lines.reduce((s,l)=>s+Number(l.charge||0),0);put(money(total),478,rowTop+22*rowH,12,7);

    put(data.payer,30,642,32,7.5);put(data.billingNpi,430,642,10,7.5);put(personName(data.insured),30,666,30,7);put(data.memberId,260,666,22,7);put(data.policyGroup,410,666,22,7);
    put(inst.principalDx,90,704,9,7.5);data.diagnoses.slice(1,17).forEach((dx,i)=>put(dx.code,160+(i%8)*52,704+Math.floor(i/8)*18,8,6.5));put(inst.admittingDx,90,740,9,7);put(inst.drg,320,740,6,7);put(inst.externalCause,390,740,9,7);
    put(inst.attendingNpi,430,740,10,7);put(inst.attendingName,500,740,16,6.5);put(inst.operatingNpi,430,760,10,7);put(inst.operatingName,500,760,16,6.5);put(inst.remarks,30,760,50,5.8);
  }

  async function buildPdf(data,file){
    const {PDFDocument,StandardFonts}=await loadPdfLib();
    const source=await PDFDocument.load(await file.arrayBuffer(),{ignoreEncryption:false});
    if(source.getPageCount()<1)throw new Error('The selected PDF has no pages.');
    const templateIndex=source.getPageCount()-1;
    const output=await PDFDocument.create();
    const font=await output.embedFont(StandardFonts.Courier);
    if(data.mode==='professional'){
      const chunks=[];for(let i=0;i<Math.max(1,data.lines.length);i+=6)chunks.push(data.lines.slice(i,i+6));
      const pages=await output.copyPages(source,chunks.map(()=>templateIndex));
      pages.forEach((page,i)=>{output.addPage(page);fillCms1500(page,font,data,chunks[i]);});
    }else{
      const [page]=await output.copyPages(source,[templateIndex]);output.addPage(page);fillUb04(page,font,data);
    }
    output.setTitle(data.mode==='professional'?'CMS-1500 Claim':'UB-04 Claim');
    output.setProducer('ClaimMatrix RCM');
    return output.save();
  }

  function deliverPdf(bytes,data){
    const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);
    const name=`ClaimMatrix-${data.mode==='professional'?'CMS1500':'UB04'}-${data.patient.last||'claim'}-${data.dos||new Date().toISOString().slice(0,10)}.pdf`.replace(/[^A-Za-z0-9._-]/g,'-');
    const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(isiOS){
      const opened=window.open(url,'_blank');
      if(!opened){location.href=url;}else{message('Actual claim-form PDF opened. Use Share → Save to Files to keep the PDF. Nothing was uploaded.');}
      setTimeout(()=>URL.revokeObjectURL(url),120000);return;
    }
    const a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    message(`Actual ${data.mode==='professional'?'CMS-1500':'UB-04'} PDF generated from your selected form. Nothing was uploaded.`);
  }

  async function officialExport(event){
    event.preventDefault();event.stopImmediatePropagation();
    const data=collectData(),file=templateFile(data.mode),missing=validate(data,file);
    if(missing.length){message(`Export needs ${missing.length} more item${missing.length===1?'':'s'}. First: ${missing[0].label}.`);focusMissing(missing[0]);return;}
    const button=$('#exportClaim');const original=button?.textContent;
    try{
      if(button){button.disabled=true;button.textContent='Building actual form PDF…';}
      message(`Filling the selected ${data.mode==='professional'?'CMS-1500':'UB-04'} PDF locally…`);
      const bytes=await buildPdf(data,file);deliverPdf(bytes,data);
      const progress=$('#formProgress');if(progress)progress.textContent='Actual-form PDF ready';
    }catch(error){console.error(error);message(`Could not generate the actual claim-form PDF: ${error?.message||'Unknown PDF error'}.`);}
    finally{if(button){button.disabled=false;button.textContent=original||'Generate PDF';syncExportUi();}}
  }

  function install(){
    addTemplateControls();syncExportUi();
    const button=$('#exportClaim');
    if(button&&!button.dataset.officialExport){button.dataset.officialExport='true';button.addEventListener('click',officialExport,true);}
    const observer=new MutationObserver(()=>{addTemplateControls();syncExportUi();});
    observer.observe(document.body,{attributes:true,attributeFilter:['data-claim-mode'],childList:true,subtree:false});
  }

  install();
})();
