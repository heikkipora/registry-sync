import globals from 'globals'
import mocha from 'eslint-plugin-mocha'
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  mocha.configs.recommended,
  {
    rules: {
      'mocha/no-mocha-arrows': 'off'
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node,
      }
    }
  }
]
 