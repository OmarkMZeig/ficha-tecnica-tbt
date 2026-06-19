# Fluxo de utilização e telas

## Telas

O sistema tem **duas telas** alternadas pelo seletor `Editor | Biblioteca` no topo.

### Tela 1 — Editor
```
┌──────────────────────────────────────────────────────────────────────┐
│ FT Ficha Técnica TBT │ REF-1234 · Calça Jeans │ [Editor|Biblioteca] │ ações │
├───┬──────────────────────────────────────────────────────┬───────────┤
│ ➚ │ ┌──────────── FOLHA A4 ────────────────────────────┐ │ CATEGORIA │
│ 🖼 │ │ CABEÇALHO (ref, marca, cliente, coleção, data...)│ │ [Calça ▾] │
│ ──│ │──────────────────────────────────────────────────│ │           │
│ T │ │ DESENHO TÉCNICO (prancheta livre p/ fotos+marcas) │ │ propriedades│
│ ↗ │ │                                                  │ │ do objeto │
│ ╱ │ │──────────────────────────────────────────────────│ │ selecionado│
│ ◯ │ │ MEDIDAS · AVIAMENTOS · MATERIAIS · CUSTOS        │ │           │
│ ▭ │ │ OBSERVAÇÕES · REVISÕES · APROVAÇÕES              │ │ INFORMAÇÕES│
│ 💬│ └──────────────────────────────────────────────────┘ │           │
│ ① │                                                       │           │
└───┴──────────────────────────────────────────────────────┴───────────┘
```

### Tela 2 — Biblioteca (banco de produtos)
```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍 Buscar referência/marca/cliente/coleção...   [Todas categorias ▾] │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│ │ [foto]  │  │ [foto]  │  │ [foto]  │  │ [foto]  │                    │
│ │ REF·v1.0│  │ REF·v2.1│  │ REF·v1.0│  │ REF·v1.3│                    │
│ │ Calça.. │  │ Bermuda │  │ Jaqueta │  │ Camisa  │                    │
│ │[Abrir]🗑│  │[Abrir]🗑│  │[Abrir]🗑│  │[Abrir]🗑│                    │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘                    │
└──────────────────────────────────────────────────────────────────────┘
```

## Fluxo principal — criar uma ficha

```
[+ Nova] ─► escolher modelo ─► preencher cabeçalho ─► arrastar fotos
   ─► anotar (setas/números/balões) ─► ajustar tabelas (ou colar do Excel)
   ─► [Exportar ▸ PDF]  ✔ (salvo automaticamente no banco)
```

## Fluxo — nova cor/variação da mesma peça

```
abrir ficha ─► [Duplicar] ─► trocar cor/fotos/medidas ─► salvar
```

## Fluxo — peça mudou (mesma referência)

```
abrir ficha ─► [+ Versão] (descreve a mudança) ─► editar ─► exportar
            (a versão sobe 1.0→1.1 e entra no Controle de Revisões)
```

## Fluxo — reutilizar como modelo

```
montar a ficha "padrão" ─► [⋯ ▸ Salvar como modelo]
                          ─► aparece em [+ Nova] para os próximos produtos
```

## Fluxo — levar para outro computador

```
[Exportar ▸ Arquivo .ftj]  ──(pendrive/e-mail)──►  [⋯ ▸ Importar ficha]
```

## Automações disponíveis

| Necessidade | Recurso |
|-------------|---------|
| Duplicar ficha existente | **Duplicar** |
| Criar nova versão | **+ Versão** (com registro automático na revisão) |
| Atualizar só as tabelas | edite as tabelas; o desenho permanece |
| Atualizar só os desenhos | edite a prancheta; as tabelas permanecem |
| Clonar produtos semelhantes | **Duplicar** + ajustar, ou **Salvar como modelo** |
| Reaproveitar grade/aviamentos | **Modelos prontos** por categoria |
