import sdkConfig from './.genesys/sdk/eslint.config.js';

/**
 * ESLint configuration for this Genesys project.
 *
 * This file imports the SDK's base ESLint configuration and exports it.
 * You can customize/extend the rules here for your specific project needs.
 *
 * @example Add custom rules:
 * export default [
 *   ...sdkConfig,
 *   {
 *     rules: {
 *       'custom/my-rule': 'warn'
 *     }
 *   }
 * ];
 */
export default [
  ...sdkConfig,
  // tests/ and tools/ are Node-only (run with tsx), outside tsconfig's src/, so the typed rules cannot parse them.
  { ignores: ['tests/**', 'tools/**'] },
  // Add your custom overrides below:
  // {
  //   rules: {
  //     // your custom rules
  //   }
  // }
];
