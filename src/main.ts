// Ponto de entrada da aplicação.
// Por enquanto ele só prova que o bundle TypeScript carregou e executou —
// é isso que o SETUP-02 precisa demonstrar. O jogo em si entra a partir da
// Parte 5 (UI) e da Parte 6 (engine).

const root = document.querySelector<HTMLDivElement>('#app');

if (root === null) {
  throw new Error('Elemento #app não encontrado — verifique o index.html.');
}

// Verificável no DevTools: a div #app precisa ganhar data-status="pronto".
// Se o atributo não aparecer, o módulo não rodou.
root.dataset.status = 'pronto';
