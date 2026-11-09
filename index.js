/**
 * Host half of the Session Cost (TWD) bundle.
 *
 * The visible contribution is the `cost` and `balance` entries in the
 * `conversation.composer.dock` slot, registered by `client.js`. This half
 * exists for two reasons: every Loader row needs a resolvable package module,
 * and the wallet balance must be read on the Host — the browser never sees the
 * account grant.
 *
 * `GET /api/session-cost/balance` sits under `/api/`, so the connection
 * service has already authenticated the request before the handler runs.
 * The handler asks the same account service the Settings → Account card uses,
 * so the numbers match and the grant never leaves the Host.
 *
 * @module dsh-session-cost-twd
 */

/** Route the browser half polls. */
const ROUTE = '/api/session-cost/balance'

/** Plugin name, also the row name through the bundle patch. */
export const name = 'session-cost-twd'

/** Host services this route needs: the authenticated fence and the account. */
export const inject = ['connection', 'deepseekAccount']

/** Headers shared by every answer; wallet data is never cached by a proxy. */
const HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json; charset=utf-8',
}

/**
 * Register the balance route for the plugin's lifetime.
 * @param ctx - Host context carrying `connection` and `deepseekAccount`.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE,
    methods: ['GET', 'HEAD'],
    requestBody: 'buffered',
    fetch: request => serve(ctx, request),
  }), 'session-cost-twd: balance route')
}

/**
 * Answer one balance request.
 * @param ctx - Host context.
 * @param request - fetch request built by the bridge.
 * @returns the sanitized wallet outcome.
 */
async function serve(ctx, request) {
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: HEADERS })
  }
  const client = {
    version: '0.2.1-rc.4',
    locale: requestLocale(request),
    timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
  }
  try {
    const result = await ctx.deepseekAccount.getBalance(client)
    if (result === null || result === undefined) return json({ status: 'signed-out' })
    return json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json({ status: 'failed', message }, 502)
  }
}

/**
 * Read the UI language from the request without trusting it for anything else.
 * @param request - the incoming request.
 * @returns a locale tag such as `zh-TW`.
 */
function requestLocale(request) {
  const header = request.headers.get('accept-language')
  if (typeof header !== 'string') return 'zh-TW'
  const first = header.split(',')[0].trim()
  return first === '' ? 'zh-TW' : first
}

/**
 * Encode one JSON answer.
 * @param value - serializable body.
 * @param status - HTTP status.
 * @returns the response.
 */
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: HEADERS })
}
