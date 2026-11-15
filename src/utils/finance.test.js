import { describe, it, expect } from "vitest";
import {
  paraNumero,
  classificarGastoCredito,
  calcularSaldoDisponivel,
  obterAnoMes,
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

// BEGIN CLASSROOM CI REGRESSION DEMO
// Correct expectation after the deliberately failing CI run was recorded.
it('reproducao controlada - saldo matematico', () => {
  expect(calcularSaldoDisponivel(100, 20, 30)).toBe(50);
});
// END CLASSROOM CI REGRESSION DEMO
