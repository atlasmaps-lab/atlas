# Atlas Resilience (0.12)

For people who plan for, respond to and try to understand emergencies (emergency planners first, with a public view on top).

- **Prepare**: hazards on the map (recorded floods, coastal erosion, hot days, wildfire, rivers) over a council vulnerability index. The parts are always shown: 65+, living alone at 66+, bad health, disability, fuel poverty, deprivation and child poverty. Each part is a percentile among councils, and the index is their average.
- **Respond**: live Environment Agency flood warnings and alerts (England), refreshed every 15 minutes. Click one for what's inside it:
  - homes and facilities, from OpenStreetMap;
  - people, estimated at the council's density;
  - a situation report as a card.
- **Understand**:
  - recorded floods by year;
  - COVID-19 deaths by week for the council in focus;
  - flu positivity and measles cases for England (UKHSA data dashboard API).
- **Near me**: is there a warning near a place, its flood history, and how to prepare.

Live services: EA flood monitoring, the UKHSA dashboard API, Overpass and Photon. None needs a key; all are open to the browser, cached, and fail plainly. Tests mock them (`test_resilience.py`).
