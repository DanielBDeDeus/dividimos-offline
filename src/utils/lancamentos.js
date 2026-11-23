import { arredondarBRL, paraNumero } from './finance';

export const formasDePagamento = {
  saldo: 'Dinheiro, saldo ou Pix',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito',
  pagamento_fatura: 'Pagamento de fatura',
};

export function cartaoDoGasto(gasto, cartoes) {
  const pagamento = gasto.tipo === 'pagamento_fatura';
  const id = pagamento ? gasto.cartaoFaturaId : gasto.cartaoId;
  if (id != null) return cartoes.find(cartao => cartao.id === id);
  const nome = pagamento ? gasto.cartaoFaturaNome : gasto.cartaoNome;
  const tipo = pagamento ? 'credito' : gasto.tipo;
  const candidatos = cartoes.filter(cartao => cartao.nome === nome && cartao.tipo === tipo);
  return candidatos.length === 1 ? candidatos[0] : undefined;
}

function ajustarSaldos({ pessoas, cartoes }, gasto, sinal) {
  const valor = arredondarBRL(paraNumero(gasto.valor) * sinal);
  const pagamento = gasto.tipo === 'pagamento_fatura';
  if (gasto.tipo === 'credito' || pagamento) {
    const cartao = cartaoDoGasto(gasto, cartoes);
    if (!cartao) throw new Error('O cartão associado a este lançamento não está disponível.');
    const utilizado = arredondarBRL(paraNumero(cartao.limiteUsado) + (pagamento ? -valor : valor));
    if (utilizado < 0) {
      throw new Error(pagamento && sinal > 0
        ? 'O pagamento excede a fatura em aberto.'
        : 'Parte desta compra já pode ter sido paga. Confira os pagamentos antes de alterá-la.');
    }
    cartoes = cartoes.map(item => item.id === cartao.id ? { ...item, limiteUsado: utilizado } : item);
  }

  if (gasto.tipo !== 'credito') {
    const delta = gasto.tipo === 'entrada' ? valor : -valor;
    pessoas = pessoas.map(pessoa => pessoa.id === gasto.pessoaId
      ? { ...pessoa, saldo: arredondarBRL(paraNumero(pessoa.saldo) + delta) }
      : pessoa);
  }
  return { pessoas, cartoes };
}

function transacaoCorrespondente(gasto, transacoes) {
  const vinculadas = transacoes.filter(transacao => transacao.gastoId === gasto.id);
  if (vinculadas.length) return vinculadas[0];
  const legadas = transacoes.filter(transacao => transacao.gastoId == null &&
    transacao.tipo === gasto.tipo && transacao.pessoaId === gasto.pessoaId &&
    transacao.nome === gasto.nome && paraNumero(transacao.valor) === paraNumero(gasto.valor) &&
    (transacao.id === gasto.id || transacao.id === gasto.id + 1 ||
      (gasto.data && transacao.data === gasto.data)));
  return legadas.length === 1 ? legadas[0] : undefined;
}

export function atualizarLancamento(estado, anterior, novo) {
  const { gastos, transacoes } = estado;
  let saldos = { pessoas: estado.pessoas, cartoes: estado.cartoes };
  // Combine the delta when a credit purchase remains on the same card.
  const cartaoAnterior = anterior && cartaoDoGasto(anterior, estado.cartoes);
  const mesmoCredito = anterior?.tipo === 'credito' && novo?.tipo === 'credito' &&
    cartaoAnterior && cartaoAnterior.id === cartaoDoGasto(novo, estado.cartoes)?.id;
  if (mesmoCredito) {
    saldos = ajustarSaldos(saldos, { ...novo, valor: novo.valor - paraNumero(anterior.valor) }, 1);
  } else {
    if (anterior) saldos = ajustarSaldos(saldos, anterior, -1);
    if (novo) saldos = ajustarSaldos(saldos, novo, 1);
  }

  const registro = anterior && transacaoCorrespondente(anterior, transacoes);
  const historico = transacoes.filter(transacao => transacao !== registro);
  const lista = anterior ? gastos.filter(gasto => gasto.id !== anterior.id) : gastos;
  if (!novo) return { ...saldos, gastos: lista, transacoes: historico };

  const transacao = {
    ...novo,
    id: registro?.id ?? novo.id,
    gastoId: novo.id,
    origem: novo.origem || 'gasto',
    observacao: novo.observacao || '',
  };
  return { ...saldos, gastos: [...lista, novo], transacoes: [transacao, ...historico] };
}

export const tipos = {
  debito: 'Débito',
  credito: 'Crédito',
  entrada: 'Entrada',
  conta_paga: 'Conta paga',
  pagamento_fatura: 'Pagamento de fatura',
};

