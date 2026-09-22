import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// A ideia aqui é que o lint cobre as regras da FORMA-DE-TRABALHO.md em vez de
// confiar na memória de quem revisa. Cada bloco abaixo cita a regra que aplica.
export default tseslint.config(
  { ignores: ['dist/', 'dist-feira/', 'coverage/', 'node_modules/'] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    rules: {
      // Quem checa variável não declarada é o tsc, com muito mais precisão.
      // Deixar ligado só produz falso positivo com globais do navegador.
      'no-undef': 'off',

      // Regra 6: sem console.log no código final. warn e error seguem liberados
      // porque são canal de erro de verdade, não depuração esquecida.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Regra 7: nenhum Math.random() em lugar nenhum.
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Regra 7 da FORMA-DE-TRABALHO.md: todo sorteio usa o RNG semeado de src/engine/rng.ts. Math.random() torna a partida irreproduzível.',
        },
      ],

      // §4: preferir `type` a `interface`.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // Regra 6: sem @ts-ignore. O recommended já proíbe; aqui só reforçamos que
      // @ts-expect-description precisa de justificativa escrita.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
      ],

      // Variável não usada com prefixo _ é intencional (ex.: parâmetro de assinatura).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    // §3, regra de ouro da arquitetura: engine/ não sabe que existe uma tela.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', '**/ui'],
              message:
                'Regra de ouro (§3): engine/ não pode importar de ui/. O engine é TS puro e testável sem DOM.',
            },
          ],
        },
      ],
    },
  },

  // Precisa ser o último: desliga as regras de formatação que o Prettier resolve.
  prettier,
);
