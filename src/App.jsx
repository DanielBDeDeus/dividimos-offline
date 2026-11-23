import { useEffect, useMemo, useState } from "react";
import { paraNumero, gastoEntraNaFaturaDoCiclo, arredondarBRL, lerValorBRL, hojeISO } from "./utils/finance";
import { BrowserRouter, Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import PessoasPage from "./PessoasPage";
import LedgerPage from "./LedgerPage";
import { saveLocalEntries, STORAGE_KEYS } from "./utils/cloudState";
import OfflineToolbar from "./OfflineToolbar";
import ExchangeRate from "./ExchangeRate";
import { atualizarLancamento, cartaoDoGasto, formasDePagamento, tipos } from "./utils/lancamentos";
import "./Workspace.css";
import { LayoutDashboard, Users, Receipt, CreditCard, ListChecks, Settings, History, Wallet, Plus } from "lucide-react";

// ╠══════════════════════════════════════════════╣

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,

} from "recharts";

// ╠══════════════════════════════════════════════╣

const THEMES = {
  cassette_neon: { label: "Cassette Neon", accent: "#08675c" },
  vista_glass: { label: "Vista Glass", accent: "#275d80" },
  msn_bubblegum: { label: "MSN Bubblegum", accent: "#675195" },
  midnight_terminal: { label: "Midnight Terminal", accent: "#17485f" },
  household_warm: { label: "Household Warm", accent: "#8a4e27" },
};
const RESET_MESSAGES = ["Redefinir lançamentos", "Confirmar exclusão", "Excluir lançamentos agora"];

function lerTextoStorage(chave) {
  if (typeof window === "undefined") {
    return "";
  }

  const valorSalvo = window.localStorage.getItem(chave);
  return valorSalvo ?? "";
}

function lerJsonStorage(chave, valorPadrao) {
  if (typeof window === "undefined") {
    return valorPadrao;
  }

  const valorSalvo = window.localStorage.getItem(chave);

  if (!valorSalvo) {
    return valorPadrao;
  }

  try {
    return JSON.parse(valorSalvo);
  } catch {
    return valorPadrao;
  }
}

// ╠══════════════════════════════════════════════╣

function formatarMoeda(valor) {
  const numeroSeguro = paraNumero(valor);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeroSeguro);
}
function formatarDataISOParaBR(dataISO) {
  if (!dataISO) return "";

  const partes = dataISO.split("-");
  if (partes.length !== 3) return "";

  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

function parseDataBR(dataStr) {
  if (!dataStr) return null;

  const partes = dataStr.split("/");

  if (partes.length === 2) {
    // dd/mm → assume current year
    const [dia, mes] = partes;
    const ano = new Date().getFullYear();
    return new Date(`${ano}-${mes}-${dia}`);
  }

  if (partes.length === 3) {
    const [dia, mes, ano] = partes;
    return new Date(`${ano}-${mes}-${dia}`);
  }

  return null;
}

// === DATE PARSER FIX END ===

function isContaAtrasada(conta) {
  if (conta.pago) return false;

  const hoje = new Date();
  const vencimento = parseDataBR(conta.dataVencimento);

  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  return vencimento < hoje;
}

// ╠══════════════════════════════════════════════╣

// ╠══════════════════════════════════════════════╣

const paginas = [
  { path: "/", label: "Visão geral", icon: LayoutDashboard, description: "Confira seus saldos e compromissos." },
  { path: "/pessoas", label: "Pessoas", icon: Users, description: "Cadastre pessoas e gerencie seus saldos." },
  { path: "/gastos", label: "Gastos", icon: Receipt, description: "Registre compras e consulte os lançamentos do mês." },
  { path: "/cartoes", label: "Cartões e faturas", icon: CreditCard, description: "Gerencie cartões, limites e pagamentos de fatura." },
  { path: "/contas", label: "Contas", icon: ListChecks, description: "Acompanhe vencimentos e pagamentos." },
  { path: "/historico", label: "Histórico", icon: History, description: "Consulte as movimentações financeiras por pessoa, data e tipo." },
  { path: "/configuracoes", label: "Backup e ajustes", icon: Settings, description: "Proteja seus dados e consulte a cotação do dólar." },
];

function Dashboard({
  pessoas,
  setPessoas,
  contas,
  setContas,
  transacoes,
  setTransacoes,
  temaAtivo,
  perfilAtivo,
  setPerfilAtivo
}) {
const navigate = useNavigate();
const { pathname } = useLocation();
const [feedback, setFeedback] = useState(null);
const mensagem = feedback?.pagina === pathname ? feedback.texto : "";
function setMensagem(texto) {
  setFeedback({ pagina: pathname, texto });
}
const [buscaGastos, setBuscaGastos] = useState("");
const [filtroGastos, setFiltroGastos] = useState("");
const [maisAntigos, setMaisAntigos] = useState(false);

// ╠══════════════════════════════════════════════╣

const [resetEtapa, setResetEtapa] = useState(
  0
);

// ╠══════════════════════════════════════════════╣

  const [gastoDebito, setGastoDebito] = useState(() =>
    lerTextoStorage(STORAGE_KEYS.gastoDebito)
  );

  const [faturaAtual, setFaturaAtual] = useState(() =>
    lerTextoStorage(STORAGE_KEYS.faturaAtual)
  );

  const [cartoes, setCartoes] = useState(() =>
    lerJsonStorage(STORAGE_KEYS.cartoes, [])
  );
  const [pessoaCartaoSelecionada, setPessoaCartaoSelecionada] = useState("");
  const [nomeCartao, setNomeCartao] = useState("");
  const [tipoCartao, setTipoCartao] = useState("credito");
  const [diaFechamento, setDiaFechamento] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [erroCartao, setErroCartao] = useState("");
  const [limiteCartao, setLimiteCartao] = useState("");
  const [limiteUsado, setLimiteUsado] = useState("");
  const [cartaoEmEdicaoId, setCartaoEmEdicaoId] = useState(null);

  const [gastos, setGastos] = useState(() =>
    lerJsonStorage(STORAGE_KEYS.gastos, [])
  );

  const [nomeGasto, setNomeGasto] = useState("");
  const [valorGasto, setValorGasto] = useState("");
  const [cartaoSelecionado, setCartaoSelecionado] = useState("");
  const [pessoaSelecionada, setPessoaSelecionada] = useState("");
  const [gastoEmEdicaoId, setGastoEmEdicaoId] = useState(null);
  const [erroGasto, setErroGasto] = useState("");
  const [temTarifaCredito, setTemTarifaCredito] = useState(false);
  const [valorTarifa, setValorTarifa] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("saldo");
  const [dataGasto, setDataGasto] = useState(hojeISO);
  

  const [nomeConta, setNomeConta] = useState("");
  const [valorConta, setValorConta] = useState("");
  const [dataConta, setDataConta] = useState("");
  const [erroConta, setErroConta] = useState("");
  const [quemPagouConta, setQuemPagouConta] = useState("");

  function alterarTemaDaPessoa(idPessoa, novoTema) {
    setPessoas((pessoasAnteriores) =>
      pessoasAnteriores.map((pessoa) =>
        pessoa.id === idPessoa
          ? {
              ...pessoa,
              tema: novoTema,
            }
          : pessoa
      )
    );
  }

// ╠══════════════════════════════════════════════╣

function alterarSaldoPessoa(idPessoa, valor, comentario = "") {
  const pessoa = pessoas.find(p => p.id === idPessoa);
  if (!pessoa || !valor) return false;
  const ajuste = {
    id: crypto.randomUUID(),
    data: new Date().toISOString(),
    nome: comentario.trim() || "Ajuste manual de saldo",
    valor: Math.abs(valor),
    tipo: valor < 0 ? "debito" : "entrada",
    cartaoNome: "Ajuste manual",
    pessoaId: pessoa.id,
    pessoaNome: pessoa.nome,
    origem: "ajuste_manual",
    observacao: comentario.trim(),
  };
  aplicarLancamento(null, ajuste);
  setMensagem(`Saldo de ${pessoa.nome} ajustado.`);
  return true;
}

function limparFormularioCartao() {
  setCartaoEmEdicaoId(null);
  setNomeCartao("");
  setTipoCartao("credito");
  setPessoaCartaoSelecionada("");
  setDiaFechamento("");
  setDiaVencimento("");
  setLimiteCartao("");
  setLimiteUsado("");
  setErroCartao("");
}

function editarCartao(cartao) {
  if (formaPagamento === "pagamento_fatura") limparFormularioGasto();
  setCartaoEmEdicaoId(cartao.id);
  setNomeCartao(cartao.nome);
  setTipoCartao(cartao.tipo);
  setPessoaCartaoSelecionada(String(cartao.pessoaId || ""));
  const data = (mes, dia) => {
    if (!dia) return "";
    const ano = new Date().getFullYear();
    const numeroMes = Number(mes || "12");
    const diaValido = Math.min(dia, new Date(ano, numeroMes, 0).getDate());
    return `${ano}-${String(numeroMes).padStart(2, "0")}-${String(diaValido).padStart(2, "0")}`;
  };
  setDiaFechamento(data(cartao.mesFechamento, cartao.diaFechamento));
  setDiaVencimento(data(cartao.mesVencimento, cartao.diaVencimento));
  setLimiteCartao(cartao.limite == null ? "" : paraNumero(cartao.limite).toFixed(2).replace(".", ","));
  setLimiteUsado(paraNumero(cartao.limiteUsado).toFixed(2).replace(".", ","));
  setErroCartao("");
  requestAnimationFrame(() => document.getElementById("card-form-title")?.focus());
}

function adicionarCartao() {
  const nome = nomeCartao.trim();
  const credito = tipoCartao === "credito";
  const limite = credito ? lerValorBRL(limiteCartao) : null;
  const utilizado = credito && limiteUsado.trim() ? lerValorBRL(limiteUsado) : 0;
  const anterior = cartoes.find(cartao => cartao.id === cartaoEmEdicaoId);
  if (!nome || (credito && (!diaFechamento || !diaVencimento || !limite || utilizado === null))) {
    setErroCartao("Confira o nome, as datas e os valores do cartão.");
    return;
  }
  if (cartoes.some(cartao => cartao.id !== cartaoEmEdicaoId && !cartao.arquivado &&
      cartao.tipo === tipoCartao && cartao.nome.toLowerCase() === nome.toLowerCase())) {
    setErroCartao("Já existe um cartão com esse nome e modalidade.");
    return;
  }
  if (anterior && anterior.tipo !== tipoCartao &&
      (paraNumero(anterior.limiteUsado) > 0 || gastos.some(gasto => cartaoDoGasto(gasto, cartoes)?.id === anterior.id))) {
    setErroCartao("A modalidade de um cartão com lançamentos deve permanecer a mesma.");
    return;
  }
  const novo = {
    ...anterior,
    id: anterior?.id ?? Date.now(),
    nome,
    tipo: tipoCartao,
    pessoaId: Number(pessoaCartaoSelecionada),
    diaFechamento: credito ? Number(diaFechamento.slice(8)) : null,
    diaVencimento: credito ? Number(diaVencimento.slice(8)) : null,
    mesFechamento: credito ? diaFechamento.slice(5, 7) : null,
    mesVencimento: credito ? diaVencimento.slice(5, 7) : null,
    limite,
    limiteUsado: utilizado,
  };
  if (anterior) {
    setCartoes(prev => prev.map(cartao => cartao.id === anterior.id ? novo : cartao));
    const atualizarReferencia = gasto => {
      if (cartaoDoGasto(gasto, cartoes)?.id !== anterior.id) return gasto;
      return gasto.tipo === "pagamento_fatura"
        ? { ...gasto, cartaoFaturaId: novo.id, cartaoFaturaNome: novo.nome }
        : { ...gasto, cartaoId: novo.id, cartaoNome: novo.nome };
    };
    setGastos(prev => prev.map(atualizarReferencia));
    setTransacoes(prev => prev.map(atualizarReferencia));
  } else {
    setCartoes(prev => [...prev, novo]);
  }
  limparFormularioCartao();
  setMensagem(anterior ? "Cartão atualizado." : "Cartão cadastrado.");
}

function excluirCartao(idCartao) {
  const cartao = cartoes.find(c => c.id === idCartao);
  if (!cartao) return;
  if (paraNumero(cartao.limiteUsado) > 0) {
    setErroCartao("Quite a fatura antes de excluir o cartão.");
    return;
  }
  if (!window.confirm(`Excluir o cartão ${cartao.nome}? Os lançamentos permanecerão no histórico.`)) return;
  const vincular = gasto => {
    if (cartaoDoGasto(gasto, cartoes)?.id !== idCartao) return gasto;
    return gasto.tipo === "pagamento_fatura" ? { ...gasto, cartaoFaturaId: idCartao } : { ...gasto, cartaoId: idCartao };
  };
  setGastos(prev => prev.map(vincular));
  setTransacoes(prev => prev.map(vincular));
  setCartoes(cartoes.map(c => c.id === idCartao ? { ...c, arquivado: true } : c));
  if (cartaoEmEdicaoId === idCartao) limparFormularioCartao();
  setMensagem("Cartão excluído.");
}

function aplicarLancamento(anterior, novo) {
  const resultado = atualizarLancamento({ pessoas, cartoes, gastos, transacoes }, anterior, novo);
  setPessoas(resultado.pessoas);
  setCartoes(resultado.cartoes);
  setGastos(resultado.gastos);
  setTransacoes(resultado.transacoes);
  setGastoDebito(resultado.gastos.filter(g => g.tipo === "debito")
    .reduce((total, g) => total + paraNumero(g.valor), 0));
  setFaturaAtual(resultado.cartoes.filter(c => c.tipo === "credito")
    .reduce((total, c) => total + paraNumero(c.limiteUsado), 0));
}

function limparFormularioGasto() {
  setNomeGasto("");
  setValorGasto("");
  setDataGasto(hojeISO());
  setCartaoSelecionado("");
  setPessoaSelecionada("");
  setGastoEmEdicaoId(null);
  setErroGasto("");
  setTemTarifaCredito(false);
  setValorTarifa("");
  setFormaPagamento("saldo");
}

function adicionarGasto(event) {
  event.preventDefault();
  const pagamento = formaPagamento === "pagamento_fatura";
  const pessoa = pessoas.find(p => String(p.id) === pessoaDoFormulario);
  const cartao = formaPagamento === "saldo" ? undefined : cartoes.find(c => String(c.id) === cartaoSelecionado);
  const anterior = gastos.find(g => g.id === gastoEmEdicaoId);
  const nome = pagamento ? `Pagamento de fatura · ${cartao?.nome ?? ""}` : nomeGasto.trim();
  const base = lerValorBRL(valorGasto);
  const tarifa = formaPagamento === "credito" && temTarifaCredito ? lerValorBRL(valorTarifa) : 0;
  if (!nome || !base || tarifa === null || !pessoa || !dataGasto || !Number.isFinite(Date.parse(dataGasto))) {
    setErroGasto("Confira a descrição, o valor, a pessoa, a data e a tarifa quando aplicável.");
    return;
  }
  if (formaPagamento !== "saldo" && (!cartao || (cartao.arquivado && !anterior) || cartao.tipo !== (pagamento ? "credito" : formaPagamento))) {
    setErroGasto("Selecione um cartão para esta forma de pagamento.");
    return;
  }
  const data = dataGasto === hojeISO() ? new Date().toISOString() : new Date(`${dataGasto}T12:00:00`).toISOString();
  const gasto = {
    ...anterior,
    id: anterior?.id ?? crypto.randomUUID(),
    data: anterior?.data && dataGasto === dataLocal(anterior.data) ? anterior.data : data,
    nome,
    valor: arredondarBRL(base + tarifa),
    valorBase: base,
    tarifa,
    tipo: formaPagamento === "saldo" ? "debito" : formaPagamento,
    formaPagamento,
    cartaoId: pagamento ? null : cartao?.id ?? null,
    cartaoNome: formaPagamento === "saldo" || pagamento ? "Saldo / Pix" : cartao.nome,
    cartaoFaturaId: pagamento ? cartao.id : null,
    cartaoFaturaNome: pagamento ? cartao.nome : "",
    pessoaId: pessoa.id,
    pessoaNome: pessoa.nome,
  };
  try {
    aplicarLancamento(anterior, gasto);
    if (pathname === "/gastos") {
      setMesSelecionado(dataGasto.slice(5, 7));
      setAnoSelecionado(dataGasto.slice(0, 4));
    }
    limparFormularioGasto();
    setMensagem(anterior ? "Lançamento atualizado." : pagamento ? "Pagamento registrado." : "Gasto registrado.");
  } catch (error) {
    setErroGasto(error.message);
  }
}

function dataLocal(iso) {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function editarGasto(gasto) {
  const cartao = cartaoDoGasto(gasto, cartoes);
  setNomeGasto(gasto.nome);
  setValorGasto(paraNumero(gasto.valorBase ?? gasto.valor).toFixed(2).replace(".", ","));
  setTemTarifaCredito(Boolean(gasto.tarifa));
  setValorTarifa(gasto.tarifa ? gasto.tarifa.toFixed(2).replace(".", ",") : "");
  setFormaPagamento(gasto.formaPagamento ?? (gasto.tipo === "debito" && !cartao ? "saldo" : gasto.tipo));
  setDataGasto(gasto.data ? dataLocal(gasto.data) : hojeISO());
  setCartaoSelecionado(cartao ? String(cartao.id) : "");
  setPessoaSelecionada(String(gasto.pessoaId));
  setGastoEmEdicaoId(gasto.id);
  setErroGasto("");
  if (gasto.tipo === "pagamento_fatura") navigate("/cartoes");
  requestAnimationFrame(() => document.getElementById("expense-form-title")?.focus());
}

function excluirGasto(gasto) {
  if (!window.confirm(`Excluir “${gasto.nome}” e desfazer seus efeitos no saldo ou na fatura?`)) return;
  try {
    aplicarLancamento(gasto, null);
    if (gastoEmEdicaoId === gasto.id) limparFormularioGasto();
    setMensagem("Lançamento excluído.");
  } catch (error) {
    setErroGasto(error.message);
  }
}

function adicionarConta(event) {
  event.preventDefault();
  if (!nomeConta.trim()) {
    setErroConta("Digite o nome da conta.");
    return;
  }

  const valor = lerValorBRL(valorConta);
  if (!valor) {
    setErroConta("Informe um valor maior que zero.");
    return;
  }

  if (!dataConta) {
    setErroConta("Selecione a data.");
    return;
  }

  if (!quemPagouConta) {
    setErroConta("Selecione quem vai pagar.");
    return;
  }

  const pessoa = pessoas.find(
    (p) => p.id === Number(quemPagouConta)
  );

  if (!pessoa) {
    setErroConta("Pessoa inválida.");
    return;
  }

  const novaConta = {
    id: crypto.randomUUID(),
    nome: nomeConta.trim(),
    valor,
    dataVencimento: (() => {
  const [ano, mes, dia] = dataConta.split("-");
  return `${dia}/${mes}/${ano}`;
})(),
    pago: false,
    quemPagouId: pessoa.id,
    quemPagouNome: pessoa.nome,
  };

  setContas([...contas, novaConta]);
  selecionarMes(dataConta.slice(0, 7));

  setNomeConta("");
  setValorConta("");
  setDataConta("");
  setQuemPagouConta("");
  setErroConta("");
  setMensagem("Conta cadastrada.");
}

function marcarContaComoPaga(idConta) {
  const conta = contas.find((c) => c.id === idConta);
  if (!conta || conta.pago) return;

  const pessoa = pessoas.find(
    (p) => p.id === conta.quemPagouId
  );

  if (!pessoa) {
    setErroConta("A pessoa responsável precisa estar cadastrada para pagar a conta.");
    return;
  }
  if (!window.confirm(`Pagar ${formatarMoeda(conta.valor)} com o saldo de ${pessoa.nome}?`)) return;

  const pessoasAtualizadas = pessoas.map((p) =>
    p.id === pessoa.id
      ? { ...p, saldo: arredondarBRL(paraNumero(p.saldo) - paraNumero(conta.valor)) }
      : p
  );

  setPessoas(pessoasAtualizadas);

  const contasAtualizadas = contas.map((c) =>
    c.id === idConta
      ? { ...c, pago: true }
      : c
  );

  setContas(contasAtualizadas);

  const novaTransacao = {
    id: crypto.randomUUID(),
    tipo: "conta_paga",
    origem: "boleto",
    nome: conta.nome,
    valor: paraNumero(conta.valor),
    pessoaId: pessoa.id,
    pessoaNome: pessoa.nome,
    cartaoNome: null,
    data: new Date().toISOString(),
    observacao: "Pagamento de conta",
  };

  setTransacoes((prev) => [novaTransacao, ...prev]);
  setMensagem("Pagamento da conta registrado.");
}

function excluirConta(idConta) {
  const conta = contas.find(item => item.id === idConta);
  if (!conta || conta.pago || !window.confirm(`Excluir a conta “${conta.nome}”?`)) return;
  setContas(contas.filter(c => c.id !== idConta));
  setMensagem("Conta excluída.");
}

// ╠══════════════════════════════════════════════╣

// ╠══════════════════════════════════════════════╣

  const ehHousehold = perfilAtivo === "household";
const hoje = new Date();

const [mesSelecionado, setMesSelecionado] = useState(
  localStorage.getItem("mesSelecionado") ||
  String(hoje.getMonth() + 1).padStart(2, "0")
);

const [anoSelecionado, setAnoSelecionado] = useState(
  localStorage.getItem("anoSelecionado") ||
  String(hoje.getFullYear())
);

useEffect(() => {
  saveLocalEntries({
    [STORAGE_KEYS.pessoas]: JSON.stringify(pessoas),
    [STORAGE_KEYS.cartoes]: JSON.stringify(cartoes),
    [STORAGE_KEYS.gastos]: JSON.stringify(gastos),
    [STORAGE_KEYS.contas]: JSON.stringify(contas),
    [STORAGE_KEYS.transacoes]: JSON.stringify(transacoes),
    [STORAGE_KEYS.gastoDebito]: String(gastoDebito),
    [STORAGE_KEYS.faturaAtual]: String(faturaAtual),
    [STORAGE_KEYS.perfilAtivo]: perfilAtivo,
    [STORAGE_KEYS.resetEtapa]: String(resetEtapa),
    [STORAGE_KEYS.mesSelecionado]: mesSelecionado,
    [STORAGE_KEYS.anoSelecionado]: anoSelecionado,
  });
}, [pessoas, cartoes, gastos, contas, transacoes, gastoDebito, faturaAtual,
    perfilAtivo, resetEtapa, mesSelecionado, anoSelecionado]);

  const pessoaDoFormulario = pessoaSelecionada || (!ehHousehold && pessoas.some(p => String(p.id) === perfilAtivo)
  ? perfilAtivo : pessoas.length === 1 ? String(pessoas[0].id) : "");

  const pessoaAtiva = useMemo(() => {
    if (ehHousehold) {
      return null;
    }

    return (
      pessoas.find((pessoa) => String(pessoa.id) === String(perfilAtivo)) ?? null
    );
  }, [ehHousehold, perfilAtivo, pessoas]);

const gastosFiltrados = useMemo(() => {
  const filtrados = gastos.filter((gasto) => {
    if (!gasto.data) return true;

    const data = new Date(gasto.data);

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesSelecionado && ano === anoSelecionado;
  });

  if (ehHousehold) return filtrados;

  return filtrados.filter(
    (gasto) => String(gasto.pessoaId) === String(perfilAtivo)
  );
}, [ehHousehold, gastos, perfilAtivo, mesSelecionado, anoSelecionado]);

const gastosNoCiclo = useMemo(() => {
  const base = ehHousehold
    ? gastos
    : gastos.filter((g) => String(g.pessoaId) === String(perfilAtivo));

  return base.filter((gasto) =>
    gastoEntraNaFaturaDoCiclo(gasto, cartoes, mesSelecionado, anoSelecionado)
  );
}, [gastos, cartoes, mesSelecionado, anoSelecionado, perfilAtivo, ehHousehold]);

  const gastoDebitoFiltrado = useMemo(() => {
    return gastosFiltrados
      .filter((gasto) => gasto.tipo === "debito")
      .reduce((acumulador, gasto) => acumulador + paraNumero(gasto.valor), 0);
  }, [gastosFiltrados]);

const faturaAtualFiltrada = useMemo(() => {
  return gastosNoCiclo.reduce(
    (acc, g) => acc + paraNumero(g.valor),
    0
  );
}, [gastosNoCiclo]);

const contasFiltradas = useMemo(() => {
  const filtradas = contas.filter((conta) => {
    if (!ehHousehold && String(conta.quemPagouId) !== perfilAtivo) return false;
    const data = parseDataBR(conta.dataVencimento);
    if (!data) return false;

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = String(data.getFullYear());

    return mes === mesSelecionado && ano === anoSelecionado;
  });

  return filtradas;
}, [contas, mesSelecionado, anoSelecionado, ehHousehold, perfilAtivo]);

const totalContasPendentes = contasFiltradas
  .filter((conta) => !conta.pago)
  .reduce((acc, conta) => acc + paraNumero(conta.valor), 0);

const contasOrdenadas = [...contasFiltradas].sort((a, b) => {
  if (a.pago !== b.pago) return a.pago ? 1 : -1;
  return parseDataBR(a.dataVencimento) - parseDataBR(b.dataVencimento);
});
const totalContasPagas = contasFiltradas
  .filter((c) => c.pago)
  .reduce((acc, c) => acc + paraNumero(c.valor), 0);

const totalEntradas = gastosFiltrados
  .filter((g) => g.tipo === "entrada")
  .reduce((acc, g) => acc + paraNumero(g.valor), 0);

const perfilPessoas = ehHousehold ? pessoas : pessoas.filter(pessoa => pessoa.id === pessoaAtiva?.id);
const salarioTotalFiltrado = perfilPessoas
  .filter(salarioDisponivel)
  .reduce((total, pessoa) => total + paraNumero(pessoa.salario), 0);

const dataGrafico = [
  { name: "Salário", value: salarioTotalFiltrado },
  { name: "Débito", value: paraNumero(gastoDebitoFiltrado) || 0 },
  { name: "Crédito", value: paraNumero(faturaAtualFiltrada) || 0 },
  { name: "Entradas", value: totalEntradas || 0 },
  { name: "Contas pagas", value: totalContasPagas || 0 },
];

  function alterarTemaAtivo(novoTema) {
    if (ehHousehold) {
      return;
    }

    if (pessoaAtiva) {
      alterarTemaDaPessoa(pessoaAtiva.id, novoTema);
    }
  }

// ╠══════════════════════════════════════════════╣

function limparTudo() {
  setCartoes([]);
  setGastos([]);
  setContas([]);
  setTransacoes([]);
  setGastoDebito(0);
  setFaturaAtual(0);
  setPerfilAtivo("household");
  setResetEtapa(0);
  limparFormularioCartao();
  limparFormularioGasto();
  setMensagem("Lançamentos redefinidos.");

}

function lidarComResetTotal() {
  if (resetEtapa < 2) {
    setResetEtapa((etapaAnterior) => etapaAnterior + 1);
    return;
  }

  limparTudo();
}

function salarioDisponivel(pessoa) {
  return !pessoa.pagamentoIrregular || !pessoa.dataPagamentoOverride ||
    pessoa.dataPagamentoOverride <= hojeISO();
}

function saldoDisponivelPessoa(pessoa) {
  return paraNumero(pessoa.saldo) -
    (pessoa.saldoInicialIndependente || salarioDisponivel(pessoa) ? 0 : paraNumero(pessoa.salario));
}

function selecionarMes(valor) {
  if (!/^\d{4}-\d{2}$/.test(valor)) return;
  const [ano, mes] = valor.split("-");
  setAnoSelecionado(ano);
  setMesSelecionado(mes);
}

function abrirPagamento(cartao) {
  limparFormularioGasto();
  setFormaPagamento("pagamento_fatura");
  if (cartao) setCartaoSelecionado(String(cartao.id));
}

function removerPessoa(pessoa) {
  if (contas.some(conta => !conta.pago && conta.quemPagouId === pessoa.id) ||
      cartoes.some(cartao => cartao.pessoaId === pessoa.id && paraNumero(cartao.limiteUsado) > 0)) {
    return "Resolva as contas pendentes e faturas da pessoa antes de excluir.";
  }
  if (!window.confirm(`Excluir ${pessoa.nome} e seu saldo? Os lançamentos permanecem no histórico.`)) return "";
  setPessoas(prev => prev.filter(item => item.id !== pessoa.id));
  if (String(pessoa.id) === perfilAtivo) setPerfilAtivo("household");
  setMensagem("Pessoa excluída.");
  return "";
}

  const cartoesVisiveis = cartoes.filter(cartao => !cartao.arquivado &&
    (ehHousehold || !cartao.pessoaId || cartao.pessoaId === pessoaAtiva?.id));
  const saldoAtual = perfilPessoas.reduce((total, pessoa) => total + saldoDisponivelPessoa(pessoa), 0);
  const faturasAbertas = cartoesVisiveis.filter(cartao => cartao.tipo === "credito")
    .reduce((total, cartao) => total + paraNumero(cartao.limiteUsado), 0);
  const listaGastos = gastosFiltrados.filter(gasto =>
    (!filtroGastos || (filtroGastos === "ajuste_manual" ? gasto.origem === filtroGastos : gasto.tipo === filtroGastos)) &&
    [gasto.nome, gasto.pessoaNome, gasto.cartaoNome, gasto.cartaoFaturaNome].join(" ").toLowerCase().includes(buscaGastos.trim().toLowerCase())
  ).sort((a, b) => ((Date.parse(b.data) || 0) - (Date.parse(a.data) || 0)) * (maisAntigos ? -1 : 1));
  const titulo = paginas.find(pagina => pagina.path === pathname)?.label ?? "Visão geral";
  const visao = pathname === "/" || !paginas.some(pagina => pagina.path === pathname);
  const registrarFatura = formaPagamento === "pagamento_fatura";
  const valorDigitado = lerValorBRL(valorGasto);
  const valorComTarifa = (valorDigitado || 0) + (formaPagamento === "credito" && temTarifaCredito ? lerValorBRL(valorTarifa) || 0 : 0);
  const destinatario = pessoas.find(pessoa => String(pessoa.id) === pessoaDoFormulario);
  const cartaoDoFormulario = cartoes.find(cartao => String(cartao.id) === cartaoSelecionado);
  const novaPessoa = <Link className="finance-button primary" to="/pessoas">Criar pessoa</Link>;
  const donoCartao = cartao => pessoas.find(pessoa => pessoa.id === cartao.pessoaId)?.nome ?? "Sem titular cadastrado";

  const perfilEMes = <div className="workspace-filters">
    <label>Perfil da consulta
      <select value={perfilAtivo} onChange={event => setPerfilAtivo(event.target.value)}>
        <option value="household">Casa inteira</option>
        {pessoas.map(pessoa => <option key={pessoa.id} value={String(pessoa.id)}>{pessoa.nome}</option>)}
      </select>
    </label>
    {pathname !== "/cartoes" && <label>Mês de referência
      <input type="month" value={`${anoSelecionado}-${mesSelecionado}`} onChange={event => selecionarMes(event.target.value)} />
    </label>}
    {visao && !ehHousehold && <label>Tema do perfil
      <select value={pessoaAtiva?.tema || "cassette_neon"} onChange={event => alterarTemaAtivo(event.target.value)}>
        {Object.entries(THEMES).map(([id, tema]) => <option key={id} value={id}>{tema.label}</option>)}
      </select>
    </label>}
  </div>;

  const escolherPessoa = (label, value, onChange) => <label>{label}
    <select value={value} onChange={event => onChange(event.target.value)} required>
      <option value="">Selecione uma pessoa</option>
      {pessoas.map(pessoa => <option key={pessoa.id} value={String(pessoa.id)}>{pessoa.nome}</option>)}
    </select>
  </label>;

  const formularioGasto = <section className="finance-panel" aria-labelledby="expense-form-title">
    <h2 id="expense-form-title" tabIndex={-1}>
      {registrarFatura ? (gastoEmEdicaoId ? "Editar pagamento" : "Pagar fatura") : (gastoEmEdicaoId ? "Editar gasto" : "Novo gasto")}
    </h2>
    {pessoas.length === 0 ? <><p>Crie uma pessoa para identificar de qual saldo sai o pagamento.</p>{novaPessoa}</> :
      <form className="finance-form" onSubmit={adicionarGasto} onKeyDown={event => {
        if (event.key === "Escape" && gastoEmEdicaoId) limparFormularioGasto();
      }}>
        {!registrarFatura && <label>Forma de pagamento
          <select value={formaPagamento} onChange={event => {
            setFormaPagamento(event.target.value); setCartaoSelecionado(""); setErroGasto("");
          }}>
            {Object.entries(formasDePagamento).filter(([id]) => id !== "pagamento_fatura")
              .map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>}
        {escolherPessoa(registrarFatura ? "Pessoa que vai pagar" : "Pessoa responsável", pessoaDoFormulario, setPessoaSelecionada)}
        {formaPagamento !== "saldo" && <label>{registrarFatura ? "Fatura a pagar" : "Cartão usado"}
          <select value={cartaoSelecionado} onChange={event => setCartaoSelecionado(event.target.value)} required>
            <option value="">Selecione um cartão</option>
            {cartoes.filter(cartao => (!cartao.arquivado || String(cartao.id) === cartaoSelecionado) && cartao.tipo === (registrarFatura ? "credito" : formaPagamento))
              .map(cartao => <option key={cartao.id} value={String(cartao.id)}>{cartao.nome} · {donoCartao(cartao)}{registrarFatura ? ` · ${formatarMoeda(cartao.limiteUsado)} em aberto` : ""}</option>)}
          </select>
        </label>}
        {formaPagamento !== "saldo" && !cartoes.some(cartao => !cartao.arquivado && cartao.tipo === (registrarFatura ? "credito" : formaPagamento)) &&
          <p className="finance-callout">{registrarFatura ? "Cadastre um cartão de crédito para pagar a fatura." :
            <Link to="/cartoes">Cadastre um cartão dessa modalidade</Link>}</p>}
        {!registrarFatura && <label>Descrição<input placeholder="Ex. Mercado" value={nomeGasto} onChange={event => setNomeGasto(event.target.value)} required /></label>}
        <div className="finance-row">
          <label>Valor (R$)<input inputMode="decimal" placeholder="0,00" value={valorGasto} onChange={event => setValorGasto(event.target.value)} required /></label>
          <label>Data<input type="date" value={dataGasto} onChange={event => setDataGasto(event.target.value)} required /></label>
        </div>
        {formaPagamento === "credito" && <>
          <label className="checkbox"><input type="checkbox" checked={temTarifaCredito} onChange={event => setTemTarifaCredito(event.target.checked)} /> Pix no crédito com tarifa</label>
          {temTarifaCredito && <label>Tarifa (R$)<input inputMode="decimal" placeholder="0,00" value={valorTarifa} onChange={event => setValorTarifa(event.target.value)} required /></label>}
        </>}
        {destinatario && valorDigitado > 0 && <p className="finance-callout">
          {formaPagamento === "credito"
            ? `${formatarMoeda(valorComTarifa)} serão adicionados à fatura de ${cartaoDoFormulario?.nome || "um cartão"}. O saldo de ${destinatario.nome} permanece igual.`
            : `${formatarMoeda(valorDigitado)} sairão do saldo de ${destinatario.nome}.${registrarFatura ? " O valor abate a fatura em aberto." : ""}`}
          {gastoEmEdicaoId && " O efeito do lançamento anterior será revertido ao salvar."}
        </p>}
        {erroGasto && <p className="finance-error" role="alert">{erroGasto}</p>}
        <div className="finance-row">
          <button className="finance-button primary" type="submit">{gastoEmEdicaoId ? "Salvar alterações" : registrarFatura ? "Registrar pagamento" : "Registrar gasto"}</button>
          {gastoEmEdicaoId && <button type="button" className="finance-button" onClick={limparFormularioGasto}>Cancelar edição</button>}
          {registrarFatura && <button type="button" className="finance-button" onClick={limparFormularioGasto}>Fechar pagamento</button>}
        </div>
      </form>}
  </section>;

  return <div className="finance-page" style={{ "--profile-accent": temaAtivo.accent, "--accent": temaAtivo.accent }}>
    <header className="page-header">
      <div>
        <h1 id="workspace-title" tabIndex={-1}>{titulo}</h1>
        <p className="muted">{paginas.find(pagina => pagina.path === pathname)?.description ?? paginas[0].description}</p>
      </div>
      {visao && pessoas.length > 0 && <Link to="/gastos" className="finance-button primary"><Plus size={17} aria-hidden /> Novo gasto</Link>}
      {pathname === "/cartoes" && !registrarFatura && <button className="finance-button primary" onClick={() => abrirPagamento()}>Pagar fatura</button>}
    </header>
    {(visao || ["/gastos", "/cartoes", "/contas"].includes(pathname)) && perfilEMes}
    <p role="status" className="finance-status">{mensagem}</p>

    {visao && <>
      {pessoas.length === 0 && <section className="finance-panel finance-onboarding">
        <h2>Comece pelo seu saldo</h2>
        <ol><li>Crie uma pessoa para identificar quem paga.</li><li>Informe o saldo de partida e, se quiser, o salário.</li><li>Registre o primeiro gasto em dinheiro, Pix ou cartão.</li></ol>
        {novaPessoa}
      </section>}
      <div className="finance-kpis" aria-label="Resumo financeiro">
        {[
          ["Dinheiro disponível", saldoAtual, "Saldo atual de quem está no perfil"],
          ["Saídas no débito", gastoDebitoFiltrado, "Compras e ajustes de saída no mês"],
          ["Compras no crédito", faturaAtualFiltrada, "Compras no ciclo selecionado"],
          ["Faturas em aberto", faturasAbertas, "Total atual após pagamentos"],
          ["Contas a pagar", totalContasPendentes, "Vencimentos pendentes do mês"],
        ].map(([label, valor, ajuda]) => <dl className="finance-kpi" key={label}>
          <dt>{label}</dt><dd>{formatarMoeda(valor)}</dd><small>{ajuda}</small>
        </dl>)}
      </div>
      <div className="workspace-columns">
        <section className="finance-panel">
          <h2>Saldo e compromissos</h2>
          <ul className="finance-list">
            <li className="finance-item"><span>Saldo após faturas e contas do mês</span><strong>{formatarMoeda(saldoAtual - faturasAbertas - totalContasPendentes)}</strong></li>
            <li className="finance-item"><span>Salário considerado</span><strong>{formatarMoeda(salarioTotalFiltrado)}</strong></li>
            {perfilPessoas.map(pessoa => <li key={pessoa.id} className="finance-item">
              <div><strong>{pessoa.nome}</strong><p>{salarioDisponivel(pessoa) ? "Saldo da pessoa" : `Salário previsto para ${formatarDataISOParaBR(pessoa.dataPagamentoOverride)}`}</p></div>
              <Link to="/pessoas" className="finance-button">Gerenciar saldo</Link>
            </li>)}
          </ul>
          <div className="finance-row overview-links">
            <Link className="finance-button" to="/cartoes">Ver cartões</Link>
            <Link className="finance-button" to="/contas">Ver contas</Link>
          </div>
        </section>
        <section className="finance-panel">
          <h2>Movimentação do período</h2>
          {dataGrafico.some(item => item.value > 0) ? <>
            <div aria-hidden="true" className="chart-frame">
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={dataGrafico} margin={{ left: 10, right: 12, top: 7, bottom: 10 }} accessibilityLayer={false}>
                  <CartesianGrid vertical={false} stroke="#d6e0e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#405767" }} />
                  <YAxis width={45} tick={{ fontSize: 11, fill: "#405767" }} />
                  <Tooltip formatter={value => formatarMoeda(value)} />
                  <Bar dataKey="value" name="Valor" fill="#168274" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details><summary>Ver valores do gráfico</summary>
              <table className="finance-table"><thead><tr><th scope="col">Categoria</th><th scope="col">Valor em reais</th></tr></thead>
                <tbody>{dataGrafico.map(item => <tr key={item.name}><td>{item.name}</td><td>{formatarMoeda(item.value)}</td></tr>)}</tbody>
              </table>
            </details>
          </> : <p>As movimentações aparecem aqui depois do primeiro lançamento.</p>}
        </section>
      </div>
      {perfilPessoas.length > 0 && <section className="finance-panel profile-balances">
        <details>
          <summary>Saldos individuais e limites disponíveis</summary>
          <table className="finance-table">
            <thead><tr><th scope="col">Pessoa</th><th scope="col">Dinheiro disponível</th><th scope="col">Limite de crédito disponível</th></tr></thead>
            <tbody>{perfilPessoas.map(pessoa => {
              const limite = cartoesVisiveis.filter(cartao => cartao.tipo === "credito" && cartao.pessoaId === pessoa.id)
                .reduce((total, cartao) => total + paraNumero(cartao.limite) - paraNumero(cartao.limiteUsado), 0);
              return <tr key={pessoa.id}><td>{pessoa.nome}</td><td>{formatarMoeda(saldoDisponivelPessoa(pessoa))}</td><td>{formatarMoeda(limite)}</td></tr>;
            })}</tbody>
          </table>
        </details>
      </section>}
    </>}

    {pathname === "/pessoas" && <PessoasPage pessoas={pessoas} contas={contas}
      onCreate={pessoa => { setPessoas(prev => [...prev, pessoa]); setMensagem(`${pessoa.nome} cadastrada.`); }}
      onExpense={pessoa => {
        if (!nomeGasto && !valorGasto && !gastoEmEdicaoId && !registrarFatura) setPessoaSelecionada(String(pessoa.id));
        navigate("/gastos");
      }} onAdjust={alterarSaldoPessoa} onRemove={removerPessoa} onTheme={alterarTemaDaPessoa} temas={THEMES} />}

    {pathname === "/gastos" && <div className="workspace-columns">
      {!registrarFatura ? formularioGasto : <section className="finance-panel">
        <h2>Novo gasto</h2><p>Há um pagamento de fatura em edição.</p>
        <div className="finance-row">
          <Link className="finance-button" to="/cartoes">Voltar ao pagamento</Link>
          <button type="button" className="finance-button" onClick={limparFormularioGasto}>Descartar pagamento</button>
        </div>
      </section>}
      <section className="finance-panel">
        <h2>Gastos e ajustes do mês</h2>
        <div className="finance-row">
          <label>Buscar<input type="search" placeholder="Buscar lançamento" value={buscaGastos} onChange={event => setBuscaGastos(event.target.value)} /></label>
          <label>Tipo<select value={filtroGastos} onChange={event => setFiltroGastos(event.target.value)}>
            <option value="">Todos</option>
            <option value="debito">Débito</option><option value="credito">Crédito</option>
            <option value="pagamento_fatura">Pagamento de fatura</option><option value="ajuste_manual">Ajustes de saldo</option>
          </select></label>
          <label>Ordem<select value={maisAntigos ? "asc" : "desc"} onChange={event => setMaisAntigos(event.target.value === "asc")}>
            <option value="desc">Mais recentes</option><option value="asc">Mais antigos</option>
          </select></label>
        </div>
        {!listaGastos.length && <p className="muted list-empty">{gastosFiltrados.length ? "Nenhum lançamento corresponde à busca." : "Nenhum lançamento no período e perfil selecionados."}</p>}
        <ul className="finance-list">
          {listaGastos.map(gasto => <li key={gasto.id}>
            <div className="finance-item">
              <div><strong>{gasto.nome}</strong>
                <p>{gasto.pessoaNome} · {gasto.cartaoFaturaNome || gasto.cartaoNome || "Saldo"} · {gasto.data ? formatarDataISOParaBR(dataLocal(gasto.data)) : "Sem data"}</p>
                <span className="finance-pill">{gasto.origem === "ajuste_manual" ? "Ajuste de saldo" : tipos[gasto.tipo] || gasto.tipo}</span>
              </div>
              <span className="finance-amount">{formatarMoeda(gasto.valor)}</span>
            </div>
            <div className="finance-row list-actions">
              {gasto.origem !== "ajuste_manual" && <button type="button" className="finance-button" onClick={() => editarGasto(gasto)}>Editar<span className="sr-only"> {gasto.nome}</span></button>}
              <button type="button" className="finance-button danger" onClick={() => excluirGasto(gasto)}>Excluir<span className="sr-only"> {gasto.nome}</span></button>
            </div>
          </li>)}
        </ul>
      </section>
    </div>}

    {pathname === "/cartoes" && <div className="workspace-columns">
      {registrarFatura ? formularioGasto : <section className="finance-panel">
        <h2 id="card-form-title" tabIndex={-1}>{cartaoEmEdicaoId ? "Editar cartão" : "Novo cartão"}</h2>
        <form className="finance-form" onSubmit={event => { event.preventDefault(); adicionarCartao(); }} onKeyDown={event => {
          if (event.key === "Escape" && cartaoEmEdicaoId) limparFormularioCartao();
        }}>
          <label>Nome do cartão<input placeholder="Ex. Cartão do banco" value={nomeCartao} onChange={event => setNomeCartao(event.target.value)} required /></label>
          <label>Modalidade<select value={tipoCartao} onChange={event => setTipoCartao(event.target.value)}>
            <option value="credito">Crédito</option><option value="debito">Débito</option>
          </select></label>
          <label>Titular<select value={pessoaCartaoSelecionada} onChange={event => setPessoaCartaoSelecionada(event.target.value)}>
            <option value="">Sem titular cadastrado</option>
            {pessoas.map(pessoa => <option key={pessoa.id} value={String(pessoa.id)}>{pessoa.nome}</option>)}
          </select></label>
          {tipoCartao === "credito" && <>
            <div className="finance-row">
              <label>Fechamento da fatura<input type="date" value={diaFechamento} onChange={event => setDiaFechamento(event.target.value)} required /></label>
              <label>Vencimento da fatura<input type="date" value={diaVencimento} onChange={event => setDiaVencimento(event.target.value)} required /></label>
            </div>
            <div className="finance-row">
              <label>Limite total (R$)<input inputMode="decimal" placeholder="0,00" value={limiteCartao} onChange={event => setLimiteCartao(event.target.value)} required /></label>
              <label>Já utilizado (R$)<input inputMode="decimal" placeholder="0,00" value={limiteUsado} onChange={event => setLimiteUsado(event.target.value)} /></label>
            </div>
          </>}
          {erroCartao && <p className="finance-error" role="alert">{erroCartao}</p>}
          <div className="finance-row">
            <button className="finance-button primary" type="submit">{cartaoEmEdicaoId ? "Salvar cartão" : "Adicionar cartão"}</button>
            {cartaoEmEdicaoId && <button className="finance-button" type="button" onClick={limparFormularioCartao}>Cancelar edição</button>}
          </div>
        </form>
      </section>}
      <section className="finance-panel">
        <h2>Cartões cadastrados</h2>
        {!cartoesVisiveis.length && <p>Nenhum cartão nesta seleção.</p>}
        <ul className="finance-list">
          {cartoesVisiveis.map(cartao => <li key={cartao.id}>
            <div className="finance-item">
              <div><strong>{cartao.nome}</strong><p>{donoCartao(cartao)} · {tipos[cartao.tipo] || cartao.tipo}</p>
                {cartao.tipo === "credito" && <p>Fechamento dia {cartao.diaFechamento || "—"} · Vencimento dia {cartao.diaVencimento || "—"}</p>}
              </div>
              {cartao.tipo === "credito" && <div><div className="finance-amount">{formatarMoeda(cartao.limiteUsado)} em aberto</div><small>Limite total {formatarMoeda(cartao.limite)}</small></div>}
            </div>
            <div className="finance-row list-actions">
              {cartao.tipo === "credito" && paraNumero(cartao.limiteUsado) > 0 && <button type="button" className="finance-button" onClick={() => abrirPagamento(cartao)}>Pagar fatura</button>}
              <button type="button" className="finance-button" onClick={() => editarCartao(cartao)}>Editar<span className="sr-only"> {cartao.nome}</span></button>
              <button type="button" className="finance-button danger" onClick={() => excluirCartao(cartao.id)}>Excluir<span className="sr-only"> {cartao.nome}</span></button>
            </div>
          </li>)}
        </ul>
      </section>
    </div>}

    {pathname === "/contas" && <div className="workspace-columns">
      <section className="finance-panel">
        <h2>Nova conta</h2>
        {!pessoas.length ? <><p>Crie uma pessoa para indicar quem vai pagar a conta.</p>{novaPessoa}</> :
          <form className="finance-form" onSubmit={adicionarConta}>
            <label>Descrição<input placeholder="Ex. Energia" value={nomeConta} onChange={event => setNomeConta(event.target.value)} required /></label>
            <label>Valor (R$)<input inputMode="decimal" placeholder="0,00" value={valorConta} onChange={event => setValorConta(event.target.value)} required /></label>
            <label>Vencimento<input type="date" value={dataConta} onChange={event => setDataConta(event.target.value)} required /></label>
            {escolherPessoa("Quem vai pagar", quemPagouConta, setQuemPagouConta)}
            {erroConta && <p className="finance-error" role="alert">{erroConta}</p>}
            <div><button className="finance-button primary" type="submit">Adicionar conta</button></div>
          </form>}
      </section>
      <section className="finance-panel">
        <h2>Vencimentos do mês</h2>
        {!contasOrdenadas.length && <p>Nenhuma conta no período e perfil selecionados.</p>}
        <ul className="finance-list">
          {contasOrdenadas.map(conta => <li key={conta.id}>
            <div className="finance-item">
              <div><strong>{conta.nome}</strong><p>{conta.quemPagouNome} · Vence em {conta.dataVencimento}</p>
                <span className="finance-pill">{conta.pago ? "Paga" : isContaAtrasada(conta) ? "Em atraso" : "Pendente"}</span>
              </div>
              <span className="finance-amount">{formatarMoeda(conta.valor)}</span>
            </div>
            {!conta.pago && <div className="finance-row list-actions">
              <button type="button" className="finance-button" onClick={() => marcarContaComoPaga(conta.id)}>Pagar<span className="sr-only"> {conta.nome}</span></button>
              <button type="button" className="finance-button danger" onClick={() => excluirConta(conta.id)}>Excluir<span className="sr-only"> {conta.nome}</span></button>
            </div>}
          </li>)}
        </ul>
      </section>
    </div>}

    {pathname === "/historico" && <LedgerPage transacoes={transacoes} gastos={gastos} pessoas={pessoas} />}

    {pathname === "/configuracoes" && <>
      <div className="workspace-columns"><OfflineToolbar /><ExchangeRate /></div>
      <section className="finance-panel reset-panel">
        <details>
          <summary>Redefinir lançamentos</summary>
          <p>Apaga gastos, cartões, contas e histórico. As pessoas e seus saldos atuais serão preservados. Exporte um backup antes de continuar.</p>
          <div className="finance-row">
            <button type="button" className="finance-button danger" onClick={lidarComResetTotal}>{RESET_MESSAGES[resetEtapa] ?? RESET_MESSAGES[2]}</button>
            {resetEtapa > 0 && <button type="button" className="finance-button" onClick={() => setResetEtapa(0)}>Cancelar</button>}
          </div>
        </details>
      </section>
    </>}
  </div>;
}

export default function App() {
  

  const [pessoas, setPessoas] = useState(() =>
    lerJsonStorage(STORAGE_KEYS.pessoas, [])
  );
  const [contas, setContas] = useState(() =>
  lerJsonStorage(STORAGE_KEYS.contas, [])
);
const [transacoes, setTransacoes] = useState(() =>
  lerJsonStorage(STORAGE_KEYS.transacoes, [])
);

const [perfilAtivo, setPerfilAtivo] = useState(() => {
  const salvo = lerTextoStorage(STORAGE_KEYS.perfilAtivo);
  return pessoas.some(pessoa => String(pessoa.id) === salvo) ? salvo : "household";
});

// ╠══════════════════════════════════════════════╣

const pessoaAtiva = pessoas.find(pessoa => String(pessoa.id) === perfilAtivo);
const temaAtivo = Object.hasOwn(THEMES, pessoaAtiva?.tema) ? THEMES[pessoaAtiva.tema] : THEMES.cassette_neon;

  return <BrowserRouter>
    <Workspace>
      <Dashboard pessoas={pessoas} setPessoas={setPessoas} contas={contas} setContas={setContas}
        transacoes={transacoes} setTransacoes={setTransacoes} temaAtivo={temaAtivo}
        perfilAtivo={perfilAtivo} setPerfilAtivo={setPerfilAtivo} />
    </Workspace>
  </BrowserRouter>;
}

function Workspace({ children }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("workspace-title")?.focus({ preventScroll: true });
  }, [pathname]);
  return <div className="workspace">
    <a className="skip-link" href="#workspace-main">Pular para o conteúdo</a>
    <aside className="workspace-nav">
      <div className="workspace-brand"><span className="brand-icon"><Wallet size={22} aria-hidden /></span>DividimOS</div>
      <nav aria-label="Navegação principal">
        {paginas.map(pagina =>
          <NavLink key={pagina.path} to={pagina.path} end><pagina.icon size={17} aria-hidden /><span>{pagina.label}</span></NavLink>
        )}
      </nav>
      <p className="workspace-storage">{window.dividimos ? "Salvo neste dispositivo" : "Prévia no navegador"}</p>
    </aside>
    <main id="workspace-main" className="workspace-main" tabIndex={-1}>{children}</main>
  </div>;
}
