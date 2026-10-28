'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApi}=require('../server/api.cjs');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dividimos-demo-'));
  const api=createApi({databasePath:path.join(dir,'demo.db')});
  try {
    const url=await api.start();
    const header={Authorization:'Bearer '+api.token};
    const health=await (await fetch(url+'/health')).json();
    const state=await (await fetch(url+'/api/state',{headers:header})).json();
    const summary=await (await fetch(url+'/api/summary',{headers:header})).json();
    console.log('Health:',health,'\nState:',state,'\nSummary:',summary);
    console.log('Demonstração da API autenticada concluida. Banco temporario eliminado.');
  } finally { await api.close(); fs.rmSync(dir,{recursive:true,force:true}); }
})().catch(e=>{console.error(e);process.exitCode=1});
