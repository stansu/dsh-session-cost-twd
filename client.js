window.__ModuleLoader__.load({
  id: 'dsh-session-cost-twd',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** React's portal helper, when the shell exposes it. */
    let createPortal = null
    try {
      const reactDom = require('react-dom')
      if (reactDom && typeof reactDom.createPortal === 'function') createPortal = reactDom.createPortal
    } catch {
      createPortal = null
    }

    /** Locale namespace owned by this plugin. */
    const NS = 'session-cost-twd'

    /** Browser storage key holding the reader's model and exchange-rate choice. */
    const STORE_KEY = 'dsh.session-cost-twd.v2'

    /** English dictionary. */
    const en = {
      'pill.label': 'Spend',
      'pill.aria': 'Estimated spend for this session: {amount}',
      'pill.estimate': 'est.',
      'pill.balance': 'Balance',
      'pill.balanceAria': 'DeepSeek balance: {amount}',
      'dialog.title': 'Estimated session spend',
      'dialog.subtitle': 'Priced from the token usage this session reports, at the official DeepSeek list price for the selected model.',
      'dialog.total': 'Total',
      'dialog.tokens': 'Tokens',
      'dialog.turns': 'Turns',
      'dialog.turn': 'Turn {turn}',
      'dialog.model': 'Model',
      'dialog.rate': 'USD → TWD',
      'dialog.rateNote': 'Used only for display; DeepSeek bills in US dollars.',
      'dialog.partial': 'Some turns did not report usage and are left out.',
      'dialog.peakNote': 'Peak hours are 01:00–04:00 and 06:00–10:00 UTC, Monday to Friday; Chinese public holidays are not tracked.',
      'dialog.note': 'Estimate only. Actual deductions come from your DeepSeek balance —',
      'dialog.noteLink': 'see the platform bill',
      'dialog.close': 'Close',
      'band.peak': 'Peak',
      'band.off': 'Off-peak',
      'balance.title': 'DeepSeek balance',
      'balance.recharge': 'Top-up balance',
      'balance.bonus': 'Bonus',
      'balance.updated': 'Updated {time}',
      'balance.open': 'Platform billing',
      'balance.native': '{amount} · rate {rate}',
      'balance.stale': 'Last read {time}',
      'balance.failed': 'Could not read the balance. The sign-in may have expired.',
      'balance.refresh': 'Refresh',
    }

    /** Traditional Chinese dictionary. */
    const zh = {
      'pill.label': '花費',
      'pill.aria': '本次對話估算花費：{amount}',
      'pill.estimate': '估算',
      'pill.balance': '餘額',
      'pill.balanceAria': 'DeepSeek 餘額：{amount}',
      'dialog.title': '本次對話花費估算',
      'dialog.subtitle': '依本次對話回報的 token 用量，套用所選模型的 DeepSeek 官方牌價估算。',
      'dialog.total': '合計',
      'dialog.tokens': 'Token',
      'dialog.turns': '輪次',
      'dialog.turn': '第 {turn} 輪',
      'dialog.model': '模型',
      'dialog.rate': '美元 → 臺幣',
      'dialog.rateNote': '只用於換算顯示，DeepSeek 實際以美元扣款。',
      'dialog.partial': '有部分輪次沒有回報用量，未計入。',
      'dialog.peakNote': '尖峰時段為 UTC 週一至週五 01:00–04:00、06:00–10:00（即北京時間 09:00–12:00、14:00–18:00），未計入中國法定假日。',
      'dialog.note': '僅為估算，實際扣款以 DeepSeek 餘額為準 —',
      'dialog.noteLink': '查看平台帳務',
      'dialog.close': '關閉',
      'band.peak': '尖峰',
      'band.off': '離峰',
      'balance.title': 'DeepSeek 餘額',
      'balance.recharge': '儲值餘額',
      'balance.bonus': '贈金',
      'balance.updated': '更新於 {time}',
      'balance.open': '平台帳務',
      'balance.native': '{amount} · 匯率 {rate}',
      'balance.stale': '上次讀取 {time}',
      'balance.failed': '讀取不到餘額，可能是登入過期或連線問題。',
      'balance.refresh': '重新整理',
    }

    /**
     * Official list prices, USD per million tokens, as [off-peak, peak].
     * Source: DeepSeek API docs, Models & Pricing, read 2026-11-09.
     */
    const MODELS = {
      'deepseek-flash': {
        title: 'deepseek-flash',
        hit: [0.003, 0.006],
        miss: [0.15, 0.3],
        out: [0.6, 1.2],
      },
      'deepseek-v4-pro': {
        title: 'deepseek-v4-pro',
        hit: [0.022, 0.044],
        miss: [0.66, 1.32],
        out: [1.98, 3.96],
      },
    }

    /** Default choice stored on first use. */
    const DEFAULTS = { model: 'deepseek-flash', rate: 32.85 }

    /** Host route that answers the sanitized wallet snapshot. */
    const BALANCE_ROUTE = '/api/session-cost/balance'

    /** How often the balance pill re-reads the platform wallet. */
    const BALANCE_REFRESH_MS = 120000

    /* Theme tokens only: the browser shell owns light and dark values. */
    const STYLES = `
      .dsh-sct-anchor {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .dsh-sct-pill {
        display: inline-flex;
        align-items: baseline;
        gap: 5px;
        padding: 2px 8px;
        border: 0.5px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 11px;
        line-height: 1.5;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }
      .dsh-sct-pill:hover,
      .dsh-sct-pill[aria-expanded='true'] {
        border-color: var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
      }
      .dsh-sct-pill:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary);
      }
      .dsh-sct-amount {
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .dsh-sct-tag {
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        opacity: 0.75;
      }
      .dsh-sct-panel {
        position: fixed;
        z-index: 60;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 320px;
        max-height: min(70vh, 560px);
        overflow-y: auto;
        box-sizing: border-box;
        padding: 14px 16px 16px;
        border: 0.5px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
        font-size: 12px;
        line-height: 1.5;
      }
      .dsh-sct-head {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .dsh-sct-heading {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .dsh-sct-title {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
      }
      .dsh-sct-subtitle {
        margin: 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        line-height: 1.45;
      }
      .dsh-sct-close {
        flex: none;
        padding: 2px 6px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
      }
      .dsh-sct-close:hover {
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
      }
      .dsh-sct-total {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }
      .dsh-sct-total-value {
        font-size: 24px;
        font-weight: 650;
        letter-spacing: -0.01em;
        font-variant-numeric: tabular-nums;
      }
      .dsh-sct-total-caption {
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
      }
      .dsh-sct-figures {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .dsh-sct-figure {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        padding: 2px 8px;
        border: 0.5px solid var(--dsw-alias-border-l1);
        border-radius: 7px;
        background: var(--dsw-alias-bg-layer-1);
      }
      .dsh-sct-figure-value {
        font-size: 11.5px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .dsh-sct-figure-label {
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
      }
      .dsh-sct-section-title {
        margin: 4px 0 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .dsh-sct-rows {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .dsh-sct-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: baseline;
        gap: 8px;
        padding: 4px 2px;
        border-bottom: 0.5px solid var(--dsw-alias-border-l1);
      }
      .dsh-sct-row:last-child {
        border-bottom: 0;
      }
      .dsh-sct-row-name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-sct-row-tokens {
        color: var(--dsw-alias-label-secondary);
        font-size: 10.5px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .dsh-sct-row-value {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .dsh-sct-band {
        margin-inline-start: 5px;
        padding: 0 4px;
        border-radius: 4px;
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary);
        font-size: 9.5px;
        font-weight: 500;
      }
      .dsh-sct-settings {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 6px 10px;
        padding-top: 4px;
        border-top: 0.5px solid var(--dsw-alias-border-l1);
      }
      .dsh-sct-label {
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
      }
      .dsh-sct-control {
        width: 100%;
        box-sizing: border-box;
        padding: 4px 7px;
        border: 0.5px solid var(--dsw-alias-border-l2);
        border-radius: 7px;
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 11.5px;
      }
      .dsh-sct-control:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary);
      }
      .dsh-sct-note {
        margin: 0;
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        line-height: 1.5;
      }
      .dsh-sct-note a {
        color: inherit;
        text-decoration: underline;
      }
      .dsh-sct-wallet {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        padding: 5px 0;
        border-bottom: 0.5px solid var(--dsw-alias-border-l1);
      }
      .dsh-sct-wallet:last-child {
        border-bottom: 0;
      }
      .dsh-sct-wallet-label {
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
      }
      .dsh-sct-wallet-value {
        font-size: 13px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .dsh-sct-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }
      .dsh-sct-button {
        padding: 4px 10px;
        border: 0.5px solid var(--dsw-alias-border-l2);
        border-radius: 7px;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 11.5px;
        line-height: 1.5;
        text-decoration: none;
        cursor: pointer;
      }
      .dsh-sct-button:hover {
        background: var(--dsw-alias-bg-layer-2);
      }
      .dsh-sct-button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary);
      }
    `

    /** TWD text with two decimals. */
    const twd = new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    /** USD text with two decimals. */
    const usd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    /** USD text with enough precision for tiny per-turn amounts. */
    const usdPrecise = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    /** Compact token counts. */
    const compact = new Intl.NumberFormat('en', { maximumFractionDigits: 1 })
    /** Clock for the balance timestamp. */
    const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

    /**
     * Format an amount in New Taiwan dollars.
     * @param value - amount in TWD.
     * @returns `NT$0.42`, or `NT$<0.01` for a positive sub-cent amount.
     */
    function formatTwd(value) {
      if (!(value > 0)) return 'NT$0.00'
      if (value < 0.005) return 'NT$<0.01'
      return `NT$${twd.format(value)}`
    }

    /**
     * Format a US dollar balance.
     * @param value - amount in USD.
     * @returns `$11.18`, or `<$0.01` for a positive sub-cent amount.
     */
    function formatUsd(value, currency = 'USD') {
      const symbol = currency === 'CNY' ? '¥' : '$'
      const amount = Number(value)
      if (!Number.isFinite(amount) || amount === 0) return `${symbol}0.00`
      if (amount > 0 && amount < 0.01) return `<${symbol}0.01`
      if (amount < 0 && amount > -0.01) return `-<${symbol}0.01`
      const sign = amount < 0 ? '-' : ''
      return `${sign}${symbol}${usd.format(Math.abs(amount))}`
    }

    /**
     * Format a small USD amount with enough decimals to stay meaningful.
     * @param value - amount in USD.
     * @returns `$0.0042`.
     */
    function formatUsdPrecise(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount) || amount === 0) return '$0.00'
      return `$${usdPrecise.format(amount)}`
    }

    /**
     * Format a token count compactly.
     * @param value - token count.
     * @returns `8.4k`, `1.2M`, or `0`.
     */
    function formatTokens(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '0'
      if (value < 1000) return String(Math.round(value))
      if (value < 1000000) return `${compact.format(value / 1000)}k`
      return `${compact.format(value / 1000000)}M`
    }

    /** UTC wall clock, the billing time zone for DeepSeek peak hours. */
    const utc = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })

    /**
     * Whether a moment falls in DeepSeek's peak billing window.
     * Peak is UTC Monday–Friday, 01:00–04:00 and 06:00–10:00.
     * @param time - epoch milliseconds.
     * @returns true for the peak price.
     */
    function isPeak(time) {
      const moment = new Date(typeof time === 'number' && Number.isFinite(time) ? time : Date.now())
      const parts = utc.formatToParts(moment)
      let weekday = ''
      let hour = 0
      let minute = 0
      for (const part of parts) {
        if (part.type === 'weekday') weekday = part.value
        if (part.type === 'hour') hour = Number(part.value)
        if (part.type === 'minute') minute = Number(part.value)
      }
      if (weekday === 'Sat' || weekday === 'Sun') return false
      const minutes = hour * 60 + minute
      return (minutes >= 60 && minutes < 240) || (minutes >= 360 && minutes < 600)
    }

    /**
     * Read the saved pricing choices.
     * @returns the stored model id and exchange rate, or the defaults.
     */
    function readConfig() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY)
        if (raw === null) return { ...DEFAULTS }
        const parsed = JSON.parse(raw)
        return {
          model: typeof parsed.model === 'string' && MODELS[parsed.model] !== undefined ? parsed.model : DEFAULTS.model,
          rate: typeof parsed.rate === 'number' && Number.isFinite(parsed.rate) && parsed.rate > 0 ? parsed.rate : DEFAULTS.rate,
        }
      } catch {
        return { ...DEFAULTS }
      }
    }

    /**
     * Persist the pricing choices.
     * @param config - model id and exchange rate.
     */
    function writeConfig(config) {
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(config))
      } catch {
        /* A storage-less shell keeps the choices for this page only. */
      }
    }

    /**
     * Normalize one usage record into disjoint billing buckets.
     * @param usage - reported token usage.
     * @returns bucket counts.
     */
    function buckets(usage) {
      const value = usage !== null && typeof usage === 'object' ? usage : {}
      const miss = typeof value.uncachedInputTokens === 'number' ? value.uncachedInputTokens : 0
      const hit = typeof value.cacheReadTokens === 'number' ? value.cacheReadTokens : 0
      const write = typeof value.cacheWriteTokens === 'number' ? value.cacheWriteTokens : 0
      const out = typeof value.outputTokens === 'number' ? value.outputTokens : 0
      return { miss, hit, write, out, total: miss + hit + write + out }
    }

    /**
     * Price one usage record.
     * @param usage - reported token usage.
     * @param model - model id into MODELS.
     * @param at - epoch milliseconds deciding the peak band.
     * @returns USD amount, the band it used, and the bucket counts.
     */
    function priceUsage(usage, model, at) {
      const price = MODELS[model] ?? MODELS[DEFAULTS.model]
      const peak = isPeak(at)
      const band = peak ? 1 : 0
      const counts = buckets(usage)
      const amount = (
        counts.miss * price.miss[band]
        + counts.write * price.miss[band]
        + counts.hit * price.hit[band]
        + counts.out * price.out[band]
      ) / 1000000
      return { amount, peak, counts }
    }

    /**
     * Read one published turn metric without assuming the data store shape.
     * @param location - resolved Turn location from the Chat timeline.
     * @returns the Turn's tail data, when the Chat target published it.
     */
    function turnTail(location) {
      const data = location && location.data
      if (!data || typeof data.get !== 'function') return undefined
      return data.get('turn-tail')
    }

    /**
     * Price every loaded turn of the timeline.
     * @param timeline - Chat timeline snapshot.
     * @param model - model id used for turns that do not report their own.
     * @returns priced rows, totals, and completeness flags.
     */
    function priceTimeline(timeline, model) {
      const order = timeline && Array.isArray(timeline.turnOrder) ? timeline.turnOrder : []
      const turns = timeline && timeline.turns
      const rows = []
      let totalUsd = 0
      let totalTokens = 0
      let missing = 0
      for (const turnNumber of order) {
        const location = turns && typeof turns.get === 'function' ? turns.get(turnNumber) : undefined
        const tail = turnTail(location)
        const usage = tail && tail.tokenUsage ? tail.tokenUsage : undefined
        if (usage === undefined) {
          missing += 1
          continue
        }
        const start = location && location.start ? location.start.time : undefined
        const at = typeof start === 'number' ? start : Date.now()
        const route = usage.routes && usage.routes.length > 0 ? usage.routes[0] : undefined
        const routed = route && typeof route.model === 'string' && MODELS[route.model] !== undefined
          ? route.model
          : model
        const priced = priceUsage(usage, routed, at)
        rows.push({
          turn: turnNumber,
          at,
          peak: priced.peak,
          counts: priced.counts,
          usd: priced.amount,
          model: routed,
        })
        totalUsd += priced.amount
        totalTokens += priced.counts.total
      }
      return { rows, totalUsd, totalTokens, missing, order }
    }

    /**
     * Anchor state for a pill and its panel: open flag, position, refs.
     * @returns control surface for the pill.
     */
    function usePillPanel() {
      const [open, setOpen] = React.useState(false)
      const [anchor, setAnchor] = React.useState(null)
      const buttonRef = React.useRef(null)
      const panelRef = React.useRef(null)

      const place = React.useCallback(() => {
        const node = buttonRef.current
        if (node === null) return
        const rect = node.getBoundingClientRect()
        const width = 320
        const margin = 8
        const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin))
        const bottom = Math.max(margin, window.innerHeight - rect.top + 8)
        setAnchor({ left, bottom })
      }, [])

      React.useEffect(() => {
        if (!open) return undefined
        place()
        const onDown = event => {
          const panel = panelRef.current
          const button = buttonRef.current
          if (panel !== null && panel.contains(event.target)) return
          if (button !== null && button.contains(event.target)) return
          setOpen(false)
        }
        const onKey = event => {
          if (event.key === 'Escape') setOpen(false)
        }
        const onResize = () => place()
        document.addEventListener('pointerdown', onDown, true)
        document.addEventListener('keydown', onKey)
        window.addEventListener('resize', onResize)
        return () => {
          document.removeEventListener('pointerdown', onDown, true)
          document.removeEventListener('keydown', onKey)
          window.removeEventListener('resize', onResize)
        }
      }, [open, place])

      const toggle = () => {
        setOpen(!open)
        if (!open) place()
      }

      return { open, anchor, buttonRef, panelRef, toggle, close: () => setOpen(false) }
    }

    /**
     * Wrap panel content in the shared panel chrome, portaled when possible.
     * @param props - t, anchor, refs, title, subtitle, onClose, and children.
     * @returns the panel element.
     */
    function Panel(props) {
      const { t, anchor, panelRef, title, subtitle, onClose, children } = props
      const panel = h('div', {
        ref: panelRef,
        className: 'dsh-sct-panel',
        role: 'dialog',
        'aria-label': title,
        style: { left: `${anchor.left}px`, bottom: `${anchor.bottom}px` },
      },
      h('div', { className: 'dsh-sct-head' },
        h('div', { className: 'dsh-sct-heading' },
          h('h2', { className: 'dsh-sct-title' }, title),
          subtitle === null ? null : h('p', { className: 'dsh-sct-subtitle' }, subtitle)),
        h('button', {
          type: 'button',
          className: 'dsh-sct-close',
          'aria-label': t('dialog.close'),
          onClick: onClose,
        }, '×')),
      children)

      if (typeof createPortal !== 'function') return panel
      return createPortal(panel, document.body)
    }

    /**
     * One small bordered figure in a summary strip.
     * @param props - value and caption.
     * @returns the figure element.
     */
    function Figure({ value, label }) {
      return h('span', { className: 'dsh-sct-figure' },
        h('span', { className: 'dsh-sct-figure-value' }, value),
        h('span', { className: 'dsh-sct-figure-label' }, label))
    }

    /**
     * The spend pill and its breakdown panel.
     * @param props - standard composer dock props.
     * @returns the pill, or null when the session has no reported usage yet.
     */
    function CostPill(props) {
      const { t } = props
      const readProjection = typeof props.useProjection === 'function'
        ? props.useProjection
        : () => undefined
      const readChat = typeof props.useChat === 'function' ? props.useChat : () => undefined
      const projection = readProjection('tokenUsage')
      const timeline = readChat(snapshot => snapshot.timeline)
      const [config, setConfig] = React.useState(readConfig)
      const panel = usePillPanel()

      const priced = React.useMemo(
        () => priceTimeline(timeline, config.model),
        [timeline, config.model],
      )

      /* Fall back to the whole-log projection when the timeline is not readable. */
      const fallback = React.useMemo(() => {
        if (priced.rows.length > 0 || projection === undefined) return null
        const value = buckets(projection)
        if (value.total <= 0) return null
        const result = priceUsage(projection, config.model, Date.now())
        return { amount: result.amount, counts: result.counts, peak: result.peak }
      }, [priced.rows.length, projection, config.model])

      const totalUsd = priced.rows.length > 0
        ? priced.totalUsd
        : fallback !== null ? fallback.amount : 0
      const totalTokens = priced.rows.length > 0
        ? priced.totalTokens
        : fallback !== null ? fallback.counts.total : 0
      const totalTwd = totalUsd * config.rate
      const amountText = formatTwd(totalTwd)

      /**
       * Store a changed pricing choice and keep rendering with it.
       * @param patch - fields to replace.
       */
      const update = patch => {
        setConfig(current => {
          const next = { ...current, ...patch }
          writeConfig(next)
          return next
        })
      }

      const rows = priced.rows.slice(-8)

      if (totalTokens <= 0) return null

      return h(React.Fragment, null,
        h('style', { key: 'styles' }, STYLES),
        h('span', { className: 'dsh-sct-anchor' },
          h('button', {
            type: 'button',
            ref: panel.buttonRef,
            className: 'dsh-sct-pill',
            'data-composer-stat': 'cost',
            'aria-haspopup': 'dialog',
            'aria-expanded': panel.open,
            'aria-label': t('pill.aria', { amount: amountText }),
            title: `${t('pill.label')} · ${amountText}`,
            onClick: panel.toggle,
          },
          h('span', { className: 'dsh-sct-amount' }, amountText),
          h('span', { className: 'dsh-sct-tag' }, t('pill.estimate')))),
        panel.open && panel.anchor !== null ? h(Panel, {
          t,
          anchor: panel.anchor,
          panelRef: panel.panelRef,
          title: t('dialog.title'),
          subtitle: t('dialog.subtitle'),
          onClose: panel.close,
        }, SpendDetails({ t, config, rows, totalUsd, totalTokens, totalTwd, turnCount: priced.rows.length, missing: priced.missing, update })) : null,
      )
    }

    /**
     * The spend panel body.
     * @param props - totals, rows, and the pricing setter.
     * @returns the panel sections.
     */
    function SpendDetails({ t, config, rows, totalUsd, totalTokens, totalTwd, turnCount, missing, update }) {
      const list = rows.map(row => h('li', {
        className: 'dsh-sct-row',
        key: String(row.turn),
      },
      h('span', { className: 'dsh-sct-row-name' },
        t('dialog.turn', { turn: row.turn }),
        h('span', { className: 'dsh-sct-band' }, row.peak ? t('band.peak') : t('band.off'))),
      h('span', { className: 'dsh-sct-row-tokens' }, formatTokens(row.counts.total)),
      h('span', { className: 'dsh-sct-row-value' }, formatTwd(row.usd * config.rate)),
      ))

      return [
        h('div', { className: 'dsh-sct-total', key: 'total' },
          h('span', { className: 'dsh-sct-total-value' }, formatTwd(totalTwd)),
          h('span', { className: 'dsh-sct-total-caption' }, `${t('dialog.total')} · ${formatUsdPrecise(totalUsd)}`)),
        h('div', { className: 'dsh-sct-figures', key: 'figures' },
          h(Figure, { value: formatTokens(totalTokens), label: t('dialog.tokens') }),
          h(Figure, { value: String(turnCount), label: t('dialog.turns') }),
          h(Figure, { value: `${config.rate}`, label: t('dialog.rate') })),
        list.length === 0 ? null : h(React.Fragment, { key: 'turns' },
          h('p', { className: 'dsh-sct-section-title' }, t('dialog.turns')),
          h('ul', { className: 'dsh-sct-rows' }, list)),
        h('div', { className: 'dsh-sct-settings', key: 'settings' },
          h('label', { className: 'dsh-sct-label', htmlFor: 'dsh-sct-model' }, t('dialog.model')),
          h('select', {
            id: 'dsh-sct-model',
            className: 'dsh-sct-control',
            value: config.model,
            onChange: event => update({ model: event.target.value }),
          }, Object.keys(MODELS).map(id => h('option', { key: id, value: id }, MODELS[id].title))),
          h('label', { className: 'dsh-sct-label', htmlFor: 'dsh-sct-rate' }, t('dialog.rate')),
          h('input', {
            id: 'dsh-sct-rate',
            className: 'dsh-sct-control',
            type: 'number',
            min: '0',
            step: '0.01',
            value: config.rate,
            onChange: event => {
              const value = Number(event.target.value)
              if (Number.isFinite(value) && value > 0) update({ rate: value })
            },
          })),
        h('p', { className: 'dsh-sct-note', key: 'rate' }, t('dialog.rateNote')),
        missing > 0 ? h('p', { className: 'dsh-sct-note', key: 'partial' }, t('dialog.partial')) : null,
        h('p', { className: 'dsh-sct-note', key: 'peak' }, t('dialog.peakNote')),
        h('p', { className: 'dsh-sct-note', key: 'note' },
          t('dialog.note'), ' ',
          h('a', {
            href: 'https://platform.deepseek.com/usage',
            target: '_blank',
            rel: 'noreferrer',
          }, t('dialog.noteLink'))),
      ]
    }

    /**
     * Build the balance pill bound to one Host reader.
     * @param readBalance - resolves the wallet snapshot from the Host route.
     * @returns the pill component.
     */
    function makeBalancePill(readBalance) {
      return function BalancePill({ t }) {
        const [state, setState] = React.useState({ status: 'loading' })
        const panel = usePillPanel()
        const alive = React.useRef(true)

        const load = React.useCallback(async () => {
          try {
            const next = await readBalance()
            if (alive.current) setState(next)
          } catch {
            const reason = error instanceof Error ? error.message : String(error)
            if (alive.current) {
              setState(current => current.status === 'ready' ? { ...current, stale: true } : { status: 'failed', reason })
            }
          }
        }, [])

        React.useEffect(() => {
          alive.current = true
          load()
          const timer = window.setInterval(load, BALANCE_REFRESH_MS)
          const onVisible = () => {
            if (document.visibilityState === 'visible') load()
          }
          document.addEventListener('visibilitychange', onVisible)
          return () => {
            alive.current = false
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
          }
        }, [load])

        React.useEffect(() => {
          if (panel.open) load()
        }, [panel.open, load])

        if (state.status === 'loading' || state.status === 'none' || state.status === 'unavailable') return null

        const ready = state.status === 'ready' && Array.isArray(state.wallets) && state.wallets.length > 0
        const wallet = ready ? state.wallets[0] : null
        const config = readConfig()
        const native = wallet === null ? null : formatUsd(wallet.balance, wallet.currency)
        const amountText = wallet === null
          ? '—'
          : wallet.currency === 'USD'
            ? formatTwd(Number(wallet.balance) * config.rate)
            : formatUsd(wallet.balance, wallet.currency)
        const caption = native === null ? null : t('balance.native', { amount: native, rate: config.rate })
        const bonus = ready ? state.bonus.filter(entry => Number(entry.balance) > 0) : []

        const wallets = ready ? state.wallets.map(entry => h('div', { className: 'dsh-sct-wallet', key: entry.currency },
          h('span', { className: 'dsh-sct-wallet-label' }, t('balance.recharge')),
          h('span', { className: 'dsh-sct-wallet-value' }, formatUsd(entry.balance, entry.currency)))) : []

        return h(React.Fragment, null,
          h('style', { key: 'styles' }, STYLES),
          h('span', { className: 'dsh-sct-anchor' },
            h('button', {
              type: 'button',
              ref: panel.buttonRef,
              className: 'dsh-sct-pill',
              'data-composer-stat': 'balance',
              'aria-haspopup': 'dialog',
              'aria-expanded': panel.open,
              'aria-label': t('pill.balanceAria', { amount: amountText }),
              title: native === null ? `${t('pill.balance')} · ${amountText}` : `${t('pill.balance')} · ${amountText} (${native})`,
              onClick: panel.toggle,
            },
            h('span', { className: 'dsh-sct-tag' }, t('pill.balance')),
            h('span', { className: 'dsh-sct-amount' }, amountText))),
          panel.open && panel.anchor !== null ? h(Panel, {
            t,
            anchor: panel.anchor,
            panelRef: panel.panelRef,
            title: t('balance.title'),
            subtitle: null,
            onClose: panel.close,
          }, BalanceDetails({
            t,
            wallets,
            bonus,
            amountText,
            caption,
            at: state.at,
            stale: state.stale,
            failed: !ready,
            reason: state.reason,
            onRetry: load,
          })) : null,
        )
      }
    }

    /**
     * The balance panel body.
     * @param props - wallets, bonus, totals, and timestamp.
     * @returns the panel sections.
     */
    function BalanceDetails({ t, wallets, bonus, amountText, caption, at, stale, failed, reason, onRetry }) {
      return [
        h('div', { className: 'dsh-sct-total', key: 'amount' },
          h('span', { className: 'dsh-sct-total-value' }, amountText),
          caption === null ? null : h('span', { className: 'dsh-sct-total-caption' }, caption)),
        failed ? h('p', { className: 'dsh-sct-note', key: 'failed' }, t('balance.failed')) : null,
        failed && typeof reason === 'string' && reason !== ''
          ? h('p', { className: 'dsh-sct-note', key: 'reason' }, reason)
          : null,
        wallets.length > 1 ? h('div', { key: 'wallets' }, wallets) : null,
        bonus.length === 0 ? null : h('div', { key: 'bonus' },
          bonus.map(entry => h('div', { className: 'dsh-sct-wallet', key: entry.currency },
            h('span', { className: 'dsh-sct-wallet-label' }, t('balance.bonus')),
            h('span', { className: 'dsh-sct-wallet-value' }, formatUsd(entry.balance, entry.currency))))),
        h('p', { className: 'dsh-sct-note', key: 'time' },
          typeof at === 'number' && Number.isFinite(at)
            ? (stale ? t('balance.stale', { time: clock.format(new Date(at)) }) : t('balance.updated', { time: clock.format(new Date(at)) }))
            : null),
        h('div', { className: 'dsh-sct-actions', key: 'actions' },
          h('button', {
            type: 'button',
            className: 'dsh-sct-button',
            onClick: onRetry,
          }, t('balance.refresh')),
          h('a', {
            className: 'dsh-sct-button',
            href: 'https://platform.deepseek.com/top_up',
            target: '_blank',
            rel: 'noreferrer',
          }, t('balance.open'))),
      ]
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-cost-twd: dictionaries')
        const t = ctx.locale.bind(NS)
        /**
         * Read the platform wallets from the Host route.
         * @returns a normalized snapshot for the balance pill.
         */
        const readBalance = async () => {
          let response
          try {
            response = await fetch(BALANCE_ROUTE, {
              credentials: 'same-origin',
              cache: 'no-store',
              headers: { accept: 'application/json' },
            })
          } catch (error) {
            return { status: 'failed', reason: error instanceof Error ? error.message : String(error) }
          }
          if (!response.ok) return { status: 'failed', reason: `HTTP ${response.status}` }
          let body
          try {
            body = await response.json()
          } catch {
            return { status: 'failed', reason: 'invalid JSON' }
          }
          if (body === null || typeof body !== 'object') return { status: 'failed', reason: 'empty answer' }
          if (body.status === 'signed-out') return { status: 'none' }
          if (body.status !== 'ready') {
            return { status: 'failed', reason: typeof body.message === 'string' ? body.message : String(body.status) }
          }
          const wallets = Array.isArray(body.value) ? body.value : []
          if (wallets.length === 0) return { status: 'none' }
          return {
            status: 'ready',
            wallets,
            bonus: Array.isArray(body.bonusWallets) ? body.bonusWallets : [],
            at: Date.now(),
          }
        }

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'cost',
          order: 2,
          locale: NS,
        }, CostPill))

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'balance',
          order: 3,
          locale: NS,
        }, makeBalancePill(readBalance)))
      },
    }
  },
})
