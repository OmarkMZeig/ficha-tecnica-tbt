// Titulo de bloco com botao de OCULTAR (modo invisibilidade p/ fornecedor).
// Blocos ocultos: aparecem esmaecidos no editor, mas somem na impressao/exportacao.
import { el } from './util.js';
import { store, commit } from './store.js';

export const isHidden = (mod) => !!(store.current && store.current.hidden && store.current.hidden[mod]);
export const sectionClass = (base, mod) => base + (isHidden(mod) ? ' mod-hidden' : '');

export function blockTitle(label, mod, rightNode) {
  const hidden = isHidden(mod);
  const right = el('span', { class: 'bt-right' });
  if (rightNode) right.append(rightNode);
  if (mod) {
    right.append(el('button', {
      class: 'eye-toggle' + (hidden ? ' on' : ''),
      title: hidden ? 'Oculto na entrega ao fornecedor — clique para mostrar' : 'Ocultar este bloco na entrega ao fornecedor',
      onclick: (e) => { e.stopPropagation(); toggleHidden(mod); },
    }, hidden ? '🚫 oculto' : '👁'));
  }
  return el('div', { class: 'block-title', dataset: mod ? { mod } : {} }, el('span', {}, label), right);
}

function toggleHidden(mod) {
  const f = store.current;
  f.hidden = f.hidden || {};
  f.hidden[mod] = !f.hidden[mod];
  commit('load');
}
