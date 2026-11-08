# Atlas Transport

Owner: (unassigned)

Getting around the UK, and the data a transport planner works with.

- **Directions**: from A to B by car, bike, on foot, hiking or public transport (rail, Tube, tram, bus, ferry), with alternatives, times, every step, and the route on the map. Places come from Atlas (stations, airports, ports, towns), suggested as you type, and addresses from Nominatim, looked up only when you press Enter or click "Search addresses" (Nominatim's usage policy forbids search-as-you-type).
- **Reach**: everywhere you can reach within 15 to 60 minutes (an isochrone), the councils inside it and their population, and the hubs within reach.
- **Trails**: hiking and cycling routes as an overlay (Waymarked Trails, from OpenStreetMap); Hike mode prefers paths and accepts hills.
- **Stations & hubs**: the busiest stations, airports and ports with their trends. Bus, tram and ferry stops appear at street zoom (core), with live arrivals in London (TfL).
- **Planner data**: the transport metrics on the map: rail journeys, stations, airport passengers, port freight, bus stops and coverage.

Services (free, no key, used only when someone asks): Valhalla on FOSSGIS's servers (roads, cycling, walking, isochrones), Transitous/MOTIS (public transport), Nominatim (addresses), TfL Unified API (London arrivals). All have fair-use limits: if Atlas gets busy, self-host Valhalla and talk to Transitous first (they ask projects to get in touch before heavy use).

Not yet: live buses outside London (the Bus Open Data Service needs a key, so a small server), live train running (Darwin needs a key), road traffic counts, road casualties (STATS19), journey times to services, travel to work (Census 2021).
