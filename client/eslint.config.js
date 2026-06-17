import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // 数据获取场景下 effect 中 setState 是标准模式，降级为 warn 避免误报
      'react-hooks/set-state-in-effect': 'warn',
      // Context 文件同时导出 Provider 组件和 hook 是标准模式
      'react-refresh/only-export-components': 'off',
    },
  },
])
