import { copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distIndex = path.join(appRoot, 'dist', 'index.html')
const distShell = path.join(appRoot, 'dist', 'og-shell.html')

if (existsSync(distIndex)) {
    copyFileSync(distIndex, distShell)
    console.log(`copied ${path.relative(appRoot, distIndex)} -> ${path.relative(appRoot, distShell)}`)
} else {
    console.warn('dist/index.html not found, skipping og-shell copy')
}
