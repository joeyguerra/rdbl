#!/usr/bin/env bun
/**
 * rdbl docs static site generator
 * Usage: bun run bin/build.js
 * Output: dist/
 */

import { readdir, mkdir, copyFile } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const SRC = join(ROOT, 'docs/src')
const ASSETS_SRC = join(ROOT, 'docs/assets')
const RDBL_SRC = join(ROOT, 'src/rdbl.js')
const DIST = join(ROOT, 'dist')
const ASSETS_DIST = join(DIST, 'assets')

const layout = await Bun.file(join(SRC, '_layout.html')).text()

async function build() {
  // Clean dist
  await Bun.$`rm -rf ${DIST}`.quiet()
  await mkdir(ASSETS_DIST, { recursive: true })

  // Copy assets
  const assets = await readdir(ASSETS_SRC)
  for (const asset of assets) {
    await copyFile(join(ASSETS_SRC, asset), join(ASSETS_DIST, asset))
  }

  // Copy rdbl.js to assets
  await copyFile(RDBL_SRC, join(ASSETS_DIST, 'rdbl.js'))

  // Process pages
  await processDir(SRC, DIST)

  const count = pageCount
  console.log(`\n  ✦ Build complete → dist/  (${count} pages)\n`)
}

let pageCount = 0

async function processDir(srcDir, distDir) {
  const entries = await readdir(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue
    const srcPath = join(srcDir, entry.name)
    const distPath = join(distDir, entry.name)
    if (entry.isDirectory()) {
      await mkdir(distPath, { recursive: true })
      await processDir(srcPath, distPath)
    } else if (entry.name.endsWith('.html')) {
      await processPage(srcPath, distPath, srcDir)
    }
  }
}

async function processPage(srcPath, distPath, srcDir) {
  const content = await Bun.file(srcPath).text()

  // Extract <!-- title: ... --> comment
  const titleMatch = content.match(/<!--\s*title:\s*(.+?)\s*-->/)
  const title = titleMatch ? `${titleMatch[1]} — rdbl` : 'rdbl'

  // Extract <!-- nav: ... --> for active nav link
  const navMatch = content.match(/<!--\s*nav:\s*(.+?)\s*-->/)
  const navActive = navMatch ? navMatch[1].trim() : ''

  // Extract <!-- desc: ... --> for meta description
  const descMatch = content.match(/<!--\s*desc:\s*(.+?)\s*-->/)
  const desc = descMatch ? descMatch[1].trim() : 'Signals-based reactivity wired directly to plain HTML. No build step. No virtual DOM.'

  // Strip meta comments from page body
  const body = content
    .replace(/<!--\s*title:[^>]+-->/g, '')
    .replace(/<!--\s*nav:[^>]+-->/g, '')
    .replace(/<!--\s*desc:[^>]+-->/g, '')
    .trim()

  // Compute root-relative path (for assets)
  const relFromDist = relative(DIST, distPath)
  const depth = relFromDist.split('/').length - 1
  const rootPath = depth === 0 ? './' : '../'.repeat(depth)

  // Render layout
  let html = layout
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{desc\}\}/g, desc)
    .replace(/\{\{content\}\}/g, body)
    .replace(/\{\{rootPath\}\}/g, rootPath)
    .replace(/\{\{navActive\}\}/g, navActive)

  await Bun.write(distPath, html)
  pageCount++
  const rel = relative(ROOT, distPath)
  console.log(`  ✓  ${rel}`)
}

console.log('\n  ◎ rdbl docs build\n')
await build()
