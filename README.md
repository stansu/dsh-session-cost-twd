# dsh-session-cost-twd

Two small pills under the DSH composer:

```
[ 3 輪 · 45.2s ] [ 88.4k tokens ] [ NT$0.28 est. ] [ NT$364 balance ]
```

- **NT$ estimate** — what this conversation has cost so far, priced from the token usage DSH already reports.
- **Balance** — the DeepSeek wallet behind the account you signed in to DSH with, converted to TWD. No browser tab needed.

Both open a panel: the spend pill has a per-turn breakdown and pricing settings; the balance pill has top-up/bonus, the last read time, and a refresh button.

## How it works

- Spend = reported tokens × the official DeepSeek list price, converted to TWD. Cache-hit, cache-miss, and output tokens are priced separately, and each turn uses **its own** timestamp to pick peak or off-peak rates (peak is UTC Mon–Fri 01:00–04:00 and 06:00–10:00; Chinese public holidays are not tracked).
- Balance is read by the plugin's Host half through DSH's own account service, the same one behind **Settings → Account**. The account token never leaves the Host; the browser only receives currency codes and amounts.
- The balance is polled every 2 minutes, when the panel opens, and when the window becomes visible again.

## Requirements

- DSH with the built-in DeepSeek account signed in (`connection` and `deepseekAccount` Host services). With an API-key-only setup the spend pill still works; the balance pill stays hidden.
- Built and tested against DSH **2.0.21-next** (client build `0.2.1-rc.4`). The Host route uses `ctx.connection.fetch.register`, so a future DSH could change it.

## Pricing assumptions

The defaults are for a **USD-billed** account running `deepseek-flash`, with USD→TWD at **32.85**:

| model | cache hit (off-peak / peak) | cache miss (off-peak / peak) | output (off-peak / peak) |
| --- | --- | --- | --- |
| `deepseek-flash` | $0.003 / $0.006 | $0.15 / $0.30 | $0.60 / $1.20 |
| `deepseek-v4-pro` | $0.022 / $0.044 | $0.66 / $1.32 | $1.98 / $3.96 |

The exchange rate is shared by both pills: change it in the spend panel and the balance converts with it. Everything is editable in the panel (model, exchange rate) and remembered per browser in `localStorage` under `dsh.session-cost-twd.v2`.

If your account is billed in **CNY**, the numbers are wrong by roughly the exchange rate. Change the `MODELS` table in `client.js` to the CNY prices from <https://api-docs.deepseek.com/zh-cn/quick_start/pricing> and set the rate to CNY→TWD (about 4.92).

## Install

**From a folder** (unpack the tarball, or clone this repository):

1. DSH → **Plugins** → **Add plugin** → **Install a third-party plugin**
2. Paste the absolute path to this folder, or the Git URL of this repository
3. **Install** → **Enable now**
4. **Restart DSH completely** — the Host route only mounts at Host start, a page refresh is not enough

## Notes

- The estimate is not a bill. Actual deductions come from the wallet; the panel links to the platform billing page.
- Only loaded turns are priced; older turns outside the window are left out and the panel says so.
- Turning the plugin off or uninstalling it removes both pills and the route; nothing is written outside `localStorage`.

## License

MIT — see [LICENSE](LICENSE).
