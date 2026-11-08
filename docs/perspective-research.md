# What specialists track, and what Atlas gives them (0.8)

Each view's top bar is built around how a professional in that field works: the figures they check first, the comparisons they make, and when the numbers change. This note records that research (November 2026), what each view now has, and what's next.

## Economist (Atlas Economic)
**Tracks:**
- GDP (monthly, quarterly, regional GVA by ITL)
- inflation (CPI, CPIH, core, services)
- the labour market (unemployment, employment, inactivity, vacancies, payrolls)
- pay (nominal and real)
- productivity, public finances, trade, retail, house prices

**Compares** outturns with forecasts (OBR, Bank of England, the independent consensus) and reads the "surprise".

**Release rhythm:**
- GDP about six weeks after the month
- CPI mid-month (a Wednesday), the labour market mid-month (a Tuesday)
- Bank of England reports in February, May, August and November

ONS advises care with Labour Force Survey figures until the transformed survey replaces it (2027 at the earliest).

**In Atlas:**
- **Indicators:** 16 headline series with the latest value, change, trend and next release date.
- **Forecasts vs outturn:** HM Treasury's monthly comparison (average, median, range) and the OBR, with the surprise once the outturn is published.
- **Regions:** GVA per head and growth.
- **Release calendar.**
- **Rates & sterling.**
- **Place dashboard, Rankings, Growth decomposition.**

**Next:**
- house prices (UK HPI)
- PMIs (not free)
- productivity by region (ONS subregional)
- RTI payrolls
- the OBR's historical forecasts database (its site blocks scripts; download it by hand to add)

## Markets and financial analyst (Atlas Markets)
**Tracks:**
- equity indices and sectors
- gilt yields and the curve, Bank Rate and SONIA, sterling
- earnings and corporate announcements, M&A
- company fundamentals (Companies House)

**In Atlas:**
- Market overview, Companies and screener, Places and markets
- **Rates & sterling:** the Bank of England's 5- and 10-year gilt yields, Bank Rate, SONIA, sterling and mortgage rates
- **Political money:** company donors, their contracts and meetings with ministers
- the Calculator
- the Marketplace (shared with Social)

**Next:** company accounts from Companies House (iXBRL), an announcements and earnings calendar (FCA National Storage Mechanism), and licensed share prices (none free for public display; see `pipeline/sources/prices_licence.md`).

## Social policy and research consultant (Atlas Social, Statistics)
**Tracks:**
- deprivation (IMD 2025 and the devolved indices)
- Census 2021 profiles
- poverty (HBAI, children in low-income families)
- housing affordability and homelessness
- crime, education attainment, migration, wellbeing

**Typical outputs:** needs assessments, equality impact assessments, breakdowns by deprivation decile.

**In Atlas:**
- **Deprivation:** overall decile, the share of neighbourhoods in England's most deprived 10%, and the seven domains as map metrics and a place chart.
- population, change, density and age
- homelessness and fuel poverty (existing metrics)

**Next:**
- the devolved indices (WIMD, SIMD, NIMDM), kept separate because they can't be compared with England's
- children in low-income families (DWP)
- crime (police.uk)
- education (DfE)
- the population pyramid (ONS single year of age)

## Public health consultant (Atlas Health)
**Tracks:**
- life expectancy and healthy life expectancy, avoidable mortality
- obesity and smoking, mental health
- NHS performance (waiting lists, A&E, GP access)
- everything by deprivation decile, against England and "similar areas", in Fingertips-style spine charts (RAG)

**In Atlas:**
- the Place profile
- **Against England:** a spine chart
- **Inequality:** an indicator by deprivation decile, and the gap between the most and least deprived
- Rankings

**Next:**
- confidence intervals (needed for proper red, amber and green)
- NHS England performance by trust and ICB
- the slope index of inequality from neighbourhood data
- Fingertips' replacement, "Find Public Health Data"

## Transport planner (Atlas Transport)
**Tracks:**
- traffic counts (DfT), road casualties (STATS19)
- bus and rail use (DfT, ORR)
- connectivity (DfT's Transport Connectivity Metric, which replaced the journey time statistics)
- mode share (Census travel to work), EV charging, active travel

**In Atlas:**
- **Directions:** road, cycling, walking, hiking, public transport
- **Reach:** isochrones, with the councils and population inside
- **Trails**
- **Stations & hubs** with trends
- bus, tram and ferry stops, with live London arrivals
- **Planner data:** rail journeys, stations, airport passengers, port freight, bus stops and coverage

**Next:**
- DfT traffic counts and STATS19
- the Transport Connectivity Metric
- Census TS061 mode share
- EV charge points
- live buses outside London (needs a key, so a small server)

## Sources
Research drew on ONS, Bank of England, OBR, HM Treasury, MHCLG, DWP, DfE, OHID, NHS England, DfT, ORR, Ofcom and the ICO, as cited in the pipeline scripts and `pipeline/sources/MANIFEST.csv`.
