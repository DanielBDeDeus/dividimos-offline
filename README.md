# DividimOS Offline

Controle financeiro doméstico com pessoas, cartões, gastos, contas, saldos e gráficos. React + Vite no desktop Electron, API REST local em Node.js e persistência SQLite. Funciona sem serviço de nuvem após o download.

**Aluno:** Daniel Barros de Deus · RA 22600468 · GitHub DanielBDeDeus. **Disciplina:** Integração DevOps, UniCEUB. **Entrega:** 02/12/2026 às 23h59, Brasília.

**Modalidade individual declarada pelo aluno.** O enunciado exige dupla; a aceitação individual depende do professor. Não há participação de segundo estudante comprovada.

## Baixar e executar

[Release v1.1.0 e executáveis](https://github.com/DanielBDeDeus/dividimos-offline/releases/tag/v1.1.0) · [Código](https://github.com/DanielBDeDeus/dividimos-offline) · [Roteiro de apresentação](docs/APRESENTACAO.md) · [Evidências](docs/EVIDENCIAS.md)

- Windows x64: baixar `DividimOS-1.1.0-Portable.exe` e abrir. Não instala Node nem exige instalador. Políticas do computador podem bloquear executáveis não assinados.
- Linux x64: baixar `DividimOS-1.1.0-x86_64.AppImage`, permitir execução nas propriedades e abrir. Requer sessão gráfica e suporte AppImage/FUSE. Alternativa: `chmod +x DividimOS-1.1.0-x86_64.AppImage && ./DividimOS-1.1.0-x86_64.AppImage --appimage-extract-and-run`.
- Conferir o arquivo contra `SHA256SUMS.txt` da mesma release. Internet somente para baixar; nenhum serviço externo é necessário durante o uso.
- Dados ficam no diretório de usuário do Electron (`app.getPath('userData')`), arquivo `finances.db`, separado do executável. Exportar/importar JSON em **Backup e ajustes**.

O artefato escolhido é EXE/AppImage, permitido pelo enunciado mediante justificativa: entrega diretamente o produto desktop offline, com runtime embutido, sem exigir Docker ou privilégios administrativos do usuário. Não há sincronização entre computadores nem migração automática do antigo Supabase.

## O que mudou na v1.1.0

- **Pessoas** cadastra saldo inicial e salário separadamente. Ajustes de saldo registram um lançamento no histórico.
- **Gastos** começa pela forma de pagamento. Dinheiro, saldo ou Pix usa o saldo da pessoa sem exigir cartão. **Cartões e faturas** permite registrar pagamentos e consultar a dívida em aberto.
- **Visão geral** mostra dinheiro disponível, saídas no débito, compras no ciclo de crédito, faturas em aberto e contas do mês. **Histórico** permite buscar, ordenar e filtrar movimentações.
- **Backup e ajustes** reúne exportação, restauração e cotação. A atualização de USD/BRL é opcional e consulta a PTAX de venda do Banco Central. Ao abrir o app, ele lê somente a última cotação salva. É possível registrar uma cotação manual sem internet. A cotação é referência e fica em `usd-brl.json`, fora do banco e do backup financeiro.
- O mesmo `finances.db` e o formato de backup JSON v1 são usados. Antes de atualizar com dados reais, exporte um backup com a versão anterior. Se voltar para ela, mantenha uma cópia dos dados e restaure o backup anterior à atualização.

[Veja as telas e os cenários verificados](docs/EVIDENCIAS.md#revisão-de-interface-e-cotação).

## Executar a partir do código e testar API

Ambiente de desenvolvimento: Git, Node.js 24 e npm. Para a interface desktop, Windows/Linux x64 com sessão gráfica. Instalação reproduzível pelo lockfile:

```sh
git clone https://github.com/DanielBDeDeus/dividimos-offline.git
cd dividimos-offline
npm ci
npm run verify
npm run desktop
```

`npm run verify` executa Vitest, testes Node API/SQLite, build Vite e demonstração REST. `npm run demo:api` usa banco temporário e dados fictícios; não altera seu banco pessoal. `npm run test:desktop` testa Electron real com perfil descartável; CI executa no Windows. `npm run dev` é somente preview web, não comprova persistência SQLite.

| Endpoint | Função | Autorização |
|---|---|---|
| `GET /health` | Status da API local, modo offline e armazenamento SQLite | Público local |
| `GET /api/state` | Ler estado financeiro | Bearer aleatório por sessão |
| `PUT /api/state` | Gravar estado validado, limite 2 MiB | Bearer aleatório por sessão |
| `GET /api/summary` | Contar pessoas, gastos e contas | Bearer aleatório por sessão |

A API escuta somente `127.0.0.1` em porta disponível. O renderer usa IPC restrito; não recebe o token. `/health` indica resposta do processo, não é um teste completo da integridade do banco.

## Git e colaboração

GitHub Flow: branches `feat/*`, `fix/*` e `demo/*`, commits descritivos e PR para `main`. Histórico original preservado; a aplicação antiga `controle-financeiro` permanece independente.

- [PR #1: implementação offline](https://github.com/DanielBDeDeus/dividimos-offline/pull/1).
- [PR #2: falha controlada e correção](https://github.com/DanielBDeDeus/dividimos-offline/pull/2).
- Os PRs foram preparados na conta de Daniel com assistência de IA. Não constituem revisão independente ou contribuição de outra pessoa.

## CI/CD e artefato rastreável

| Etapa | Execução |
|---|---|
| Integração | Push/PR dispara checkout, Node 24 e `npm ci` |
| Testes | Vitest + Node test runner; erro obrigatório interrompe o job |
| Construção | Vite compila frontend; electron-builder empacota o desktop |
| Segurança | Trivy HIGH/CRITICAL, relatório informativo; não bloqueia por achados |
| Entrega | Artefatos por SHA; release versionada com EXE, AppImage e hashes |
| Implantação | Baixar o artefato aprovado e executar no computador local |

`.github/workflows/ci.yml` valida pushes e PRs. `desktop-preview.yml` gera previews da branch offline. `release.yml` executa em tag `v*`, manualmente, ou após mudanças de versão/workflow em `main`; verifica testes, Electron no Windows e Trivy no Linux antes de publicar. Tag deve corresponder à versão de `package.json`; uma nova versão deve incrementar esse número. Token efêmero `GITHUB_TOKEN` fornecido pelo GitHub, permissão `contents: write` apenas no job de publicação. Não há credencial pessoal no código.

## Falha controlada real

`calcularSaldoDisponivel(100, 20, 30)` retorna **50**. Na branch de demonstração, o teste foi alterado para exigir **-999**, sem modificar a função de produção.

- [Run vermelho 40994472015](https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40994472015): 1 teste falhou, 8 passaram; etapas posteriores bloqueadas.
- Correção: expectativa voltou para 50 no commit `60d03fdc32374f803d573af26bf7cfd8a51300d8`.
- [Run verde 40994594705](https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40994594705): 9 testes Vitest e 11 API/SQLite, build e scan concluídos.

Na implementação principal são 8 Vitest + 11 API/SQLite; o teste adicional é da demonstração. Os casos cobrem saldo, parcelas, serialização, persistência após reabrir banco, autorização, origem/host, JSON inválido, limites e UTF-8. Não reutilizar evidências de outro repositório.

## Atualização e rollback

1. Exportar backup JSON; fechar o aplicativo e guardar o executável atual.
2. Baixar a nova versão e conferir SHA256. Substituir somente o executável, preservando o diretório de dados.
3. Abrir e conferir os registros. Se houver problema, fechar e voltar ao executável anterior.
4. Se houver mudança incompatível de dados, preservar também o banco atual e restaurar o backup compatível pela interface. Não restaurar às cegas sobre a única cópia.

Não existe versão anterior pública comprovada para ensaio completo de downgrade. O procedimento está documentado; teste real entre versões e execução manual no PC do aluno devem ser registrados antes da apresentação.

## Segurança, configuração e observabilidade

- Bind loopback, validação Host/Origin, token aleatório, limite de payload e queries parametrizadas.
- Electron com sandbox, contextIsolation, nodeIntegration desativado, IPC validado, CSP e navegação externa bloqueada.
- Sem dados financeiros reais, backups, DB ou segredos no Git. Banco local não criptografado; proteger conta e backups.
- Configuração de usuário vem do SO; porta e token por sessão. O empacotamento usa `CSC_IDENTITY_AUTO_DISCOVERY=false` porque não há certificado. Nenhum `.env` de nuvem é necessário.
- Logs em `logs/application.log` dentro do diretório de dados, com rotação a 1 MiB. Registram início, endereço `/health`, encerramento e erros genéricos, sem token ou valores financeiros.
- Para demonstrar falha após deploy: abrir o endereço `/health` registrado, fechar o aplicativo e consultar novamente. A conexão recusada indica processo indisponível; reabrir e usar o novo endereço, pois a porta muda.

## Entrega e limites

O roteiro e a matriz de requisitos estão em `docs/APRESENTACAO.md` e `docs/EVIDENCIAS.md`. A apresentação prática e o envio no Moodle são ações do aluno. Teste automatizado com rede externa bloqueada e seletores simulados não equivale a teste manual do EXE/AppImage com rede física desligada. Conferir as evidências atuais antes de afirmar conclusão.
