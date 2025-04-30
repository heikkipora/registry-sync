import globals from 'globals'
import mochaPlugin from 'eslint-plugin-mocha'
import jsPlugin from '@eslint/js'
import parser from '@typescript-eslint/parser'
import prettierConfig from 'eslint-config-prettier/flat'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import {defineConfig} from 'eslint/config'

export default defineConfig([
  prettierConfig,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    extends: ['@typescript-eslint/eslint-recommended', '@typescript-eslint/recommended', 'js/recommended'],
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      js: jsPlugin,
      mocha: mochaPlugin
    },
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node
      },
      parser
    }
  }
])
