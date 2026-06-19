# Arquitetura — Ficha Técnica TBT

## 1. Decisão de formato (por que aplicação web local)

Avaliamos as opções pedidas no briefing:

| Opção | Veredito |
|------|----------|
| Word inteligente | ❌ Layout livre + marcações sobre foto não são confiáveis; difícil padronizar |
| PowerPoint editável | ❌ Vira "gambiarra"; sem banco de dados, busca ou versionamento |
| PDF preenchível | ❌ Ótimo para sair, péssimo para **editar/duplicar/versionar** |
| App desktop (Tauri/Electron) | ⚠️ Melhor empacotamento, mas **exige build/instalação** (a máquina não tem Node.js) |
| **App web local** | ✅ **Escolhida** — drag-and-drop, sem instalação, roda offline, exporta PDF/PNG perfeitos |

**Escolha: aplicação web que roda localmente** (servida pelo `serve.ps1`), no
mesmo padrão dos outros sistemas da casa (ERP de confecção, Bling Cockpit).
Empacotar como app desktop (Tauri) fica como evolução futura **sem reescrever** o
código (o núcleo já é web).

### Tecnologias
- **HTML + CSS + JavaScript (ES Modules) puro** — sem framework, sem build, sem
  dependências de runtime. Mais leve e fácil de manter do que React-via-CDN para
  um **editor de canvas** (que é, por natureza, manipulação direta de DOM).
- **SVG + HTML posicionado** para a prancheta — vetorial, escala sem perder
  qualidade, imprime perfeito.
- **IndexedDB** para persistência local (fichas, imagens em blob, templates).
- **Impressão nativa do navegador** para PDF (fidelidade total, zero dependência).
- **html-to-image** (10 KB, hospedada localmente) para exportar PNG/JPG.

## 2. Camadas

```
 UI (DOM)  ──►  main.js (orquestra)
                   │
   ┌───────────────┼─────────────────────────────┐
   ▼               ▼                               ▼
 ficha.js       canvas.js                      inspector.js / library.js
 (documento)    (prancheta: objetos)           (painéis)
   │               │
   └──────┬────────┘
          ▼
       store.js  (estado + autosave)
          ▼
        db.js   (IndexedDB)  ──►  [futuro: Firebase, sem mudar as camadas acima]
```

**Princípio:** toda escrita passa pelo `store`/`db`. Trocar `db.js` por
Firestore/Storage no futuro habilita nuvem **sem tocar** na UI nem no editor.

## 3. Modelo de dados (uma ficha)

```js
{
  id,                         // uuid
  meta: {                     // CABEÇALHO
    referencia, descricao, marca, cliente, colecao,
    categoria, codigoInterno, responsavel, data, versao, pecaPiloto
  },
  board: {                    // PRANCHETA (desenho livre)
    numberSeq,                // contador da numeração automática
    objects: [                // modelo unificado: todo objeto é um bbox
      { id, type:'image',  x,y,w,h,rot,z, imgKey },
      { id, type:'text',   x,y,w,h,rot,z, text,font,size,color,bold,italic,underline,align },
      { id, type:'arrow'|'line'|'circle'|'rect', x,y,w,h,rot,z, stroke,strokeW,fill },
      { id, type:'callout',x,y,w,h,rot,z, text,stroke,fill,size,color },
      { id, type:'number', x,y,w,h,rot,z, value,fill,color }
    ]
  },
  tables: {                   // TABELAS (arrays de linhas)
    medidas:    [ {tamanho,cintura,quadril,gancho,coxa,joelho,boca,entrepernas,comprimento} ],
    aviamentos: [ {codigo,descricao,fornecedor,cor,qtd} ],
    materiais:  [ {tecido,composicao,gramatura,cor,consumo} ],
    custos:     [ {item,valor} ]
  },
  observacoes,                // texto livre
  revisoes: [ {data,usuario,alteracao} ],
  assinaturas: { modelista, aprovacao, producao },
  createdAt, updatedAt, thumb // thumb = miniatura JPEG (p/ a Biblioteca)
}
```

**Imagens** ficam fora do JSON (store `images`, por chave `imgKey`), como **blob**.
Vantagem: o JSON da ficha é leve e a imagem não é duplicada ao duplicar a ficha.

### Stores do IndexedDB
- `fichas` (keyPath `id`, índice `updatedAt`)
- `images` (keyPath `key`) — blobs das imagens
- `templates` (keyPath `id`) — modelos salvos pelo usuário
- `meta` (keyPath `k`) — config (ex.: última ficha aberta)

## 4. Prancheta — modelo unificado de objeto

Todo objeto (imagem, forma, texto, número) é um **retângulo orientado**
`{x, y, w, h, rot}`. Isso unifica seleção, mover, redimensionar e girar para
todos os tipos com o mesmo código (`canvas.js`). O redimensionamento é
**ciente da rotação** (mantém o canto oposto fixo no espaço da página).

- Formas vetoriais (seta/linha/círculo/retângulo) → `<svg>` redesenhado no resize.
- Imagem/texto/balão/número → elementos HTML posicionados.

## 5. Exportação e fidelidade de impressão

- **PDF:** `print.css` isola a folha A4 (`@page A4`, esconde todo o "chrome") e
  usa a **impressão nativa** → texto vetorial, imagens nítidas, cores exatas.
- **PNG/JPG:** `html-to-image` rasteriza a folha em `pixelRatio 3` (≈ alta
  resolução para A4).

## 6. Custos de implantação

| Item | Custo |
|------|-------|
| Licenças / assinaturas | **R$ 0** |
| Servidor / hospedagem | **R$ 0** (roda local) |
| Instalação | **R$ 0** (sem Node, sem build) |
| Internet | **Não exigida** (offline) |
| Manutenção | Baixa — código modular, sem dependências que quebram |

**Evoluções opcionais** (todas sem reescrever o núcleo):
1. **Nuvem (Firebase):** trocar `db.js` → fichas e banco de produtos compartilhados
   por toda a equipe (custo: faixa gratuita do Firebase atende bem no início).
2. **App desktop (Tauri):** empacotar para `.exe` com 1 clique (sem navegador).
3. **IA (Claude API):** sugerir aviamentos/observações a partir da foto.

## 7. Manutenção

- Cada recurso vive em **um módulo** (`canvas`, `tables`, `export`...).
- Sem ferramentas de build → editar o `.js` e recarregar o navegador.
- Sem dependências de runtime externas além de **uma** lib local (`html-to-image`).
