#!/usr/bin/env python3
"""Gather only real GitHub evidence; optionally format PDF in CEUB-inspired style."""
import argparse, datetime, html, json, pathlib, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
p = argparse.ArgumentParser()
p.add_argument('--partner', default='[COLEGA: PREENCHER]')
p.add_argument('--repo', default='DanielBDeDeus/dividimos-offline')
a = p.parse_args()

def gh(url):
    try:
        raw = subprocess.check_output(['gh','api',url], text=True, stderr=subprocess.PIPE)
        return json.loads(raw)
    except (FileNotFoundError,subprocess.CalledProcessError) as e:
        raise SystemExit(f'GitHub CLI nao autenticado ou repositorio inacessivel: {e}')

runs = gh(f'repos/{a.repo}/actions/runs?per_page=100').get('workflow_runs', [])
prs = gh(f'repos/{a.repo}/pulls?state=all&per_page=100')
releases = gh(f'repos/{a.repo}/releases?per_page=20')

def first_run(result):
    return next((r for r in runs if r.get('conclusion')==result), None)

fail=first_run('failure'); success=first_run('success')
fmt_run=lambda r: f"{r['html_url']} ({r['name']}; {r['created_at']}; {r['head_branch']})" if r else 'PENDENTE: nenhum run com esse resultado'
prlines=[f"- #{i['number']}: {i['title']} — {i['user']['login']} — {i['html_url']}" for i in prs]
rellines=[f"- {i['tag_name']}: {i['html_url']}" for i in releases]
text = f'''# Projeto final - Evidencias reais - DividimOS Offline

Gerado: {datetime.datetime.now(datetime.timezone.utc).isoformat()}
Integrante 1: Daniel Barros de Deus
Integrante 2: {a.partner}
Repositorio: https://github.com/{a.repo}

## CI - Falha real
{fmt_run(fail)}

## CI - Sucesso real
{fmt_run(success)}

## Pull Requests (evidencia de colaboracao)
{chr(10).join(prlines) if prlines else 'PENDENTE: nenhum PR registrado'}

## GitHub Releases (artefatos)
{chr(10).join(rellines) if rellines else 'PENDENTE: nenhuma release publicada'}

## Implementacao declarada no codigo
API REST local, SQLite em diretorio do usuario, Electron, GitHub Actions com testes e build, Trivy.
Verifique manualmente todas estas funcoes e anexe capturas reais de telas e logs.

## Evidencias que ainda dependem de teste humano
- Print de executavel Windows offline funcionando.
- Print de AppImage Linux offline funcionando.
- Reinicio do app preservando dados e exportacao/importacao de backup.
- Rollback entre duas versoes reais do executavel.
- Identificacao do commit da falha e da correcao, com explicacao verificada.
- Participacao de ambos os integrantes na apresentacao.

Ambos os integrantes devem fazer a entrega individualmente no Moodle.
'''
output = root/'docs/EVIDENCIAS_GERADAS.md'
output.write_text(text,encoding='utf8')
print('Criado',output)
try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
except ImportError:
    print('PDF nao gerado: instale reportlab em um ambiente Python local; Markdown foi criado.')
    sys.exit(0)

purple=colors.HexColor('#451351'); dark=colors.HexColor('#310a38'); pale=colors.HexColor('#f1e8f4'); gray=colors.HexColor('#505263')
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=18,leading=23,textColor=dark,spaceAfter=12),
 'head':ParagraphStyle('head',fontName='Helvetica-Bold',fontSize=11,leading=15,textColor=purple,spaceBefore=12,spaceAfter=5),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=8.5,leading=12,textColor=gray,spaceAfter=6,wordWrap='CJK'),
}
def P(s, style='body'): return Paragraph(html.escape(str(s)),styles[style])
def link(url):
    if not url: return P('PENDENTE')
    esc=html.escape(url,quote=True)
    return Paragraph(f'<link href="{esc}" color="#4c236e">{esc}</link>',styles['body'])

story=[P('PROJETO FINAL — DIVIDIMOS OFFLINE','title'),P('Integração DevOps | Relatório de evidências verificáveis')]
ident=Table([[P('Integrante 1'),P('Daniel Barros de Deus')],[P('Integrante 2'),P(a.partner)],[P('Repositório'),link('https://github.com/'+a.repo)]],colWidths=[125,390])
ident.setStyle(TableStyle([('BACKGROUND',(0,0),(0,-1),pale),('GRID',(0,0),(-1,-1),0.35,colors.HexColor('#d4b6dd')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story.extend([ident,P('1. Execucoes da CI','head'),P('Falha: '+ (fail.get('display_title','') if fail else 'PENDENTE'))])
story.append(link(fail.get('html_url') if fail else None))
story.extend([P('Sucesso: '+(success.get('display_title','') if success else 'PENDENTE')),link(success.get('html_url') if success else None),P('2. Colaboração - Pull Requests','head')])
if prs:
    for item in prs[:12]: story.extend([P(f"PR #{item['number']} — {item['user']['login']}: {item['title']}"),link(item['html_url'])])
else: story.append(P('PENDENTE: não há PRs.'))
story.append(P('3. Artefatos versionados','head'))
if releases:
    for item in releases[:8]: story.extend([P(item['tag_name']),link(item['html_url'])])
else: story.append(P('PENDENTE: não há releases.'))
story.extend([P('4. Processo e evidências complementares','head'),P('Código: API REST local em Node.js, SQLite e Electron. CI: Vitest, testes da API, build e Trivy. Confirmar resultados com logs e capturas reais.'),P('PENDÊNCIAS: teste offline de EXE e AppImage; reinício preservando dados; teste de backup; rollback; análise da causa da falha; identificação da contribuição de ambos os integrantes.'),P('As evidências são coletadas do GitHub no momento da execução; itens ausentes ficam explícitos como pendentes.')])

def header(canvas,doc):
    canvas.saveState();w,h=letter
    canvas.setFillColor(colors.HexColor('#a31c85'));canvas.rect(35,h-39,w-70,16,fill=1,stroke=0)
    canvas.setFillColor(purple);canvas.rect(w-96,h-39,61,16,fill=1,stroke=0)
    canvas.setFillColor(gray);canvas.setFont('Helvetica',7);canvas.drawRightString(w-35,29,f'Pagina {doc.page}')
    canvas.restoreState()

pdf=root/'docs/EVIDENCIAS_GERADAS.pdf'
SimpleDocTemplate(str(pdf),pagesize=letter,leftMargin=45,rightMargin=45,topMargin=58,bottomMargin=45).build(story,onFirstPage=header,onLaterPages=header)
print('Criado',pdf)
