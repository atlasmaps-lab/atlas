/* Atlas Markets (0.11) · the bar's dropdown menus (see menu.js): trade by product and partner, investment, house prices. */
(function () {
  "use strict";
  const reg = window.AtlasMenus = window.AtlasMenus || {}; const M = reg.markets = reg.markets || {};
  const full = (B, id, l, s) => ({ label: "The full panel", items: [B.panel(id, l, s)] });
  M.trade = (ctx, B) => ({ lede: "What the UK buys and sells, with whom, and where it depends on one supplier.", sections: [B.group("Trade in goods", "markets", { label: "Trade by place" }), B.bd("trd_sitc_exp", { label: "Exports by product" }), B.bd("trd_sitc_imp", { label: "Imports by product" }), B.bd("trd_ptn_exp", { label: "Export partners" }), B.bd("trd_ptn_imp", { label: "Import partners" }), full(B, "trade", "Open Trade", "Balance, products, partners and dependence")].filter(Boolean) });
  M.products = (ctx, B) => ({ sections: [B.bd("trd_sitc_exp", { label: "Exports by product" }), B.bd("trd_sitc_imp", { label: "Imports by product" }), full(B, "products", "Open Products", "97 chapters down to 9,000 product codes")].filter(Boolean) });
  M.partners = (ctx, B) => ({ sections: [B.bd("trd_ptn_exp", { label: "Who buys from us" }), B.bd("trd_ptn_imp", { label: "Who we buy from" }), full(B, "partners", "Open Partners", "Every country, over time")].filter(Boolean) });
  M.investment = (ctx, B) => ({ sections: [B.group("Investment", "markets", { label: "New investment projects" }), full(B, "investment", "Open Investment", "FDI both ways, by country and industry"), full(B, "income", "Income flows", "Profits sent home and kept")].filter(Boolean) });
  M.overview = (ctx, B) => ({ sections: [B.group("FTSE 100 in London (test case)", "markets", { label: "Listed companies" }), B.group("House prices", "markets", { label: "House prices" }), B.group("Rents", "markets", { label: "Rents" }), B.group("Homes", "markets", { label: "Homes" }), full(B, "overview", "Open Market overview", "Companies, places and markets")].filter(Boolean) });
})();
