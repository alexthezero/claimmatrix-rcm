(()=>{
  'use strict';

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const htmlEscape=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fieldValue=id=>$('#'+id)?.value?.trim?.()||'';
  const body=document.body;
  let claimMode='professional';
  const professionalLineMeta=new Map();
  const institutionalLineMeta=new Map();

  function ensureDiagnosisSlots(){
    const grid=$('.diaggrid');
    if(!grid)return;
    for(let i=5;i<=12;i+=1){
      if(grid.querySelector(`[data-field="dx${i}"]`))continue;
      const label=document.createElement('label');
      label.className='diag';
      label.dataset.field=`dx${i}`;
      label.innerHTML=`<span class="dnum">${i}</span><input class="live dxcode" placeholder="ICD-10-CM" aria-label="Diagnosis ${i}">`;
      grid.appendChild(label);
      label.querySelector('input').addEventListener('input',()=>{
        try{ touched.add(`dx${i}`); scrub(); }catch(_){ /* existing prototype state not available */ }
      });
    }
  }

  function addProgressStep(){
    const nav=$('.progress-strip');
    if(!nav||$('#formProgressStep'))return;
    const btn=document.createElement('button');
    btn.id='formProgressStep';
    btn.className='progress-step';
    btn.type='button';
    btn.dataset.scroll='claimFormPanel';
    btn.innerHTML='<span>4</span><div><strong>Claim form</strong><small id="formProgress">Details incomplete</small></div>';
    nav.appendChild(btn);
    btn.addEventListener('click',()=>$('#claimFormPanel')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function buildClaimFormPanel(){
    if($('#claimFormPanel'))return;
    const servicePanel=$('#servicePanel');
    if(!servicePanel)return;
    const panel=document.createElement('section');
    panel.className='panel claim-form-panel';
    panel.id='claimFormPanel';
    panel.innerHTML=`
      <div class="panelhead claim-form-head">
        <div>
          <div class="eyebrow">CLAIM FORM DETAILS</div>
          <h3 id="claimFormHeading">CMS-1500 professional claim</h3>
        </div>
        <div class="claim-form-actions">
          <span class="form-route" id="formRoute">Professional → CMS-1500 (02/12)</span>
          <button class="btn primary" id="exportClaim" type="button">Export CMS-1500</button>
        </div>
      </div>

      <div class="claim-form-body">
        <section class="form-section">
          <div class="form-section-title"><div><strong>Patient & insurance</strong><span>Shared data used by the destination claim form.</span></div></div>
          <div class="claim-detail-grid">
            <label class="cf-field"><span>Insurance program</span><select id="cf-insurance-type"><option value="">Select</option><option>Medicare</option><option>Medicaid</option><option>TRICARE</option><option>CHAMPVA</option><option>Group Health Plan</option><option>FECA Black Lung</option><option>Other</option></select></label>
            <label class="cf-field"><span>Patient middle initial</span><input id="cf-patient-mi" maxlength="1"></label>
            <label class="cf-field"><span>Sex</span><select id="cf-sex"><option value="">Select</option><option value="M">Male</option><option value="F">Female</option><option value="U">Unknown / other</option></select></label>
            <label class="cf-field"><span>Relationship to insured</span><select id="cf-relationship"><option value="self">Self</option><option value="spouse">Spouse</option><option value="child">Child</option><option value="other">Other</option></select></label>
            <label class="cf-field span2"><span>Patient street address</span><input id="cf-patient-address"></label>
            <label class="cf-field"><span>Patient city</span><input id="cf-patient-city"></label>
            <label class="cf-field"><span>Patient state</span><input id="cf-patient-state" maxlength="2"></label>
            <label class="cf-field"><span>Patient ZIP</span><input id="cf-patient-zip" inputmode="numeric"></label>
            <label class="cf-field"><span>Patient phone</span><input id="cf-patient-phone" inputmode="tel"></label>
            <label class="cf-field"><span>Policy / group number</span><input id="cf-policy-group"></label>
            <label class="cf-field"><span>Insurance plan / program name</span><input id="cf-plan-name"></label>
          </div>
        </section>

        <section class="form-section" id="insuredSection">
          <div class="form-section-title"><div><strong>Insured / subscriber</strong><span>For self, blank insured address/name fields inherit the patient data.</span></div></div>
          <div class="claim-detail-grid">
            <label class="cf-field"><span>Insured last name</span><input id="cf-insured-last"></label>
            <label class="cf-field"><span>Insured first name</span><input id="cf-insured-first"></label>
            <label class="cf-field"><span>Insured middle initial</span><input id="cf-insured-mi" maxlength="1"></label>
            <label class="cf-field"><span>Other insured name</span><input id="cf-other-insured-name"></label>
            <label class="cf-field span2"><span>Insured street address</span><input id="cf-insured-address"></label>
            <label class="cf-field"><span>Insured city</span><input id="cf-insured-city"></label>
            <label class="cf-field"><span>Insured state</span><input id="cf-insured-state" maxlength="2"></label>
            <label class="cf-field"><span>Insured ZIP</span><input id="cf-insured-zip"></label>
            <label class="cf-field"><span>Insured phone</span><input id="cf-insured-phone"></label>
            <label class="cf-field"><span>Other insured policy / group</span><input id="cf-other-insured-policy"></label>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section-title"><div><strong>Billing provider</strong><span>Used for CMS-1500 Item 33 and CMS-1450 provider identification.</span></div></div>
          <div class="claim-detail-grid">
            <label class="cf-field span2 required-export"><span>Billing provider / organization name</span><input id="cf-billing-name"></label>
            <label class="cf-field"><span>Federal tax ID</span><input id="cf-taxid"></label>
            <label class="cf-field"><span>Tax ID type</span><select id="cf-taxid-type"><option value="EIN">EIN</option><option value="SSN">SSN</option></select></label>
            <label class="cf-field span2 required-export"><span>Billing street address</span><input id="cf-billing-address"></label>
            <label class="cf-field required-export"><span>Billing city</span><input id="cf-billing-city"></label>
            <label class="cf-field required-export"><span>Billing state</span><input id="cf-billing-state" maxlength="2"></label>
            <label class="cf-field required-export"><span>Billing ZIP</span><input id="cf-billing-zip"></label>
            <label class="cf-field"><span>Billing phone</span><input id="cf-billing-phone"></label>
          </div>
        </section>

        <section class="form-section mode-professional" id="professionalDetails">
          <div class="form-section-title"><div><strong>Professional claim details</strong><span>Additional CMS-1500 items and service-line fields.</span></div></div>
          <div class="claim-detail-grid">
            <label class="cf-field"><span>Employment related?</span><select id="cf-employment"><option value="N">No</option><option value="Y">Yes</option></select></label>
            <label class="cf-field"><span>Auto accident?</span><select id="cf-auto-accident"><option value="N">No</option><option value="Y">Yes</option></select></label>
            <label class="cf-field"><span>Auto accident state</span><input id="cf-auto-state" maxlength="2"></label>
            <label class="cf-field"><span>Other accident?</span><select id="cf-other-accident"><option value="N">No</option><option value="Y">Yes</option></select></label>
            <label class="cf-field span2"><span>Other claim ID / qualifier</span><input id="cf-other-claim-id"></label>
            <label class="cf-field"><span>Resubmission code</span><input id="cf-resubmission-code"></label>
            <label class="cf-field"><span>Original reference number</span><input id="cf-original-ref"></label>
            <label class="cf-field span2"><span>Referring / ordering provider name</span><input id="cf-referring-name"></label>
            <label class="cf-field"><span>Referring / ordering NPI</span><input id="cf-referring-npi" maxlength="10"></label>
            <label class="cf-field"><span>Prior authorization number</span><input id="cf-prior-auth"></label>
            <label class="cf-field span2"><span>Service facility name</span><input id="cf-facility-name"></label>
            <label class="cf-field span2"><span>Service facility street address</span><input id="cf-facility-address"></label>
            <label class="cf-field"><span>Facility city</span><input id="cf-facility-city"></label>
            <label class="cf-field"><span>Facility state</span><input id="cf-facility-state" maxlength="2"></label>
            <label class="cf-field"><span>Facility ZIP</span><input id="cf-facility-zip"></label>
            <label class="cf-field"><span>Facility NPI</span><input id="cf-facility-npi" maxlength="10"></label>
            <label class="cf-field"><span>Accept assignment?</span><select id="cf-assignment"><option value="Y">Yes</option><option value="N">No</option></select></label>
            <label class="cf-field"><span>Patient signature</span><select id="cf-patient-signature"><option value="SOF">Signature on file</option><option value="">Blank</option></select></label>
            <label class="cf-field"><span>Insured signature</span><select id="cf-insured-signature"><option value="SOF">Signature on file</option><option value="">Blank</option></select></label>
            <label class="cf-field"><span>Provider signature date</span><input id="cf-provider-sign-date" type="date"></label>
          </div>
          <div class="line-supplement-wrap">
            <div class="supplement-heading"><strong>Additional professional line fields</strong><span>CMS-1500 supports four modifiers and line-level rendering/provider details.</span></div>
            <div id="professionalLineDetails"></div>
          </div>
        </section>

        <section class="form-section mode-institutional" id="institutionalDetails" hidden>
          <div class="form-section-title"><div><strong>Institutional claim details</strong><span>Core CMS-1450 / UB-04 form locators. Payer-specific conditional locators may still apply.</span></div></div>
          <div class="claim-detail-grid">
            <label class="cf-field"><span>FL 3a Patient control no.</span><input id="cf-patient-control"></label>
            <label class="cf-field"><span>FL 3b Medical record no.</span><input id="cf-medical-record"></label>
            <label class="cf-field required-export"><span>FL 4 Type of bill</span><input id="cf-type-bill" maxlength="4" placeholder="e.g. 0131"></label>
            <label class="cf-field"><span>FL 5 Federal tax no.</span><input id="cf-inst-taxid"></label>
            <label class="cf-field required-export"><span>FL 6 Statement from</span><input id="cf-statement-from" type="date"></label>
            <label class="cf-field required-export"><span>FL 6 Statement through</span><input id="cf-statement-through" type="date"></label>
            <label class="cf-field"><span>FL 12 Admission/start date</span><input id="cf-admit-date" type="date"></label>
            <label class="cf-field"><span>FL 13 Admission hour</span><input id="cf-admit-hour" maxlength="2"></label>
            <label class="cf-field"><span>FL 14 Admission/visit type</span><input id="cf-admission-type" maxlength="1"></label>
            <label class="cf-field"><span>FL 15 Point of origin</span><input id="cf-admission-source" maxlength="1"></label>
            <label class="cf-field"><span>FL 16 Discharge hour</span><input id="cf-discharge-hour" maxlength="2"></label>
            <label class="cf-field"><span>FL 17 Patient discharge status</span><input id="cf-discharge-status" maxlength="2"></label>
            <label class="cf-field span2"><span>FL 18–28 Condition codes</span><input id="cf-condition-codes" placeholder="Comma separated"></label>
            <label class="cf-field span2"><span>FL 31–34 Occurrence codes / dates</span><textarea id="cf-occurrence-codes" rows="3" placeholder="One per line: CODE | YYYY-MM-DD"></textarea></label>
            <label class="cf-field span2"><span>FL 35–36 Occurrence spans</span><textarea id="cf-occurrence-spans" rows="3" placeholder="One per line: CODE | FROM | THROUGH"></textarea></label>
            <label class="cf-field span2"><span>FL 39–41 Value codes / amounts</span><textarea id="cf-value-codes" rows="3" placeholder="One per line: CODE | AMOUNT"></textarea></label>
            <label class="cf-field required-export"><span>FL 67 Principal diagnosis</span><input id="cf-principal-dx"></label>
            <label class="cf-field"><span>FL 69 Admitting diagnosis</span><input id="cf-admitting-dx"></label>
            <label class="cf-field"><span>FL 72 External cause</span><input id="cf-external-cause"></label>
            <label class="cf-field"><span>FL 71 PPS / DRG code</span><input id="cf-drg"></label>
            <label class="cf-field"><span>FL 76 Attending NPI</span><input id="cf-attending-npi" maxlength="10"></label>
            <label class="cf-field"><span>FL 76 Attending provider name</span><input id="cf-attending-name"></label>
            <label class="cf-field"><span>FL 77 Operating NPI</span><input id="cf-operating-npi" maxlength="10"></label>
            <label class="cf-field"><span>FL 77 Operating provider name</span><input id="cf-operating-name"></label>
            <label class="cf-field span2"><span>FL 80 Remarks</span><textarea id="cf-remarks" rows="3"></textarea></label>
          </div>
          <div class="line-supplement-wrap">
            <div class="supplement-heading"><strong>Institutional charge-line details</strong><span>Add the revenue code and line-specific service data needed for the UB-04.</span></div>
            <div id="institutionalLineDetails"></div>
          </div>
        </section>

        <div class="export-note">
          <strong>Paper form note</strong>
          <span>The generated document is a review/print preview. Official paper submissions require the proper OCR form stock/scale. The preview also offers an experimental data-only overlay view that should be calibrated before use with preprinted forms.</span>
        </div>
      </div>`;
    servicePanel.after(panel);

    $$('.cf-field input,.cf-field select,.cf-field textarea',panel).forEach(el=>el.addEventListener('input',updateFormProgress));
    $('#exportClaim').addEventListener('click',exportClaim);
  }

  function setupClaimTypeToggle(){
    const buttons=$$('.claimtoggle button');
    if(buttons.length<2)return;
    const [professional,institutional]=buttons;
    professional.disabled=false;
    institutional.disabled=false;
    institutional.classList.remove('disabled-mode');
    institutional.removeAttribute('title');
    institutional.innerHTML='Institutional <small>UB-04</small>';
    professional.innerHTML='Professional <small>CMS-1500</small>';
    professional.addEventListener('click',()=>setClaimMode('professional'));
    institutional.addEventListener('click',()=>setClaimMode('institutional'));
  }

  function setClaimMode(mode){
    claimMode=mode;
    body.dataset.claimMode=mode;
    const buttons=$$('.claimtoggle button');
    buttons.forEach((button,index)=>{
      const active=(mode==='professional'&&index===0)||(mode==='institutional'&&index===1);
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    $('#professionalDetails').hidden=mode!=='professional';
    $('#institutionalDetails').hidden=mode!=='institutional';
    $('#claimFormHeading').textContent=mode==='professional'?'CMS-1500 professional claim':'CMS-1450 / UB-04 institutional claim';
    $('#formRoute').textContent=mode==='professional'?'Professional → CMS-1500 (02/12)':'Institutional → CMS-1450 / UB-04';
    $('#exportClaim').textContent=mode==='professional'?'Export CMS-1500':'Export UB-04';
    const headers=$$('.matrix thead th');
    if(headers[1])headers[1].textContent=mode==='professional'?'Procedure':'HCPCS';
    renderLineSupplements();
    updateFormProgress();
  }

  function getLineMeta(map,id,defaults={}){
    if(!map.has(id))map.set(id,{...defaults});
    return map.get(id);
  }

  function renderLineSupplements(){
    renderProfessionalLineSupplements();
    renderInstitutionalLineSupplements();
  }

  function renderProfessionalLineSupplements(){
    const root=$('#professionalLineDetails');
    if(!root)return;
    root.innerHTML=lines.map((line,index)=>{
      const meta=getLineMeta(professionalLineMeta,line.id,{from:'',to:'',pos:'',m3:'',m4:'',emg:'',renderNpi:''});
      return `<div class="supplement-row" data-prof-line="${line.id}">
        <div class="supplement-line-id"><strong>Line ${index+1}</strong><span>${htmlEscape(line.code||'No code')}</span></div>
        <label><span>From</span><input type="date" data-prof="from" value="${htmlEscape(meta.from)}"></label>
        <label><span>To</span><input type="date" data-prof="to" value="${htmlEscape(meta.to)}"></label>
        <label><span>POS override</span><input maxlength="2" data-prof="pos" value="${htmlEscape(meta.pos)}" placeholder="Claim POS"></label>
        <label><span>Mod 3</span><input maxlength="2" data-prof="m3" value="${htmlEscape(meta.m3)}"></label>
        <label><span>Mod 4</span><input maxlength="2" data-prof="m4" value="${htmlEscape(meta.m4)}"></label>
        <label><span>EMG</span><input maxlength="1" data-prof="emg" value="${htmlEscape(meta.emg)}"></label>
        <label class="wide"><span>Rendering NPI</span><input maxlength="10" data-prof="renderNpi" value="${htmlEscape(meta.renderNpi)}" placeholder="Defaults billing NPI"></label>
      </div>`;
    }).join('')||'<div class="supplement-empty">Add a service line to enter line-level claim form details.</div>';
    $$('[data-prof-line]',root).forEach(row=>{
      const id=row.dataset.profLine;
      row.querySelectorAll('[data-prof]').forEach(input=>input.addEventListener('input',()=>{
        getLineMeta(professionalLineMeta,id)[input.dataset.prof]=input.value.toUpperCase?.()||input.value;
        if(['m3','m4','pos','emg'].includes(input.dataset.prof))input.value=input.value.toUpperCase();
      }));
    });
  }

  function renderInstitutionalLineSupplements(){
    const root=$('#institutionalLineDetails');
    if(!root)return;
    root.innerHTML=lines.map((line,index)=>{
      const meta=getLineMeta(institutionalLineMeta,line.id,{revenue:'',description:'',serviceDate:'',noncovered:''});
      return `<div class="supplement-row institutional" data-inst-line="${line.id}">
        <div class="supplement-line-id"><strong>Line ${index+1}</strong><span>${htmlEscape(line.code||'No HCPCS')}</span></div>
        <label><span>FL 42 Revenue code</span><input maxlength="4" inputmode="numeric" data-inst="revenue" value="${htmlEscape(meta.revenue)}"></label>
        <label class="wide"><span>FL 43 Description</span><input data-inst="description" value="${htmlEscape(meta.description)}"></label>
        <label><span>FL 45 Service date</span><input type="date" data-inst="serviceDate" value="${htmlEscape(meta.serviceDate)}"></label>
        <label><span>FL 48 Noncovered</span><input type="number" min="0" step="0.01" data-inst="noncovered" value="${htmlEscape(meta.noncovered)}"></label>
      </div>`;
    }).join('')||'<div class="supplement-empty">Add a service line to enter institutional charge-line details.</div>';
    $$('[data-inst-line]',root).forEach(row=>{
      const id=row.dataset.instLine;
      row.querySelectorAll('[data-inst]').forEach(input=>input.addEventListener('input',()=>{
        getLineMeta(institutionalLineMeta,id)[input.dataset.inst]=input.value;
      }));
    });
  }

  function commonData(){
    const relationship=fieldValue('cf-relationship')||'self';
    const patient={
      last:fieldValue('last'),first:fieldValue('first'),mi:fieldValue('cf-patient-mi'),dob:fieldValue('dob'),sex:fieldValue('cf-sex'),
      address:fieldValue('cf-patient-address'),city:fieldValue('cf-patient-city'),state:fieldValue('cf-patient-state'),zip:fieldValue('cf-patient-zip'),phone:fieldValue('cf-patient-phone')
    };
    const insuredSelf=relationship==='self';
    const insured={
      last:fieldValue('cf-insured-last')||(insuredSelf?patient.last:''),first:fieldValue('cf-insured-first')||(insuredSelf?patient.first:''),mi:fieldValue('cf-insured-mi')||(insuredSelf?patient.mi:''),
      address:fieldValue('cf-insured-address')||(insuredSelf?patient.address:''),city:fieldValue('cf-insured-city')||(insuredSelf?patient.city:''),state:fieldValue('cf-insured-state')||(insuredSelf?patient.state:''),zip:fieldValue('cf-insured-zip')||(insuredSelf?patient.zip:''),phone:fieldValue('cf-insured-phone')||(insuredSelf?patient.phone:'')
    };
    return {
      mode:claimMode,
      payer:fieldValue('payer'),memberId:fieldValue('member'),dos:fieldValue('dos'),pos:fieldValue('pos'),billingNpi:fieldValue('npi'),
      insuranceType:fieldValue('cf-insurance-type'),relationship,patient,insured,
      policyGroup:fieldValue('cf-policy-group'),planName:fieldValue('cf-plan-name'),otherInsuredName:fieldValue('cf-other-insured-name'),otherInsuredPolicy:fieldValue('cf-other-insured-policy'),
      billing:{name:fieldValue('cf-billing-name'),taxId:fieldValue('cf-taxid'),taxType:fieldValue('cf-taxid-type'),address:fieldValue('cf-billing-address'),city:fieldValue('cf-billing-city'),state:fieldValue('cf-billing-state'),zip:fieldValue('cf-billing-zip'),phone:fieldValue('cf-billing-phone')},
      diagnoses:$$('.dxcode').map((input,index)=>({pointer:index+1,code:input.value.trim().toUpperCase()})).filter(x=>x.code)
    };
  }

  function professionalData(){
    const data=commonData();
    return {...data,professional:{
      employment:fieldValue('cf-employment'),autoAccident:fieldValue('cf-auto-accident'),autoState:fieldValue('cf-auto-state'),otherAccident:fieldValue('cf-other-accident'),
      otherClaimId:fieldValue('cf-other-claim-id'),resubmissionCode:fieldValue('cf-resubmission-code'),originalRef:fieldValue('cf-original-ref'),
      referringName:fieldValue('cf-referring-name'),referringNpi:fieldValue('cf-referring-npi'),priorAuth:fieldValue('cf-prior-auth'),
      facility:{name:fieldValue('cf-facility-name'),address:fieldValue('cf-facility-address'),city:fieldValue('cf-facility-city'),state:fieldValue('cf-facility-state'),zip:fieldValue('cf-facility-zip'),npi:fieldValue('cf-facility-npi')},
      assignment:fieldValue('cf-assignment'),patientSignature:fieldValue('cf-patient-signature'),insuredSignature:fieldValue('cf-insured-signature'),providerSignDate:fieldValue('cf-provider-sign-date')
    },lines:lines.map(line=>{
      const meta=getLineMeta(professionalLineMeta,line.id,{});
      return {from:meta.from||data.dos,to:meta.to||meta.from||data.dos,pos:meta.pos||data.pos,code:line.code,m1:line.m1,m2:line.m2,m3:meta.m3||'',m4:meta.m4||'',emg:meta.emg||'',dx:line.dx,charge:Number(line.charge)||0,units:Number(line.units)||0,renderNpi:meta.renderNpi||data.billingNpi};
    })};
  }

  function institutionalData(){
    const data=commonData();
    return {...data,institutional:{
      patientControl:fieldValue('cf-patient-control'),medicalRecord:fieldValue('cf-medical-record'),typeBill:fieldValue('cf-type-bill'),taxId:fieldValue('cf-inst-taxid')||data.billing.taxId,
      statementFrom:fieldValue('cf-statement-from'),statementThrough:fieldValue('cf-statement-through'),admitDate:fieldValue('cf-admit-date'),admitHour:fieldValue('cf-admit-hour'),admissionType:fieldValue('cf-admission-type'),admissionSource:fieldValue('cf-admission-source'),dischargeHour:fieldValue('cf-discharge-hour'),dischargeStatus:fieldValue('cf-discharge-status'),
      conditionCodes:fieldValue('cf-condition-codes'),occurrenceCodes:fieldValue('cf-occurrence-codes'),occurrenceSpans:fieldValue('cf-occurrence-spans'),valueCodes:fieldValue('cf-value-codes'),principalDx:fieldValue('cf-principal-dx'),admittingDx:fieldValue('cf-admitting-dx'),externalCause:fieldValue('cf-external-cause'),drg:fieldValue('cf-drg'),
      attendingNpi:fieldValue('cf-attending-npi'),attendingName:fieldValue('cf-attending-name'),operatingNpi:fieldValue('cf-operating-npi'),operatingName:fieldValue('cf-operating-name'),remarks:fieldValue('cf-remarks')
    },lines:lines.map(line=>{
      const meta=getLineMeta(institutionalLineMeta,line.id,{});
      return {revenue:meta.revenue||'',description:meta.description||'',hcpcs:line.code,modifiers:[line.m1,line.m2].filter(Boolean).join(' '),serviceDate:meta.serviceDate||data.dos,units:Number(line.units)||0,charge:Number(line.charge)||0,noncovered:Number(meta.noncovered)||0,dx:line.dx};
    })};
  }

  function exportMissing(data){
    const missing=[];
    const push=(label,target)=>missing.push({label,target});
    if(!data.payer)push('Payer','payer');
    if(!data.memberId)push('Member ID','member');
    if(!data.patient.first)push('Patient first name','first');
    if(!data.patient.last)push('Patient last name','last');
    if(!data.patient.dob)push('Date of birth','dob');
    if(!data.patient.address)push('Patient address','cf-patient-address');
    if(!data.patient.city)push('Patient city','cf-patient-city');
    if(!data.patient.state)push('Patient state','cf-patient-state');
    if(!data.patient.zip)push('Patient ZIP','cf-patient-zip');
    if(!data.billing.name)push('Billing provider name','cf-billing-name');
    if(!data.billing.address)push('Billing provider address','cf-billing-address');
    if(!data.billing.city)push('Billing provider city','cf-billing-city');
    if(!data.billing.state)push('Billing provider state','cf-billing-state');
    if(!data.billing.zip)push('Billing provider ZIP','cf-billing-zip');
    if(!data.billingNpi)push('Billing NPI','npi');
    if(!data.diagnoses.length)push('At least one diagnosis','dx1');
    if(!data.lines.length)push('At least one service line','addLine');
    if(claimMode==='professional'){
      if(!data.insuranceType)push('Insurance program','cf-insurance-type');
      if(!data.dos)push('Date of service','dos');
      if(!data.pos)push('Place of service','pos');
      data.lines.forEach((line,index)=>{
        if(!line.code)push(`Line ${index+1} procedure code`,`line-${lines[index]?.id}-code`);
        if(!(line.units>0))push(`Line ${index+1} units`,`line-${lines[index]?.id}-units`);
        if(!(line.charge>0))push(`Line ${index+1} charge`,`line-${lines[index]?.id}-charge`);
        if(!String(line.dx||'').trim())push(`Line ${index+1} diagnosis pointer`,`line-${lines[index]?.id}-dx`);
      });
    }else{
      const inst=data.institutional;
      if(!inst.typeBill)push('Type of bill','cf-type-bill');
      if(!inst.statementFrom)push('Statement from date','cf-statement-from');
      if(!inst.statementThrough)push('Statement through date','cf-statement-through');
      if(!inst.principalDx)push('Principal diagnosis','cf-principal-dx');
      data.lines.forEach((line,index)=>{
        if(!line.revenue)push(`Line ${index+1} revenue code`,null);
        if(!(line.charge>0))push(`Line ${index+1} charge`,`line-${lines[index]?.id}-charge`);
      });
    }
    return missing;
  }

  function exportClaim(){
    const data=claimMode==='professional'?professionalData():institutionalData();
    const missing=exportMissing(data);
    if(missing.length){
      const first=missing[0];
      $('#message').textContent=`Export needs ${missing.length} more item${missing.length===1?'':'s'}. First: ${first.label}.`;
      if(first.target){
        const target=$('#'+CSS.escape(first.target));
        target?.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>target?.focus?.(),250);
      }else{
        $('#claimFormPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
      }
      $('#formProgress').textContent=`${missing.length} export item${missing.length===1?'':'s'} missing`;
      $('#formProgressStep')?.classList.add('attention');
      return;
    }
    openClaimPreview(data);
  }

  function displayDate(v){
    if(!v)return '';
    const parts=v.split('-');
    return parts.length===3?`${parts[1]}/${parts[2]}/${parts[0]}`:v;
  }

  function money(v){return Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function name(person){return [person.last,person.first,person.mi].filter(Boolean).join(', ');}
  function addr(person){return [person.address,[person.city,person.state,person.zip].filter(Boolean).join(' ')].filter(Boolean).join(' · ');}
  function box(label,value,cls=''){return `<div class="box ${cls}"><span>${htmlEscape(label)}</span><strong>${htmlEscape(value||'')}</strong></div>`;}

  function professionalPages(data){
    const chunks=[];
    for(let i=0;i<Math.max(1,data.lines.length);i+=6)chunks.push(data.lines.slice(i,i+6));
    return chunks.map((chunk,pageIndex)=>{
      const p=data.professional;
      const dx=data.diagnoses.map(x=>`${x.pointer}. ${x.code}`).join('   ');
      const total=chunk.reduce((s,x)=>s+x.charge,0);
      const rows=chunk.map((line,i)=>`<tr><td>${pageIndex*6+i+1}</td><td>${htmlEscape(displayDate(line.from))}</td><td>${htmlEscape(displayDate(line.to))}</td><td>${htmlEscape(line.pos)}</td><td>${htmlEscape(line.emg)}</td><td>${htmlEscape([line.code,line.m1,line.m2,line.m3,line.m4].filter(Boolean).join(' '))}</td><td>${htmlEscape(line.dx)}</td><td>$${money(line.charge)}</td><td>${htmlEscape(line.units)}</td><td>${htmlEscape(line.renderNpi)}</td></tr>`).join('');
      return `<section class="paper cms1500">
        <div class="watermark">PREVIEW — NOT SUBMISSION FORM</div>
        <header><div><h1>CMS-1500 Claim Preview</h1><p>02/12 field mapping · page ${pageIndex+1} of ${chunks.length}</p></div><div class="route">${htmlEscape(data.insuranceType)}</div></header>
        <div class="grid g4">
          ${box('1 Insurance type',data.insuranceType)}${box('1a Insured ID',data.memberId)}${box('2 Patient name',name(data.patient),'span2')}
          ${box('3 DOB / Sex',`${displayDate(data.patient.dob)} · ${data.patient.sex}`)}${box('4 Insured name',name(data.insured))}${box('5 Patient address',addr(data.patient),'span2')}
          ${box('6 Relationship',data.relationship)}${box('7 Insured address',addr(data.insured),'span2')}${box('9 Other insured',data.otherInsuredName)}
          ${box('9a Other policy/group',data.otherInsuredPolicy)}${box('10a Employment',p.employment)}${box('10b Auto accident',`${p.autoAccident}${p.autoState?` · ${p.autoState}`:''}`)}${box('10c Other accident',p.otherAccident)}
          ${box('11 Policy/group',data.policyGroup)}${box('11c Plan/program',data.planName)}${box('11d Other health benefit plan','')}${box('19 Additional claim information',p.otherClaimId)}
          ${box('17 Referring/ordering provider',p.referringName,'span2')}${box('17b NPI',p.referringNpi)}${box('23 Prior authorization',p.priorAuth)}
          ${box('21 Diagnoses',dx,'span4')}
        </div>
        <table><thead><tr><th>#</th><th>24A From</th><th>24A To</th><th>24B POS</th><th>24C EMG</th><th>24D Procedure / modifiers</th><th>24E Dx</th><th>24F Charge</th><th>24G Units</th><th>24J Rendering NPI</th></tr></thead><tbody>${rows||'<tr><td colspan="10">No lines</td></tr>'}</tbody></table>
        <div class="grid g4 footer-grid">
          ${box('25 Federal tax ID',`${data.billing.taxId} (${data.billing.taxType})`)}${box('27 Accept assignment',p.assignment)}${box('28 Total charge',`$${money(total)}`)}${box('29 Amount paid','')}
          ${box('31 Provider signature/date',p.providerSignDate)}${box('32 Service facility',[p.facility.name,p.facility.address,[p.facility.city,p.facility.state,p.facility.zip].filter(Boolean).join(' ')].filter(Boolean).join(' · '),'span2')}${box('32a Facility NPI',p.facility.npi)}
          ${box('33 Billing provider',[data.billing.name,data.billing.address,[data.billing.city,data.billing.state,data.billing.zip].filter(Boolean).join(' ')].filter(Boolean).join(' · '),'span3')}${box('33a Billing NPI',data.billingNpi)}
        </div>
      </section>`;
    }).join('');
  }

  function institutionalPages(data){
    const chunks=[];
    for(let i=0;i<Math.max(1,data.lines.length);i+=22)chunks.push(data.lines.slice(i,i+22));
    return chunks.map((chunk,pageIndex)=>{
      const x=data.institutional;
      const rows=chunk.map((line,i)=>`<tr><td>${pageIndex*22+i+1}</td><td>${htmlEscape(line.revenue)}</td><td>${htmlEscape(line.description)}</td><td>${htmlEscape([line.hcpcs,line.modifiers].filter(Boolean).join(' '))}</td><td>${htmlEscape(displayDate(line.serviceDate))}</td><td>${htmlEscape(line.units)}</td><td>$${money(line.charge)}</td><td>$${money(line.noncovered)}</td></tr>`).join('');
      const total=chunk.reduce((s,line)=>s+line.charge,0);
      return `<section class="paper ub04">
        <div class="watermark">PREVIEW — NOT SUBMISSION FORM</div>
        <header><div><h1>CMS-1450 / UB-04 Claim Preview</h1><p>Institutional field-locator mapping · page ${pageIndex+1} of ${chunks.length}</p></div><div class="route">${htmlEscape(data.payer)}</div></header>
        <div class="grid g4">
          ${box('FL 1 Provider',[data.billing.name,data.billing.address,[data.billing.city,data.billing.state,data.billing.zip].filter(Boolean).join(' '),data.billing.phone].filter(Boolean).join(' · '),'span2')}${box('FL 3a Patient control',x.patientControl)}${box('FL 3b Medical record',x.medicalRecord)}
          ${box('FL 4 Type of bill',x.typeBill)}${box('FL 5 Federal tax no.',x.taxId)}${box('FL 6 Statement period',`${displayDate(x.statementFrom)} – ${displayDate(x.statementThrough)}`,'span2')}
          ${box('FL 8 Patient',`${name(data.patient)} · ${addr(data.patient)}`,'span2')}${box('FL 9 Patient address',addr(data.patient),'span2')}
          ${box('FL 10 DOB',displayDate(data.patient.dob))}${box('FL 11 Sex',data.patient.sex)}${box('FL 12 Admission/start',displayDate(x.admitDate))}${box('FL 13 Admission hour',x.admitHour)}
          ${box('FL 14 Type',x.admissionType)}${box('FL 15 Source',x.admissionSource)}${box('FL 16 Discharge hour',x.dischargeHour)}${box('FL 17 Discharge status',x.dischargeStatus)}
          ${box('FL 18–28 Condition codes',x.conditionCodes,'span2')}${box('FL 31–34 Occurrence',x.occurrenceCodes,'span2')}
          ${box('FL 35–36 Occurrence spans',x.occurrenceSpans,'span2')}${box('FL 39–41 Value codes',x.valueCodes,'span2')}
        </div>
        <table><thead><tr><th>#</th><th>FL42 Revenue</th><th>FL43 Description</th><th>FL44 HCPCS / modifiers</th><th>FL45 Date</th><th>FL46 Units</th><th>FL47 Charges</th><th>FL48 Noncovered</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No charge lines</td></tr>'}</tbody></table>
        <div class="grid g4 footer-grid">
          ${box('FL 50 Payer',data.payer,'span2')}${box('FL 60 Insured ID',data.memberId)}${box('FL 67 Principal diagnosis',x.principalDx)}
          ${box('FL 69 Admitting diagnosis',x.admittingDx)}${box('FL 71 PPS/DRG',x.drg)}${box('FL 72 External cause',x.externalCause)}${box('Total charges',`$${money(total)}`)}
          ${box('FL 76 Attending',`${x.attendingNpi} ${x.attendingName}`,'span2')}${box('FL 77 Operating',`${x.operatingNpi} ${x.operatingName}`,'span2')}
          ${box('FL 80 Remarks',x.remarks,'span4')}
        </div>
      </section>`;
    }).join('');
  }

  function previewCss(){return `
    *{box-sizing:border-box}body{margin:0;background:#e8ecef;color:#111;font-family:Arial,Helvetica,sans-serif}.toolbar{position:sticky;top:0;z-index:10;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:#121a20;color:white}.toolbar button{border:0;border-radius:7px;padding:9px 12px;font-weight:700;cursor:pointer}.toolbar .primary{background:#6bd6d8}.toolbar .secondary{background:#293844;color:#fff}.toolbar p{margin:0 0 0 auto;font-size:11px;color:#c6d0d6;max-width:520px}.pages{padding:20px}.paper{position:relative;width:8.5in;min-height:11in;margin:0 auto 20px;background:#fff;padding:.28in;border:1px solid #aeb7bd;page-break-after:always;overflow:hidden}.paper:last-child{page-break-after:auto}.watermark{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) rotate(-28deg);font-size:48px;font-weight:900;letter-spacing:.08em;color:rgba(180,0,0,.08);white-space:nowrap;pointer-events:none}.paper header{display:flex;justify-content:space-between;align-items:flex-start;border:2px solid #111;padding:8px;margin-bottom:6px}.paper h1{font-size:18px;margin:0}.paper header p{margin:3px 0 0;font-size:10px}.route{font-size:11px;font-weight:700;border:1px solid #111;padding:6px}.grid{display:grid;border-left:1px solid #111;border-top:1px solid #111}.g4{grid-template-columns:repeat(4,1fr)}.box{min-height:42px;border-right:1px solid #111;border-bottom:1px solid #111;padding:4px}.box span{display:block;font-size:8px;font-weight:700;color:#4a4a4a;margin-bottom:4px}.box strong{font-size:10px;line-height:1.25;white-space:pre-wrap}.span2{grid-column:span 2}.span3{grid-column:span 3}.span4{grid-column:span 4}table{width:100%;border-collapse:collapse;margin:6px 0;font-size:8px}th,td{border:1px solid #111;padding:4px;text-align:left;vertical-align:top}th{background:#f2f2f2;font-size:7px}.footer-grid{margin-top:6px}.overlay-mode .watermark{display:none}.overlay-mode .paper{border-color:transparent}.overlay-mode .paper header,.overlay-mode .grid,.overlay-mode table,.overlay-mode th,.overlay-mode td,.overlay-mode .box{border-color:transparent}.overlay-mode .paper header h1,.overlay-mode .paper header p,.overlay-mode .route,.overlay-mode .box span,.overlay-mode th{visibility:hidden}.overlay-mode th{height:18px}.overlay-mode .paper{box-shadow:none}@media print{body{background:#fff}.toolbar{display:none}.pages{padding:0}.paper{margin:0;border:0}.watermark{color:rgba(180,0,0,.08)}@page{size:letter;margin:0}}
  `;}

  function openClaimPreview(data){
    const w=window.open('','_blank');
    if(!w){$('#message').textContent='Your browser blocked the claim preview window. Allow pop-ups for this site and export again.';return;}
    const title=data.mode==='professional'?'CMS-1500 Claim Preview':'UB-04 Claim Preview';
    const pages=data.mode==='professional'?professionalPages(data):institutionalPages(data);
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${previewCss()}</style></head><body><div class="toolbar"><button class="primary" id="printPreview">Print / Save PDF</button><button class="secondary" id="overlay">Data-only overlay</button><button class="secondary" id="normal">Full preview</button><p>Preview is not an OCR submission form. Data-only overlay is experimental and should be calibrated against official preprinted form stock before use.</p></div><main class="pages">${pages}</main><script>document.getElementById('printPreview').addEventListener('click',()=>window.print());document.getElementById('overlay').addEventListener('click',()=>document.body.classList.add('overlay-mode'));document.getElementById('normal').addEventListener('click',()=>document.body.classList.remove('overlay-mode'));<\/script></body></html>`);
    w.document.close();
    $('#message').textContent=`${title} generated in a new tab. No claim was transmitted.`;
    $('#formProgress').textContent='Export ready';
    $('#formProgressStep')?.classList.remove('attention');
    $('#formProgressStep')?.classList.add('complete');
  }

  function updateFormProgress(){
    if(!$('#formProgress'))return;
    const data=claimMode==='professional'?professionalData():institutionalData();
    const missing=exportMissing(data);
    $('#formProgress').textContent=missing.length?`${missing.length} export item${missing.length===1?'':'s'} missing`:'Ready to export';
    $('#formProgressStep')?.classList.toggle('complete',missing.length===0);
    $('#formProgressStep')?.classList.toggle('attention',missing.length>0&&claimHasSomeFormData());
  }

  function claimHasSomeFormData(){
    return $$('.claim-form-panel input,.claim-form-panel select,.claim-form-panel textarea').some(el=>el.value&&el.value.trim?.());
  }

  function populateDemoDetails(){
    const set=(id,v)=>{const el=$('#'+id);if(el)el.value=v;};
    set('cf-insurance-type','Group Health Plan');set('cf-sex','M');set('cf-patient-address','100 Demo Way');set('cf-patient-city','Sample City');set('cf-patient-state','FL');set('cf-patient-zip','32000');set('cf-patient-phone','555-0100');
    set('cf-policy-group','DEMO-GROUP');set('cf-plan-name','Demo Health Plan');set('cf-billing-name','ClaimMatrix Demo Clinic');set('cf-taxid','12-3456789');set('cf-billing-address','200 Provider Ave');set('cf-billing-city','Sample City');set('cf-billing-state','FL');set('cf-billing-zip','32000');set('cf-billing-phone','555-0200');
    set('cf-facility-name','ClaimMatrix Demo Clinic');set('cf-facility-address','200 Provider Ave');set('cf-facility-city','Sample City');set('cf-facility-state','FL');set('cf-facility-zip','32000');
    set('cf-patient-control','DEMO-PCN-1001');set('cf-medical-record','MR-DEMO-1001');set('cf-type-bill','0131');set('cf-statement-from',fieldValue('dos'));set('cf-statement-through',fieldValue('dos'));set('cf-principal-dx','Z00.00');
    renderLineSupplements();updateFormProgress();
  }

  function clearClaimFormDetails(){
    $$('.claim-form-panel input,.claim-form-panel textarea').forEach(el=>el.value='');
    $$('.claim-form-panel select').forEach(el=>el.selectedIndex=0);
    professionalLineMeta.clear();institutionalLineMeta.clear();
    setClaimMode('professional');renderLineSupplements();updateFormProgress();
  }

  function observeServiceLines(){
    const target=$('#lineBody');
    if(!target)return;
    let timer;
    new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{renderLineSupplements();updateFormProgress();},30)}).observe(target,{childList:true});
  }

  function wireExistingActions(){
    $('#loadDemo')?.addEventListener('click',()=>setTimeout(populateDemoDetails,0));
    $('#reset')?.addEventListener('click',()=>setTimeout(clearClaimFormDetails,0));
  }

  function initialize(){
    ensureDiagnosisSlots();
    addProgressStep();
    buildClaimFormPanel();
    setupClaimTypeToggle();
    renderLineSupplements();
    observeServiceLines();
    wireExistingActions();
    body.dataset.claimMode='professional';
    const footer=$('.footer');if(footer)footer.textContent='ClaimMatrix RCM v0.3 · Claim-form export prototype · No licensed CPT dataset or X12 implementation-guide content is bundled.';
    updateFormProgress();
  }

  initialize();
})();
