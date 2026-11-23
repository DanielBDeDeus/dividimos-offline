'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { createApi } = require('./api.cjs');
const { validateState } = require('./storage.cjs');
let api, url, dir;
test.before(async () => { dir = fs.mkdtempSync(path.join(os.tmpdir(),'dividimos-api-')); api = createApi({databasePath:path.join(dir,'test.db'),log:{info(){},error:console.error}}); url=await api.start(); });
test.after(async () => { await api.close(); fs.rmSync(dir,{recursive:true,force:true}); });
test('GET /health returns healthy status', async()=>{
  const r=await fetch(url+'/health');assert.equal(r.status,200);assert.equal((await r.json()).status,'ok');
});
test('API rejects unauthenticated calls',async()=>{
  const r=await fetch(url+'/api/state');assert.equal(r.status,401);
});
test('API refuses untrusted Origin',async()=>{
  const r=await fetch(url+'/api/state',{headers:{Authorization:'Bearer '+api.token,Origin:'https://attacker.example'}});assert.equal(r.status,403);
});
test('PUT + GET state persists finance data',async()=>{
  const headers={Authorization:'Bearer '+api.token,'Content-Type':'application/json'};
  const data={'controle-financeiro:pessoas':JSON.stringify([{nome:'Ana'}])};
  const put=await fetch(url+'/api/state',{method:'PUT',headers,body:JSON.stringify(data)});assert.equal(put.status,200);
  const get=await fetch(url+'/api/state',{headers});assert.deepEqual(await get.json(),data);
});
test('GET /api/summary counts persons and expenses',async()=>{
  const headers={Authorization:'Bearer '+api.token,'Content-Type':'application/json'};
  const data={'controle-financeiro:pessoas':'[{"nome":"Ana"},{"nome":"Bia"}]','controle-financeiro:gastos':'[{"valor":25}]'};
  await fetch(url+'/api/state',{method:'PUT',headers,body:JSON.stringify(data)});
  const r=await fetch(url+'/api/summary',{headers});const body=await r.json();assert.equal(body.pessoas,2);assert.equal(body.gastos,1);
});
test('Reject unknown state keys',()=>assert.throws(()=>validateState({'senha':'123'}),/nao permitida/));
test('Reject non-string state values',()=>assert.throws(()=>validateState({'controle-financeiro:gastos':[]}),/texto/));
test('SQLite data survives close and reopen',()=>{
  const {openStore}=require('./storage.cjs');
  const file=path.join(dir,'restart.db');
  const first=openStore(file);first.write({'controle-financeiro:contas':'[{"nome":"Luz"}]'});first.close();
  const second=openStore(file);assert.deepEqual(second.read(),{'controle-financeiro:contas':'[{"nome":"Luz"}]'});second.close();
});
test('Malformed JSON does not change stored data', async () => {
  const before = api.store.read();
  const r = await fetch(url+'/api/state', {method:'PUT', headers:{Authorization:'Bearer '+api.token}, body:'{broken'});
  assert.equal(r.status,400);
  assert.deepEqual(api.store.read(),before);
});
test('Oversize payload is rejected without changing data', async () => {
  const before = api.store.read();
  const r = await fetch(url+'/api/state', {method:'PUT', headers:{Authorization:'Bearer '+api.token}, body:'x'.repeat(2*1024*1024+1)});
  assert.equal(r.status,413);
  assert.deepEqual(api.store.read(),before);
});
test('UTF-8 split across HTTP chunks is preserved', async () => {
  const http = require('node:http');
  const data = {'controle-financeiro:pessoas':'[{"nome":"João"}]'};
  const bytes = Buffer.from(JSON.stringify(data));
  const split = bytes.indexOf(Buffer.from('ã'))+1;
  await new Promise((resolve,reject) => {
    const req = http.request(url+'/api/state',{method:'PUT',headers:{Authorization:'Bearer '+api.token}},res=>{
      res.resume(); res.on('end',()=>{try {assert.equal(res.statusCode,200);resolve();}catch(e){reject(e);}});
    });
    req.on('error',reject);req.write(bytes.subarray(0,split));
    setTimeout(()=>req.end(bytes.subarray(split)),20);
  });
  assert.deepEqual(api.store.read(),data);
});
