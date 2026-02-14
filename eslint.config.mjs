import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      }
    }
  }
]
