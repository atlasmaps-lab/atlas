// Atlas 1.5 settings
window.ATLAS_CONFIG = {
  // Your MapTiler API key (https://cloud.maptiler.com/account/keys/). Leave empty to be asked when the page opens.
  maptilerKey: "",
  // Starting view, and the box the map springs back to when someone pans away (west, south, east, north).
  start: { center: [-3.3, 54.6], zoom: 4.9 },
  homeBounds: [-8.6, 49.9, 1.8, 60.9],
  minZoom: 4.6,
  // How long the pointer must rest on an area before its card appears, in milliseconds.
  hoverDelayMs: 500,
  // 0.7.1: a Hoefler&Co Cloud.typography kit for Surveyor and Archer, if you have one (the kit's CSS address). Leave
  // empty to use fonts installed on the computer, licensed files in fonts/, or the free stand-ins (see fonts.css).
  fontKitCss: "",
  // 0.7.1: true if you've put licensed font files in fonts/ (see fonts-files.example.css).
  fontFiles: false
};
// load the font kit (if any) as early as possible
if (window.ATLAS_CONFIG.fontFiles) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "fonts/atlas-fonts.css"; document.head.appendChild(l); }
if (window.ATLAS_CONFIG.fontKitCss) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = window.ATLAS_CONFIG.fontKitCss; document.head.appendChild(l); }
