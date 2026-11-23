import { useState } from 'react';

export default function OfflineToolbar() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const desktop = window.dividimos;

  async function backup(importing) {
    setMessage('');
    setBusy(true);
    try {
      const result = await (importing ? desktop.importBackup() : desktop.exportBackup());
      if (result?.restored) window.location.reload();
      if (result?.saved) setMessage('Backup exportado.');
    } catch (error) {
      setMessage(`Falha no backup. ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  return <section className="finance-panel" aria-labelledby="backup-title">
    <h2 id="backup-title">Backup dos dados</h2>
    <p>Exporte uma cópia em JSON para guardar em outro local. Restaurar um backup substitui os dados financeiros atuais.</p>
    {desktop ? <div className="finance-row">
      <button className="finance-button primary" type="button" disabled={busy} onClick={() => backup(false)}>Exportar backup</button>
      <button className="finance-button" type="button" disabled={busy} onClick={() => backup(true)}>Importar backup</button>
    </div> : <p>Use o aplicativo desktop para exportar ou importar um backup SQLite.</p>}
    <p className="finance-status" role="status">{message}</p>
  </section>;
}
