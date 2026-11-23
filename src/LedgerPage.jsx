import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatarBRL } from './utils/finance';
import { tipos } from './utils/lancamentos';

function dataHora(iso) {
  const data = new Date(iso);
  return iso && Number.isFinite(data.getTime()) ? data.toLocaleString('pt-BR') : 'Sem data';
}

export default function LedgerPage({ transacoes, gastos, pessoas }) {
  const [busca, setBusca] = useState('');
  const [pessoa, setPessoa] = useState('');
  const [tipo, setTipo] = useState('');
  const [mes, setMes] = useState('');
  const [ordem, setOrdem] = useState('desc');

  const ids = new Set(transacoes.map(item => item.gastoId).filter(id => id != null));
  const legados = gastos.filter(gasto => !ids.has(gasto.id) && !transacoes.some(item =>
    item.gastoId == null && item.pessoaId === gasto.pessoaId && item.tipo === gasto.tipo &&
    (item.id === gasto.id || item.id === gasto.id + 1) && item.nome === gasto.nome));
  const registros = [...transacoes, ...legados];
  const pessoasNoHistorico = new Map(pessoas.map(item => [String(item.id), item.nome]));
  for (const item of registros) {
    if (item.pessoaId != null && !pessoasNoHistorico.has(String(item.pessoaId))) {
      pessoasNoHistorico.set(String(item.pessoaId), item.pessoaNome || 'Pessoa removida');
    }
  }
  const lista = registros.filter(item => {
    const data = item.data ? new Date(item.data) : null;
    const mesItem = data && Number.isFinite(data.getTime())
      ? `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}` : '';
    const texto = [item.nome, item.pessoaNome, item.cartaoFaturaNome, item.cartaoNome, item.observacao].join(' ').toLocaleLowerCase('pt-BR');
    return (!busca || texto.includes(busca.trim().toLocaleLowerCase('pt-BR'))) &&
      (!pessoa || pessoa === String(item.pessoaId)) &&
      (!tipo || tipo === item.tipo) && (!mes || mes === mesItem);
  }).sort((a, b) => ((Date.parse(b.data) || 0) - (Date.parse(a.data) || 0)) * (ordem === 'desc' ? 1 : -1));

  function limpar() {
    setBusca(''); setPessoa(''); setTipo(''); setMes(''); setOrdem('desc');
  }

  return <section className="finance-panel" aria-label="Movimentações financeiras">
    <div className="workspace-filters">
      <label>Buscar<input type="search" placeholder="Descrição, pessoa ou cartão" value={busca} onChange={e => setBusca(e.target.value)} /></label>
      <label>Pessoa<select value={pessoa} onChange={e => setPessoa(e.target.value)}>
        <option value="">Todas</option>
        {[...pessoasNoHistorico].map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
      </select></label>
      <label>Tipo<select value={tipo} onChange={e => setTipo(e.target.value)}>
        <option value="">Todos</option>
        {Object.entries(tipos).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
      </select></label>
      <label>Mês<input type="month" value={mes} onChange={e => setMes(e.target.value)} /></label>
      <label>Ordem<select value={ordem} onChange={e => setOrdem(e.target.value)}>
        <option value="desc">Mais recentes</option><option value="asc">Mais antigas</option>
      </select></label>
      <button className="finance-button" onClick={limpar}>Limpar filtros</button>
    </div>
    {!lista.length ? (registros.length ? <p>Nenhuma movimentação corresponde aos filtros.</p> :
      <p>Nenhuma movimentação registrada. <Link className="finance-button" to="/gastos">Registrar gasto</Link></p>) :
      <table className="finance-table">
        <caption className="sr-only">Histórico de movimentações</caption>
        <thead><tr><th scope="col">Descrição</th><th scope="col">Pessoa</th><th scope="col">Data</th><th scope="col">Valor</th></tr></thead>
        <tbody>{lista.map(item => <tr key={`${item.gastoId ?? item.id}-${item.origem ?? 'legado'}`}>
          <td><strong>{item.nome}</strong><br /><span className="muted">{item.origem === 'ajuste_manual' ? 'Ajuste de saldo' : tipos[item.tipo] ?? item.tipo}{item.cartaoFaturaNome && ` · ${item.cartaoFaturaNome}`}</span></td>
          <td>{item.pessoaNome || '—'}</td><td>{dataHora(item.data)}</td><td className="finance-amount">{formatarBRL(item.valor)}</td>
        </tr>)}</tbody>
      </table>}
  </section>;
}
