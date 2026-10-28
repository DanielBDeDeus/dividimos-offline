import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'material-symbols/outlined.css';
import './index.css';
import App from './App.jsx';
import OfflineToolbar from './OfflineToolbar.jsx';
import { loadStateFromLocal, installLocalAutosave } from './utils/cloudState.js';

async function start() {
  try {
    await loadStateFromLocal(); // Hydrate before React reads localStorage.
    installLocalAutosave();
  } catch (e) {
    console.error('Falha ao carregar banco SQLite local:', e);
    // Critical: don't render empty app and accidentally overwrite saved records.
    document.getElementById('root').textContent = 'Falha ao carregar dados locais. Nenhuma informacao foi alterada. ' + e.message;
    return;
  }
  createRoot(document.getElementById('root')).render(<StrictMode><App/><OfflineToolbar/></StrictMode>);
}
start();
