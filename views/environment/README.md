# Atlas Environment

**Owner:** 
**Opens at:** `index.html#app=environment`

Where the environment is changing, and where it is protected, on a timeline that runs from recorded history into official forecasts. The zones are the view's own layers. They are not council or constituency areas, and opening the view clears the area metrics from the map.

## Header tabs

| Tab | What it shows |
|---|---|
| **Timeline** | The year slider (1945 to today, with ▶ to play the years), **Future** buttons (by 2055, by 2105) and the layers to show. When you move the slider, every layer follows: floods recorded up to that year, protected areas designated by then, and heat for that period. |
| **Floods** | Floods recorded each year, and the largest floods up to the chosen year (click one to go there). |
| **Coast** | How much coast is forecast to erode by 2055 and 2105, and the stretches with the greatest retreat. |
| **Heat** | Days above 30 °C a year, at each step from 1981–2000 to +4 °C of global warming, and the hottest squares. |
| **Conservation** | National Parks by year designated, and Ramsar wetlands by nation. |
| **Sources** | What covers which nation, and the gaps. |

## Layers

| Layer | Coverage | Timeline | Source (all Open Government Licence v3.0) |
|---|---|---|---|
| Floods (recorded) | England, Wales | Up to the chosen year. Zoomed out they show as hot zones; zoomed in, as outlines coloured by source (river, sea, surface water, groundwater) | Environment Agency, Recorded Flood Outlines; Natural Resources Wales, Historic Flood Map |
| Coastal erosion (forecast) | England, Wales | Under **Future**: by 2055 in red, 2055–2105 in orange | Environment Agency, NCERM 2024; Natural Resources Wales, NCERM. Both assume the shoreline management plans are delivered, with the higher central sea level allowance |
| Hot summer days | UK (12 km squares) | 1981–2000 up to 2000, 2001–2020 after; or pick a warming level (+1.5 to +4 °C) | Met Office Climate Data Portal (UKCP18, RCP8.5 ensemble median) |
| Wildfire (satellite) | Scotland | Summer 2026 | SEPA, Copernicus Emergency Management Service |
| National Parks and Ramsar wetlands | All four nations (NI has no National Parks) | From the year designated. Ramsar sites without a published date show dashed, as "protected today" | Natural England, Natural Resources Wales, Scottish Government, NatureScot, DAERA |

**Warming levels are not dates.** The Met Office gives heat at +1.5, +2, +2.5, +3 and +4 °C of global warming, not by year, so the view shows them as steps. The Met Office notes that current international policies point to about 2.4–2.8 °C.

## Rebuilding the data

```
python3 pipeline/fetch_envzones.py    # about 1 GB into pipeline/sources/raw/envzones/ (not committed)
python3 pipeline/build_envzones.py    # data/envzones/*.js (about 8 MB; each file loads when its layer is first shown)
```

## Planned
- Scotland's coastal erosion (Dynamic Coast, published region by region)
- Future flood risk with climate change (England's 2024 national assessment, Wales's flood maps)
- SSSIs and other protected sites, where designation dates are published
- Coastal realignment and habitat creation projects (OMReg), once ABPmer agrees to reuse
- Economic damage: flood damage costs and properties at risk, where they are published as open data
