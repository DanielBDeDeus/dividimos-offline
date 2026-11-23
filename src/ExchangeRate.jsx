import { useEffect, useState } from 'react';
import { lerValorBRL } from './utils/finance';

const formatRate = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4,
});

export default function ExchangeRate() {
  const desktop = window.dividimos;
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    desktop?.readFx?.().then(value => { if (active) setQuote(value); })
      .catch(() => { if (active) setMessage('Não foi possível ler a cotação salva.'); });
    return () => { active = false; };
  }, [desktop]);

  async function update(operation) {
    setBusy(true);
    setMessage('');
    try {
      setQuote(await operation());
      setMessage('Cotação salva neste dispositivo.');
    } catch {
      setMessage('Não foi possível atualizar a cotação. Confira a conexão ou informe um valor manual.');
    } finally {
      setBusy(false);
    }
  }

  function saveManual(event) {
    event.preventDefault();
    const value = lerValorBRL(manual, 4);
    if (!value || value >= 1000000) {
      setMessage('Informe um valor válido, por exemplo 5,4321.');
      return;
    }
    update(async () => {
      const next = await desktop.saveManualFx(value);
      setManual('');
      return next;
    });
  }

  return <section className="finance-panel" aria-labelledby="fx-title">
    <h2 id="fx-title">Cotação do dólar</h2>
    {quote ? <>
      <p className="fx-rate">US$ 1 = {formatRate.format(quote.rate)}</p>
      <p>{quote.source === 'manual' ? 'Cotação manual' : 'Última cotação salva · PTAX venda (Banco Central)'} · {quote.date.split('-').reverse().join('/')}{quote.stale && ' · Desatualizada'}</p>
    </> : <p>Cotação ainda não disponível.</p>}
    <p className="muted">Referência em reais. A PTAX é publicada em dias úteis e pode diferir da taxa do cartão.</p>
    {desktop?.refreshFx ? <>
      <button type="button" className="finance-button" disabled={busy} onClick={() => update(() => desktop.refreshFx())}>
        {busy ? 'Atualizando…' : 'Atualizar cotação'}
      </button>
      <p className="muted fx-consent">A consulta conecta ao Banco Central e envia somente o período consultado.</p>
      <details>
        <summary>Informar cotação manual</summary>
        <form onSubmit={saveManual} className="finance-form">
          <label>Reais por dólar<input inputMode="decimal" placeholder="5,4321" value={manual} onChange={event => setManual(event.target.value)} /></label>
          <button type="submit" className="finance-button" disabled={busy}>Salvar cotação manual</button>
        </form>
      </details>
    </> : <p>Consulta e armazenamento disponíveis no aplicativo desktop.</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
