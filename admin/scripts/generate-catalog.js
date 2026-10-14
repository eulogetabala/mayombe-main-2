#!/usr/bin/env node
/**
 * Génère admin/public/restaurant-catalog.json à partir de l'API.
 *
 * POURQUOI CE SCRIPT EXISTE
 * -------------------------
 * L'API refuse les requêtes venant du navigateur (elle répond 500 dès qu'un
 * en-tête Origin est présent, et n'émet aucun en-tête CORS). Le dashboard
 * passe donc normalement par un proxy Cloud Function… qui est actuellement
 * hors service (facturation Firebase en suspens).
 *
 * Résultat : le navigateur ne peut pas joindre l'API, et l'admin retombe sur
 * le catalogue embarqué (mode dégradé). Si ce catalogue n'est jamais
 * régénéré, il se fige : les restaurants ajoutés côté Laravel deviennent
 * invisibles dans l'admin, et les restaurants supprimés y restent.
 *
 * CE SCRIPT
 * ---------
 * Il s'exécute dans Node, donc SANS navigateur et SANS en-tête Origin : il
 * joint l'API directement, sans proxy ni CORS. Lancé avant chaque build, il
 * garantit que le catalogue embarqué reste le reflet fidèle de l'API.
 *
 * En cas d'échec (API injoignable, réseau coupé), le catalogue existant est
 * conservé intact et le build continue : ce script ne casse jamais un
 * déploiement.
 */

import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../public/restaurant-catalog.json')

const API_BASE_URL =
  process.env.VITE_API_BASE_URL ||
  'https://www.api-mayombe.mayombe-app.com/public/api'

const REQUEST_TIMEOUT_MS = 20000

const fetchRestaurants = async () => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}/resto`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const payload = await response.json()
    const list = Array.isArray(payload) ? payload : payload?.data

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('Réponse vide ou format inattendu')
    }

    return list
  } finally {
    clearTimeout(timer)
  }
}

const readExistingCatalog = async () => {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8'))
  } catch {
    return null
  }
}

const summarize = (catalog) => {
  const items = Array.isArray(catalog) ? catalog : catalog?.restaurants || []
  return items.map((r) => String(r.id)).sort((a, b) => Number(a) - Number(b))
}

const main = async () => {
  const existing = await readExistingCatalog()

  let restaurants
  try {
    restaurants = await fetchRestaurants()
  } catch (error) {
    if (existing) {
      console.warn(
        `⚠️  Catalogue NON régénéré (API injoignable : ${error.message}). ` +
        `Le catalogue existant (${existing.count ?? '?'} restaurants) est conservé.`
      )
      return
    }
    console.error(`❌ API injoignable (${error.message}) et aucun catalogue existant.`)
    process.exitCode = 1
    return
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    source: `${API_BASE_URL}/resto`,
    count: restaurants.length,
    restaurants,
  }

  const before = summarize(existing)
  const after = summarize(catalog)

  const added = after.filter((id) => !before.includes(id))
  const removed = before.filter((id) => !after.includes(id))

  await writeFile(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')

  console.log(`✅ Catalogue régénéré : ${restaurants.length} restaurants`)
  if (added.length) console.log(`   + ajoutés   : ${added.join(', ')}`)
  if (removed.length) console.log(`   - supprimés : ${removed.join(', ')}`)
  if (!added.length && !removed.length) console.log('   (identique au précédent)')
}

main().catch((error) => {
  console.error('❌ Erreur inattendue du générateur de catalogue:', error.message)
  process.exitCode = 1
})
