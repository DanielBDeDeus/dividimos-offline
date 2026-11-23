'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const endpoint = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/';
const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit', year: 'numeric',
});
const timeoutMs = 12000;
const maxBytes = 8192;
const dayMs = 86400000;

function validRate(rate) {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && rate < 1000000;
}

function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(date);
  return Number.isFinite(time) && new Date(time).toISOString().startsWith(date);
}

function createFxStore(directory, { request = fetch, now = () => new Date(), timeout = timeoutMs } = {}) {
  const file = path.join(directory, 'usd-brl.json');
  let pending;

  function withStatus(quote) {
    const today = dateFormat.format(now()).replace(/(\d\d)\/(\d\d)\/(\d{4})/, '$3-$1-$2');
    return { ...quote, stale: Date.parse(today) - Date.parse(quote.date) >= 4 * dayMs };
  }

  async function read() {
    try {
      if ((await fs.stat(file)).size > 1024) return null;
      const { rate, date, source, savedAt } = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!validRate(rate) || !validDate(date) || !['ptax', 'manual'].includes(source) ||
          typeof savedAt !== 'string' || !Number.isFinite(Date.parse(savedAt))) return null;
      return withStatus({ rate, date, source, savedAt });
    } catch {
      return null;
    }
  }

  function save(getQuote) {
    if (pending) throw new Error('Já existe uma atualização em andamento.');
    pending = (async () => {
      const quote = { ...await getQuote(), savedAt: now().toISOString() };
      await fs.writeFile(file + '.tmp', JSON.stringify(quote), { mode: 0o600 });
      await fs.rename(file + '.tmp', file);
      return withStatus(quote);
    })().finally(() => { pending = null; });
    return pending;
  }

  function manual(rate) {
    if (!validRate(rate)) throw new Error('Informe uma cotação válida.');
    const [month, day, year] = dateFormat.format(now()).split('/');
    return save(() => ({ rate, date: `${year}-${month}-${day}`, source: 'manual' }));
  }

  function refresh() {
    return save(async () => {
      const end = now();
      const start = new Date(end.getTime() - 14 * dayMs);
      const inicio = dateFormat.format(start).replaceAll('/', '-');
      const fim = dateFormat.format(end).replaceAll('/', '-');
      // Olinda expects the OData aliases and option names literally in the query.
      const url = new URL(
        "CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)" +
        `?@dataInicial=%27${inicio}%27&@dataFinalCotacao=%27${fim}%27` +
        '&$orderby=dataHoraCotacao%20desc&$top=1&$format=json', endpoint);
      const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(timeout) });
      if (!response.ok || !response.body) throw new Error('A consulta ao Banco Central falhou.');
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > maxBytes) throw new Error('Resposta da cotação muito grande.');
        chunks.push(chunk);
      }
      const row = JSON.parse(Buffer.concat(chunks).toString('utf8')).value?.[0];
      const date = typeof row?.dataHoraCotacao === 'string' ? row.dataHoraCotacao.slice(0, 10) : '';
      const [month, day, year] = dateFormat.format(end).split('/');
      if (!validRate(row?.cotacaoVenda) || !validDate(date) || date > `${year}-${month}-${day}`) {
        throw new Error('O Banco Central não retornou uma cotação válida.');
      }
      return { rate: row.cotacaoVenda, date, source: 'ptax' };
    });
  }

  return { read, refresh, manual };
}

module.exports = { createFxStore };
