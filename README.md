# DividimOS Offline — projeto final Integração DevOps

Versão desktop independente, derivada do repositório `controle-financeiro`.
O código original foi mantido como base; as novas funcionalidades estão na branch `feat/offline-desktop`.

## Produto

- Executável Windows x64 portable e Linux x64 AppImage gerados no GitHub Actions por tag.
- Totalmente offline após download; sem Supabase, Google Fonts ou AwesomeAPI.
- React + Vite + Electron 45 + SQLite embutido (`node:sqlite` no Node 24 do Electron).
- Persistência no diretório de dados do usuário, não dentro do executável.
- Exportação/importação de backup JSON na barra inferior direita.
- Não há sincronização entre dois computadores offline.

## Ambiente para desenvolvimento

Requer git, Node.js 24+, npm, Python 3 (somente no setup). Para usuários do release: nenhum deles.

```sh
npm ci
npm test
npm run test:api
npm run build
npm run desktop
npm run demo:api
```

## Endpoints REST

O processo desktop inicia um servidor local na porta efêmera de `127.0.0.1`:

- `GET /health` — resposta pública `{ status: "ok", database: "sqlite", mode: "offline" }`
- `GET /api/state` — leitura de dados, exigindo bearer token local aleatório
- `PUT /api/state` — atualiza estado financeiro validado (token requerido)
- `GET /api/summary` — contagem de cadastros sem exposição de valores (token requerido)

A integração React/SQLite é feita via IPC restrito no Electron. O token da API não é entregue ao renderer.
O script `npm run demo:api` demonstra os endpoints sem expor token permanente.

## CI / CD

- `.github/workflows/ci.yml` executa testes Vitest, testes de API/SQLite, build de React e Trivy em pushes e PRs.
- O scan Trivy é informativo (não bloqueia CI); falhas de teste bloqueiam o build.
- `.github/workflows/release.yml` compila dois sistemas em runners separados e publica o GitHub Release em tags `v*`.
- Os executáveis são artefatos de entrega; usuários fazem deployment ao executar.
- Rollback: substituir pelo executável da tag anterior (o banco local permanece), com backup e migração segura de esquema.

## Teste de falha real para apresentação

```sh
bash scripts/demo-regression.sh prepare
# push da branch, abrir PR, capturar run vermelho
bash scripts/demo-regression.sh fix
# push da correção, capturar run verde
```

## Publicar versão

Atualizar `package.json` e testar. Conferir versão e tag exatas. Depois:

```sh
git tag v1.0.0
git push origin v1.0.0
```

Não é feito upload automático pela etapa de setup. A release depende do repositório final estar no GitHub.

## Privacidade e segurança

- Não colocar backups, `finances.db`, tokens ou registros financeiros reais no Git.
- Usar dados fictícios na demonstração.
- O servidor só escuta loopback, valida Host/Origin e exige token nas rotas de dados.
- Electron com `contextIsolation`, `sandbox`, navegação bloqueada para origens externas e IPC restrito.
- Release não possui assinatura de código; o Windows pode mostrar aviso SmartScreen.
- Dados locais não são criptografados; proteger a conta do sistema operacional e os backups.

## Limitações

Testar o AppImage em Fedora/Bazzite e o Portable no Windows antes da entrega.
Sem serviço de rede não há sincronização entre computadores. O app não migra automaticamente
registros da antiga URL do Vercel ou do Supabase; exporte/importante esses dados manualmente
caso ainda os tenha. O suporte `node:sqlite` depende da versão embutida do Electron.

## PDF de evidencias gerado a partir de dados REAIS

Após criar PRs, rodar os pipelines e publicar release, execute:

```sh
bash scripts/collect-evidence.sh --partner "Nome do colega"
```

A coleta usa `gh api` autenticado; escreve `docs/EVIDENCIAS_GERADAS.md` e,
quando `reportlab` estiver disponivel, `docs/EVIDENCIAS_GERADAS.pdf` no estilo CEUB.
Itens faltantes sao marcados como **PENDENTE**, nunca inventados.
