# Roteiro individual - DividimOS (8 a 10 minutos)

Daniel Barros de Deus · 22600468. Material de apoio para demonstração, sem slides obrigatórios.

## Antes de começar

Abra o app, este roteiro, o repositório, os dois runs de CI e a release. Use dados fictícios. Exporte backup se o computador já tiver dados. A modalidade individual depende de aceitação do professor.

## 0:00-1:30 - Problema e produto

**Mostrar:** pessoas, cartões, gastos e saldo. Criar uma pessoa fictícia e um gasto; fechar e reabrir.

**Dizer:** “O DividimOS organiza finanças domésticas. A versão anterior dependia de serviços externos. Esta versão guarda os dados em SQLite e funciona offline. O foco deste trabalho é o caminho do código até um executável testado e distribuído.”

## 1:30-2:30 - Arquitetura e API

**Mostrar:** seção Endpoints do README; executar `npm run demo:api` em ambiente com Node instalado.

**Dizer:** “React apresenta os dados. Electron executa o aplicativo e controla o acesso ao SQLite. A API REST escuta somente neste computador. Health verifica resposta do processo; as rotas de dados exigem token. A interface usa IPC restrito, sem receber esse token.”

## 2:30-3:30 - Git

**Mostrar:** PR #1, commits e branch; PR #2.

**Dizer:** “Usei GitHub Flow: alteração em branch, commits descritivos e integração por PR. O histórico anterior foi preservado. Este trabalho foi realizado individualmente, com assistência de IA; não estou apresentando revisão de outro aluno.”

## 3:30-5:00 - Pipeline e teste quebrado

**Mostrar:** run vermelho 40994472015, mensagem `expected 50 to be -999`, correção e run verde 40994594705.

**Dizer:** “Provoquei uma falha controlada na expectativa do teste. A conta correta é 100 menos 20 menos 30, igual a 50. O teste exigiu -999 e o pipeline parou. Corrigi a expectativa para 50; os testes e o build passaram. Isso mostra que um teste obrigatório realmente impede a entrega.”

## 5:00-6:30 - Artefato e implantação

**Mostrar:** workflow de release, EXE/AppImage e SHA256SUMS. Abrir o executável baixado.

**Dizer:** “Build transforma código em aplicativo. Teste valida comportamento. Entrega disponibiliza o arquivo versionado. Deploy é executar esse arquivo no ambiente de uso. Escolhi executável porque o produto é desktop offline e o enunciado permite outro artefato com justificativa. O usuário não precisa instalar Docker nem Node.”

## 6:30-7:30 - Segurança e observabilidade

**Mostrar:** relatório Trivy do run atual; arquivo `logs/application.log`, abrir URL `/health` nele indicada. Fechar app e tentar novamente; reabrir para recuperar.

**Dizer:** “O Trivy verifica vulnerabilidades conhecidas, mas está em modo informativo. O scan não garante ausência de falhas. Tokens não vão para o repositório. Health e logs ajudam a perceber indisponibilidade depois do deploy.”

## 7:30-9:00 - Backup, atualização e encerramento

**Mostrar:** exportar backup, alterar dado fictício e restaurar após confirmação.

**Dizer:** “Os dados ficam fora do executável. Antes de atualizar, exporto backup e guardo a versão anterior. Para rollback, fecho o app e volto ao binário anterior, conferindo compatibilidade dos dados. Não afirmo ter testado troca entre duas versões públicas enquanto esse ensaio não existir.”

## Respostas rápidas

- CI: integrar alterações com testes e build automáticos.
- CD: disponibilizar versão e definir como executá-la/atualizá-la.
- Artefato: resultado executável, identificado por versão e SHA.
- Rollback: voltar à versão anterior com proteção dos dados.
- Por que SQLite? Persistência local sem servidor e sem internet.
- Por que GitHub Actions? Repetir a mesma validação em push/PR e registrar os resultados.
- Limite: sem sincronização entre PCs; binários não assinados; apresentação e teste no PC real ainda precisam acontecer.

## Moodle

Enviar link do repositório, PDF de evidências, links dos runs vermelho/verde, identificação da release e este material se usado. Prazo: 02/12/2026 às 23h59 (Brasília). Verificar o registro de envio. Aceitação individual é pendência acadêmica, não um requisito técnico resolvido por código.
