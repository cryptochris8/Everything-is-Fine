import { createGenesysConfig } from '@gnsx/genesys.js/eslint-config';

const files = [
  '**/*.ts',
  '**/*.tsx'
];

const FIXED_POSITION = /position\s*:\s*fixed/;

/**
 * Game UI placement rules. The editor shows the game in a panel, so `world.gameContainer`
 * is the game's screen. UI attached to `document.body` or positioned with `position: fixed`
 * is placed against the whole editor window instead.
 *
 * These are plugin rules, not `no-restricted-syntax` entries: the engine preset already
 * uses `no-restricted-syntax` for its XSS checks, and a second entry would replace them.
 */
const gameUiRules = {
  'no-page-level-ui': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Keep game UI inside world.gameContainer and off position: fixed.',
      },
      schema: [],
      messages: {
        body: 'Attach UI to world.gameContainer, not the page. In the editor the game is a panel, not the whole window.',
        fixed: 'Use position: absolute inside world.gameContainer. position: fixed is placed against the whole editor window.',
      },
    },
    create(context) {
      const reportFixed = node => context.report({ node, messageId: 'fixed' });
      return {
        'MemberExpression[object.name=\'document\'][property.name=/^(body|documentElement)$/]'(node) {
          context.report({ node, messageId: 'body' });
        },
        Literal(node) {
          if (typeof node.value === 'string' && FIXED_POSITION.test(node.value)) {
            reportFixed(node);
          }
        },
        TemplateElement(node) {
          if (FIXED_POSITION.test(node.value.raw)) {
            reportFixed(node);
          }
        },
        // el.style.position = 'fixed'
        'AssignmentExpression[left.property.name=\'position\'][right.value=\'fixed\']': reportFixed,
        // Object.assign(el.style, { position: 'fixed' })
        'Property[key.name=\'position\'][value.value=\'fixed\']': reportFixed,
        // el.style.setProperty('position', 'fixed')
        'CallExpression[callee.property.name=\'setProperty\'][arguments.0.value=\'position\'][arguments.1.value=\'fixed\']': reportFixed,
      };
    },
  },
  'no-page-wide-dom-query': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Prefer element references or queries scoped to the game UI over page-wide lookups.',
      },
      schema: [],
      messages: {
        query: 'document.{{name}} searches the whole page, editor included, and returns null for detached elements. Keep a reference to the element, or query from your panel or world.gameContainer.',
      },
    },
    create(context) {
      return {
        'MemberExpression[object.name=\'document\'][property.name=/^(getElementById|querySelector|querySelectorAll)$/]'(node) {
          context.report({ node, messageId: 'query', data: { name: node.property.name } });
        },
      };
    },
  },
};

export default [
  ...createGenesysConfig({
    preset: 'game',
    tsConfigPaths: ['./tsconfig.json'],
    ignores: [
      'dist/**',
      '.engine/**',
      '.agents/**',
      '.genesys/**',
      'node_modules/**',
      '**/*.d.ts'
    ],
    files,
    includeStyleRules: false
  }),
  {
    files,
    plugins: {
      'game-ui': { rules: gameUiRules }
    },
    rules: {
      'game-ui/no-page-level-ui': 'error',
      'game-ui/no-page-wide-dom-query': 'warn'
    }
  }
];
