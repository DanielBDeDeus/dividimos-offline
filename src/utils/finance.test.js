import { describe, it, expect } from "vitest";
import {
  paraNumero,
  classificarGastoCredito,
  calcularSaldoDisponivel,
  obterAnoMes,
  gastoEntraNaFaturaDoCiclo,
} from "./finance";

describe("funções financeiras", () => {
  it("converte texto numérico em número", () => {
    expect(paraNumero("123.45")).toBe(123.45);
  });

  it("retorna 0 para valor inválido", () => {
    expect(paraNumero("abc")).toBe(0);
  });

  it("classifica gasto antes ou no dia do fechamento como fatura atual", () => {
    expect(classificarGastoCredito("2026-04-10", 10)).toBe("atual");
    expect(classificarGastoCredito("2026-04-08", 10)).toBe("atual");
  });

  it("classifica gasto depois do fechamento como próxima fatura", () => {
    expect(classificarGastoCredito("2026-04-11", 10)).toBe("proxima");
  });

  it("calcula saldo disponível corretamente", () => {
    expect(calcularSaldoDisponivel(3500, 500, 1000)).toBe(2000);
  });

  it("extrai ano e mês corretamente", () => {
    expect(obterAnoMes("2026-04-06")).toBe("2026-04");
  });
});

describe("separação de gastos debitados e faturas de crédito", () => {
  const cartoes = [{ nome: "Cartão crédito", tipo: "credito", diaFechamento: 15 }];

  it("nunca conta ajuste manual de débito sem data como crédito", () => {
    const ajuste = { nome: "Compra", tipo: "debito", origem: "ajuste_manual", valor: 25 };
    expect(gastoEntraNaFaturaDoCiclo(ajuste, cartoes, "11", "2026")).toBe(false);
  });

  it("exclui outros movimentos que não são de crédito", () => {
    for (const tipo of ["entrada", "debito", "pagamento_fatura"]) {
      expect(gastoEntraNaFaturaDoCiclo({ tipo, data: "2026-11-05T12:00:00", cartaoNome: "Cartão crédito" }, cartoes, "11", "2026")).toBe(false);
    }
  });

  it("mantém compras reais de crédito dentro do seu ciclo", () => {
    const credito = { tipo: "credito", data: "2026-11-05T12:00:00", cartaoNome: "Cartão crédito" };
    expect(gastoEntraNaFaturaDoCiclo(credito, cartoes, "11", "2026")).toBe(true);
    expect(gastoEntraNaFaturaDoCiclo({ ...credito, data: "2026-10-01T12:00:00" }, cartoes, "11", "2026")).toBe(false);
  });
});
