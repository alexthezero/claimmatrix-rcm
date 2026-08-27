import { useMemo, useState } from 'react';
import type { ClaimDraft, ClaimHeader, ClaimLine, Diagnosis, Finding, Severity } from './domain/types';
import { scrubClaim } from './engine/scrubber';

const emptyLine = (): ClaimLine => ({
  id: crypto.randomUUID(),
  procedureCode: '',
  modifier1: '',
  modifier2: '',
  units: 1,
  diagnosisPointers: [1],
  charge: 0,
});

const initialDraft = (): ClaimDraft => ({
  header: {
    claimType: 'professional', payerName: '', memberId: '', patientFirstName: '', patientLastName: '',
    dateOfBirth: '', dateOfService: '', placeOfService: '11', billingNpi: '',
  },
  diagnoses: [{ id: 1, code: '' }, { id: 2, code: '' }, { id: 3, code: '' }, { id: 4, code: '' }],
  lines: [emptyLine()],
});

function SeverityBadge({ severity }: { severity: Severity }) {
  const label = severity === 'blocker' ? 'BLOCK' : severity.toUpperCase();
  return <span className={`severity severity-${severity}`}>{label}</span>;
}

function FindingCard({ item }: { item: Finding }) {
  return (
    <article className={`finding finding-${item.severity}`}>
      <div className="finding-heading"><SeverityBadge severity={item.severity} /><strong>{item.title}</strong></div>
      <p>{item.message}</p>
      <div className="correction"><span>Fix</span>{item.correction}</div>
      <div className="provenance">
        <span>{item.source.authority}</span><span>{item.source.title}</span>{item.source.version && <span>{item.source.version}</span>}
      </div>
    </article>
  );
}

function App() {
  const [draft, setDraft] = useState<ClaimDraft>(initialDraft);
  const [systemMessage, setSystemMessage] = useState('');
  const scrub = useMemo(() => scrubClaim(draft), [draft]);

  const updateHeader = <K extends keyof ClaimHeader>(key: K, value: ClaimHeader[K]) => {
    setSystemMessage('');
    setDraft((current) => ({ ...current, header: { ...current.header, [key]: value } }));
  };

  const updateDiagnosis = (id: number, code: string) => {
    setSystemMessage('');
    setDraft((current) => ({ ...current, diagnoses: current.diagnoses.map((diagnosis) => diagnosis.id === id ? { ...diagnosis, code: code.toUpperCase() } : diagnosis) }));
  };

  const updateLine = <K extends keyof ClaimLine>(id: string, key: K, value: ClaimLine[K]) => {
    setSystemMessage('');
    setDraft((current) => ({ ...current, lines: current.lines.map((line) => line.id === id ? { ...line, [key]: value } : line) }));
  };

  const loadDemo = () => {
    setDraft({
      header: {
        claimType: 'professional', payerName: 'Demo Health Plan', memberId: 'DEMO-48291', patientFirstName: 'Jordan',
        patientLastName: 'Sample', dateOfBirth: '1988-04-12', dateOfService: '2026-08-18', placeOfService: '11', billingNpi: '1234567893',
      },
      diagnoses: [{ id: 1, code: 'Z00.00' }, { id: 2, code: 'R51.9' }, { id: 3, code: '' }, { id: 4, code: '' }],
      lines: [
        { id: crypto.randomUUID(), procedureCode: 'TEST1', modifier1: '', modifier2: '', units: 1, diagnosisPointers: [1], charge: 145 },
        { id: crypto.randomUUID(), procedureCode: 'TEST2', modifier1: '', modifier2: '', units: 1, diagnosisPointers: [1], charge: 80 },
        { id: crypto.randomUUID(), procedureCode: 'TEST3', modifier1: '', modifier2: '', units: 4, diagnosisPointers: [2], charge: 55 },
        { id: crypto.randomUUID(), procedureCode: 'TEST4', modifier1: '', modifier2: '', units: 1, diagnosisPointers: [2], charge: 40 },
      ],
    });
    setSystemMessage('Problem demo loaded — these are synthetic rules, not real coding guidance.');
  };

  const resetDraft = () => { setDraft(initialDraft()); setSystemMessage('Draft cleared.'); };
  const addLine = () => setDraft((current) => ({ ...current, lines: [...current.lines, emptyLine()] }));
  const removeLine = (id: string) => setDraft((current) => ({ ...current, lines: current.lines.filter((line) => line.id !== id) }));

  const attemptSubmit = () => {
    if (!scrub.readyForSubmission) {
      setSystemMessage(`Submission blocked: resolve ${scrub.blockerCount} blocking edit${scrub.blockerCount === 1 ? '' : 's'} first.`);
      return;
    }
    setSystemMessage('Preflight passed. No EDI connector is configured, so nothing was transmitted.');
  };

  const totalCharges = draft.lines.reduce((sum, line) => sum + (Number.isFinite(line.charge) ? line.charge : 0), 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">CM</div>
          <div><h1>ClaimMatrix <span>RCM</span></h1><p>Preventable-denial interception before submission</p></div>
        </div>
        <div className="prototype-banner">PROTOTYPE · SYNTHETIC DATA ONLY</div>
      </header>

      <main className="workspace">
        <section className="editor-column">
          <div className="toolbar">
            <div><div className="eyebrow">QUICK BILL</div><h2>Build the claim once. Catch errors while you type.</h2></div>
            <div className="toolbar-actions">
              <button className="button button-secondary" onClick={loadDemo}>Load problem demo</button>
              <button className="button button-ghost" onClick={resetDraft}>Reset</button>
            </div>
          </div>

          <section className="panel claim-header-panel">
            <div className="panel-title-row">
              <div><div className="eyebrow">CLAIM CONTEXT</div><h3>Patient, payer & routing</h3></div>
              <div className="claim-type-toggle" role="group" aria-label="Claim type">
                <button className={draft.header.claimType === 'professional' ? 'active' : ''} onClick={() => updateHeader('claimType', 'professional')}>Professional</button>
                <button className={draft.header.claimType === 'institutional' ? 'active' : ''} onClick={() => updateHeader('claimType', 'institutional')}>Institutional</button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field field-span-2"><span>Payer</span><input value={draft.header.payerName} onChange={(event) => updateHeader('payerName', event.target.value)} placeholder="Search or enter payer" /></label>
              <label className="field"><span>Member ID</span><input value={draft.header.memberId} onChange={(event) => updateHeader('memberId', event.target.value)} placeholder="Member / subscriber ID" /></label>
              <label className="field"><span>Date of service</span><input type="date" value={draft.header.dateOfService} onChange={(event) => updateHeader('dateOfService', event.target.value)} /></label>
              <label className="field"><span>First name</span><input value={draft.header.patientFirstName} onChange={(event) => updateHeader('patientFirstName', event.target.value)} placeholder="First" /></label>
              <label className="field"><span>Last name</span><input value={draft.header.patientLastName} onChange={(event) => updateHeader('patientLastName', event.target.value)} placeholder="Last" /></label>
              <label className="field"><span>Date of birth</span><input type="date" value={draft.header.dateOfBirth} onChange={(event) => updateHeader('dateOfBirth', event.target.value)} /></label>
              <label className="field field-compact"><span>POS</span><input maxLength={2} value={draft.header.placeOfService} onChange={(event) => updateHeader('placeOfService', event.target.value.replace(/\D/g, '').slice(0, 2))} /></label>
              <label className="field field-span-2"><span>Billing NPI</span><input inputMode="numeric" maxLength={10} value={draft.header.billingNpi} onChange={(event) => updateHeader('billingNpi', event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit NPI" /></label>
            </div>
          </section>

          <section className="panel diagnoses-panel">
            <div className="panel-title-row">
              <div><div className="eyebrow">DIAGNOSIS MATRIX</div><h3>Diagnosis pointers</h3></div>
              <span className="microcopy">Format check only until authoritative code-set adapter is connected.</span>
            </div>
            <div className="diagnosis-grid">
              {draft.diagnoses.map((diagnosis: Diagnosis) => (
                <label className="diagnosis-field" key={diagnosis.id}>
                  <span className="diagnosis-index">{diagnosis.id}</span>
                  <input value={diagnosis.code} onChange={(event) => updateDiagnosis(diagnosis.id, event.target.value)} placeholder="ICD-10-CM" aria-label={`Diagnosis ${diagnosis.id}`} />
                </label>
              ))}
            </div>
          </section>

          <section className="panel matrix-panel">
            <div className="panel-title-row"><div><div className="eyebrow">CODING MATRIX</div><h3>Service lines</h3></div><button className="button button-secondary" onClick={addLine}>+ Add line</button></div>
            <div className="table-wrap">
              <table className="coding-table">
                <thead><tr><th>#</th><th>Procedure</th><th>Mod 1</th><th>Mod 2</th><th>Units</th><th>Dx ptr</th><th>Charge</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {draft.lines.map((line, index) => {
                    const lineFindings = scrub.findings.filter((item) => item.lineId === line.id);
                    const lineSeverity: Severity | 'clean' = lineFindings.some((item) => item.severity === 'blocker') ? 'blocker' : lineFindings.some((item) => item.severity === 'warning') ? 'warning' : lineFindings.some((item) => item.severity === 'info') ? 'info' : 'clean';
                    return (
                      <tr key={line.id} className={`line-${lineSeverity}`}>
                        <td className="line-number">{index + 1}</td>
                        <td><input className="cell-input code-input" value={line.procedureCode} onChange={(event) => updateLine(line.id, 'procedureCode', event.target.value.toUpperCase().slice(0, 5))} placeholder="Code" /></td>
                        <td><input className="cell-input short-input" value={line.modifier1} onChange={(event) => updateLine(line.id, 'modifier1', event.target.value.toUpperCase().slice(0, 2))} placeholder="--" /></td>
                        <td><input className="cell-input short-input" value={line.modifier2} onChange={(event) => updateLine(line.id, 'modifier2', event.target.value.toUpperCase().slice(0, 2))} placeholder="--" /></td>
                        <td><input className="cell-input units-input" type="number" min="1" value={line.units} onChange={(event) => updateLine(line.id, 'units', Number(event.target.value))} /></td>
                        <td><input className="cell-input pointer-input" value={line.diagnosisPointers.join(',')} onChange={(event) => updateLine(line.id, 'diagnosisPointers', event.target.value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0))} placeholder="1,2" /></td>
                        <td><div className="money-input"><span>$</span><input className="cell-input" type="number" min="0" step="0.01" value={line.charge || ''} onChange={(event) => updateLine(line.id, 'charge', Number(event.target.value))} placeholder="0.00" /></div></td>
                        <td>{lineSeverity === 'clean' ? <span className="clean-pill">CLEAN</span> : <SeverityBadge severity={lineSeverity} />}</td>
                        <td><button className="icon-button" onClick={() => removeLine(line.id)} aria-label={`Remove line ${index + 1}`}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="matrix-footer"><span>{draft.lines.length} service line{draft.lines.length === 1 ? '' : 's'}</span><strong>Total charges: ${totalCharges.toFixed(2)}</strong></div>
          </section>
        </section>

        <aside className="preflight-column">
          <div className="sticky-preflight">
            <section className="score-card">
              <div className="score-topline">
                <div><div className="eyebrow">LIVE PREFLIGHT</div><h3>Claim readiness</h3></div>
                <div className={`score-ring ${scrub.readyForSubmission ? 'score-ready' : 'score-blocked'}`}><strong>{scrub.score}</strong><span>/100</span></div>
              </div>
              <div className="metric-row"><div><strong>{scrub.blockerCount}</strong><span>Blockers</span></div><div><strong>{scrub.warningCount}</strong><span>Warnings</span></div><div><strong>{scrub.infoCount}</strong><span>Info</span></div></div>
              <div className={`submission-state ${scrub.readyForSubmission ? 'state-ready' : 'state-blocked'}`}><span className="state-dot"></span>{scrub.readyForSubmission ? 'Preflight clear' : 'Submission locked'}</div>
              <button className="button button-primary submit-button" onClick={attemptSubmit}>{scrub.readyForSubmission ? 'Mark ready for EDI' : `Resolve ${scrub.blockerCount} blocker${scrub.blockerCount === 1 ? '' : 's'}`}</button>
              {systemMessage && <p className="system-message">{systemMessage}</p>}
              <p className="safety-note">Nothing in this prototype transmits or persists patient data. Do not use real PHI.</p>
            </section>

            <section className="findings-section">
              <div className="findings-title"><h3>Edits</h3><span>{scrub.findings.length}</span></div>
              {scrub.findings.length === 0 ? <div className="empty-findings"><strong>No prototype edits found.</strong><p>This means the local structural checks passed — not that a payer will necessarily accept or pay the claim.</p></div> : <div className="findings-list">{scrub.findings.map((item) => <FindingCard key={item.id} item={item} />)}</div>}
            </section>
          </div>
        </aside>
      </main>

      <footer className="footer">ClaimMatrix RCM v0.1 · Development prototype · No CPT dataset or X12 implementation-guide content is bundled.</footer>
    </div>
  );
}

export default App;
