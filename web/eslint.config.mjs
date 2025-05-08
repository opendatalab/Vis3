import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  ignores: [
    '**/dist/',
  ],
}, {
  rules: {
    'curly': ['error', 'all'],
    'unused-imports/no-unused-vars': 'error',
    'import/order': [
      'error',
      {
        'groups': ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        'pathGroups': [
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        'pathGroupsExcludedImportTypes': ['builtin'],
        'newlines-between': 'always',
      },
    ],
  },
})
