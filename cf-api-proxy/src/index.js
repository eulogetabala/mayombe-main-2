/**
 * Proxy API Mayombe — Cloudflare Worker
 * =====================================
 *
 * POURQUOI CE PROXY
 * -----------------
 * L'API Laravel a deux comportements bloquants pour un navigateur :
 *   1. Elle répond 500 dès qu'un en-tête `Origin` est présent.
 *   2. Elle n'émet aucun en-tête CORS.
 * Un navigateur envoyant TOUJOURS `Origin`, l'admin ne peut pas l'appeler
 * directement : il retombait donc sur un catalogue figé (mode dégradé).
 *
 * Le proxy Firebase historique (`apiProxy`) remplissait ce rôle mais il est
 * hors service (facturation Firebase en suspens).
 *
 * CE WORKER
 * ---------
 * Il relaie les requêtes côté serveur, sans navigateur :
 *   navigateur → ce Worker → API Mayombe
 * Comme il ne transmet JAMAIS l'en-tête `Origin` à l'API, celle-ci répond
 * normalement (200). Il ajoute ensuite les en-têtes CORS attendus par le
 * navigateur.
 *
 * Offre gratuite Cloudflare Workers : 100 000 requêtes/jour.
 */

const API_ORIGIN = 'https://www.api-mayombe.mayombe-app.com/public/api'

/** Origines autorisées à consommer ce proxy. */
const ALLOWED_ORIGINS = [
  'https://mayombe-ba11b.web.app',
  'https://admin-mayombe.web.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const buildCorsHeaders = (origin) => ({
  // On renvoie l'origine exacte si elle est autorisée, sinon la première
  // (le navigateur refusera alors la réponse, ce qui est le comportement voulu).
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || ''
    const cors = buildCorsHeaders(origin)

    // Préflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const incoming = new URL(request.url)
    const target = `${API_ORIGIN}${incoming.pathname}${incoming.search}`

    // En-têtes transmis à l'API. On ne recopie QUE ce qui est utile :
    // surtout pas `Origin`, qui déclenche le 500, ni les en-têtes hop-by-hop.
    const headers = new Headers()
    headers.set('Accept', request.headers.get('Accept') || 'application/json')

    const authorization = request.headers.get('Authorization')
    if (authorization) headers.set('Authorization', authorization)

    const contentType = request.headers.get('Content-Type')
    if (contentType) headers.set('Content-Type', contentType)

    const init = { method: request.method, headers, redirect: 'follow' }
    if (!['GET', 'HEAD'].includes(request.method)) {
      init.body = await request.arrayBuffer()
    }

    let upstream
    try {
      upstream = await fetch(target, init)
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Proxy: API injoignable',
          detail: String(error),
          target,
        }),
        { status: 502, headers: { ...cors, ...JSON_HEADERS } }
      )
    }

    const responseHeaders = new Headers(cors)
    const upstreamContentType = upstream.headers.get('Content-Type')
    if (upstreamContentType) responseHeaders.set('Content-Type', upstreamContentType)

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    })
  },
}
