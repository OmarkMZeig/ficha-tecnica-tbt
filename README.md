# Ficha Técnica TBT

Editor visual de **fichas técnicas de confecção** (jeans, sarja e derivados) — crie,
edite, salve, duplique, versione e exporte fichas profissionais em minutos.

> Você **importa fotos reais** da peça (frente, costas, detalhes, aviamentos) e
> **anota** por cima (setas, balões, números, textos), preenche as tabelas e
> exporta em PDF/PNG/JPG. Tudo roda **no seu computador**, sem internet e sem
> instalação de programas.

---

## Como rodar (Windows)

Não precisa de Node.js nem instalação. Só do **PowerShell** (já vem no Windows) e
de um **navegador** (Edge ou Chrome).

1. Abra o PowerShell na pasta do projeto (`FICHA TECNICA TBT`).
2. Execute:

   ```powershell
   .\serve.ps1
   ```

3. Abra no navegador: **http://localhost:8770/**

Para parar o servidor: `Ctrl + C` no PowerShell.

> Porta ocupada? Use outra:
> ```powershell
> $env:PORT=9000; .\serve.ps1
> ```

### Atalho de 1 clique (opcional)

Crie um atalho do Windows apontando para:

```
powershell.exe -ExecutionPolicy Bypass -File "C:\Users\amura\OneDrive\Documentos\CLAUDE\FICHA TECNICA TBT\serve.ps1"
```

Dê um duplo-clique nele sempre que quiser abrir o sistema, depois acesse
`http://localhost:8770/` no navegador (pode salvar como favorito).

### Por que precisa do servidor?

O app é dividido em módulos JavaScript (`import`), que o navegador só carrega via
`http://` — não funciona abrindo o `index.html` direto (`file://`). O `serve.ps1`
é um servidor estático mínimo escrito em PowerShell puro: **zero dependências,
zero instalação**.

---

## Onde ficam os dados

Tudo é salvo **localmente no navegador** (IndexedDB) — fichas, imagens, templates.
Nada vai para a internet. Funciona offline.

- **Backup / levar para outro PC:** `Exportar ▸ Arquivo .ftj` gera um arquivo com a
  ficha + imagens embutidas. No outro computador: `⋯ ▸ Importar ficha`.
- A arquitetura já está pronta para uma **futura sincronização em nuvem** (Firebase),
  sem reescrever o sistema.

> ⚠️ Como os dados ficam no navegador, **não limpe os dados do site** e faça
> backups periódicos (`Exportar ▸ .ftj`) das fichas importantes.

---

## Estrutura do projeto

```
FICHA TECNICA TBT/
├── index.html            ← ponto de entrada
├── serve.ps1             ← servidor local (PowerShell)
├── README.md             ← este arquivo
├── MANUAL.md             ← manual de uso (passo a passo)
├── styles/               ← CSS (tema técnico industrial + folha A4 + impressão)
├── vendor/
│   └── html-to-image.js  ← biblioteca p/ exportar PNG/JPG (offline)
├── docs/
│   ├── ARQUITETURA.md    ← decisões técnicas, modelo de dados, custos
│   └── FLUXO.md          ← fluxo de uso e telas
└── src/
    ├── main.js           ← inicialização e orquestração
    ├── store.js          ← estado + persistência (IndexedDB)
    ├── db.js             ← camada IndexedDB
    ├── model.js          ← modelo de dados + definição das tabelas
    ├── templates.js      ← modelos prontos (calça/bermuda/jaqueta/camisa...)
    ├── ficha.js          ← renderiza o documento A4 (cabeçalho, tabelas...)
    ├── canvas.js         ← prancheta: imagens e marcações (mover/girar/redimensionar)
    ├── tables.js         ← tabelas editáveis + colar do Excel
    ├── inspector.js      ← painel de propriedades
    ├── library.js        ← banco de produtos (busca)
    ├── export.js         ← exportação PDF/PNG/JPG/.ftj
    └── util.js           ← utilitários
```

---

## Exportação

| Formato | Como | Uso |
|--------|------|-----|
| **PDF** | `Exportar ▸ PDF` → "Salvar como PDF" na janela de impressão | Impressão e envio oficial (qualidade máxima, vetorial) |
| **PNG** | `Exportar ▸ PNG` | Alta resolução p/ apresentação |
| **JPG** | `Exportar ▸ JPG` | Arquivo menor p/ WhatsApp/e-mail |
| **.ftj** | `Exportar ▸ Arquivo .ftj` | Backup / enviar a outro computador (inclui imagens) |

---

Leia o **[MANUAL.md](MANUAL.md)** para o passo a passo completo.
