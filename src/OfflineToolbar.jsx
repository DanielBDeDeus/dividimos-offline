import { useState } from 'react';
export default function OfflineToolbar() {
  const [message, setMessage] = useState('');
  if (!window.dividimos) return null;
  const exportBackup = async () => {
    try { const r = await window.dividimos.exportBackup(); if (r?.saved) setMessage('Backup exportado.'); }
    catch (e) { setMessage(`Falha: ${e.message}`); }
  };
  const importBackup = async () => {
    try { const r = await window.dividimos.importBackup(); if (r?.restored) window.location.reload(); }
    catch (e) { setMessage(`Falha: ${e.message}`); }
  };
  return <div style={{position:'fixed',bottom:12,right:12,zIndex:9999,display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:12,background:'#142032',color:'#fff',boxShadow:'0 4px 20px #0006',fontSize:12}}>
    <span title="Funciona sem internet">● Offline</span>
    <button type="button" onClick={exportBackup}>Exportar backup</button>
    <button type="button" onClick={importBackup}>Importar backup</button>
    {message && <span role="status">{message}</span>}
  </div>;
}
