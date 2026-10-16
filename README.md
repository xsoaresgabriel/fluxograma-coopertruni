# Fluxograma Coopertruni

Fluxograma interativo do processo operacional da Coopertruni — da abertura
de cliente ao fechamento contábil, incluindo as áreas de apoio (RH, TI) e
as áreas fora do fluxo de frete (Posto, Aptrar, VRB).

Clique num nó pra abrir o painel lateral com responsabilidades, resultado da
etapa, indicadores e travas do sistema.

## Como abrir

Precisa servir por HTTP (abrir `index.html` direto com `file://` quebra o
carregamento dos scripts em alguns navegadores). Dentro da pasta do projeto:

```bash
python3 -m http.server 8000
```

Depois abra <http://localhost:8000>.

## Estrutura

```
index.html         estrutura da página
css/styles.css     estilos (tema escuro)
js/data.js         dados do fluxo (fases, nós, áreas de apoio)
js/app.js          render, painel lateral, drag/drop, Mermaid
```

Pra ajustar o processo (adicionar/remover etapas, mudar responsabilidades,
indicadores, travas), edite **`js/data.js`** — é onde está o conteúdo do
fluxograma. O `app.js` é a lógica de render e normalmente não precisa
mexer.

## Persistência

As alterações feitas pela interface ficam no `sessionStorage` do navegador
(some ao fechar a aba). Alterações permanentes vão no `js/data.js`.
