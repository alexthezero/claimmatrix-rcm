const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let lines=[];
let reviewed=false;
const touched=new Set();
const mkLine=(x={})=>({id:crypto.randomUUID(),code:x.code||'',m1:x.m1||'',m2:x.m2||'',units:x.units??1,dx:x.dx||'',charge:x.charge??0});
const esc=v=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const localDateKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const normalize=v=>String(v||'').trim().toUpperCase();
const lineKey=(id,k)=>`${id}:${k}`;

function validNpi(v){
  if(!/^\d{10}$/.test(v))return false;
  const d=('80840'+v).split('').map(Number);let sum=0,p=d.length%2;
  d.forEach((n,i)=>{if(i%2===p){n*=2;if(n>9)n-=9}sum+=n});
  return sum%10===0;
}

function addFinding(arr,severity,title,message,fix,target='',fieldKey='',lineId='',source='ClaimMatrix structural validation'){
  arr.push({severity,title,message,fix,target,fieldKey,lineId,source});
}

function isLineActive(line){
  return reviewed||line.code.trim()||line.m1.trim()||line.m2.trim()||line.dx.trim()||Number(line.charge)>0||['code','m1','m2','units','dx','charge'].some(k=>touched.has(lineKey(line.id,k)));
}

function activeDiagnoses(){
  return $$('.dxcode').map((e,i)=>({id:i+1,code:normalize(e.value)})).filter(x=>x.code);
}

function requiredContextComplete(){
  return ['payer','member','dos','first','last','dob','pos','npi'].every(id=>$('#'+id).value.trim());
}

function servicesComplete(){
  const dx=activeDiagnoses();
  return lines.length>0&&lines.every(l=>normalize(l.code)&&Number(l.units)>0&&Number(l.charge)>0&&String(l.dx).split(',').map(x=>Number(x.trim())).filter(Number.isInteger).some(p=>dx.some(d=>d.id===p)));
}

function claimHasData(){
  return ['payer','member','dos','first','last','dob','pos','npi'].some(id=>$('#'+id).value.trim())||activeDiagnoses().length>0||lines.some(l=>l.code.trim()||l.m1.trim()||l.m2.trim()||l.dx.trim()||Number(l.charge)>0);
}

function renderLines(){
  const tb=$('#lineBody');tb.innerHTML='';
  lines.forEach((l,i)=>{
    const tr=document.createElement('tr');tr.className='service-row';tr.dataset.id=l.id;tr.id=`line-${l.id}`;
    tr.innerHTML=`
      <td class="lineNo" data-label="Line">${i+1}</td>
      <td data-label="Procedure"><input class="cell code" id="line-${l.id}-code" data-k="code" maxlength="5" value="${esc(l.code)}" placeholder="Code" aria-label="Line ${i+1} procedure code"></td>
      <td data-label="Modifier 1"><input class="cell short" id="line-${l.id}-m1" data-k="m1" maxlength="2" value="${esc(l.m1)}" placeholder="--" aria-label="Line ${i+1} modifier 1"></td>
      <td data-label="Modifier 2"><input class="cell short" id="line-${l.id}-m2" data-k="m2" maxlength="2" value="${esc(l.m2)}" placeholder="--" aria-label="Line ${i+1} modifier 2"></td>
      <td data-label="Units"><input class="cell units" id="line-${l.id}-units" data-k="units" type="number" min="1" value="${l.units}" aria-label="Line ${i+1} units"></td>
      <td data-label="Dx ptr"><input class="cell ptr" id="line-${l.id}-dx" data-k="dx" value="${esc(l.dx)}" placeholder="1,2" aria-label="Line ${i+1} diagnosis pointers"></td>
      <td data-label="Charge"><div class="money"><span>$</span><input class="cell" id="line-${l.id}-charge" data-k="charge" type="number" min="0" step="0.01" value="${l.charge||''}" placeholder="0.00" aria-label="Line ${i+1} charge"></div></td>
      <td class="status" data-label="Status"><span class="neutral-pill">INCOMPLETE</span></td>
      <td data-label=""><button class="remove" type="button" aria-label="Remove service line ${i+1}">×</button></td>`;
    tb.appendChild(tr);
    const issue=document.createElement('tr');issue.className='line-issue-row';issue.dataset.issueFor=l.id;issue.hidden=true;issue.innerHTML='<td colspan="9"><div class="line-issue"></div></td>';tb.appendChild(issue);
  });
  wireRows();scrub();
}

function wireRows(){
  $$('#lineBody tr.service-row').forEach(tr=>{
    const id=tr.dataset.id;
    tr.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const l=lines.find(x=>x.id===id),k=inp.dataset.k;let v=inp.value;
        if(['code','m1','m2'].includes(k)){v=v.toUpperCase();inp.value=v}
        if(k==='units'||k==='charge')v=Number(v);
        l[k]=v;touched.add(lineKey(id,k));scrub();
      });
    });
    tr.querySelector('.remove').addEventListener('click',()=>{lines=lines.filter(x=>x.id!==id);renderLines()});
  });
}

function scrub(){
  const f=[];
  const payer=$('#payer').value.trim(),member=$('#member').value.trim(),first=$('#first').value.trim(),last=$('#last').value.trim(),dob=$('#dob').value,dos=$('#dos').value,pos=$('#pos').value.trim(),npi=$('#npi').value.trim();
  const req=(id,value,title,message,fix)=>{if(!value&&(reviewed||touched.has(id)))addFinding(f,'block',title,message,fix,id,id)};
  req('payer',payer,'Payer is required','A payer or routing destination has not been selected.','Enter or select the payer before submission.');
  req('member',member,'Member ID is required','The subscriber/member identifier is blank.','Enter the member ID exactly as shown by the payer record.');
  req('first',first,'Patient first name is required','The patient first name is blank.','Complete the patient first name.');
  req('last',last,'Patient last name is required','The patient last name is blank.','Complete the patient last name.');
  req('dob',dob,'Date of birth is required','Patient date of birth is blank.','Enter the patient date of birth.');
  req('dos',dos,'Date of service is required','The claim has no date of service.','Enter the date on which the service occurred.');
  req('pos',pos,'Place of service is required','No place of service is entered.','Enter the supported two-digit POS code.');
  req('npi',npi,'Billing NPI is required','No billing NPI is entered.','Enter the 10-digit billing NPI.');

  const today=localDateKey();
  if(dos&&dos>today)addFinding(f,'block','Future date of service',`The date of service ${dos} is after today.`,'Correct the date of service before submission.','dos','dos');
  if(dob&&dob>today)addFinding(f,'block','Future date of birth',`The date of birth ${dob} is after today.`,'Correct the patient date of birth.','dob','dob');
  if(dob&&dos&&dos<dob)addFinding(f,'block','Service date precedes birth date','The date of service occurs before the patient date of birth.','Verify both dates before submission.','dos','dos');
  if(pos&&!/^\d{2}$/.test(pos))addFinding(f,'block','Place of service format','POS must be a two-digit code.','Enter and verify a current two-digit POS code.','pos','pos');
  if(npi&&!validNpi(npi))addFinding(f,'block','Billing NPI failed validation','The billing NPI is malformed or fails its check digit.','Verify the 10-digit billing NPI.','npi','npi');

  const dx=activeDiagnoses();
  const anyService=lines.some(isLineActive);
  if(!dx.length&&(reviewed||anyService||$$('.dxcode').some((_,i)=>touched.has(`dx${i+1}`))))addFinding(f,'block','Diagnosis required','At least one diagnosis is required for an active claim.','Add the diagnosis supported by the documentation.','dx1','dx1');
  dx.forEach(x=>{
    if(!/^[A-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$/.test(x.code))addFinding(f,'warn',`Diagnosis ${x.id} needs code-set validation`,`${x.code} does not match the prototype ICD-10-CM format screen.`,'Verify the code against the effective ICD-10-CM code set.',`dx${x.id}`,`dx${x.id}`);
  });

  if(!lines.length&&reviewed)addFinding(f,'block','Service line required','The claim contains no service lines.','Add at least one supported service line.','addLine','lines');
  const codeSet=new Set(lines.map(x=>normalize(x.code)).filter(Boolean));

  lines.forEach((l,i)=>{
    const active=isLineActive(l);if(!active)return;
    const c=normalize(l.code),prefix=`Line ${i+1}`;
    const lineReq=(k,condition,title,message,fix)=>{if(condition)addFinding(f,'block',`${prefix}: ${title}`,message,fix,`line-${l.id}-${k}`,lineKey(l.id,k),l.id)};
    lineReq('code',!c,'procedure code required','The service line has no procedure/HCPCS code.','Enter the supported procedure code.');
    if(c&&!/^[A-Z0-9]{5}$/.test(c))addFinding(f,'block',`${prefix}: procedure format`,'Procedure/HCPCS code must be five alphanumeric characters in this prototype.','Enter a supported code and validate it against the effective code set.',`line-${l.id}-code`,lineKey(l.id,'code'),l.id);
    [l.m1,l.m2].forEach((m,mi)=>{if(m&&!/^[A-Z0-9]{2}$/.test(normalize(m)))addFinding(f,'block',`${prefix}: modifier format`,`Modifier ${m} is not two alphanumeric characters.`,'Correct the modifier and confirm documentation supports its use.',`line-${l.id}-m${mi+1}`,lineKey(l.id,`m${mi+1}`),l.id)});
    lineReq('units',!(Number(l.units)>0),'units must be positive','Units must be greater than zero.','Enter the supported units of service.');
    lineReq('charge',!(Number(l.charge)>0),'charge is required','The service line charge must be greater than zero.','Enter the applicable charge.');
    const ptr=String(l.dx).split(',').map(x=>Number(x.trim())).filter(x=>Number.isInteger(x)&&x>0);
    lineReq('dx',!ptr.length,'diagnosis pointer missing','The service line does not point to a diagnosis.','Assign the supported diagnosis pointer(s).');
    ptr.forEach(p=>{if(!dx.some(d=>d.id===p))addFinding(f,'block',`${prefix}: invalid diagnosis pointer`,`Pointer ${p} does not reference an active diagnosis.`,'Correct the pointer or add the referenced diagnosis.',`line-${l.id}-dx`,lineKey(l.id,'dx'),l.id)});
    if(c==='TEST3'&&Number(l.units)>2)addFinding(f,'block',`${prefix}: demo unit limit exceeded`,`${c} has ${l.units} units; the synthetic demo threshold is 2.`,'Review units. Production will use authoritative rule data where available.',`line-${l.id}-units`,lineKey(l.id,'units'),l.id,'DEMO ONLY — synthetic MUE-style rule');
    if(c==='TEST4'&&!codeSet.has('TEST5'))addFinding(f,'block',`${prefix}: demo add-on code lacks primary service`,'TEST4 is configured as a synthetic add-on code and requires TEST5.','Review whether the add-on and primary service are supported.',`line-${l.id}-code`,lineKey(l.id,'code'),l.id,'DEMO ONLY — synthetic add-on rule');
  });

  for(let a=0;a<lines.length;a++)for(let b=a+1;b<lines.length;b++){
    const x=lines[a],y=lines[b],xc=normalize(x.code),yc=normalize(y.code);
    if(!xc||!yc)continue;
    if(xc===yc&&normalize(x.m1)===normalize(y.m1)&&normalize(x.m2)===normalize(y.m2)&&String(x.dx).replace(/\s/g,'')===String(y.dx).replace(/\s/g,''))addFinding(f,'warn',`Possible duplicate lines ${a+1} and ${b+1}`,'Procedure, modifiers, and diagnosis pointers match.','Confirm the services are intentionally separate.',`line-${y.id}-code`,lineKey(y.id,'code'),y.id);
    if((xc==='TEST1'&&yc==='TEST2')||(xc==='TEST2'&&yc==='TEST1'))addFinding(f,'block','Demo code-pair edit triggered','TEST1 and TEST2 are configured as an incompatible synthetic pair.','Review documentation. ClaimMatrix will never add a modifier automatically simply to bypass an edit.',`line-${y.id}-code`,lineKey(y.id,'code'),y.id,'DEMO ONLY — synthetic NCCI-style rule');
  }
  if(f.some(x=>x.source.startsWith('DEMO')))addFinding(f,'info','Synthetic rule data is active','TEST1–TEST5 behavior demonstrates the rule engine only.','Replace demo adapters with authoritative versioned imports before production.','','','','ClaimMatrix prototype notice');
  paint(f);return f;
}

function clearStates(){
  $$('.field,.diag').forEach(el=>{el.classList.remove('invalid','warning','valid');if(el.classList.contains('field'))el.removeAttribute('data-message')});
  $$('.cell').forEach(el=>el.classList.remove('invalid','warning','valid'));
}

function applyFieldState(f){
  f.forEach(x=>{
    if(!x.target)return;
    const target=$('#'+CSS.escape(x.target));if(!target)return;
    const wrapper=target.closest('.field,.diag');
    const level=x.severity==='block'?'invalid':x.severity==='warn'?'warning':'';
    if(wrapper&&level){wrapper.classList.add(level);if(wrapper.classList.contains('field'))wrapper.dataset.message=x.title}
    else if(level&&target.classList.contains('cell'))target.classList.add(level);
  });
  ['payer','member','dos','first','last','dob','pos','npi'].forEach(id=>{const input=$('#'+id),wrapper=input.closest('.field');if(input.value.trim()&&!wrapper.classList.contains('invalid')&&!wrapper.classList.contains('warning'))wrapper.classList.add('valid')});
  $$('.dxcode').forEach(input=>{const wrapper=input.closest('.diag');if(input.value.trim()&&!wrapper.classList.contains('invalid')&&!wrapper.classList.contains('warning'))wrapper.classList.add('valid')});
}

function paintLineStates(f){
  $$('#lineBody tr.service-row').forEach((tr,index)=>{
    const id=tr.dataset.id,l=lines.find(x=>x.id===id),lf=f.filter(x=>x.lineId===id),status=tr.querySelector('.status'),issueRow=$(`[data-issue-for="${id}"]`),issue=issueRow?.querySelector('.line-issue');
    tr.classList.remove('blockrow','warnrow');
    tr.querySelectorAll('.cell').forEach(c=>c.classList.remove('invalid','warning'));
    lf.forEach(x=>{if(x.target){const t=$('#'+CSS.escape(x.target));if(t?.classList.contains('cell'))t.classList.add(x.severity==='block'?'invalid':'warning')}});
    if(lf.some(x=>x.severity==='block')){tr.classList.add('blockrow');status.innerHTML='<button class="statusbutton" type="button"><span class="badge block">MUST FIX</span></button>'}
    else if(lf.some(x=>x.severity==='warn')){tr.classList.add('warnrow');status.innerHTML='<button class="statusbutton" type="button"><span class="badge warn">REVIEW</span></button>'}
    else if(isLineActive(l)&&normalize(l.code)&&Number(l.charge)>0&&String(l.dx).trim()){status.innerHTML='<span class="clean">CLEAN</span>'}
    else status.innerHTML='<span class="neutral-pill">INCOMPLETE</span>';
    const primary=lf.find(x=>x.severity==='block')||lf.find(x=>x.severity==='warn');
    if(issueRow&&issue){issueRow.hidden=!primary;if(primary)issue.innerHTML=`<strong>${primary.severity==='block'?'Must fix':'Review'}</strong><span>${esc(primary.title)} — ${esc(primary.fix)}</span>`}
    const sb=status.querySelector('.statusbutton');if(sb)sb.onclick=()=>{const first=lf.find(x=>x.target);if(first)jumpTo(first.target)};
  });
}

function paint(f){
  clearStates();applyFieldState(f);paintLineStates(f);
  const blockers=f.filter(x=>x.severity==='block').length,warnings=f.filter(x=>x.severity==='warn').length,infos=f.filter(x=>x.severity==='info').length;
  $('#bc').textContent=blockers;$('#wc').textContent=warnings;$('#ic').textContent=infos;$('#editCount').textContent=f.length;
  const complete=requiredContextComplete()&&activeDiagnoses().length>0&&servicesComplete();
  const icon=$('#stateIcon'),title=$('#stateTitle'),sub=$('#stateSubtitle');icon.className='state-icon';
  if(blockers){icon.classList.add('blocked');icon.textContent='!';title.textContent='Needs attention';sub.textContent=`${blockers} issue${blockers===1?'':'s'} must be fixed before submission.`}
  else if(warnings){icon.classList.add('review');icon.textContent='?';title.textContent='Review';sub.textContent=`No hard blockers. Review ${warnings} warning${warnings===1?'':'s'} before submission.`}
  else if(complete){icon.classList.add('ready');icon.textContent='✓';title.textContent='Ready';sub.textContent='Prototype structural checks are clear. No claim has been transmitted.'}
  else{icon.classList.add('neutral');icon.textContent='•';title.textContent='Incomplete';sub.textContent=claimHasData()?'Keep building the claim, or run Review Claim to check every required field.':'Start entering the claim. Missing untouched fields stay neutral.'}
  const list=$('#editList');
  if(!f.length)list.innerHTML=`<div class="empty ${complete?'ready':''}"><strong>${complete?'No prototype edits found.':'No active issues yet.'}</strong><p>${complete?'Local structural checks passed. This does not guarantee payer acceptance or payment.':'Untouched required fields remain neutral until you work in them or run Review Claim.'}</p></div>`;
  else list.innerHTML=f.map((x,i)=>`<button class="finding ${x.severity}" type="button" data-finding="${i}" ${x.target?'data-target="'+esc(x.target)+'"':''}><div class="fhead"><span class="badge ${x.severity}">${x.severity==='block'?'MUST FIX':x.severity==='warn'?'REVIEW':'INFO'}</span><strong>${esc(x.title)}</strong></div><p>${esc(x.message)}</p><div class="fix"><b>Next</b>${esc(x.fix)}</div><div class="source"><span>${esc(x.source)}</span></div></button>`).join('');
  $$('#editList [data-target]').forEach(btn=>btn.onclick=()=>jumpTo(btn.dataset.target));
  $('#lineCount').textContent=`${lines.length} service line${lines.length===1?'':'s'}`;$('#total').textContent='$'+lines.reduce((s,x)=>s+(Number(x.charge)||0),0).toFixed(2);
  updateProgress(f,complete);
}

function updateProgress(f,complete){
  const contextMissing=['payer','member','dos','first','last','dob','pos','npi'].filter(id=>!$('#'+id).value.trim()).length;
  $('#contextProgress').textContent=contextMissing?`${8-contextMissing}/8 entered`:'Complete';
  $('#diagnosisProgress').textContent=activeDiagnoses().length?`${activeDiagnoses().length} diagnosis${activeDiagnoses().length===1?'':'es'}`:'Not started';
  const incomplete=lines.filter(l=>!normalize(l.code)||!(Number(l.charge)>0)||!String(l.dx).trim()).length;
  $('#serviceProgress').textContent=incomplete?`${incomplete} incomplete line${incomplete===1?'':'s'}`:`${lines.length} complete line${lines.length===1?'':'s'}`;
  const steps=$$('.progress-step');steps.forEach(s=>s.classList.remove('complete','attention'));
  if(!contextMissing)steps[0].classList.add('complete');
  if(activeDiagnoses().length)steps[1].classList.add('complete');
  if(!incomplete&&lines.length)steps[2].classList.add('complete');
  if(f.some(x=>['payer','member','dos','first','last','dob','pos','npi'].includes(x.fieldKey)&&x.severity==='block'))steps[0].classList.add('attention');
  if(f.some(x=>String(x.fieldKey).startsWith('dx')&&x.severity==='block'))steps[1].classList.add('attention');
  if(f.some(x=>x.lineId&&x.severity==='block'))steps[2].classList.add('attention');
}

function jumpTo(targetId){
  const el=$('#'+CSS.escape(targetId));if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>{if(typeof el.focus==='function')el.focus({preventScroll:true});(el.closest('.field,.diag')||el).classList.add('flash');setTimeout(()=> (el.closest('.field,.diag')||el).classList.remove('flash'),1000)},350);
}

function reviewClaim(){
  reviewed=true;const f=scrub();const blockers=f.filter(x=>x.severity==='block').length,warnings=f.filter(x=>x.severity==='warn').length;
  $('#message').textContent=blockers?`Review complete: ${blockers} item${blockers===1?'':'s'} must be fixed.`:warnings?`Review complete: no blockers; ${warnings} warning${warnings===1?'':'s'} remain.`:'Review complete: prototype structural checks are clear.';
  const first=f.find(x=>x.severity==='block'&&x.target)||f.find(x=>x.severity==='warn'&&x.target);if(first)jumpTo(first.target);
}

function demo(){
  const values={payer:'Demo Health Plan',member:'DEMO-48291',first:'Jordan',last:'Sample',dob:'1988-04-12',dos:'2026-08-18',pos:'11',npi:'1234567893'};Object.entries(values).forEach(([id,v])=>{$('#'+id).value=v;touched.add(id)});
  const dx=$$('.dxcode');dx[0].value='Z00.00';dx[1].value='R51.9';dx.slice(2).forEach(x=>x.value='');touched.add('dx1');touched.add('dx2');
  lines=[mkLine({code:'TEST1',dx:'1',charge:145}),mkLine({code:'TEST2',dx:'1',charge:80}),mkLine({code:'TEST3',units:4,dx:'2',charge:55}),mkLine({code:'TEST4',dx:'2',charge:40})];reviewed=true;renderLines();$('#message').textContent='Problem demo loaded — synthetic rules only, not real coding guidance.';
}

function reset(){
  reviewed=false;touched.clear();$$('input').forEach(x=>x.value='');lines=[mkLine()];renderLines();$('#message').textContent='New blank claim started. Nothing is saved or transmitted.';
}

$('#addLine').onclick=()=>{lines.push(mkLine());renderLines();setTimeout(()=>jumpTo(`line-${lines.at(-1).id}-code`),50)};
$('#loadDemo').onclick=demo;$('#reset').onclick=reset;$('#review').onclick=reviewClaim;$('#reviewTop').onclick=reviewClaim;
$$('.live').forEach(input=>input.addEventListener('input',()=>{
  const id=input.id||'';if(id)touched.add(id);else if(input.classList.contains('dxcode'))touched.add(`dx${$$('.dxcode').indexOf(input)+1}`);
  if(input.classList.contains('dxcode'))input.value=input.value.toUpperCase();
  if(input.id==='pos')input.value=input.value.replace(/\D/g,'').slice(0,2);
  if(input.id==='npi')input.value=input.value.replace(/\D/g,'').slice(0,10);
  scrub();
}));
$$('.progress-step').forEach(btn=>btn.onclick=()=>$('#'+btn.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'}));
document.addEventListener('keydown',e=>{if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();$('#addLine').click()}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();reviewClaim()}});
lines=[mkLine()];renderLines();