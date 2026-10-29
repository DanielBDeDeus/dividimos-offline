# Evidências reais — DividimOS Offline

Integrante 1: Daniel Barros de Deus. Integrante 2: PENDENTE (participação real obrigatória).

- Repositório: https://github.com/DanielBDeDeus/dividimos-offline
- PR da implementação: https://github.com/DanielBDeDeus/dividimos-offline/pull/1
- CI vermelha real: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40687726038
  - Causa verificada no log: `aquasecurity/trivy-action@0.33.1` não existia; job falhou no setup, antes dos testes.
  - Correção: commit `40195b5938591db7d5290c520af750151dbc5a0f` fixa versão verificada v0.36.0 pelo SHA.
- CI verde após correção: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40905318178
  - Testes Vitest, API/SQLite, build e scan Trivy executados com sucesso.
  - Relatório Trivy é artefato da execução; scan report-only não bloqueia por vulnerabilidade.
- Build Windows real: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40687726101
- Teste Electron vermelho real: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40905978541
  - Causa: variável ELECTRON_RUN_AS_NODE presente, mesmo vazia, iniciava Electron em modo Node.
  - Correção: remover a variável do ambiente do processo de teste, commit `3180297a6d23d63ca74e095b69715f72f0b37077`.

Esses erros são falhas reais, não são apresentados como a regressão controlada exigida para demonstrar uma regra financeira incorreta.

- Teste Electron Windows aprovado: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40906283706 (startup, persistência, backup com seletores simulados e bloqueio de rede externa).

## Pendente

- Release pública aprovada, versão final e download testado.
- Execução do EXE no Windows sem admin e AppImage no Bazzite; rede fisicamente desconectada.
- Teste manual dos seletores de backup e atualização/rollback.
- PR/revisão/contribuições do segundo estudante.
- Demonstração controlada de teste financeiro vermelho/verde, PDF e apresentação.
- Duas submissões individuais no Moodle.
