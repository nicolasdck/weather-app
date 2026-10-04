import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Donne un identifiant unique à sw.js à chaque build : le navigateur détecte ainsi
// une nouvelle version à chaque déploiement et l'application affiche la bannière de mise à jour.
function serviceWorkerVersion(): Plugin {
  let outDir = 'dist'
  return {
    name: 'service-worker-version',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js')
      const source = readFileSync(file, 'utf8')
      writeFileSync(file, source.replace('__BUILD_ID__', Date.now().toString(36)))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorkerVersion()],
})
