import { useState } from 'react';
import { formatarBRL, lerValorBRL, hojeISO, paraNumero } from './utils/finance';

export default function PessoasPage({ pessoas, contas, onCreate, onExpense, onAdjust, onRemove, onTheme, temas }) {
  const [nome, setNome] = useState('');
  const [saldo, setSaldo] = useState('');
  const [salario, setSalario] = useState('');
  const [irregular, setIrregular] = useState(false);
  const [recebimento, setRecebimento] = useState('');
  const [erro, setErro] = useState('');
  const [pessoaAjuste, setPessoaAjuste] = useState(null);
  const [valorAjuste, setValorAjuste] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erroAjuste, setErroAjuste] = useState('');
  const [erroLista, setErroLista] = useState('');

  function criar(event) {
    event.preventDefault();
    const saldoInicial = saldo.trim() ? lerValorBRL(saldo) : 0;
    const renda = salario.trim() ? lerValorBRL(salario) : 0;
    if (!nome.trim() || saldoInicial === null || renda === null || (irregular && !recebimento)) {
      setErro('Confira o nome, os valores em reais e a data de recebimento.');
      return;
    }
    onCreate({
      id: Date.now(),
      nome: nome.trim(),
      saldo: saldoInicial,
      salario: renda,
      saldoInicialIndependente: true,
      tema: 'cassette_neon',
      pagamentoIrregular: irregular,
      dataPagamentoOverride: irregular ? recebimento : null,
    });
    setNome(''); setSaldo(''); setSalario(''); setIrregular(false); setRecebimento(''); setErro('');
  }

  function abrirAjuste(id) {
    setPessoaAjuste(id); setValorAjuste(''); setMotivo(''); setErroAjuste('');
  }

  function ajustar(event, pessoa) {
    event.preventDefault();
    const valor = lerValorBRL(valorAjuste);
    if (!valor) {
      setErroAjuste('Informe um valor maior que zero.');
      return;
    }
    const sinal = event.nativeEvent.submitter?.value === 'remover' ? -1 : 1;
    if (onAdjust(pessoa.id, sinal * valor, motivo)) abrirAjuste(null);
  }

  return <div className="workspace-columns">
    <section className="finance-panel">
      <h2>Nova pessoa</h2>
      <form className="finance-form" onSubmit={criar}>
        <label>Nome<input value={nome} onChange={event => setNome(event.target.value)} required /></label>
        <label>Saldo inicial (R$)<input inputMode="decimal" placeholder="0,00" value={saldo} onChange={event => setSaldo(event.target.value)} /></label>
        <label>Salário mensal (R$)<input inputMode="decimal" placeholder="Opcional" value={salario} onChange={event => setSalario(event.target.value)} /></label>
        <p className="finance-callout">Informe o dinheiro que a pessoa já tem. O salário é uma referência. Quando receber, registre a entrada em Ajustar saldo.</p>
        <label className="checkbox"><input type="checkbox" checked={irregular} onChange={event => setIrregular(event.target.checked)} /> Recebimento irregular este mês</label>
        {irregular && <label>Data prevista de recebimento<input type="date" value={recebimento} onChange={event => setRecebimento(event.target.value)} required /></label>}
        {erro && <p className="finance-error" role="alert">{erro}</p>}
        <div><button type="submit" className="finance-button primary">Adicionar pessoa</button></div>
      </form>
    </section>
    <section className="finance-panel">
      <h2>Pessoas cadastradas</h2>
      {erroLista && <p className="finance-error" role="alert">{erroLista}</p>}
      {!pessoas.length && <p>Crie seu perfil para registrar o primeiro gasto.</p>}
      <ul className="finance-list">
        {pessoas.map(pessoa => {
          const pendentes = contas.filter(conta => conta.quemPagouId === pessoa.id && !conta.pago);
          const proxima = [...pendentes].sort((a, b) => dataOrdem(a.dataVencimento).localeCompare(dataOrdem(b.dataVencimento)))[0];
          const previsto = pessoa.pagamentoIrregular && pessoa.dataPagamentoOverride > hojeISO();
          const saldoAtual = paraNumero(pessoa.saldo) -
            (previsto && !pessoa.saldoInicialIndependente ? paraNumero(pessoa.salario) : 0);
          return <li key={pessoa.id} className="person-list">
            <div className="finance-item">
              <div><strong>{pessoa.nome}</strong><p>Salário mensal {formatarBRL(pessoa.salario)}{previsto && ` · previsto para ${pessoa.dataPagamentoOverride.split('-').reverse().join('/')}`}</p>
                <p>{pendentes.length} {pendentes.length === 1 ? 'conta pendente' : 'contas pendentes'}{proxima && ` · Próxima: ${proxima.nome}, ${proxima.dataVencimento}`}</p>
              </div>
              <div><span className="finance-amount">{formatarBRL(saldoAtual)}</span><br /><small>Saldo atual</small></div>
            </div>
            {pessoaAjuste === pessoa.id ? <form className="finance-form" onSubmit={event => ajustar(event, pessoa)}
              onKeyDown={event => { if (event.key === 'Escape') abrirAjuste(null); }}>
              <div className="finance-row">
                <label>Valor do ajuste (R$)<input inputMode="decimal" value={valorAjuste} onChange={event => setValorAjuste(event.target.value)} required /></label>
                <label>Motivo (opcional)<input value={motivo} onChange={event => setMotivo(event.target.value)} /></label>
              </div>
              <div className="finance-row">
                <button className="finance-button primary" type="submit" value="adicionar">Adicionar ao saldo</button>
                <button className="finance-button" type="submit" value="remover">Remover do saldo</button>
                <button className="finance-button" type="button" onClick={() => abrirAjuste(null)}>Cancelar</button>
              </div>
              {erroAjuste && <p className="finance-error" role="alert">{erroAjuste}</p>}
            </form> : <div className="finance-row">
              <button className="finance-button" type="button" onClick={() => abrirAjuste(pessoa.id)}>Ajustar saldo<span className="sr-only"> de {pessoa.nome}</span></button>
              <button type="button" className="finance-button" onClick={() => onExpense(pessoa)}>Registrar gasto</button>
              <button className="finance-button danger" type="button" onClick={() => setErroLista(onRemove(pessoa))}>Excluir<span className="sr-only"> {pessoa.nome}</span></button>
            </div>}
            <details><summary>Tema do perfil</summary>
              <label>Tema de {pessoa.nome}
                <select value={Object.hasOwn(temas, pessoa.tema) ? pessoa.tema : 'cassette_neon'} onChange={event => onTheme(pessoa.id, event.target.value)}>
                  {Object.entries(temas).map(([id, tema]) => <option key={id} value={id}>{tema.label}</option>)}
                </select>
              </label>
            </details>
          </li>;
        })}
      </ul>
    </section>
  </div>;
}

function dataOrdem(data) {
  return String(data || '').split('/').reverse().join('-');
}
