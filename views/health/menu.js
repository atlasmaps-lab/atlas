/* Atlas Health (0.11) · the bar's dropdown menus (see menu.js): the place profile by theme, causes of death, inequality. */
(function () {
  "use strict";
  const reg = window.AtlasMenus = window.AtlasMenus || {}; const M = reg.health = reg.health || {};
  const g = (B, name, label, note) => B.group(name, "health", { label, note });
  M.overview = (ctx, B) => ({ lede: "How long and how well people live here, what they die of, and the habits and conditions behind it.", sections: [g(B, "Life expectancy", "Life expectancy"), g(B, "Deaths", "Deaths"), g(B, "Weight & lifestyle", "Weight and lifestyle"), g(B, "Conditions & wellbeing", "Conditions and wellbeing"), g(B, "Census 2021: health", "Health and care (Census)"), g(B, "Environment & care", "Environment and care"), { label: "The full panel", items: [B.panel("overview", "Open Place profile", "Everything for the place in focus"), B.panel("spine", "Against England", "Spine chart, Fingertips style")] }].filter(Boolean) });
  M.deaths = (ctx, B) => ({ sections: [B.bd("hd_cause", { label: "Causes of death" }), B.bd("hd_detail", { label: "In detail" }), B.bd("hd_age", { label: "By age" }), g(B, "Deaths", "Death rates"), { label: "The full panel", items: [B.panel("deaths", "Open Causes of death", "About 230 causes and by age")] }].filter(Boolean) });
  M.inequality = (ctx, B) => ({ sections: [g(B, "Life expectancy", "Life expectancy"), B.group("Deprivation (England, 2025)", "social", { label: "Deprivation" }), { label: "The full panel", items: [B.panel("inequality", "Open Inequality", "Health by deprivation decile")] }].filter(Boolean) });
  M.spine = (ctx, B) => ({ sections: [{ label: "Against England", items: [B.panel("spine", "Open the spine chart", "The place against England and every council")] }, g(B, "Life expectancy", "Life expectancy"), g(B, "Deaths", "Deaths")].filter(Boolean) });
})();
