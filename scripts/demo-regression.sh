#!/usr/bin/env bash
set -Eeuo pipefail
mode="${1:-help}"
file="src/utils/finance.test.js"
start='// BEGIN CLASSROOM CI REGRESSION DEMO'
end='// END CLASSROOM CI REGRESSION DEMO'
case "$mode" in
  prepare)
    test -z "$(git status --porcelain)" || { echo 'Working tree dirty; commit or stash first.' >&2; exit 1; }
    git switch -c demo/controlled-test-failure
    cat >> "$file" <<'JS'

// BEGIN CLASSROOM CI REGRESSION DEMO
it('reproducao controlada - saldo matematico', () => {
  expect(calcularSaldoDisponivel(100, 20, 30)).toBe(-999);
});
// END CLASSROOM CI REGRESSION DEMO
JS
    git add "$file"
    git commit -m 'test: demonstra falha real e controlada na CI'
    echo 'Agora: git push -u origin demo/controlled-test-failure; abra um Pull Request. Pipeline deve falhar no teste.'
    ;;
  fix)
    grep -q "$start" "$file" || { echo 'Bloco de demonstracao nao encontrado' >&2; exit 1; }
    python3 - "$file" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]); s=p.read_text(encoding='utf8'); old="expect(calcularSaldoDisponivel(100, 20, 30)).toBe(-999);";assert old in s;s=s.replace(old,"expect(calcularSaldoDisponivel(100, 20, 30)).toBe(50);");p.write_text(s,encoding='utf8')
PY
    npm test && npm run test:api
    git add "$file"
    git commit -m 'fix: corrige regressao identificada pelo pipeline'
    echo 'Agora: git push origin demo/controlled-test-failure; confira o pipeline verde e os dois runs.'
    ;;
  *) echo 'Usage: bash scripts/demo-regression.sh prepare|fix'; exit 1;;
esac
