#!/usr/bin/env python3
"""Patch a fresh clone of DanielBDeDeus/controle-financeiro; fail closed on mismatches."""
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parent.parent
app = root / 'src/App.jsx'
html = root / 'index.html'
packagefile = root / 'package.json'
assert app.exists() and html.exists() and packagefile.exists(), 'Not a compatible source checkout'

text = app.read_text(encoding='utf-8-sig')
pattern = r'''useEffect\(\(\) => \{\s*async function carregarCotacaoDolar\(\) \{.*?\n\s*carregarCotacaoDolar\(\);\s*\}, \[\]\);'''
replacement = '''useEffect(() => {
  // Offline desktop: no external exchange-rate API.
  // The dashboard explicitly indicates that a live quotation is unavailable.
  setCotacaoDolar(null);
  setErroCotacao('Cotacao online indisponivel no modo offline');
}, []);'''
text, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
if count != 1:
    raise RuntimeError('Could not locate currency API effect: source changed. No silent patch applied.')
app.write_text(text, encoding='utf8')

text = html.read_text(encoding='utf-8-sig')
text, count = re.subn(r'''\s*<link\s+href="https://fonts\.googleapis\.com/css2\?family=Material\+Symbols\+Outlined"\s+rel="stylesheet"\s*/>''', '', text, count=1)
if count != 1:
    raise RuntimeError('Google font link not found; stop and inspect offline dependencies.')
html.write_text(text, encoding='utf8')

pkg = json.loads(packagefile.read_text(encoding='utf-8-sig'))
pkg['name'] = 'dividimos-offline'
pkg['productName'] = 'DividimOS'
pkg['version'] = '1.0.0'
pkg['description'] = 'DividimOS offline desktop, DevOps final project'
pkg['main'] = 'desktop/main.cjs'
pkg['repository'] = { 'type':'git', 'url':'https://github.com/DanielBDeDeus/dividimos-offline.git' }
pkg['scripts'].update({
 'test:api':'node --test server/*.test.cjs',
 'demo:api':'node scripts/demo-api.cjs',
 'desktop':'npm run build && electron .',
 'dist:linux':'npm run build && electron-builder --linux AppImage --x64 --publish never',
 'dist:win':'npm run build && electron-builder --win portable --x64 --publish never',
 'verify':'npm test && npm run test:api && npm run build && npm run demo:api',
})
pkg['dependencies'].pop('@supabase/supabase-js', None)
pkg['dependencies']['material-symbols'] = '0.48.1'
pkg['devDependencies']['electron'] = '45.1.0'
pkg['devDependencies']['electron-builder'] = '26.18.0'
packagefile.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + '\n', encoding='utf8')

old_readme = root/'README.md'
(root/'docs').mkdir(exist_ok=True)
if old_readme.exists():
    (root/'docs'/'README_LEGACY.md').write_bytes(old_readme.read_bytes())
old_readme.write_text((root/'README_OFFLINE.md').read_text(encoding='utf8'), encoding='utf8')
(root/'README_OFFLINE.md').unlink()

unused = root/'src/utils/supabaseClient.js'
if unused.exists(): unused.unlink()
for f in ['.env.example']:
    fp = root/f
    if fp.exists(): fp.unlink()
ignore = root/'.gitignore'
with ignore.open('a',encoding='utf8') as f:
    f.write('\n# DividimOS offline data / artifacts\nrelease/\n.python-deps/\nsetup-checks.log\n*.db\n*.db-shm\n*.db-wal\n*.AppImage\n*.exe\n*backup*.json\n')

# Ensure no old secret/public fallback or cloud runtime references remain in shipped entrypoints.
assert 'supabase' not in (root/'src/main.jsx').read_text(encoding='utf8').lower()
assert 'awesomeapi.com.br' not in app.read_text(encoding='utf8')
assert 'fonts.googleapis.com' not in html.read_text(encoding='utf8')
print('Patched React entrypoint, finance exchange-rate handling, offline assets, package metadata, docs.')

config = root / 'vite.config.js'
source = config.read_text(encoding='utf-8-sig')
source = source.replace('test: {', 'test: {\n    include: ["src/**/*.test.{js,jsx}"],', 1)
config.write_text(source, encoding='utf8')
