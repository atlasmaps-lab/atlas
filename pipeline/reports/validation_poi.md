# Validation: map symbols (Atlas 0.8)

Written by `pipeline/build_poi.py` on 2026-11-08.

## Summary
- **2584 railway stations** with ORR usage figures, placed by NaPTAN. ORR stations not matched to a NaPTAN location: 76 (3 of them with a million or more entries and exits a year, listed below).
- **45 airports** with CAA passenger figures. Not matched: 2.
- **53 major ports** with DfT tonnage. 27 placed from Atlas's hand table because DfT's list has no location for them (approximate, harbour level: Belfast, Boston, Cairnryan, Cardiff, Dover, Felixstowe, Fishguard, Fleetwood, Fowey, Glensanda, Heysham, Holyhead, Ipswich, Kilroot Power Station Jetty, Larne, Loch Ryan, Londonderry, Newhaven, Poole, Port Talbot, Portsmouth, Ramsgate, Rivers Hull and Humber, Stranraer, Sunderland, Swansea, Warrenpoint). Still without a location: 0.
- Airports in the Channel Islands and the Isle of Man are left out: they are Crown Dependencies, not part of the UK. Northern Ireland's airports, Prestwick, Teesside and Farnborough are placed from the hand table (`pipeline/sources/poi_locations.csv`) because NaPTAN doesn't list them.
- **9 financial sites** (the four districts and a hand table).
- **Places outside every UK council: 0** (dropped).

## Airports matched (CAA name → NaPTAN entrance)
- GATWICK → London Gatwick Airport
- HEATHROW → London Heathrow Airport
- LONDON CITY → London City Airport
- LUTON → London Luton Airport
- SOUTHEND → London Southend Airport
- STANSTED → London Stansted Airport
- ABERDEEN → Aberdeen Airport
- BARRA → Barra North Bay Airport
- BELFAST CITY (GEORGE BEST) → hand table: NI airports are not in NaPTAN; position of the terminal (approximate)
- BELFAST INTERNATIONAL → hand table: NI airports are not in NaPTAN; position of the terminal (approximate)
- BENBECULA → Benbecula Balivanich Airport
- BIGGIN HILL → Biggin Hill Airport
- BIRMINGHAM → Birmingham International Airport
- BLACKPOOL → Blackpool International Airport
- BOURNEMOUTH → Bournemouth International Airport
- BRISTOL → Bristol International Airport
- CAMBRIDGE → Cambridge Airport
- CAMPBELTOWN → Campbeltown Machrihanish Airport
- CARDIFF WALES → Cardiff International Airport
- CITY OF DERRY (EGLINTON) → hand table: NI airports are not in NaPTAN; position of the terminal (approximate)
- DUNDEE → Dundee City Airport
- EAST MIDLANDS INTERNATIONAL → East Midlands Airport
- EDINBURGH → Edinburgh Airport
- EXETER → Exeter International Airport
- FARNBOROUGH → hand table: position of the terminal (approximate)
- GLASGOW → Glasgow International Airport
- GLOUCESTERSHIRE → Gloucestershire Airport
- HUMBERSIDE → Humberside Airport
- INVERNESS → Inverness Airport
- ISLAY → Islay Glenegedal Airport
- ISLES OF SCILLY (ST.MARYS) → Isles of Scilly St Marys Airport
- KIRKWALL → Kirkwall (Orkney) Airport
- LANDS END (ST JUST) → Land's End St Just Airport
- LEEDS BRADFORD → Leeds Bradford International Airport
- LERWICK (TINGWALL) → Lerwick Tingwall Airport
- LIVERPOOL (JOHN LENNON) → Liverpool John Lennon Airport
- LYDD → Lydd London Ashford Airport
- MANCHESTER → Manchester Airport
- NEWCASTLE → Newcastle International Airport
- NEWQUAY → Newquay St Mawgan Airport
- NORWICH → Norwich International Airport
- PRESTWICK → hand table: position of the terminal (approximate)
- SOUTHAMPTON → Southampton Airport
- STORNOWAY → Stornoway Airport
- SUMBURGH → Sumburgh Airport
- TEESSIDE INTERNATIONAL AIRPORT → hand table: position of the terminal (approximate)
- TIREE → Tiree Airport
- WICK JOHN O GROATS → Wick Airport

## Airports not matched
- DONCASTER SHEFFIELD (0 passengers)
- SCATSTA (0 passengers)

## Ports without a location
None.

## Busy stations not matched (1m+ entries and exits)
- King's Cross Thameslink ([z]): 10,786,165
- Chafford Hundred Lakeside (CFH): 2,317,972
- Newark Northgate (NNG): 1,078,800

## Dropped as outside the UK
None.
