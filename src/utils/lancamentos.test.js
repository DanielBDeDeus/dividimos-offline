import { describe, expect, it } from 'vitest';
import { atualizarLancamento } from './lancamentos';
import { lerValorBRL, gastoEntraNaFaturaDoCiclo } from './finance';

const hoje = new Date(2026, 10, 30, 15).toISOString();
const pessoa = { id: 1, nome: 'Ana', saldo: 1000 };
const cartao = { id: 10, nome: 'Banco Teste', tipo: 'credito', pessoaId: 1, limiteUsado: 0, diaFechamento: 31 };
const iniciar = () => ({ pessoas: [pessoa, { id: 2, saldo: 700 }], cartoes: [cartao], gastos: [], transacoes: [] });
const gasto = (pagamento = {}) => ({ id: 'teste', pessoaId: 1, nome: 'Mercado', data: hoje, tipo: 'debito', valor: 50, ...pagamento });

describe('lançamentos em reais', () => {
  it('interpreta formato brasileiro sem converter sinal ou entrada incompleta em outro valor', () => {
    expect(lerValorBRL('R$ 1.234,56')).toBe(1234.56);
    expect(lerValorBRL('1.000')).toBe(1000);
    expect(lerValorBRL('50,2')).toBe(50.2);
    for (const entrada of ['-50', '50.25', '1,234', 'x50', '1,2,3']) {
      expect(lerValorBRL(entrada)).toBeNull();
    }
  });

  it('cria, edita e exclui débito sem cartão com o mesmo vínculo no histórico', () => {
    const antigo = gasto();
    const novo = gasto({ pessoaId: 2, valor: 60 });
    let estado = atualizarLancamento(iniciar(), null, antigo);
    expect(estado.pessoas.map(item => item.saldo)).toEqual([950, 700]);
    estado = atualizarLancamento(estado, antigo, novo);
    expect(estado.pessoas.map(item => item.saldo)).toEqual([1000, 640]);
    expect(estado.transacoes).toEqual([expect.objectContaining({ gastoId: antigo.id, valor: 60, pessoaId: 2 })]);
    estado = atualizarLancamento(estado, novo, null);
    expect(estado.pessoas.map(item => item.saldo)).toEqual([1000, 700]);
    expect(estado.transacoes).toEqual([]);
  });

  it('compra no crédito, paga parcialmente, edita a compra e reverte o pagamento uma vez', () => {
    const compra = gasto({ tipo: 'credito', cartaoId: 10, valor: 120 });
    const pagamento = gasto({ id: 'pagamento', tipo: 'pagamento_fatura', cartaoFaturaId: 10, valor: 90 });
    let estado = atualizarLancamento(iniciar(), null, compra);
    expect(estado.pessoas[0].saldo).toBe(1000);
    expect(estado.cartoes[0].limiteUsado).toBe(120);
    estado = atualizarLancamento(estado, null, pagamento);
    expect(estado.pessoas[0].saldo).toBe(910);
    expect(estado.cartoes[0].limiteUsado).toBe(30);
    expect(() => atualizarLancamento(estado, null, { ...pagamento, valor: 31 })).toThrow(/excede/);
    const editado = { ...compra, valor: 125 };
    estado = atualizarLancamento(estado, compra, editado);
    expect(estado.cartoes[0].limiteUsado).toBe(35);
    expect(estado.transacoes).toHaveLength(2);
    estado = atualizarLancamento(estado, pagamento, null);
    expect(estado.pessoas[0].saldo).toBe(1000);
    expect(estado.cartoes[0].limiteUsado).toBe(125);
    estado = atualizarLancamento(estado, editado, null);
    expect(estado.cartoes[0].limiteUsado).toBe(0);
    expect(estado.transacoes).toEqual([]);
  });

  it('respeita o dia inteiro do fechamento e limita o dia 31 ao último dia do mês', () => {
    const compra = gasto({ tipo: 'credito', cartaoId: 10 });
    expect(gastoEntraNaFaturaDoCiclo(compra, [cartao], '11', '2026')).toBe(true);
    expect(gastoEntraNaFaturaDoCiclo(compra, [cartao], '12', '2026')).toBe(false);
    expect(gastoEntraNaFaturaDoCiclo(gasto({ origem: 'ajuste_manual', data: undefined }), [cartao], '11', '2026')).toBe(false);
  });

  it('remove do histórico uma saída manual legada quando o vínculo é inequívoco', () => {
    const ajuste = gasto({ id: 200, origem: 'ajuste_manual', data: undefined, valor: 25 });
    const estado = { ...iniciar(), pessoas: [{ ...pessoa, saldo: 975 }], gastos: [ajuste], transacoes: [
      { ...ajuste, data: hoje },
      { ...ajuste, id: 201, nome: 'Outro ajuste', data: hoje },
    ] };
    const resultado = atualizarLancamento(estado, ajuste, null);
    expect(resultado.pessoas[0].saldo).toBe(1000);
    expect(resultado.transacoes.map(t => t.id)).toEqual([201]);
  });
});
