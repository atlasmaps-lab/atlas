# Share prices: the licence decision (Atlas 1.8)

Atlas is a static site on GitHub Pages: everything the browser loads is public, including any API key. So prices can only
reach the public site as a data file written by a scheduled job (a GitHub Action, with the provider's key kept as a GitHub
secret), and only from a provider whose licence allows **public display** of the data.

| Source | Used for | Can it be republished on a public site? | Decision |
|---|---|---|---|
| London Stock Exchange real-time data | — | No: licensed by the LSE, paid display licences | Not used |
| Yahoo Finance (query1.finance.yahoo.com chart feed) | Monthly closes since 1.4, on your own computer only | No: Yahoo's API terms (legal.yahoo.com, Developer API Terms of Use) forbid sharing, sublicensing or earning from the output without Yahoo's written permission, and the prices come from exchanges under their own terms | Kept local (`markets_ftse100.full.json` is git-ignored); never in the public site |
| companiesmarketcap.com | Market values since 1.4, locally | No licence for reuse is given | Kept local only |
| Free end-of-day APIs with a key (Alpha Vantage, Twelve Data, Marketstack and similar) | — | Their free tiers restrict redistribution or display to others | Not chosen |
| Companies House (accounts, iXBRL) | Fundamentals (revenue, profit, employees) | Yes: free public data (Open Government Licence) | The right source; not added this round (needs a key and an iXBRL parser) |

**Result:** the price job (`.github/workflows/prices.yml`, `pipeline/fetch_prices.py`) is built but switched off, and the
public app says prices are "Not available" rather than scraping them. To switch it on: choose a provider whose terms allow
public display of end-of-day or delayed prices, add an adapter in `fetch_prices.py`, store the key as the repository secret
`PRICES_API_KEY`, set `PRICES_PROVIDER`, and uncomment the schedule. The app then reads `data/prices.js` and shows
"Prices as of <date>, delayed".

Checked 27 October 2026.
