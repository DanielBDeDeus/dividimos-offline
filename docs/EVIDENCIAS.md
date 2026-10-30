# Evidências reais — DividimOS Offline

Integrante 1: Daniel Barros de Deus. Integrante 2: PENDENTE (nome, contribuição e revisão reais).

## Código e colaboração
- Repositório: https://github.com/DanielBDeDeus/dividimos-offline
- Implementação isolada: https://github.com/DanielBDeDeus/dividimos-offline/pull/1
- Demonstração controlada: https://github.com/DanielBDeDeus/dividimos-offline/pull/2
- O histórico original foi importado. Nenhum dos PRs prova participação de outro aluno.

## CI vermelha e verde — demonstração controlada concluída
- Vermelha: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40994472015
- Commit vermelho: 4533eb208a84f28635ef6231c99bd7b4f0f58a5a.
- Causa deliberada: calcularSaldoDisponivel(100, 20, 30) devolve corretamente 50, mas o teste exigia -999. Vitest: 1 falha e 8 aprovados; API/build/scan bloqueados.
- Correção: expectativa alterada para 50 no commit 60d03fdc32374f803d573af26bf7cfd8a51300d8; cálculo de produção inalterado.
- Verde: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40994594705
- Resultado: 9 Vitest + 11 API/SQLite, build e Trivy concluídos.

## Candidato de entrega
- Código exato: 981530f32e7b3706e334feab0590198a577139db.
- CI aprovada: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40906674077
- Builds Windows/Linux: https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40906663600
- Rascunho de release (acesso do proprietário): https://github.com/DanielBDeDeus/dividimos-offline/releases/tag/untagged-ba153c9d8ebb49e8814e
- Assets: DividimOS-1.0.0-Portable.exe (114409661 bytes), DividimOS-1.0.0-x86_64.AppImage (129859658 bytes), SHA256SUMS.txt.
- Windows Electron: startup, isolamento do preload, persistência/reabertura, exportação/importação/cancelamento e rejeição de JSON inválido passaram. Requisições externas do renderer bloqueadas. Seletores nativos simulados: não equivale a teste manual do EXE portátil.
- Trivy: relatório real no artefato trivy-security-report da CI; package-lock.json teve zero achados no filtro HIGH/CRITICAL. Secrets indicado como '-' (não escaneado nesse alvo); report-only não bloqueia entrega por vulnerabilidade.

## Falhas adicionais verificadas
- https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40687726038: tag inexistente do Trivy impedia setup; corrigida para v0.36.0 fixada por SHA.
- https://github.com/DanielBDeDeus/dividimos-offline/actions/runs/40905978541: configuração do teste iniciava Electron em modo Node; remoção de ELECTRON_RUN_AS_NODE corrigiu o teste.

## Pendente — não declarar concluído
- Aprovação/publicação da release e merge após revisão.
- Execução do EXE sem admin e do AppImage no Bazzite; teste com rede fisicamente desligada; operações CRUD completas; seletores de backup; upgrade/rollback reais.
- Identidade e contribuição real do segundo estudante; apresentação por ambos; duas submissões individuais no Moodle.
