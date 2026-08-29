(()=>{
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const value=id=>$('#'+id)?.value?.trim?.()||'';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  // Public-domain CMS-1500 02/12 artwork. The commit is pinned so the
  // background cannot silently change underneath ClaimMatrix.
  const CMS1500_ARTWORK='https://raw.githubusercontent.com/openemr/openemr/c4bb44fd16f091b1980f85536f25c3733f238ac1/public/images/cms1500.png';

  function digits(v=''){return String(v).replace(/\D/g,'');}
  function upper(v=''){return String(v).toUpperCase();}
  function parts(date=''){
    const m=String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?{yyyy:m[1],yy:m[1].slice(-2),mm:m[2],dd:m[3]}:{yyyy:'',yy:'',mm:'',dd:''};
  }
  function personName(p){return [p.last,p.first,p.mi].filter(Boolean).join(', ');}

  function collectServiceLines(){
    return $$('#lineBody tr.service-row').map(row=>{
      const id=row.dataset.id||'';
      const read=k=>row.querySelector(`[data-k="${k}"]`)?.value?.trim?.()||'';
      const supplement=$(`[data-prof-line="${CSS.escape(id)}"]`);
      const meta=k=>supplement?.querySelector(`[data-prof="${k}"]`)?.value?.trim?.()||'';
      return {
        id,
        code:upper(read('code')),
        m1:upper(read('m1')),
        m2:upper(read('m2')),
        m3:upper(meta('m3')),
        m4:upper(meta('m4')),
        units:Number(read('units'))||0,
        dx:read('dx'),
        charge:Number(read('charge'))||0,
        from:meta('from')||value('dos'),
        to:meta('to')||meta('from')||value('dos'),
        pos:meta('pos')||value('pos'),
        emg:upper(meta('emg')),
        renderNpi:meta('renderNpi')||value('npi')
      };
    });
  }

  function collectProfessionalClaim(){
    const relationship=value('cf-relationship')||'self';
    const patient={
      last:value('last'), first:value('first'), mi:value('cf-patient-mi'), dob:value('dob'), sex:value('cf-sex'),
      address:value('cf-patient-address'), city:value('cf-patient-city'), state:upper(value('cf-patient-state')), zip:value('cf-patient-zip'), phone:value('cf-patient-phone')
    };
    const self=relationship==='self';
    const insured={
      last:value('cf-insured-last')||(self?patient.last:''),
      first:value('cf-insured-first')||(self?patient.first:''),
      mi:value('cf-insured-mi')||(self?patient.mi:''),
      dob:self?patient.dob:'', sex:self?patient.sex:'',
      address:value('cf-insured-address')||(self?patient.address:''),
      city:value('cf-insured-city')||(self?patient.city:''),
      state:upper(value('cf-insured-state')||(self?patient.state:'')),
      zip:value('cf-insured-zip')||(self?patient.zip:''),
      phone:value('cf-insured-phone')||(self?patient.phone:'')
    };
    return {
      mode:'professional',
      payer:value('payer'), memberId:value('member'), dos:value('dos'), pos:value('pos'), billingNpi:value('npi'),
      insuranceType:value('cf-insurance-type'), relationship, patient, insured,
      policyGroup:value('cf-policy-group'), planName:value('cf-plan-name'),
      otherInsuredName:value('cf-other-insured-name'), otherInsuredPolicy:value('cf-other-insured-policy'),
      billing:{
        name:value('cf-billing-name'), taxId:value('cf-taxid'), taxType:value('cf-taxid-type'), address:value('cf-billing-address'),
        city:value('cf-billing-city'), state:upper(value('cf-billing-state')), zip:value('cf-billing-zip'), phone:value('cf-billing-phone')
      },
      diagnoses:$$('.dxcode').map((input,index)=>({pointer:index+1,code:upper(input.value.trim())})).filter(x=>x.code),
      professional:{
        employment:value('cf-employment'), autoAccident:value('cf-auto-accident'), autoState:upper(value('cf-auto-state')), otherAccident:value('cf-other-accident'),
        otherClaimId:value('cf-other-claim-id'), resubmissionCode:value('cf-resubmission-code'), originalRef:value('cf-original-ref'),
        referringName:value('cf-referring-name'), referringNpi:value('cf-referring-npi'), priorAuth:value('cf-prior-auth'),
        facility:{name:value('cf-facility-name'),address:value('cf-facility-address'),city:value('cf-facility-city'),state:upper(value('cf-facility-state')),zip:value('cf-facility-zip'),npi:value('cf-facility-npi')},
        assignment:value('cf-assignment'), patientSignature:value('cf-patient-signature'), insuredSignature:value('cf-insured-signature'), providerSignDate:value('cf-provider-sign-date')
      },
      lines:collectServiceLines()
    };
  }

  function requiredProfessional(data){
    const missing=[];
    const req=(label,v,id)=>{if(!String(v||'').trim())missing.push({label,id});};
    req('Payer',data.payer,'payer');
    req('Member ID',data.memberId,'member');
    req('Patient first name',data.patient.first,'first');
    req('Patient last name',data.patient.last,'last');
    req('Date of birth',data.patient.dob,'dob');
    req('Patient address',data.patient.address,'cf-patient-address');
    req('Patient city',data.patient.city,'cf-patient-city');
    req('Patient state',data.patient.state,'cf-patient-state');
    req('Patient ZIP',data.patient.zip,'cf-patient-zip');
    req('Date of service',data.dos,'dos');
    req('Place of service',data.pos,'pos');
    req('Billing provider name',data.billing.name,'cf-billing-name');
    req('Billing provider address',data.billing.address,'cf-billing-address');
    req('Billing provider city',data.billing.city,'cf-billing-city');
    req('Billing provider state',data.billing.state,'cf-billing-state');
    req('Billing provider ZIP',data.billing.zip,'cf-billing-zip');
    req('Billing NPI',data.billingNpi,'npi');
    req('Insurance program',data.insuranceType,'cf-insurance-type');
    if(!data.diagnoses.length)missing.push({label:'At least one diagnosis',id:'dx1'});
    if(!data.lines.length)missing.push({label:'At least one service line',id:'addLine'});
    data.lines.forEach((line,i)=>{
      if(!line.code)missing.push({label:`Line ${i+1} procedure code`,id:`line-${line.id}-code`});
      if(!(line.units>0))missing.push({label:`Line ${i+1} units`,id:`line-${line.id}-units`});
      if(!(line.charge>0))missing.push({label:`Line ${i+1} charge`,id:`line-${line.id}-charge`});
      if(!line.dx)missing.push({label:`Line ${i+1} diagnosis pointer`,id:`line-${line.id}-dx`});
    });
    return missing;
  }

  function makeGrid(){return Array.from({length:64},()=>Array(80).fill(' '));}
  function cleanText(v){return upper(v).replace(/[\r\n\t]/g,' ').replace(/[^\x20-\x7E]/g,' ');}
  function put(grid,row,col,maxlen,data,strip){
    if(!data)return;
    let text=cleanText(data);
    if(strip)text=text.replace(strip,'');
    text=text.slice(0,maxlen);
    const r=row-1,c=col-1;
    if(!grid[r])return;
    for(let i=0;i<text.length&&c+i<grid[r].length;i++)grid[r][c+i]=text[i];
  }
  function markYesNo(grid,row,yesCol,noCol,v){put(grid,row,String(v).toUpperCase()==='Y'?yesCol:noCol,1,'X');}
  function putDate(grid,row,cols,date,year4=false){
    const d=parts(date); if(!d.mm)return;
    put(grid,row,cols[0],2,d.mm); put(grid,row,cols[1],2,d.dd); put(grid,row,cols[2],year4?4:2,year4?d.yyyy:d.yy);
  }
  function phoneParts(phone){const d=digits(phone);return {area:d.slice(0,3),rest:d.slice(3,10)};}
  function chargeText(amount){return Number(amount||0).toFixed(2).replace('.',' ');}
  function dxPointerLetters(v){
    const letters=[];
    String(v||'').split(',').map(x=>Number(x.trim())).filter(n=>Number.isInteger(n)&&n>=1&&n<=12).forEach(n=>letters.push(String.fromCharCode(64+n)));
    return letters.join('').slice(0,4);
  }

  function insuranceColumn(type){
    const key=String(type||'').toLowerCase();
    if(key.includes('medicare'))return 1;
    if(key.includes('medicaid'))return 8;
    if(key.includes('tricare'))return 15;
    if(key.includes('champva'))return 24;
    if(key.includes('group'))return 31;
    if(key.includes('feca')||key.includes('black lung'))return 39;
    return 45;
  }
  function relationshipColumn(rel){return rel==='self'?33:rel==='spouse'?38:rel==='child'?42:47;}

  function populateHeader(grid,data){
    const p=data.professional,patient=data.patient,insured=data.insured;
    const patientPhone=phoneParts(patient.phone),insuredPhone=phoneParts(insured.phone);

    // Payer address block. ClaimMatrix currently collects the payer name only.
    put(grid,2,41,31,data.payer);

    // 1 / 1a
    put(grid,8,insuranceColumn(data.insuranceType),1,'X');
    put(grid,8,50,17,data.memberId);

    // 2-7
    put(grid,10,1,28,personName(patient));
    putDate(grid,10,[31,34,37],patient.dob,true);
    if(patient.sex==='M')put(grid,10,42,1,'X'); else if(patient.sex==='F')put(grid,10,47,1,'X');
    put(grid,10,50,28,personName(insured));
    put(grid,12,1,28,patient.address);
    put(grid,12,relationshipColumn(data.relationship),1,'X');
    put(grid,12,50,28,insured.address);
    put(grid,14,1,20,patient.city); put(grid,14,26,2,patient.state);
    put(grid,14,50,20,insured.city); put(grid,14,74,2,insured.state);
    put(grid,16,1,10,patient.zip); put(grid,16,15,3,patientPhone.area); put(grid,16,19,7,patientPhone.rest);
    put(grid,16,50,10,insured.zip); put(grid,16,65,3,insuredPhone.area); put(grid,16,69,7,insuredPhone.rest);

    // 9 / 9a / 10 / 11
    put(grid,18,1,28,data.otherInsuredName);
    put(grid,18,50,30,data.policyGroup);
    put(grid,20,1,28,data.otherInsuredPolicy);
    markYesNo(grid,20,35,41,p.employment||'N');
    if(insured.dob)putDate(grid,20,[53,56,59],insured.dob,true);
    if(insured.sex==='M')put(grid,20,68,1,'X'); else if(insured.sex==='F')put(grid,20,75,1,'X');
    markYesNo(grid,22,35,41,p.autoAccident||'N');
    if(p.autoAccident==='Y')put(grid,22,45,2,p.autoState);
    put(grid,22,50,30,p.otherClaimId);
    markYesNo(grid,24,35,41,p.otherAccident||'N');
    put(grid,24,50,30,data.planName);
    put(grid,26,57,1,'X'); // no additional health plan unless secondary data is modeled

    // 12 / 13 signatures
    if(p.patientSignature==='SOF')put(grid,29,7,17,'Signature on File');
    if(p.insuredSignature==='SOF')put(grid,29,55,17,'Signature on File');

    // 17 / 19
    if(p.referringName){put(grid,34,1,3,'DN');put(grid,34,4,25,p.referringName);}
    put(grid,34,33,15,p.referringNpi);
    put(grid,36,1,48,p.otherClaimId);

    // ICD indicator + diagnoses (A-L), CMS-1500 02/12 layout
    put(grid,37,42,1,'0');
    const dxCols=[3,16,29,42];
    data.diagnoses.slice(0,12).forEach((dx,index)=>{
      const row=38+Math.floor(index/4),col=dxCols[index%4];
      put(grid,row,col,8,dx.code,/[.#]/g);
    });

    // 22 / 23
    put(grid,38,50,10,p.resubmissionCode);
    put(grid,38,62,15,p.originalRef);
    put(grid,40,50,28,p.priorAuth);
  }

  function populateLines(grid,data,chunk){
    chunk.forEach((line,index)=>{
      const row=(index+1)*2+42; // 44,46,48,50,52,54
      putDate(grid,row,[1,4,7],line.from,false);
      putDate(grid,row,[10,13,16],line.to,false);
      put(grid,row,19,2,line.pos);
      put(grid,row,22,1,line.emg);
      put(grid,row,25,7,line.code);
      put(grid,row,33,12,[line.m1,line.m2,line.m3,line.m4].filter(Boolean).join(' '));
      put(grid,row,45,4,dxPointerLetters(line.dx));
      put(grid,row,50,8,chargeText(line.charge));
      put(grid,row,59,3,String(line.units||''));
      put(grid,row,68,10,line.renderNpi);
    });
  }

  function populateFooter(grid,data,chunk){
    const p=data.professional;
    put(grid,56,1,15,data.billing.taxId);
    put(grid,56,data.billing.taxType==='SSN'?17:19,1,'X');
    put(grid,56,p.assignment==='N'?43:38,1,'X');
    const total=chunk.reduce((sum,line)=>sum+Number(line.charge||0),0);
    put(grid,56,52,8,chargeText(total));

    const billingPhone=phoneParts(data.billing.phone);
    put(grid,57,66,3,billingPhone.area);
    if(billingPhone.rest){put(grid,57,70,3,billingPhone.rest.slice(0,3));put(grid,57,73,1,'-');put(grid,57,74,4,billingPhone.rest.slice(3,7));}

    put(grid,58,23,25,p.facility.name);
    put(grid,58,50,25,data.billing.name);
    put(grid,59,23,25,p.facility.address);
    put(grid,59,50,25,data.billing.address);
    put(grid,60,1,20,'Signature on File');
    put(grid,60,23,27,[p.facility.city,p.facility.state,p.facility.zip].filter(Boolean).join(' '));
    put(grid,60,50,27,[data.billing.city,data.billing.state,data.billing.zip].filter(Boolean).join(' '));
    if(p.providerSignDate){const d=parts(p.providerSignDate);put(grid,61,6,10,`${d.mm}/${d.dd}/${d.yy}`);}
    put(grid,61,23,10,p.facility.npi);
    put(grid,61,50,10,data.billingNpi);
  }

  function cms1500PageText(data,chunk){
    const grid=makeGrid();
    populateHeader(grid,data);
    populateLines(grid,data,chunk);
    populateFooter(grid,data,chunk);
    return grid.map(row=>row.join('').replace(/\s+$/,'')).join('\n');
  }

  function cms1500Pages(data){
    const chunks=[];
    for(let i=0;i<Math.max(1,data.lines.length);i+=6)chunks.push(data.lines.slice(i,i+6));
    return chunks.map((chunk,index)=>`<section class="page actual-cms1500" aria-label="CMS-1500 page ${index+1}">
      <img class="form-artwork" crossorigin="anonymous" src="${CMS1500_ARTWORK}" alt="CMS-1500 02/12 form">
      <pre class="hcfa-grid">${esc(cms1500PageText(data,chunk))}</pre>
      <div class="form-load-error">CMS-1500 artwork could not be loaded. Check the network connection before printing or downloading this claim.</div>
    </section>`).join('');
  }

  function previewCss(){return `
    *{box-sizing:border-box}html,body{margin:0}body{background:#e8edf1;color:#111;font-family:Arial,Helvetica,sans-serif}.toolbar{position:sticky;top:0;z-index:20;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:#101820;color:#fff;box-shadow:0 1px 8px #0003}.toolbar button{border:0;border-radius:7px;padding:9px 12px;font-weight:700;cursor:pointer}.toolbar .primary{background:#70d8da;color:#081116}.toolbar .secondary{background:#2a3945;color:#fff}.toolbar label{display:flex;align-items:center;gap:5px;font-size:11px;color:#d6e0e6}.toolbar input{width:62px;border:1px solid #60717d;border-radius:5px;padding:5px;background:#17232c;color:#fff}.toolbar p{margin:0 0 0 auto;max-width:520px;font-size:10px;line-height:1.35;color:#c4cfd6}.pages{padding:18px}.page{--x-offset:0in;--y-offset:0in;position:relative;width:8.5in;height:11in;margin:0 auto 18px;background:#fff;overflow:hidden;page-break-after:always;box-shadow:0 2px 14px #0002}.page:last-child{page-break-after:auto}.form-artwork{position:absolute;inset:0;width:8.5in;height:11in;object-fit:fill;display:block}.hcfa-grid{position:absolute;left:var(--x-offset);top:var(--y-offset);margin:0;padding:0;width:8in;height:auto;overflow:visible;white-space:pre;font-family:Courier,'Courier New',monospace;font-size:12pt;line-height:12pt;font-weight:400;letter-spacing:0;color:#000;background:transparent;pointer-events:none}.form-load-error{display:none;position:absolute;left:.5in;right:.5in;top:4.5in;padding:18px;background:#fff3f3;border:2px solid #b42318;color:#7a271a;font-weight:700;text-align:center}.page.artwork-error .form-load-error{display:block}.data-only .form-artwork{visibility:hidden}.data-only .page{box-shadow:none}.data-only .form-load-error{display:none!important}@media print{body{background:#fff}.toolbar{display:none!important}.pages{padding:0}.page{margin:0;box-shadow:none}@page{size:letter;margin:0}}
  `;}

  function wirePreview(w){
    const doc=w.document;
    const setOffset=()=>{
      const x=Number(doc.getElementById('xOffset')?.value||0);
      const y=Number(doc.getElementById('yOffset')?.value||0);
      doc.querySelectorAll('.page').forEach(page=>{page.style.setProperty('--x-offset',`${x}in`);page.style.setProperty('--y-offset',`${y}in`);});
    };
    doc.getElementById('printPreview')?.addEventListener('click',()=>w.print());
    doc.getElementById('dataOnly')?.addEventListener('click',()=>doc.body.classList.add('data-only'));
    doc.getElementById('withForm')?.addEventListener('click',()=>doc.body.classList.remove('data-only'));
    doc.getElementById('xOffset')?.addEventListener('input',setOffset);
    doc.getElementById('yOffset')?.addEventListener('input',setOffset);
    doc.querySelectorAll('.form-artwork').forEach(img=>img.addEventListener('error',()=>img.closest('.page')?.classList.add('artwork-error')));
    setOffset();
  }

  function openCms1500(data){
    const w=window.open('','_blank');
    if(!w){$('#message').textContent='Your browser blocked the CMS-1500 window. Allow pop-ups for this site and export again.';return;}
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CMS-1500 02/12 Claim</title><style>${previewCss()}</style></head><body><div class="toolbar"><button class="primary" id="printPreview" type="button">Print</button><button class="secondary" id="withForm" type="button">Actual form</button><button class="secondary" id="dataOnly" type="button">Data only</button><label>X offset <input id="xOffset" type="number" step="0.01" value="0"></label><label>Y offset <input id="yOffset" type="number" step="0.01" value="0"></label><p>This view uses the actual CMS-1500 02/12 layout. For paper claim submission, payer/CMS OCR stock, ink, scale and printer requirements still apply. Offsets are provided only for printer calibration.</p></div><main class="pages">${cms1500Pages(data)}</main></body></html>`);
    w.document.close();
    // pdf-export-fix.js wraps document.close() and enhances the same preview.
    w.setTimeout(()=>wirePreview(w),0);
    $('#message').textContent='Actual CMS-1500 02/12 form generated in a new tab. No claim was transmitted.';
    $('#formProgress').textContent='CMS-1500 ready';
    $('#formProgressStep')?.classList.remove('attention');
    $('#formProgressStep')?.classList.add('complete');
  }

  function focusMissing(missing){
    const first=missing[0];
    $('#message').textContent=`CMS-1500 export needs ${missing.length} more item${missing.length===1?'':'s'}. First: ${first.label}.`;
    const target=first.id?$('#'+CSS.escape(first.id)):null;
    target?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>target?.focus?.(),220);
  }

  function installUb04TemplateControl(){
    const section=$('#institutionalDetails');
    if(!section||$('#ub04AuthorizedTemplate'))return;
    const wrap=document.createElement('div');
    wrap.className='line-supplement-wrap';
    wrap.innerHTML=`<div class="supplement-heading"><strong>Authorized UB-04 form artwork</strong><span>The UB-04/CMS-1450 form is licensed by the AHA/NUBC. ClaimMatrix will not bundle or imitate that artwork in this public repository.</span></div><label class="cf-field"><span>Authorized blank UB-04 PDF</span><input id="ub04AuthorizedTemplate" type="file" accept="application/pdf,.pdf"><small style="display:block;margin-top:6px;opacity:.78">The selected file stays in your browser. This prototype does not upload it.</small></label>`;
    section.appendChild(wrap);
  }

  function handleInstitutionalExport(){
    installUb04TemplateControl();
    const input=$('#ub04AuthorizedTemplate');
    if(!input?.files?.length){
      $('#message').textContent='UB-04 export requires an authorized blank UB-04 PDF. Select it under Institutional claim details. ClaimMatrix will not generate a look-alike form.';
      input?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>input?.focus?.(),220);
      return;
    }
    $('#message').textContent='Authorized UB-04 template selected. The fake UB-04 preview has been disabled; field-coordinate filling is the next licensed-template step and no look-alike form will be generated.';
  }

  function exportActualClaim(event){
    const button=event.target.closest?.('#exportClaim');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(document.body.dataset.claimMode==='institutional'){
      handleInstitutionalExport();
      return;
    }
    const data=collectProfessionalClaim();
    const missing=requiredProfessional(data);
    if(missing.length){focusMissing(missing);return;}
    openCms1500(data);
  }

  function updatePaperNote(){
    const note=$('.export-note');
    if(note)note.innerHTML='<strong>Standard claim-form output</strong><span>Professional export renders claim data on the actual CMS-1500 (02/12) layout. Institutional export does not create a look-alike UB-04; an authorized UB-04 PDF is required because that form artwork is licensed by AHA/NUBC.</span>';
  }

  function initialize(){
    installUb04TemplateControl();
    updatePaperNote();
    document.addEventListener('click',exportActualClaim,true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
