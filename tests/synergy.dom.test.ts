// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ui } from '../src/data/i18n';
import { createInitialState, skills, SKILL_BRANCHES, type GameState } from '../src/engine/state';
import { mountSynergy, renderSynergy, synergyView } from '../src/ui/synergy';

/**
 * A lista de sinergias no painel da árvore (INTER-08).
 *
 * A view está no tests/synergy.test.ts, em node. Aqui só o que não existe sem
 * DOM: o título com a contagem, uma linha por sinergia, o estado escrito e nada
 * focável — é o que permite reconstruir a lista a cada mês sem arrancar o foco
 * de ninguém.
 */

const RAIZES = SKILL_BRANCHES.map(
  (branch) => skills.find((skill) => skill.branch === branch && skill.requires.length === 0)?.id,
).filter((id): id is string => id !== undefined);

function mount(): HTMLElement {
  const root = document.createElement('section');
  document.body.replaceChildren(root);
  mountSynergy(root);
  return root;
}

function linhas(root: ParentNode): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.synergy__row'));
}

describe('a lista no DOM', () => {
  it('tem rótulo para o leitor de tela e título com a contagem', () => {
    const root = mount();
    renderSynergy(root, synergyView(createInitialState(2025)));

    expect(root.getAttribute('aria-label')).toBe(ui.synergy.label);
    expect(root.querySelector('.synergy__title')?.textContent).toContain(
      `0 de ${linhas(root).length}`,
    );
  });

  it('uma linha por sinergia, com nome, condição e efeito escritos', () => {
    const root = mount();
    renderSynergy(root, synergyView(createInitialState(2025)));

    const [linha] = linhas(root);
    expect(linhas(root).length).toBeGreaterThanOrEqual(3);
    expect(linha?.querySelector('.synergy__name')?.textContent?.trim()).toBeTruthy();
    expect(linha?.querySelector('.synergy__requirement')?.textContent).toContain('ramos');
    expect(linha?.querySelector('.synergy__description')?.textContent?.trim()).toBeTruthy();
  });

  it('§5: o estado tem ícone E palavra, e o ícone é decoração', () => {
    const root = mount();
    renderSynergy(root, synergyView(createInitialState(2025)));

    const [linha] = linhas(root);
    expect(linha?.querySelector('.synergy__status')?.textContent).toBe(
      ui.synergy.status.pending.label,
    );
    expect(linha?.querySelector('.synergy__status-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a sinergia fechada é marcada, e o título conta', () => {
    const root = mount();
    const state: GameState = { ...createInitialState(2025), unlockedSkills: RAIZES };
    renderSynergy(root, synergyView(state));

    expect(linhas(root)[0]?.dataset.done).toBe('true');
    expect(linhas(root)[1]?.dataset.done).toBe('false');
    expect(root.querySelector('.synergy__title')?.textContent).toContain('1 de');
  });

  /** Sem botão, a lista pode ser reconstruída a cada mês sem custo nenhum. */
  it('não tem nada focável dentro', () => {
    const root = mount();
    renderSynergy(root, synergyView(createInitialState(2025)));

    expect(root.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });

  it('o ícone do título sobrevive aos redesenhos', () => {
    const root = mount();
    renderSynergy(root, synergyView(createInitialState(2025)));
    renderSynergy(root, synergyView({ ...createInitialState(2025), unlockedSkills: RAIZES }));

    expect(root.querySelectorAll('.synergy__title svg.icon')).toHaveLength(1);
  });
});
