// Formata valores em reais (R$) sempre com centavos
export function formatarBRL(valor) {
  const numeroSeguro = paraNumero(valor);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeroSeguro);
}

// Converte qualquer valor para número seguro (suporte completo pt-BR)
export function paraNumero(valor) {
  if (typeof valor === "number") return valor;

  if (!valor) return 0;

  let normalizado = String(valor).trim();

  // Remove espaços
  normalizado = normalizado.replace(/\s/g, "");

// Remove separadores de milhar apenas quando há vírgula (formato BR)
if (normalizado.includes(",")) {
  normalizado = normalizado.replace(/\./g, "");
}

  // Converte vírgula decimal brasileira para ponto
  normalizado = normalizado.replace(",", ".");

  // Remove qualquer caractere inválido (mantém só números e ponto)
  normalizado = normalizado.replace(/[^0-9.]/g, "");

  const numero = Number(normalizado);

  return Number.isNaN(numero) ? 0 : numero;
}

// Retorna a data de hoje no formato YYYY-MM-DD
export function hojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Extrai o mês no formato YYYY-MM
export function obterAnoMes(data) {
  return data?.slice(0, 7) || "";
}

// Extrai o dia do mês (número)
export function obterDiaDoMes(data) {
  return Number(data?.slice(8, 10) || 0);
}

// Define se o gasto entra na fatura atual ou próxima
export function classificarGastoCredito(dataGasto, diaFechamento) {
  return obterDiaDoMes(dataGasto) <= Number(diaFechamento)
    ? "atual"
    : "proxima";
}

// Calcula saldo disponível
export function calcularSaldoDisponivel(salario, gastoDebito, faturaAtual) {
  return (
    paraNumero(salario) -
    paraNumero(gastoDebito) -
    paraNumero(faturaAtual)
  );
}
// Apenas gastos de crédito pertencem à fatura. Ajustes de saldo nunca são crédito.
export function gastoEntraNaFaturaDoCiclo(gasto, cartoes, mesSelecionado, anoSelecionado) {
  if (!gasto || gasto.tipo !== "credito") return false;

  // Lançamentos legados de crédito sem data continuam visíveis.
  if (!gasto.data) return true;

  const cartao = cartoes.find(
    (c) => c.tipo === "credito" && c.nome === gasto.cartaoNome
  );
  if (!cartao || !cartao.diaFechamento) return false;

  const dataGasto = new Date(gasto.data);
  const ano = Number(anoSelecionado);
  const mes = Number(mesSelecionado);
  const fechamentoAtual = new Date(ano, mes - 1, cartao.diaFechamento);
  const fechamentoAnterior = new Date(ano, mes - 2, cartao.diaFechamento);

  return dataGasto > fechamentoAnterior && dataGasto <= fechamentoAtual;
}
