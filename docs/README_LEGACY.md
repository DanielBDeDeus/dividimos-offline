# DividimOS

Sistema de controle financeiro doméstico para organização de gastos individuais e conjuntos.

## Integrante

| Nome completo | Matrícula | GitHub |
|---|---:|---|
| Daniel Barros de Deus | 22600468 | DanielBDeDeus |

## Descrição do Projeto

O DividimOS é uma aplicação web desenvolvida para auxiliar no controle financeiro de casais ou grupos domésticos. O sistema permite registrar pessoas, cartões, gastos, contas e movimentações financeiras, oferecendo uma visão individual por perfil e uma visão conjunta do orçamento.

Nesta entrega final, o projeto foi atualizado para utilizar persistência em banco de dados em nuvem, mantendo testes automatizados, integração contínua e deploy funcional.

## Funcionalidades

- Cadastro de pessoas com salário.
- Cadastro de cartões de débito e crédito.
- Registro, edição e exclusão de gastos.
- Controle de contas e movimentações financeiras.
- Cálculo automático de saldo disponível.
- Separação entre débito e crédito.
- Filtro por perfil individual.
- Visão conjunta do orçamento.
- Gráfico de distribuição de gastos.
- Persistência de dados com Supabase/PostgreSQL em nuvem.
- Deploy online.

## Tecnologias Utilizadas

- React
- Vite
- JavaScript
- Recharts
- React Router
- Supabase
- PostgreSQL
- Vitest
- GitHub Actions
- Vercel

## Banco de Dados em Nuvem

A aplicação foi integrada ao Supabase, utilizando PostgreSQL em nuvem.

Para preservar a estrutura já existente do projeto, foi criada uma camada de sincronização entre o estado local da aplicação e a tabela `app_state`, hospedada no Supabase.

A tabela armazena os dados principais da aplicação em formato `jsonb`, permitindo leitura e escrita em um banco de dados remoto.

### Tabela principal

```sql
app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null
)
```

## Deploy Online

Aplicação publicada:

https://dividim-os.vercel.app/

## Repositório

Repositório público no GitHub:

https://github.com/DanielBDeDeus/controle-financeiro

## Pull Request da Entrega Final

https://github.com/DanielBDeDeus/controle-financeiro/pull/3

## GitHub Actions

A pipeline de integração contínua executa automaticamente:

- instalação das dependências;
- testes automatizados;
- build de produção.

Link das Actions:

https://github.com/DanielBDeDeus/controle-financeiro/actions

## Como Rodar Localmente

Clone o repositório:

```bash
git clone https://github.com/DanielBDeDeus/controle-financeiro.git
cd controle-financeiro
```

Instale as dependências:

```bash
npm install
```

Execute o projeto em ambiente de desenvolvimento:

```bash
npm run dev
```

## Variáveis de Ambiente

Para configurar outro projeto Supabase, crie um arquivo `.env.local` com:

```env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_DO_SUPABASE
```

## Testes Automatizados

O projeto utiliza Vitest para testes automatizados.

Execute:

```bash
npm test
```

## Build de Produção

Execute:

```bash
npm run build
```

## Evidências da Entrega Final

- Banco de dados em nuvem: Supabase/PostgreSQL.
- Deploy funcional: Vercel.
- Pull Request criado para integração da entrega final.
- Testes automatizados executando com sucesso.
- Pipeline de CI configurada com GitHub Actions.
