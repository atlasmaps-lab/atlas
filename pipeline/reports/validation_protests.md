# Validation: protests (Atlas 1.8)

Written by `pipeline/build_protests.py` from `pipeline/sources/protests_log.json` (the decisions `fetch_protests.py` made, retrieved 2026-10-28) and the build's own checks.

## Summary

- **186 events** at **374 sites** in `data/protests.js`; 40 are the UK part of an international protest; 17 have no single town and count for their nation.
- **Automated check: points outside the UK's boundaries: 0** (every site is tested against `pipeline/geometry/nations.geojson`, point in polygon; the build stops if any fails). Also run by `tests/test_protests_uk.py` on the built file.
- 1742 candidate articles dropped (below), 1276 sites removed, 70 places too broad for a point, 179 ambiguous place names resolved.
- 0 coastal sites fell just outside the generalised council boundary and were placed in the council whose edge is within 2 km.

## How each event was checked

1. **Country:** kept only if Wikidata gives the event's country as the United Kingdom (P17 = Q145), or a place it names resolves to a UK Wikidata item inside the UK polygons.
2. **Places:** every place goes through its Wikidata item: the item's country must be the UK *and* its coordinates must fall inside the UK polygons (not a bounding box).
3. **International events:** only UK places that the article itself describes as protest sites are kept (a sentence that names the place and a protest, in a UK section of the article or naming the UK itself), labelled "UK part of an international protest". A crowd figure is shown only if the article gives one for the UK place; a global figure is never put on a UK point.
4. **Regions, counties and countries** get no point; the event counts for the nation.

## Events dropped, and why

| Article | Reason |
|---|---|
| 11 December 2013 Euromaidan assault | no place in the UK could be named |
| 12 February 2024 Rafah strikes | not a protest article (its infobox is “civilian attack”) |
| 13 May incident | date outside 1974 to today (1969-01-01) |
| 1345 Liverpool riot | not a protest article (its infobox is “civilian attack”) |
| 1377 London riots | no protest infobox, and its title and categories don't both say protest |
| 1525 Bayham Abbey riot | date outside 1974 to today (1525-06-04) |
| 17 November 2014 global students protests | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| 17 October Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 1715 England riots | date outside 1974 to today (1715-01-01) |
| 1766 food riots | no protest infobox, and its title and categories don't both say protest |
| 1766–1773 Real del Monte strike | date outside 1974 to today (1766-07-28) |
| 1788 doctors' riot | date outside 1974 to today (1788-04-01) |
| 1812 Baltimore riots | date outside 1974 to today (1812-01-01) |
| 1831 Bristol riots | date outside 1974 to today (1831-10-31) |
| 1831 reform riots | date outside 1974 to today (1831-10-01) |
| 1834 Philadelphia race riot | date outside 1974 to today (1834-08-12) |
| 1835 Wolverhampton riot | date outside 1974 to today (1835-05-27) |
| 1836 Abolition riot | date outside 1974 to today (1836-01-01) |
| 1836 Granville riot | no protest infobox, and its title and categories don't both say protest |
| 1842 Pottery Riots | date outside 1974 to today (1842-01-01) |
| 1842 Preston strike | date outside 1974 to today (1842-01-01) |
| 1842 general strike | date outside 1974 to today (1842-01-01) |
| 1847 Woodstock riot | date outside 1974 to today (no date found) |
| 1853–1854 Preston strike | date outside 1974 to today (1853-08-22) |
| 1870 North Adams strike | date outside 1974 to today (1870-01-01) |
| 1872 Metropolitan Police strike | date outside 1974 to today (1872-01-01) |
| 1874 Tompkins Square Park riot | date outside 1974 to today (no date found) |
| 1877 Chicago railroad strike | date outside 1974 to today (1877-01-01) |
| 1877 Scranton general strike | date outside 1974 to today (1877-07-23) |
| 1877 St. Louis general strike | date outside 1974 to today (1877-01-01) |
| 1880 Garret Rock May Day riot | date outside 1974 to today (1880-05-01) |
| 1886 Belfast riots | date outside 1974 to today (1886-01-01) |
| 1889 London dock strike | date outside 1974 to today (1889-01-01) |
| 1889 Rotterdam dock strike | date outside 1974 to today (1889-09-26) |
| 1891 Belgrade riot | date outside 1974 to today (1891-05-18) |
| 1893 United Kingdom miners' strike | no protest infobox, and its title and categories don't both say protest |
| 1894 Cripple Creek miners' strike | date outside 1974 to today (1903-01-01) |
| 1899–1900 peasant unrest in Bulgaria | date outside 1974 to today (no date found) |
| 19 January 2015 DRC protests | not in the UK (Wikidata country: Democratic Republic of the Congo; no UK protest site named in the article) |
| 1904 Italian general strike | date outside 1974 to today (1904-09-16) |
| 1904 New York City rent strike | date outside 1974 to today (1904-01-01) |
| 1906 WSPU march | date outside 1974 to today (1906-01-01) |
| 1907 Belfast Dock strike | date outside 1974 to today (1907-04-26) |
| 1907 New York City rent strike | date outside 1974 to today (1907-12-26) |
| 1907 Skowhegan textile strike | date outside 1974 to today (1907-04-13) |
| 1907 Sydney bathing costume protests | date outside 1974 to today (1907-10-20) |
| 1909 Pressed Steel Car strike | date outside 1974 to today (1909-09-08) |
| 1909 South Omaha anti-Greek riot | date outside 1974 to today (1909-02-21) |
| 1910 Chicago garment workers' strike | date outside 1974 to today (1910-09-22) |
| 1911 Curepipe riots | date outside 1974 to today (1911-01-19) |
| 1911 Liverpool general transport strike | date outside 1974 to today (1911-08-01) |
| 1911 South Wales anti-Jewish riots | date outside 1974 to today (1911-08-19) |
| 1912 Brisbane general strike | date outside 1974 to today (1912-01-18) |
| 1912 Fez riots | date outside 1974 to today (1912-04-17) |
| 1912 Lawrence textile strike | date outside 1974 to today (1912-03-14) |
| 1912 United Kingdom national coal strike | date outside 1974 to today (1912-02-28) |
| 1912–1913 Little Falls textile strike | date outside 1974 to today (1912-10-09) |
| 1913 Ipswich Mills strike | date outside 1974 to today (1913-07-31) |
| 1913 Paterson silk strike | date outside 1974 to today (1913-01-01) |
| 1914 Saint John street railway strike | date outside 1974 to today (1914-07-22) |
| 1914–1915 Fulton Bag and Cotton Mills strike | date outside 1974 to today (1914-05-20) |
| 1915 Glasgow rent strikes | date outside 1974 to today (1915-03-01) |
| 1915 Sinhalese-Muslim riots | date outside 1974 to today (1915-05-28) |
| 1916 Hamilton machinists' strike | date outside 1974 to today (1916-07-22) |
| 1916 West Coast waterfront strike | date outside 1974 to today (1916-06-01) |
| 1917 Australian general strike | date outside 1974 to today (1917-08-02) |
| 1917 French Army mutinies | date outside 1974 to today (1917-01-01) |
| 1918 Rio de Janeiro anarchist insurrection | date outside 1974 to today (1918-11-18) |
| 1918 United Kingdom embargo strike | date outside 1974 to today (1918-07-29) |
| 1918 protest in Zagreb | date outside 1974 to today (1918-12-05) |
| 1918–1919 United Kingdom police strikes | date outside 1974 to today (1918-01-01) |
| 1918–1920 New York City rent strikes | date outside 1974 to today (1918-01-01) |
| 1919 Actors' Equity Association strike | date outside 1974 to today (1919-09-06) |
| 1919 British race riots | no protest infobox, and its title and categories don't both say protest |
| 1919 New York City Harbor strike | date outside 1974 to today (1919-04-20) |
| 1919 South Wales race riots | not a protest article (its infobox is “civilian attack”) |
| 1919 United Kingdom railway strike | date outside 1974 to today (1919-10-05) |
| 1920 Alabama coal strike | date outside 1974 to today (1920-09-07) |
| 1920 blind march | date outside 1974 to today (1920-01-01) |
| 1920–1921 Chicago rent strikes | date outside 1974 to today (1920-01-01) |
| 1921–1928 Newport, Kentucky steel strike | date outside 1974 to today (1921-10-05) |
| 1922 Italian general strike | date outside 1974 to today (1922-01-01) |
| 1922 New England Textile Strike | date outside 1974 to today (1922-01-23) |
| 1922 Portland waterfront strike | date outside 1974 to today (1922-01-01) |
| 1923 United Kingdom dock strike | date outside 1974 to today (1923-01-01) |
| 1925 Tenant Movement | date outside 1974 to today (1925-01-01) |
| 1926 Passaic textile strike | date outside 1974 to today (1926-01-25) |
| 1926 United Kingdom general strike | date outside 1974 to today (1926-05-04) |
| 1928 Ethiopian coup attempt | date outside 1974 to today (1928-09-01) |
| 1929 Palestine riots | not a protest article (its infobox is “civilian attack”) |
| 1930 Rangoon riots | date outside 1974 to today (1930-06-24) |
| 1931 Barcelona rent strike | date outside 1974 to today (1931-12-01) |
| 1931 Cyprus revolt | date outside 1974 to today (1931-10-21) |
| 1931–1933 New York City rent strikes | date outside 1974 to today (1931-01-01) |
| 1933 Dublin riot | date outside 1974 to today (1933-03-30) |
| 1933 Funsten Nut strike | date outside 1974 to today (1933-01-01) |
| 1933 Palestine riots | date outside 1974 to today (1933-01-01) |
| 1934 United States textile workers' strike | date outside 1974 to today (1934-01-01) |
| 1935 Copperbelt strike | date outside 1974 to today (1935-05-29) |
| 1935 Revolution Day Zócalo Battle | date outside 1974 to today (1935-11-20) |
| 1935 Sectarian rioting across Ireland | no protest infobox, and its title and categories don't both say protest |
| 1935 Suvalkija farmers' strike | no protest infobox, and its title and categories don't both say protest |
| 1935–1936 protests in Egypt | date outside 1974 to today (1935-11-11) |
| 1937 Brazilian coup d'état | date outside 1974 to today (1937-01-01) |
| 1938 New York City truckers strike | date outside 1974 to today (1938-09-15) |
| 1941 Nord-Pas-de-Calais miners' strike | date outside 1974 to today (1941-05-27) |
| 1942 Betteshanger miners' strike | no protest infobox, and its title and categories don't both say protest |
| 1942 Phoenix Thanksgiving Day riot | date outside 1974 to today (1942-11-26) |
| 1943 Detroit race riot | date outside 1974 to today (1943-01-01) |
| 1943 Greek protests against labour mobilization | date outside 1974 to today (1943-02-22) |
| 1943 Rolls-Royce strike | no protest infobox, and its title and categories don't both say protest |
| 1945 Windsor Ford strike | date outside 1974 to today (1945-09-12) |
| 1945–1946 Charleston Cigar Factory strike | date outside 1974 to today (1945-10-22) |
| 1946 Egyptian protests | date outside 1974 to today (1946-02-09) |
| 1946 Montreal Cottons strike | date outside 1974 to today (1946-06-01) |
| 1947 Jammu massacres | date outside 1974 to today (1947-10-01) |
| 1947 Telephone strike | no protest infobox, and its title and categories don't both say protest |
| 1947 anti-Jewish riots in Aden | date outside 1974 to today (1947-12-02) |
| 1947 anti-Jewish riots in Manama | not a protest article (its infobox is “civilian attack”) |
| 1950 Austrian general strikes | date outside 1974 to today (1950-01-01) |
| 1955 Singaporean constitutional crisis | date outside 1974 to today (1955-07-09) |
| 1955 riots at the Pakistani embassy and consulates in Afghanistan | not a protest article (its infobox is “terrorist attack”) |
| 1956 Australian shearers' strike | date outside 1974 to today (1956-01-01) |
| 1956 Georgian demonstrations | date outside 1974 to today (1956-03-04) |
| 1956 Hong Kong riots | date outside 1974 to today (1956-10-10) |
| 1958 Notting Hill race riots | no protest infobox, and its title and categories don't both say protest |
| 1962 Rangoon University protests | date outside 1974 to today (1963-01-01) |
| 1964 Monson Motor Lodge protests | date outside 1974 to today (1964-06-18) |
| 1964 Rochester race riot | date outside 1974 to today (1964-01-01) |
| 1964 race riots in Singapore | date outside 1974 to today (1964-01-01) |
| 1964–1965 Scripto strike | date outside 1974 to today (1964-11-27) |
| 1965 Yerevan demonstrations | date outside 1974 to today (1965-04-24) |
| 1966 Hong Kong riots | date outside 1974 to today (1966-04-04) |
| 1966 Sarawak constitutional crisis | date outside 1974 to today (1965-01-01) |
| 1966 anti-cow slaughter riot | date outside 1974 to today (1966-11-07) |
| 1967 Atlanta riots | date outside 1974 to today (1967-01-01) |
| 1967 Detroit riot | date outside 1974 to today (1967-01-01) |
| 1967 Hong Kong riots | date outside 1974 to today (1967-12-01) |
| 1967 New York City riot | date outside 1974 to today (1967-01-01) |
| 1967 Penang Hartal riot | date outside 1974 to today (1967-11-24) |
| 1967 Riviera Beach riot | date outside 1974 to today (1967-01-01) |
| 1967 Tampa riots | date outside 1974 to today (1967-01-01) |
| 1968 Democratic National Convention protests | date outside 1974 to today (1968-01-01) |
| 1968 Polish political crisis | date outside 1974 to today (1968-08-01) |
| 1968–1969 Japanese university protests | date outside 1974 to today (1968-01-01) |
| 1969 Northern Ireland riots | date outside 1974 to today (1969-08-12) |
| 1969 United Kingdom miners' strike | no protest infobox, and its title and categories don't both say protest |
| 1969 York race riot | date outside 1974 to today (1969-07-01) |
| 1970 Memorial Park riot | date outside 1974 to today (1970-01-01) |
| 1970 United Kingdom dockers' strike | date outside 1974 to today (1970-01-01) |
| 1970–1973 Republic of Ireland rent strikes | date outside 1974 to today (1970-01-01) |
| 1971 United Kingdom postal workers strike | date outside 1974 to today (1971-01-01) |
| 1972 Irish hunger strike | no protest infobox, and its title and categories don't both say protest |
| 1972 Mead wildcat strike | date outside 1974 to today (1972-08-18) |
| 1972 United Kingdom miners' strike | date outside 1974 to today (1972-01-09) |
| 1973 Durban strikes | date outside 1974 to today (1973-01-09) |
| 1974 Ethiopian Muslim protests | no place in the UK could be named |
| 1975 Mauritian student protests | no protest infobox, and its title and categories don't both say protest |
| 1978 Sikh–Nirankari clash | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 1979 Nepalese student protests | no place in the UK could be named |
| 1981 Bermuda general strike | no protest infobox, and its title and categories don't both say protest |
| 1981 Chapeltown riots | no protest infobox, and its title and categories don't both say protest |
| 1981 protests in Kosovo | not in the UK (Wikidata country: Yugoslavia; no UK protest site named in the article) |
| 1981 riots | no protest infobox, and its title and categories don't both say protest |
| 1981 warning strike in Poland | not in the UK (Wikidata country: Poland; no UK protest site named in the article) |
| 1982 Golan Heights Druze general strike | not in the UK (Wikidata country: Syria; no UK protest site named in the article) |
| 1982 Overtown riot | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1983 Pacific Coast Metal Trades Union strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1983 SEPTA Regional Rail strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1983 women's march, Lahore | no protest infobox, and its title and categories don't both say protest |
| 1984 Disneyland strike | no place in the UK could be named |
| 1984 Islington nursery strike | no protest infobox, and its title and categories don't both say protest |
| 1984 Summer Olympics boycott | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1985 Greek constitutional crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 1985 Luton riot | not a protest article (its infobox is “football match”) |
| 1985 Pan Am strike | no place in the UK could be named |
| 1985–1986 Dartmouth College anti-apartheid protests | no place in the UK could be named |
| 1985–1986 New Bedford fishermen's strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1986 Chinese student demonstrations | no protest infobox, and its title and categories don't both say protest |
| 1988 IMF/World Bank protests | no protest infobox, and its title and categories don't both say protest |
| 1988 Summer Olympics boycott | not in the UK (Wikidata country: South Korea; no UK protest site named in the article) |
| 1988 Writers Guild of America strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1989 Dewsbury riot | no place in the UK could be named |
| 1989 Soviet miners' strikes | not in the UK (Wikidata country: Soviet Union; no UK protest site named in the article) |
| 1989 Sukhumi riots | no place in the UK could be named |
| 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| 1990 Norwegian oil workers' strike | no place in the UK could be named |
| 1990 West Virginia teachers' strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1991 Haitian coup d'état | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 1991 Zaire unrest | not in the UK (Wikidata country: Zaire; no UK protest site named in the article) |
| 1991 protest in Split | not in the UK (Wikidata country: Croatia; no UK protest site named in the article) |
| 1991 protests in Belgrade | not in the UK (Wikidata country: Socialist Republic of Serbia; no UK protest site named in the article) |
| 1991 riot in Zadar | not in the UK (Wikidata country: Croatia; no UK protest site named in the article) |
| 1991–1992 anti-war protests in Belgrade | not in the UK (Wikidata country: Yugoslavia; no UK protest site named in the article) |
| 1992 Los Angeles riots | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1993 Cherbourg incident | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 1993 Welling riots | no protest infobox, and its title and categories don't both say protest |
| 1994–1996 United States broadcast television realignment | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 1996 Parliament House riot | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| 1996 Trafalgar Square riots | no protest infobox, and its title and categories don't both say protest |
| 1996 cruise missile strikes on Iraq | not a protest article (its infobox is “military operation”) |
| 1997 Banjarmasin riot | not in the UK (Wikidata country: Indonesia; no UK protest site named in the article) |
| 1997 Northern Ireland riots | not a protest article (its infobox is “military conflict”) |
| 1997 United Parcel Service strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 1998 Puerto Rican general strike | no place in the UK could be named |
| 1999 Mauritian riots | not in the UK (Wikidata country: Mauritius; no UK protest site named in the article) |
| 1999 Seattle WTO protests | no place in the UK could be named |
| 1999 Water Supply Blackmail Plot | no single place, and the title doesn't describe a protest |
| 1st Interceptor and Strike Fighter Squadron (Brazil) | not a protest article (its infobox is “military unit”) |
| 2000 UEFA Cup final riots | not in the UK (Wikidata country: Denmark; no UK protest site named in the article) |
| 2001 England riots | no protest infobox, and its title and categories don't both say protest |
| 2002 Short Strand clashes | no UK place, and neither Wikidata nor the title says it was in the UK |
| 2002 World Bank Oslo protests | not in the UK (Wikidata country: Norway; no UK protest site named in the article) |
| 2003 La Paz riots | not in the UK (Wikidata country: Bolivia; no UK protest site named in the article) |
| 2004 Dublin May Day protests | no protest infobox, and its title and categories don't both say protest |
| 2004 Redfern riots | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| 2004 Republican National Convention protest activity | no place in the UK could be named |
| 2004 unrest in Kosovo | not in the UK (Wikidata country: Kosovo; no UK protest site named in the article) |
| 2004–05 NHL lockout | no place in the UK could be named |
| 2005 BBC strike | no protest infobox, and its title and categories don't both say protest |
| 2005 Cronulla riots | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| 2005 Inuvil shooting and protests | no protest infobox, and its title and categories don't both say protest |
| 2005 anti-Japanese demonstrations | no place in the UK could be named |
| 2006 Dublin riots | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| 2006 Nepalese revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2006 United States broadcast television realignment | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2006 United States immigration reform protests | no place in the UK could be named |
| 2006 anti-NATO protests in Feodosia | no place in the UK could be named |
| 2006 youth protests in France | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| 2006–2008 Lebanese protests | not in the UK (Wikidata country: Lebanon; no UK protest site named in the article) |
| 2007 Christmas violence in Kandhamal | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2007 Georgian demonstrations | no place in the UK could be named |
| 2007 Royal Mail industrial disputes | no UK place, and neither Wikidata nor the title says it was in the UK |
| 2007 Venezuelan RCTV protests | not in the UK (Wikidata country: Venezuela; no UK protest site named in the article) |
| 2007 Venezuelan referendum protests | not in the UK (Wikidata country: Venezuela; no UK protest site named in the article) |
| 2007–08 Writers Guild of America strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2007–2008 Cork players' strike | no place in the UK could be named |
| 2007–2008 Kenyan crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2008 Armenian presidential election protests | not in the UK (Wikidata country: Armenia; no UK protest site named in the article) |
| 2008 Greek riots | not in the UK (Wikidata country: Greece; no UK protest site named in the article) |
| 2008 Kandhamal violence | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2008 National Union of Teachers strike | no protest infobox, and its title and categories don't both say protest |
| 2008 Tibetan unrest | no place in the UK could be named |
| 2008 Uyghur unrest | no protest infobox, and its title and categories don't both say protest |
| 2008 attacks on Christians in southern Karnataka | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2008 protests against Kosovo declaration of independence | no place in the UK could be named |
| 2009 French riots | not a protest article (its infobox is “civilian attack”) |
| 2009 Guinean protests | not in the UK (Wikidata country: Guinea; no UK protest site named in the article) |
| 2009 Honduran coup d'état | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2009 Icelandic financial crisis protests | not in the UK (Wikidata country: Iceland; no UK protest site named in the article) |
| 2009 Iran poll protests trial | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| 2009 May Day protests | no place in the UK could be named |
| 2009–2010 California college tuition hike protests | no place in the UK could be named |
| 2010 Canada anti-prorogation protests | not in the UK (Wikidata country: Canada; no UK protest site named in the article) |
| 2010 Catalan autonomy protest | not in the UK (Wikidata country: Spain; no UK protest site named in the article) |
| 2010 French pension reform strikes | no protest infobox, and its title and categories don't both say protest |
| 2010 G20 Toronto summit protests | not in the UK (Wikidata country: Canada; no UK protest site named in the article) |
| 2010 Hong Kong democracy protests | no protest infobox, and its title and categories don't both say protest |
| 2010 Kashmir unrest | no place in the UK could be named |
| 2010 Kyrgyz Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2010 Rinkeby riots | not in the UK (Wikidata country: Sweden; no UK protest site named in the article) |
| 2010 Thai political protests | not a protest article (its infobox is “civilian attack”) |
| 2010 United Kingdom student protests | no protest infobox, and its title and categories don't both say protest |
| 2010 student protest in Dublin | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| 2010–2012 Algerian protests | not in the UK (Wikidata country: Algeria; no UK protest site named in the article) |
| 2011 Albanian opposition demonstrations | not in the UK (Wikidata country: Albania; no UK protest site named in the article) |
| 2011 Azerbaijani protests | no place in the UK could be named |
| 2011 Bahraini uprising | not in the UK (Wikidata country: Bahrain; no UK protest site named in the article) |
| 2011 Bolivian Indigenous rights protests | not in the UK (Wikidata country: Bolivia; no UK protest site named in the article) |
| 2011 Burkina Faso protests | no place in the UK could be named |
| 2011 Djiboutian protests | not in the UK (Wikidata country: Djibouti; no UK protest site named in the article) |
| 2011 Egyptian revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2011 Indian anti-corruption movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2011 Iraqi protests | not in the UK (Wikidata country: Iraq; no UK protest site named in the article) |
| 2011 Israeli border demonstrations | no place in the UK could be named |
| 2011 Israeli social justice protests | not in the UK (Wikidata country: Israel; no UK protest site named in the article) |
| 2011 Khuzestan protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| 2011 Kurdish protests in Iraq | no place in the UK could be named |
| 2011 Lebanese protests | not in the UK (Wikidata country: Lebanon; no UK protest site named in the article) |
| 2011 Malawian protests | not in the UK (Wikidata country: Malawi; no UK protest site named in the article) |
| 2011 NBA lockout | no place in the UK could be named |
| 2011 Oakland general strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2011 Omani protests | no place in the UK could be named |
| 2011 Rome demonstration | not in the UK (Wikidata country: Italy; no UK protest site named in the article) |
| 2011 Turkish Cypriot protests | no place in the UK could be named |
| 2011 United Kingdom public sector strikes | no protest infobox, and its title and categories don't both say protest |
| 2011 Vancouver Stanley Cup riot | no protest infobox, and its title and categories don't both say protest |
| 2011 Western Saharan protests | no place in the UK could be named |
| 2011 Wisconsin protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2011 attack on the Israeli Embassy in Egypt | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2011–2012 Iranian protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| 2011–2012 Jordanian protests | no place in the UK could be named |
| 2011–2012 Kurdish protests in Turkey | not in the UK (Wikidata country: Turkey; no UK protest site named in the article) |
| 2011–2012 Mauritanian protests | not in the UK (Wikidata country: Mauritania; no UK protest site named in the article) |
| 2011–2012 Moroccan protests | not in the UK (Wikidata country: Morocco; no UK protest site named in the article) |
| 2011–2012 Palestinian protests | no place in the UK could be named |
| 2011–2012 Saudi Arabian protests | not a protest article (its infobox is “2011–2012 Saudi Arabian protests”) |
| 2011–2013 Maldives political crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2011–2013 Russian protests | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| 2011–2013 Sudanese protests | no place in the UK could be named |
| 2012 Afghanistan Quran burning protests | no place in the UK could be named |
| 2012 Asturian miners' strike | not in the UK (Wikidata country: Spain; no UK protest site named in the article) |
| 2012 Bahrain Grand Prix protests | not in the UK (Wikidata country: Bahrain; no UK protest site named in the article) |
| 2012 May Day protests | no place in the UK could be named |
| 2012 NFL referee lockout | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2012 Rakhine State riots | not a protest article (its infobox is “civilian attack”) |
| 2012 Romanian protests | not in the UK (Wikidata country: Romania; no UK protest site named in the article) |
| 2012 anti-Japanese demonstrations in China | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| 2012–2013 Cypriot financial crisis | no protest infobox, and its title and categories don't both say protest |
| 2012–2013 Ecuador–United Kingdom diplomatic crisis | no single place, and the title doesn't describe a protest |
| 2012–2013 Egyptian protests | not in the UK (Wikidata country: Egypt; no UK protest site named in the article) |
| 2012–2013 Iraqi protests | no place in the UK could be named |
| 2012–2014 Romanian protests against shale gas | not in the UK (Wikidata country: Romania; no UK protest site named in the article) |
| 2012–2015 unrest in Romania | no place in the UK could be named |
| 2013 Armenian protests | not in the UK (Wikidata country: Armenia; no UK protest site named in the article) |
| 2013 Bulgarian protests against the first Borisov cabinet | no UK place, and neither Wikidata nor the title says it was in the UK |
| 2013 Egyptian coup d'état | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2013 Israeli protests | not in the UK (Wikidata country: Israel; no UK protest site named in the article) |
| 2013 Shahbag protests | not in the UK (Wikidata country: Bangladesh; no UK protest site named in the article) |
| 2013 Shapla Square protests | not in the UK (Wikidata country: Bangladesh; no UK protest site named in the article) |
| 2013 Tbilisi anti-homophobia rally protests | not in the UK (Wikidata country: Georgia; no UK protest site named in the article) |
| 2013 Trappes riots | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| 2013 anti-Sri Lanka protests | not in the UK (Wikidata country: Sri Lanka; no UK protest site named in the article) |
| 2013 protests in Brazil | not in the UK (Wikidata country: Brazil; no UK protest site named in the article) |
| 2013–2014 Bulgarian protests against the Oresharski cabinet | not in the UK (Wikidata country: Bulgaria; no UK protest site named in the article) |
| 2013–2014 Thai political crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2013–2014 Tunisian political crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2014 Belgian anti-austerity movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2014 Burkina Faso uprising | not in the UK (Wikidata country: Burkina Faso; no UK protest site named in the article) |
| 2014 Hong Kong protests | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| 2014 Jadavpur University protests | no place in the UK could be named |
| 2014 Kobanî protests | not in the UK (Wikidata country: Turkey; no UK protest site named in the article) |
| 2014 Lahore clash | no place in the UK could be named |
| 2014 May Day protests | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| 2014 Odesa clashes | not in the UK (Wikidata country: Ukraine; no UK protest site named in the article) |
| 2014 Panama–Venezuela diplomatic crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2014 People's Climate March | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| 2014 Vietnam anti-China protests | not in the UK (Wikidata country: Vietnam; no UK protest site named in the article) |
| 2014 anti-war protests in Russia | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| 2014 pro-Russian unrest in Ukraine | not in the UK (Wikidata country: Ukraine; no UK protest site named in the article) |
| 2014 unrest in Bosnia and Herzegovina | no place in the UK could be named |
| 2014–2016 Oromo protests | not in the UK (Wikidata country: Ethiopia; no UK protest site named in the article) |
| 2015 Macedonian protests | no place in the UK could be named |
| 2015 May Day protests in the Maldives | no place in the UK could be named |
| 2015 Romanian protests | not in the UK (Wikidata country: Romania; no UK protest site named in the article) |
| 2015–2016 protests in Moldova | not in the UK (Wikidata country: Moldova; no UK protest site named in the article) |
| 2016–2017 Zimbabwe protests | not in the UK (Wikidata country: Zimbabwe; no UK protest site named in the article) |
| 2017 Belarusian protests | not in the UK (Wikidata country: Belarus; no UK protest site named in the article) |
| 2017 CUHK democracy wall standoff | no place in the UK could be named |
| 2017 Paraguayan crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2017 People's Climate March | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2017 Shayrat missile strike | not a protest article (its infobox is “operational plan”) |
| 2017 Venezuelan constitutional crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2017 Venezuelan protests | not in the UK (Wikidata country: Venezuela; no UK protest site named in the article) |
| 2017 pro-jallikattu protests | no place in the UK could be named |
| 2017 storming of the Macedonian Parliament | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2017–2018 Iranian protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| 2017–2018 Russian protests | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| 2017–2019 Romanian protests | not in the UK (Wikidata country: Romania; no UK protest site named in the article) |
| 2018 Alabama Coca-Cola strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2018 Armenian Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2018 Bangladesh road-safety protests | not in the UK (Wikidata country: Bangladesh; no UK protest site named in the article) |
| 2018 Citizen and Solidarity March (France) | no protest infobox, and its title and categories don't both say protest |
| 2018 Nicaraguan protests | not in the UK (Wikidata country: Nicaragua; no UK protest site named in the article) |
| 2018 Sri Lankan constitutional crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2018 Thoothukudi protest shooting | not a protest article (its infobox is “civilian attack”) |
| 2018 Vietnam protests | no place in the UK could be named |
| 2018 Women's March | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2018 anti-Muslim riots in Sri Lanka | not a protest article (its infobox is “civilian attack”) |
| 2018–2019 Gaza border protests | not in the UK (Wikidata country: Palestine; no UK protest site named in the article) |
| 2018–2020 Serbian protests | not in the UK (Wikidata country: Serbia; no UK protest site named in the article) |
| 2019 Balakot airstrike | not a protest article (its infobox is “military conflict”) |
| 2019 Bolivian political crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2019 Egyptian protests | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| 2019 Hong Kong Polytechnic University campus conflict | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2019 Indonesian protests and riots | not in the UK (Wikidata country: Indonesia; no UK protest site named in the article) |
| 2019 Moldovan constitutional crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2019 Montenegrin anti-corruption protests | not in the UK (Wikidata country: Montenegro; no UK protest site named in the article) |
| 2019 Papua protests | not in the UK (Wikidata country: Indonesia; no UK protest site named in the article) |
| 2019 Stop & Shop strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2019 Women's March | no place in the UK could be named |
| 2019 anti-Muslim riots in Sri Lanka | not a protest article (its infobox is “civilian attack”) |
| 2019 shipping of humanitarian aid to Venezuela | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2019–2020 French pension reform strike | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| 2019–2020 Hong Kong protests | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| 2019–2020 Iranian protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| 2019–2020 Maltese protests | not in the UK (Wikidata country: Malta; no UK protest site named in the article) |
| 2019–2024 Amaravati protests | no place in the UK could be named |
| 2020 Azerbaijani protests | not in the UK (Wikidata country: Azerbaijan; no UK protest site named in the article) |
| 2020 Balyun airstrikes | not a protest article (its infobox is “military operation”) |
| 2020 Bath shipbuilders' strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2020 Guatemalan protests | not in the UK (Wikidata country: Guatemala; no UK protest site named in the article) |
| 2020 Kyrgyz Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2020 Mi'kmaq lobster dispute | no place in the UK could be named |
| 2020 Michigan graduate students' strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2020 Port of Montreal strike | not in the UK (Wikidata country: Canada; no UK protest site named in the article) |
| 2020 Salvadoran political crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2020 Singapore circuit breaker measures | no place in the UK could be named |
| 2020s anti-LGBTQ movement in the United States | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2020–2021 Belarusian protests | not in the UK (Wikidata country: Belarus; no UK protest site named in the article) |
| 2020–2021 Indian farmers' protest | not in the UK (Wikidata country: India; no UK protest site named in the article) |
| 2020–21 United States election protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2021 British Gas strike | no protest infobox, and its title and categories don't both say protest |
| 2021 Colombian protests | not in the UK (Wikidata country: Colombia; no UK protest site named in the article) |
| 2021 Dublin riots | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| 2021 Israel–Palestine crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2021 Lakhimpur Kheri violence | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2021 Nigerian doctors' strike | not in the UK (Wikidata country: Nigeria; no UK protest site named in the article) |
| 2021 Russian protests | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| 2021 Tripura riots | not in the UK (Wikidata country: India; no UK protest site named in the article) |
| 2021 anti-LGBTQ riots in Georgia | not in the UK (Wikidata country: Georgia; no UK protest site named in the article) |
| 2021 anti-Pakistan protests | no UK place, and neither Wikidata nor the title says it was in the UK |
| 2021–2022 Saint Vincent Hospital strike | no place in the UK could be named |
| 2021–2022 Serbian environmental protests | not in the UK (Wikidata country: Serbia; no UK protest site named in the article) |
| 2021–2023 Eswatini protests | not in the UK (Wikidata country: Eswatini; no UK protest site named in the article) |
| 2022 Beijing Sitong Bridge protest | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| 2022 COVID-19 protests in China | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| 2022 Europe inflation protests | no protest infobox, and its title and categories don't both say protest |
| 2022 German coup d'état plot | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2022 Kazakh unrest | not in the UK (Wikidata country: Kazakhstan; no UK protest site named in the article) |
| 2022 Khargone violence | no place in the UK could be named |
| 2022 Moscow rally | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| 2022 North Caucasian protests | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| 2022 Peruvian economic protests | not in the UK (Wikidata country: Peru; no UK protest site named in the article) |
| 2022 Russian Far East protests | no protest infobox, and its title and categories don't both say protest |
| 2022 Wellington protest | not in the UK (Wikidata country: New Zealand; no UK protest site named in the article) |
| 2022 drone attack on the Sevastopol Naval Base | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2022 protests in Russian-occupied Ukraine | not in the UK (Wikidata country: Ukraine; no UK protest site named in the article) |
| 2022–2023 Brazilian coup plot | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2022–2023 Iranian diaspora protests | no protest infobox, and its title and categories don't both say protest |
| 2023 Armenian protests | not in the UK (Wikidata country: Armenia; no UK protest site named in the article) |
| 2023 Bitung clashes | not in the UK (Wikidata country: Indonesia; no UK protest site named in the article) |
| 2023 Democratic National Committee protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2023 Dublin riot | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| 2023 French pension reform strikes | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| 2023 Israeli judicial reform protests | not in the UK (Wikidata country: Israel; no UK protest site named in the article) |
| 2023 Israel–Palestine tensions | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2023 Kramatorsk restaurant missile strike | not a protest article (its infobox is “civilian attack”) |
| 2023 Pakistani protests | not in the UK (Wikidata country: Pakistan; no UK protest site named in the article) |
| 2023 Pokrovsk missile strike | not a protest article (its infobox is “civilian attack”) |
| 2023 SAG-AFTRA strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2023 Sikh protests | no UK place, and neither Wikidata nor the title says it was in the UK |
| 2023 Taiwanese anti–Indian migrant worker protest | not in the UK (Wikidata country: Taiwan; no UK protest site named in the article) |
| 2023 Uman missile strike | not a protest article (its infobox is “civilian attack”) |
| 2023 Writers Guild of America strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2023 antisemitic riots in the North Caucasus | not a protest article (its infobox is “civilian attack”) |
| 2023-2024 Guatemalan political crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2023–2024 European Union farmers' protests | not in the UK (Wikidata country: European Union; no UK protest site named in the article) |
| 2024 Abkhazian protests | not in the UK (Wikidata country: Georgia, Republic of Abkhazia; no UK protest site named in the article) |
| 2024 Armenian protests | not in the UK (Wikidata country: Armenia; no UK protest site named in the article) |
| 2024 Bangladesh quota reform movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2024 Boston University strikes | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2024 Faizabad sit-in | no place in the UK could be named |
| 2024 Hezbollah headquarters strike | not a protest article (its infobox is “military operation”) |
| 2024 Iranian missile strikes in Iraq and Syria | not a protest article (its infobox is “military operation”) |
| 2024 Kansas City metropolitan area rent strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2024 Mexican judicial reform protests | not in the UK (Wikidata country: Mexico; no UK protest site named in the article) |
| 2024 New Caledonia unrest | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| 2024 South Korean martial law crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2024 Taiwanese legislative reform controversy | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2024 Tyre airstrikes | not a protest article (its infobox is “military conflict”) |
| 2024 United States port strike | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2024 University of Amsterdam pro-Palestinian campus occupations | not in the UK (Wikidata country: Netherlands; no UK protest site named in the article) |
| 2024 University of Oregon pro-Palestinian campus occupation | no place in the UK could be named |
| 2024 University of Texas at Austin pro-Palestinian campus protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2024 University of Twente pro-Palestinian campus protests | no place in the UK could be named |
| 2024 Venezuelan presidential election protests | not in the UK (Wikidata country: Venezuela; no UK protest site named in the article) |
| 2024 pro-Palestinian strike in Spain | not in the UK (Wikidata country: Spain; no UK protest site named in the article) |
| 2024 storming of the Kenyan Parliament | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 2024–2025 Indian farmers' protest | not in the UK (Wikidata country: India; no UK protest site named in the article) |
| 2024–2026 Georgian protests | not in the UK (Wikidata country: Georgia; no UK protest site named in the article) |
| 2024–2026 Serbian anti-corruption protests | not in the UK (Wikidata country: Serbia; no UK protest site named in the article) |
| 2025 Balochistan protests | no place in the UK could be named |
| 2025 Chicago ACTA rent strikes | no place in the UK could be named |
| 2025 Chongqing anti-CCP protest | no protest infobox, and its title and categories don't both say protest |
| 2025 Gaza European Hospital strikes | not a protest article (its infobox is “civilian attack”) |
| 2025 Gaza Strip anti-Hamas protests | no place in the UK could be named |
| 2025 Iranian strikes on Al Udeid Air Base | not a protest article (its infobox is “military operation”) |
| 2025 Italian general strikes and protests for Gaza | not in the UK (Wikidata country: Italy; no UK protest site named in the article) |
| 2025 Kryvyi Rih playground strike | not a protest article (its infobox is “civilian attack”) |
| 2025 Maldivian protests | not in the UK (Wikidata country: Maldives; no UK protest site named in the article) |
| 2025 Nasser Hospital strikes | not a protest article (its infobox is “civilian attack”) |
| 2025 Nepalese Gen Z protests | not in the UK (Wikidata country: Nepal; no UK protest site named in the article) |
| 2025 Russian strikes on Ukrainian training grounds | not a protest article (its infobox is “military operation”) |
| 2025 Sulaymaniyah clashes | not in the UK (Wikidata country: Iraq; no UK protest site named in the article) |
| 2025 Sydney Harbour Bridge protest | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| 2025 Tehreek-e-Labbaik Pakistan protests | no place in the UK could be named |
| 2025 Ternopil strike | not a protest article (its infobox is “military operation”) |
| 2025 Timor-Leste protests | not in the UK (Wikidata country: Timor-Leste; no UK protest site named in the article) |
| 2025 United States strikes on Iranian nuclear sites | not a protest article (its infobox is “military operation”) |
| 2025–2026 Bulgarian protests | no UK place, and neither Wikidata nor the title says it was in the UK |
| 2025–2026 Canada–United States trade war | no place in the UK could be named |
| 2025–2026 Iranian protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| 2025–2026 Portland, Oregon, protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| 2026 Invasion Day protest bombing attempt | not a protest article (its infobox is “civilian attack”) |
| 2026 Iranian strike on Azerbaijan | not a protest article (its infobox is “civilian attack<!--these infoboxes are also used for military attacks-->”) |
| 2026 Iranian strike on Diego Garcia | not a protest article (its infobox is “military conflict”) |
| 2026 Iranian strikes on Jordan | not a protest article (its infobox is “military conflict”) |
| 2026 Iranian strikes on Qatar | not a protest article (its infobox is “military conflict”) |
| 2026 Iranian strikes on the Kurdistan Region | not a protest article (its infobox is “military conflict”) |
| 2026 Irish fuel protests | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| 2026 Irish public sector strikes | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| 2026 New York City protest bombing attempt | not a protest article (its infobox is “civilian attack”) |
| 2026 Starobilsk strike | not a protest article (its infobox is “civilian attack”) |
| 2026 U.S. immigration enforcement protests | no place in the UK could be named |
| 2026 strikes on Akrotiri and Dhekelia | not a protest article (its infobox is “military conflict”) |
| 20th anniversary of the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| 22 March 2024 Russian strikes on Ukraine | not a protest article (its infobox is “civilian attack”) |
| 27 July 1996 incident | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 29 October 2024 Beit Lahia airstrike | not a protest article (its infobox is “civilian attack”) |
| 30th anniversary of the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| 31 March incident | not a protest article (its infobox is “military conflict”) |
| 32nd anniversary of the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| 3rd Deep Recce Strike Brigade | not a protest article (its infobox is “military unit”) |
| 50501 protests in February 2025 | no protest infobox, and its title and categories don't both say protest |
| 6 February 1934 crisis | date outside 1974 to today (1934-02-06) |
| 6 March 2020 Kabul shooting | not a protest article (its infobox is “civilian attack”) |
| 7 November 1975 Bangladeshi coup d'état | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| 8888 Uprising | not in the UK (Wikidata country: Myanmar; no UK protest site named in the article) |
| A.S.P. Air Strike Patrol | not a protest article (its infobox is “video game”) |
| Aberdare strike 1857–1858 | date outside 1974 to today (no date found) |
| Aboriginal Tent Embassy | date outside 1974 to today (1972-01-27) |
| Aden Street riots | not a protest article (its infobox is “military conflict”) |
| Aftermath of the George Floyd protests in Minneapolis–Saint Paul | no place in the UK could be named |
| Akali movement | date outside 1974 to today (1920-01-01) |
| Albanian–Soviet split | date outside 1974 to today (1956-01-01) |
| Albany Movement | date outside 1974 to today (1961-01-01) |
| Aldermaston Marches | date outside 1974 to today (1950-01-01) |
| Aldershot riot (1945) | no protest infobox, and its title and categories don't both say protest |
| Alexandria Library sit-in | date outside 1974 to today (1939-08-21) |
| Alt Llobregat insurrection | date outside 1974 to today (1932-01-18) |
| American drone strikes in Pakistan | not a protest article (its infobox is “military conflict”) |
| Anarchist bombing campaign of 1888–1889 | date outside 1974 to today (1888-08-01) |
| Anarchist insurrection of December 1933 | date outside 1974 to today (1933-01-01) |
| Anarchist insurrection of January 1933 | date outside 1974 to today (1933-01-01) |
| Anglo-Irish trade war | date outside 1974 to today (1932-07-01) |
| Ann Carter (rioter) | no protest infobox, and its title and categories don't both say protest |
| Anne Wafula Strike | no protest infobox, and its title and categories don't both say protest |
| Anpo protests | date outside 1974 to today (1959-01-01) |
| Anti-Hindi agitations of Tamil Nadu | date outside 1974 to today (1937-08-11) |
| Anti-Serb riots in Sarajevo | date outside 1974 to today (1914-06-28) |
| Anti-austerity movement in Greece | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Anti-austerity movement in Ireland | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Anti-austerity movement in Portugal | no place in the UK could be named |
| Anti-austerity movement in Spain | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Anti-austerity movement in the United Kingdom | no single place, and the title doesn't describe a protest |
| Anti-internment rent and rates strike | date outside 1974 to today (1970-01-01) |
| Anti-nuclear protests | date outside 1974 to today (1946-07-01) |
| Anti-nuclear protests in the United States | no protest infobox, and its title and categories don't both say protest |
| Anti-war protests in Russia (2022–present) | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| Anzac Strike Wing | not a protest article (its infobox is “military unit”) |
| Apocalypse 91... The Enemy Strikes Black | not a protest article (its infobox is “album”) |
| April 2009 Moldovan parliamentary election protests | not in the UK (Wikidata country: Moldova; no UK protest site named in the article) |
| April 2018 missile strikes against Syria | not a protest article (its infobox is “operational plan”) |
| April 2024 Iranian strikes on Israel | not a protest article (its infobox is “military operation”) |
| April 2024 Israeli settler rampages | no place in the UK could be named |
| April 2024 Israeli strikes on Iran | not a protest article (its infobox is “military operation”) |
| April 27 demonstrations | no protest infobox, and its title and categories don't both say protest |
| Arab Spring | no place in the UK could be named |
| Aragalaya | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Armenian political crisis (2020–present) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Art Strike | no protest infobox, and its title and categories don't both say protest |
| Art of the 2019–2020 Hong Kong protests | no protest infobox, and its title and categories don't both say protest |
| Artistic reactions to the 1981 Irish hunger strike | no place in the UK could be named |
| Aryan Strikeforce | not a protest article (its infobox is “militant organization”) |
| Ashura protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| Assam Movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Astor Place Riot | not a protest article (its infobox is “military conflict”) |
| Asturian Revolution of 1934 | date outside 1974 to today (1934-10-04) |
| Athenian Revolution | date outside 1974 to today (0508-01-01) |
| Athenian coup of 411 BC | date outside 1974 to today (0411-01-01) |
| Athens Polytechnic uprising | date outside 1974 to today (1973-11-17) |
| Atlanta sit-ins | date outside 1974 to today (1960-03-15) |
| Atlanta's Berlin Wall | date outside 1974 to today (1962-12-17) |
| Attack on protestors at the Turkish embassy in Washington, D.C | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Attack on the United States embassy in Addis Ababa | date outside 1974 to today (1936-01-01) |
| Attempts to overturn the 2020 United States presidential election | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| August 2025 Indonesian protests | not in the UK (Wikidata country: Indonesia; no UK protest site named in the article) |
| August Agreements | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Australian industrial relations legislation national day of protest, 2005 | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| Australia–China trade war | no place in the UK could be named |
| Aviation biofuel demonstrations | no protest infobox, and its title and categories don't both say protest |
| Ax Handle Saturday | date outside 1974 to today (1960-08-27) |
| BIH Pride March | no protest infobox, and its title and categories don't both say protest |
| Bab Ali demonstration | date outside 1974 to today (1895-09-30) |
| Bacon's Rebellion | date outside 1974 to today (no date found) |
| Bahrain Tamarod | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Baltimore railroad strike of 1877 | date outside 1974 to today (1877-01-01) |
| Bangladesh post-resignation violence (2024–2026) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Bank War | date outside 1974 to today (1947-01-01) |
| Barue uprising | date outside 1974 to today (1917-01-01) |
| Batavian Revolution | date outside 1974 to today (1800-01-01) |
| Baton Rouge bus boycott | date outside 1974 to today (1953-06-25) |
| Battle of Ballantyne Pier | date outside 1974 to today (1935-06-18) |
| Battle of Bamber Bridge | date outside 1974 to today (1943-06-24) |
| Battle of Begums | not in the UK (Wikidata country: Bangladesh; no UK protest site named in the article) |
| Battle of Blair Mountain | date outside 1974 to today (1921-09-02) |
| Battle of Bossenden Wood | date outside 1974 to today (1838-05-31) |
| Battle of Bow Street | date outside 1974 to today (1919-03-01) |
| Battle of Brisbane | date outside 1974 to today (1942-11-26) |
| Battle of Cable Street | date outside 1974 to today (1936-10-04) |
| Battle of Carfax | date outside 1974 to today (1936-05-25) |
| Battle of De Winton Field | date outside 1974 to today (1936-06-11) |
| Battle of Downing Street | date outside 1974 to today (1910-11-22) |
| Battle of George Square | date outside 1974 to today (1919-01-31) |
| Battle of Hayes Pond | date outside 1974 to today (1958-01-18) |
| Battle of Holbeck Moor | date outside 1974 to today (1936-09-27) |
| Battle of Manners Street | date outside 1974 to today (1943-04-03) |
| Battle of South Street | date outside 1974 to today (1934-10-09) |
| Battle of Virden | date outside 1974 to today (1898-10-12) |
| Battle of the Bogside | date outside 1974 to today (1969-08-12) |
| Bawdy House Riots of 1668 | no protest infobox, and its title and categories don't both say protest |
| Belarusian opposition | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Belarus–European Union border crisis | no place in the UK could be named |
| Belfast City Hall flag protests | no UK place, and neither Wikidata nor the title says it was in the UK |
| Belgian general strike of 1902 | date outside 1974 to today (1902-01-01) |
| Belgian strike of 1886 | date outside 1974 to today (1886-03-01) |
| Belgrade anti-gay riot | not in the UK (Wikidata country: Serbia; no UK protest site named in the article) |
| Bengali Language Movement (Manbhum) | date outside 1974 to today (1948-01-01) |
| Bengaluru Namma Pride March | no protest infobox, and its title and categories don't both say protest |
| Bersih 4 rally | not in the UK (Wikidata country: Malaysia; no UK protest site named in the article) |
| Białystok Equality March | no protest infobox, and its title and categories don't both say protest |
| Biennio Rosso | date outside 1974 to today (1919-01-01) |
| Bigmouth Strikes Again | not a protest article (its infobox is “song”) |
| Bird strike | no protest infobox, and its title and categories don't both say protest |
| Birmingham campaign | date outside 1974 to today (1963-05-10) |
| Black Catholic Movement | date outside 1974 to today (1968-01-01) |
| Black armband protest | no protest infobox, and its title and categories don't both say protest |
| Black power movement | date outside 1974 to today (1966-01-01) |
| Blank paper protest | no protest infobox, and its title and categories don't both say protest |
| Blanket protest | no UK place, and neither Wikidata nor the title says it was in the UK |
| Blockade of Nagorno-Karabakh | not in the UK (Wikidata country: Azerbaijan; no UK protest site named in the article) |
| Blockade of the Gaza Strip | no place in the UK could be named |
| Blockadia | date outside 1974 to today (no date found) |
| Blood tax riots | date outside 1974 to today (1873-03-01) |
| Bloody Sunday (1887) | date outside 1974 to today (1887-11-13) |
| Bloody Sunday (1905) | date outside 1974 to today (1905-01-22) |
| Bloody Sunday (1921) | date outside 1974 to today (1921-07-10) |
| Boggs Mountain Demonstration State Forest | not a protest article (its infobox is “protected area <!-- See Template:Infobox protected area -->”) |
| Bolivian National Revolution | date outside 1974 to today (1952-04-09) |
| Bolivian gas war | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Boston Tea Party | date outside 1974 to today (1773-12-16) |
| Boston police strike | date outside 1974 to today (1919-01-01) |
| Bradlaugh Riots | date outside 1974 to today (1874-10-06) |
| Bridge strike | no protest infobox, and its title and categories don't both say protest |
| Bristol riots | date outside 1974 to today (1794-01-01) |
| British West Indian labour unrest of 1934–1939 | date outside 1974 to today (1934-01-01) |
| Britney Spears conservatorship case | no place in the UK could be named |
| Brixton protests | no protest infobox, and its title and categories don't both say protest |
| Brixton riots | no protest infobox, and its title and categories don't both say protest |
| Bronze Night | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Bruderkrieg (anarchism) | date outside 1974 to today (1883-01-01) |
| Buddhist crisis | date outside 1974 to today (1963-11-02) |
| Budget Protest League | no protest infobox, and its title and categories don't both say protest |
| Buffalo switchmen's strike | date outside 1974 to today (1892-08-12) |
| Burlington railroad strike of 1888 | date outside 1974 to today (1888-01-01) |
| Burning of the Jaffna Public Library | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Burntollet Bridge incident | date outside 1974 to today (1969-01-04) |
| Burston Strike School | not a protest article (its infobox is “school”) |
| Bustanico revolt | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| COVID-19 lockdown in China | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| COVID-19 lockdowns in Italy | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| COVID-19 protests in Australia | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| COVID-19 protests in Canada | not in the UK (Wikidata country: Canada; no UK protest site named in the article) |
| COVID-19 protests in Germany | not in the UK (Wikidata country: Germany; no UK protest site named in the article) |
| COVID-19 protests in the Republic of Ireland | no place in the UK could be named |
| COVID-19 protests in the United States | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Calendar riots in Riga | no protest infobox, and its title and categories don't both say protest |
| Call of Duty: Strike Team | not a protest article (its infobox is “video game”) |
| Calton weavers' strike | date outside 1974 to today (1787-01-01) |
| Cambrian Combine strike | date outside 1974 to today (1910-09-01) |
| Cambridge movement (civil rights) | date outside 1974 to today (1961-12-01) |
| Cammell Laird Shipyard occupation | no UK place, and neither Wikidata nor the title says it was in the UK |
| Camp Dump strike | date outside 1974 to today (1882-03-09) |
| Campaign to Suppress Counterrevolutionaries | date outside 1974 to today (1950-01-01) |
| Canboulay riots | date outside 1974 to today (1881-02-01) |
| Canton–Hong Kong strike | date outside 1974 to today (1925-06-19) |
| Capital strike | date outside 1974 to today (no date found) |
| Carnation Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Carrickshock incident | date outside 1974 to today (no date found) |
| Carrier Strike Group 10 | not a protest article (its infobox is “military unit”) |
| Carrier Strike Group 2 | not a protest article (its infobox is “military unit”) |
| Carrier Strike Group 3 | not a protest article (its infobox is “military unit”) |
| Carterville Mine Riot | date outside 1974 to today (no date found) |
| Casualties of the Gezi Park protests | no protest infobox, and its title and categories don't both say protest |
| Catalan Way | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Cato Street Conspiracy | date outside 1974 to today (1820-02-22) |
| Cauldron II: The Pumpkin Strikes Back | not a protest article (its infobox is “video game”) |
| Causeway Bay Books disappearances | no place in the UK could be named |
| Cedar Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Cemetery of the March Fallen | no protest infobox, and its title and categories don't both say protest |
| Central American crisis | date outside 1974 to today (1960-11-13) |
| Champagne Riots | date outside 1974 to today (1910-01-01) |
| Charleston riot | date outside 1974 to today (1864-03-28) |
| Chauri Chaura incident | date outside 1974 to today (1922-02-04) |
| Chennai Protest of Innocence of Muslims | no protest infobox, and its title and categories don't both say protest |
| Cherrydale sit-ins | date outside 1974 to today (1960-06-21) |
| Chesapeake rebellion | date outside 1974 to today (no date found) |
| Chester school protests | date outside 1974 to today (1963-11-04) |
| Chicago Freedom Movement | date outside 1974 to today (1965-01-01) |
| Chicago Riot Rugby Football Club | not a protest article (its infobox is “rugby team”) |
| Children's Crusade (1963) | date outside 1974 to today (1963-01-01) |
| China PX protest | no place in the UK could be named |
| Cholera riots | date outside 1974 to today (no date found) |
| Chris Ryan's Strike Back | not a protest article (its infobox is “television season”) |
| Christie Pits riot | date outside 1974 to today (1933-08-16) |
| Church Offensive | date outside 1974 to today (1969-12-28) |
| Cincinnati riots of 1884 | date outside 1974 to today (1884-01-01) |
| Cinderloo Uprising | date outside 1974 to today (1821-02-02) |
| City Riots | not a protest article (its infobox is “musical artist”) |
| Civil rights movement | date outside 1974 to today (1954-05-17) |
| Clichy affair | date outside 1974 to today (1891-05-01) |
| Cochabamba Water War | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Coldbath Fields riot | no protest infobox, and its title and categories don't both say protest |
| Colour Strike | date outside 1974 to today (1970-11-13) |
| Commander Littoral Strike Group | not a protest article (its infobox is “official post”) |
| Commander Strike Force Training Atlantic | not a protest article (its infobox is “military unit”) |
| Commander United Kingdom Carrier Strike Group | not a protest article (its infobox is “official post”) |
| Commander United Kingdom Strike Force | not a protest article (its infobox is “official post”) |
| Compton's Cafeteria riot | date outside 1974 to today (1966-01-01) |
| Conscription Crisis of 1917 | date outside 1974 to today (1917-01-01) |
| Constitutional crisis in Somalia | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Convict crisis | date outside 1974 to today (no date found) |
| Convoy to Canberra | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| Coors strike and boycott | no place in the UK could be named |
| Copley Street riot | date outside 1974 to today (1934-08-13) |
| Cormoran Strike | not a protest article (its infobox is “Novel series”) |
| Corn Riots | no protest infobox, and its title and categories don't both say protest |
| Coronation riots | date outside 1974 to today (1714-10-01) |
| Corrib gas controversy | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Cottage cheese boycott | no place in the UK could be named |
| Council of Wales and the Marches | not a protest article (its infobox is “legislature”) |
| Counter-Strike Online | not a protest article (its infobox is “video game”) |
| Counter-Strike: Malvinas | not a protest article (its infobox is “fictional location”) |
| Counter-Strike: Source | not a protest article (its infobox is “video game”) |
| Counter-Terrorism Strike Force | not a protest article (its infobox is “militant organization”) |
| Counter-protest | no place in the UK could be named |
| Crisis in Venezuela | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Croatian Spring | date outside 1974 to today (1967-03-17) |
| Crown Heights riot | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Culpeper's Rebellion | date outside 1974 to today (no date found) |
| Cuno strikes | date outside 1974 to today (1923-08-01) |
| Czech Republic First! | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Czechoslovak hockey riots | date outside 1974 to today (1969-03-01) |
| D-Chowk Dharna | no place in the UK could be named |
| Dan Strikes Back | not a protest article (its infobox is “video game”) |
| Deaths in March 1997 | no protest infobox, and its title and categories don't both say protest |
| Deaths in March 2014 | no place in the UK could be named |
| Deaths in March 2015 | no protest infobox, and its title and categories don't both say protest |
| Deaths in March 2022 | no protest infobox, and its title and categories don't both say protest |
| Deaths in March 2026 | no protest infobox, and its title and categories don't both say protest |
| December 2016 Congolese protests | not in the UK (Wikidata country: Democratic Republic of the Congo; no UK protest site named in the article) |
| December 2019 impeachment protests in the United States | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| December 2024 Israeli airstrikes in Yemen | not a protest article (its infobox is “military operation”) |
| Decolonize This Place | no place in the UK could be named |
| Delano grape strike | date outside 1974 to today (1965-09-07) |
| Demerara rebellion of 1823 | date outside 1974 to today (1823-08-18) |
| Demonstration (Tinie Tempah album) | not a protest article (its infobox is “album”) |
| Demonstration farm | no protest infobox, and its title and categories don't both say protest |
| Demonstration of 20 June 1792 | not a protest article (its infobox is “military conflict”) |
| Demonstration of 9 March 1883 | date outside 1974 to today (1883-03-09) |
| Demonstration sport | date outside 1974 to today (1924-01-01) |
| Demonstrations in support of Donald Trump | no protest infobox, and its title and categories don't both say protest |
| Deportations of U.S. citizens in the second Trump administration | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Desert Strike | not a protest article (its infobox is “video game”) |
| Detroit Walk to Freedom | date outside 1974 to today (1963-06-23) |
| Dexter's Laboratory: Deesaster Strikes! | not a protest article (its infobox is “video game”) |
| Dharam Yudh Morcha | no place in the UK could be named |
| Dick Barton Strikes Back | not a protest article (its infobox is “film”) |
| Diplomatic struggle for Zadar | date outside 1974 to today (1918-11-04) |
| Direct Action Day | date outside 1974 to today (1946-08-16) |
| Dissidents in the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Dockum Drug Store sit-in | date outside 1974 to today (1958-08-11) |
| Dongas road protest group | no UK place, and neither Wikidata nor the title says it was in the UK |
| Double-tap strike | no protest infobox, and its title and categories don't both say protest |
| Draft evasion in the Vietnam War | date outside 1974 to today (1965-01-01) |
| Dráscula: The Vampire Strikes Back | not a protest article (its infobox is “video game”) |
| Dublin lock-out | date outside 1974 to today (1913-08-26) |
| Duel – The Haunted House Strikes Back! | not a protest article (its infobox is “attraction”) |
| Dundas Riots | date outside 1974 to today (1792-06-01) |
| Dutch farmers' protests | not in the UK (Wikidata country: Netherlands; no UK protest site named in the article) |
| Dyke march | date outside 1974 to today (no date found) |
| Easter Riots | date outside 1974 to today (1943-04-26) |
| Eastman memos | no place in the UK could be named |
| Economic D-Day | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Ecuador National Trans March | no protest infobox, and its title and categories don't both say protest |
| Edenton Tea Party | date outside 1974 to today (1774-10-25) |
| Edinburgh snowball riots of 1838 | no protest infobox, and its title and categories don't both say protest |
| Ele Não movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Electrical demonstration | no protest infobox, and its title and categories don't both say protest |
| Ely and Littleport riots of 1816 | date outside 1974 to today (1816-05-24) |
| End SARS | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Engineer's Building airstrike | not a protest article (its infobox is “civilian attack”) |
| England riots | no protest infobox, and its title and categories don't both say protest |
| English Channel scallop fishing dispute | no place in the UK could be named |
| Epsom riot | date outside 1974 to today (1919-06-01) |
| Equality marches in Poland | no protest infobox, and its title and categories don't both say protest |
| Euromaidan | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| European Long-Range Strike Approach | no protest infobox, and its title and categories don't both say protest |
| Exercise Northern Strike | not a protest article (its infobox is “military installation”) |
| Falklands Crisis of 1770 | date outside 1974 to today (1770-01-01) |
| Fall of Suharto | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Farmers' protest | no protest infobox, and its title and categories don't both say protest |
| February 2010 Australian cyberattacks | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| February 26 incident | date outside 1974 to today (1936-02-26) |
| February 28 incident | date outside 1974 to today (1947-05-16) |
| FeesMustFall | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| First 'Ndrangheta war | no place in the UK could be named |
| First Biker War | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| First Quarter Storm | date outside 1974 to today (1970-03-01) |
| First Strike (1996 film) | not a protest article (its infobox is “film”) |
| First Strike (Stargate Atlantis) | not a protest article (its infobox is “television episode”) |
| First strike (nuclear strategy) | date outside 1974 to today (no date found) |
| Flamingo Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Fleet Street riot | date outside 1974 to today (no date found) |
| Flower protests | not in the UK (Wikidata country: Russia; no UK protest site named in the article) |
| Food riot | no protest infobox, and its title and categories don't both say protest |
| Ford sewing machinists strike of 1968 | no protest infobox, and its title and categories don't both say protest |
| Foreign media at the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Frankie Howerd Strikes Again | not a protest article (its infobox is “television”) |
| Free America Weekend | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Freedom Riders | date outside 1974 to today (1961-12-10) |
| Freedom Summer | date outside 1974 to today (1964-08-01) |
| Freedom Vote | date outside 1974 to today (1963-01-01) |
| French Revolution of 1848 | date outside 1974 to today (1848-02-22) |
| French Strikes Oil | not a protest article (its infobox is “book”) |
| Fridays for Future | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Funding of student organizations during the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| G20 protests | no protest infobox, and its title and categories don't both say protest |
| Gabriel's Rebellion | date outside 1974 to today (1800-08-30) |
| Gamma Strike | not a protest article (its infobox is “video game”) |
| Garbage Offensive | date outside 1974 to today (1969-07-27) |
| Garden House riot | date outside 1974 to today (1970-02-13) |
| Gas Stokers' strike | no protest infobox, and its title and categories don't both say protest |
| Gaspee affair | date outside 1974 to today (1772-06-09) |
| Gay liberation | date outside 1974 to today (1969-01-01) |
| Gaza Solidarity Encampment (Columbia University) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Gaza war protest vote movements | no protest infobox, and its title and categories don't both say protest |
| Gaza war protests at Ohio State University | no place in the UK could be named |
| Gaza war protests in Australia | no place in the UK could be named |
| Gaza war protests in Israel | not in the UK (Wikidata country: Israel; no UK protest site named in the article) |
| Gaza war protests in New Zealand | no place in the UK could be named |
| Gaza war protests in the United States | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Gdeim Izik protest camp | not in the UK (Wikidata country: Western Sahara; no UK protest site named in the article) |
| Gen Z protests | no place in the UK could be named |
| General strike | no protest infobox, and its title and categories don't both say protest |
| George Dunbar, 10th Earl of March | date outside 1974 to today (no date found) |
| George Floyd protests in Alabama | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Arizona | no place in the UK could be named |
| George Floyd protests in Australia | not in the UK (Wikidata country: Australia; no UK protest site named in the article) |
| George Floyd protests in California | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Canada | not in the UK (Wikidata country: Canada; no UK protest site named in the article) |
| George Floyd protests in Connecticut | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Germany | date outside 1974 to today (no date found) |
| George Floyd protests in Maine | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Minneapolis–Saint Paul | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in New Hampshire | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in New Zealand | not in the UK (Wikidata country: New Zealand; no UK protest site named in the article) |
| George Floyd protests in Ohio | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Philadelphia | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Rhode Island | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in San Diego County, California | no place in the UK could be named |
| George Floyd protests in Seattle | no place in the UK could be named |
| George Floyd protests in Tennessee | no place in the UK could be named |
| George Floyd protests in Virginia | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in Washington (state) | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| George Floyd protests in the San Francisco Bay Area | no place in the UK could be named |
| George Wallace's 1963 inaugural address | date outside 1974 to today (1963-01-14) |
| Gezi Park protests | not in the UK (Wikidata country: Turkey; no UK protest site named in the article) |
| Gladman's Procession | date outside 1974 to today (1443-01-22) |
| Glasgow Agreement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Global Climate March | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| Global March to Gaza | not in the UK (Wikidata country: Egypt; no UK protest site named in the article) |
| Global Women's Strike | no protest infobox, and its title and categories don't both say protest |
| Gluaiseacht Chearta Sibhialta na Gaeltachta | date outside 1974 to today (1969-01-01) |
| Good Trouble Lives On protest | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Gordon Riots | date outside 1974 to today (1780-06-01) |
| Gove's Rebellion | date outside 1974 to today (no date found) |
| Grand River land dispute | not in the UK (Wikidata country: Canada; no UK protest site named in the article) |
| Great Blow | date outside 1974 to today (1648-04-24) |
| Great Peace March for Global Nuclear Disarmament | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| Great Pilgrimage | date outside 1974 to today (1913-06-18) |
| Great Railroad Strike of 1877 | date outside 1974 to today (1877-01-01) |
| Great Railroad Strike of 1922 | date outside 1974 to today (1922-07-01) |
| Great Southwest railroad strike of 1886 | date outside 1974 to today (1886-01-01) |
| Great Unrest | date outside 1974 to today (1911-01-01) |
| Greensboro sit-ins | date outside 1974 to today (1960-07-25) |
| Greenville Eight | date outside 1974 to today (1960-03-01) |
| Guangzhou Television Cantonese controversy | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Guyana–Venezuela crisis (2023–2024) | no place in the UK could be named |
| Gwangju Uprising | not in the UK (Wikidata country: South Korea; no UK protest site named in the article) |
| Hachalu Hundessa riots | not in the UK (Wikidata country: Ethiopia; no UK protest site named in the article) |
| Halifax riot | date outside 1974 to today (1945-05-08) |
| Hands Off protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Hands off Greenland protests | not in the UK (Wikidata country: Kingdom of Denmark; no UK protest site named in the article) |
| Handsworth riots | no protest infobox, and its title and categories don't both say protest |
| Haredi conscription in Israel | date outside 1974 to today (1948-01-01) |
| Haymarket affair | date outside 1974 to today (1886-05-04) |
| Hazel's Inn raid | date outside 1974 to today (1956-01-01) |
| Hi-Tek incident | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Hirak (Algeria) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| History of Washington (state) | date outside 1974 to today (1967-01-01) |
| Hock Lee bus riots | date outside 1974 to today (1955-05-12) |
| Homestead strike | date outside 1974 to today (1892-07-06) |
| Hong Kong protests against mainlandisation | no protest infobox, and its title and categories don't both say protest |
| Honolulu Courthouse riot | not a protest article (its infobox is “military conflict”) |
| Housewives demonstrations | date outside 1974 to today (1940-11-01) |
| Hunger Strike (song) | not a protest article (its infobox is “song”) |
| Hunger Strike Medal | not a protest article (its infobox is “order”) |
| Hunger marches | no protest infobox, and its title and categories don't both say protest |
| Hunters Point social uprising (1966) | date outside 1974 to today (1966-10-01) |
| Hīkoi mō te Tiriti | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| I Predict a Riot | not a protest article (its infobox is “song”) |
| Idlib Governorate clashes (September 2011 – March 2012) | not a protest article (its infobox is “military conflict”) |
| Illinois Central shopmen's strike of 1911 | no protest infobox, and its title and categories don't both say protest |
| Immigration detentions of U.S. citizens in the second Trump administration | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Impact of the Arab Spring | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Impeachment March | no protest infobox, and its title and categories don't both say protest |
| Infa Riot | not a protest article (its infobox is “musical artist”) |
| Insubordination in the PLA during the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| International demonstrations and protests relating to the Syrian civil war | no protest infobox, and its title and categories don't both say protest |
| International protests over the 2021 Israel–Palestine crisis | no protest infobox, and its title and categories don't both say protest |
| International reactions to the 2008 Tibetan unrest | no protest infobox, and its title and categories don't both say protest |
| International reactions to the 2020 Belarusian presidential election and 2020–2021 protests | no protest infobox, and its title and categories don't both say protest |
| International response to Innocence of Muslims protests | no protest infobox, and its title and categories don't both say protest |
| Internet activism during the 2009 Iranian election protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| Iranian Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Iranian strikes on the Weizmann Institute of Science | not a protest article (its infobox is “military operation”) |
| Irish anti-immigration protests | not in the UK (Wikidata country: Ireland; no UK protest site named in the article) |
| Israeli direct action against aid delivery to Gaza | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Israeli strikes on Evin prison | not a protest article (its infobox is “civilian attack”) |
| J30 Protests | no protest infobox, and its title and categories don't both say protest |
| Jack Cade's Rebellion | date outside 1974 to today (1450-05-01) |
| Jackson Demonstration State Forest | not a protest article (its infobox is “forest”) |
| Jaffa riots (May 1921) | date outside 1974 to today (1921-05-01) |
| January 1993 airstrikes on Iraq | not a protest article (its infobox is “military conflict”) |
| January 23, 2026 Minnesota protests against ICE | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| January 30, 2026 protests against ICE | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Jarrow March | date outside 1974 to today (1936-10-31) |
| Johnny English Strikes Again | not a protest article (its infobox is “film”) |
| Joint Strike Fighter program | not a protest article (its infobox is “aircraft”) |
| Joint Strike Missile | not a protest article (its infobox is “weapon”) |
| Journey of Reconciliation | date outside 1974 to today (1947-01-01) |
| July 2009 Ürümqi riots | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| July 2022 Chasiv Yar missile strike | not a protest article (its infobox is “civilian attack”) |
| July Uprising | not in the UK (Wikidata country: Bangladesh; no UK protest site named in the article) |
| June 2025 Los Angeles protests against mass deportation | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| June 26 Revolution | no place in the UK could be named |
| Jungle Strike | not a protest article (its infobox is “video game”) |
| Just Stop Oil Sunflowers protest | no protest infobox, and its title and categories don't both say protest |
| Karabakh movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Katz Drug Store sit-in | date outside 1974 to today (1958-01-01) |
| Kenmure Street protests | no protest infobox, and its title and categories don't both say protest |
| Kenosha unrest | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Kenosha unrest shooting | no protest infobox, and its title and categories don't both say protest |
| Kharkiv dormitories missile strike | not a protest article (its infobox is “civilian attack”) |
| Kirkby Rent Strike | date outside 1974 to today (1972-10-01) |
| Knowles Riot | date outside 1974 to today (no date found) |
| Kong Strikes Back! | not a protest article (its infobox is “video game”) |
| Kryvyi Rih strikes (2022–present) | not a protest article (its infobox is “military conflict”) |
| Kurdish refugees | date outside 1974 to today (no date found) |
| Kuwaiti protests (2011–2012) | not in the UK (Wikidata country: Kuwait; no UK protest site named in the article) |
| L67A1 Riot Gun | no protest infobox, and its title and categories don't both say protest |
| LGBTQ rights protests surrounding the 2014 Winter Olympics | no protest infobox, and its title and categories don't both say protest |
| LaTour Demonstration State Forest | no protest infobox, and its title and categories don't both say protest |
| Lambing Flat riots | date outside 1974 to today (no date found) |
| Land War | date outside 1974 to today (1879-04-20) |
| Lansdowne Road football riot | not a protest article (its infobox is “football match”) |
| Lavenham Revolt | date outside 1974 to today (1525-01-01) |
| Laws governing public demonstrations in Australia | no protest infobox, and its title and categories don't both say protest |
| Leeds dripping riot | date outside 1974 to today (1865-02-22) |
| Legality Campaign | date outside 1974 to today (1961-08-25) |
| Leicester balloon riot | date outside 1974 to today (1864-07-11) |
| Leisler's Rebellion | date outside 1974 to today (1689-05-31) |
| Leith dockers' strike of 1913 | date outside 1974 to today (1913-01-01) |
| Liberty Affair | date outside 1974 to today (no date found) |
| Life's a Riot with Spy vs Spy | not a protest article (its infobox is “album”) |
| Light Strike Vehicle | not a protest article (its infobox is “weapon”) |
| Lightnin' Strikes | not a protest article (its infobox is “song”) |
| Lightning strike | no protest infobox, and its title and categories don't both say protest |
| List of 2017 March for Science locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2017 Women's March locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2017 Women's March locations outside the United States | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2018 Women's March locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2019 Women's March locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2020 Women's March locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2020 Women's March locations (October) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2021 Women's March locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of 2022 Women's March locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Daunte Wright protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of English Defence League demonstrations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Gaza war protests at universities in 2024 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Gaza war protests at universities in California in 2024 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Gaza war protests at universities in the Netherlands in 2024 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Gaza war protests at universities in the Netherlands in 2025 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Gaza war protests at universities in the United States in 2024 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of George Floyd protests in the United States | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of George Floyd protests outside the United States | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of March for Our Lives locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Northern Ireland riots | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Occupy movement protest locations | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Occupy movement protest locations in California | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Occupy movement protest locations in the United States | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Protestant martyrs of the Scottish Reformation | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Strike Back characters | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of Strike Back episodes | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of aviation strikes | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of changes made due to the George Floyd protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of demonstrations against corporate globalization | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of demonstrations at the University of Cape Town | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of ethnic riots | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of gay novels prior to the Stonewall riots | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of incidents of civil unrest in the United States | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of killings by law enforcement officers in the United States, March 2020 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of miners' strikes | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of monuments and memorials removed during the George Floyd protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of name changes due to the George Floyd protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of police violence incidents during George Floyd protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of pro-Palestinian protests in Belgium | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of pro-Palestinian protests in Finland | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of pro-Palestinian protests in Ireland | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of pro-Palestinian protests in Pakistan | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of pro-Palestinian protests in the Netherlands | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of pro-Palestinian protests in the United Kingdom | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protest clubs | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protests against Executive Order 13769 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protests against the Vietnam War | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protests and demonstrations in the United States by size | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protests in Hong Kong | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protests in the 21st century | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of protests in the United Kingdom | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of riot grrrl bands | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of riots | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of riots in Leeds | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of riots in London | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of riots in Singapore | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of riots in Sri Lanka | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of road protests in the United Kingdom and Ireland | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of school climate strikes | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of solidarity rallies with the Gezi Park protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of strikes | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| List of vehicle-ramming incidents during George Floyd protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Lists of pro-Palestinian protests | no protest infobox, and its title and categories don't both say protest |
| Little Rock Nine | date outside 1974 to today (1957-09-04) |
| Liverpool docks strikes | no protest infobox, and its title and categories don't both say protest |
| Liverpool riot of 1916 | date outside 1974 to today (1916-02-14) |
| Llanelli riots of 1911 | date outside 1974 to today (1911-08-18) |
| Lock-on (protest tactic) | date outside 1974 to today (no date found) |
| Log Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| London Cheerleaders Zoo Riot | not a protest article (its infobox is “sports team”) |
| London Underground strikes | date outside 1974 to today (no date found) |
| London builders' strike (1859) | no protest infobox, and its title and categories don't both say protest |
| London guild conflicts | date outside 1974 to today (1370-01-01) |
| Long March | not a protest article (its infobox is “military conflict”) |
| Long, hot summer of 1967 | date outside 1974 to today (1967-08-01) |
| Loray Mill strike | date outside 1974 to today (1929-04-01) |
| Los Angeles Garment Workers strike of 1933 | date outside 1974 to today (1933-10-12) |
| Love Not Riots | date outside 1974 to today (no date found) |
| Luc Marchal | no protest infobox, and its title and categories don't both say protest |
| Luton Peace Day Riots | date outside 1974 to today (1919-07-19) |
| Mafeje affair | date outside 1974 to today (1968-08-15) |
| Mahsa Amini protests | not in the UK (Wikidata country: Iran; no UK protest site named in the article) |
| Maldon grain riots | date outside 1974 to today (1629-03-01) |
| Malt tax riots | no protest infobox, and its title and categories don't both say protest |
| Mansfield Crisis | date outside 1974 to today (1956-08-30) |
| Marblehead Riot of 1677 | no protest infobox, and its title and categories don't both say protest |
| March 1 | not a protest article (its infobox is “calendar date today”) |
| March 10 | not a protest article (its infobox is “calendar date today”) |
| March 11 | not a protest article (its infobox is “calendar date today”) |
| March 11 (Eastern Orthodox liturgics) | no protest infobox, and its title and categories don't both say protest |
| March 12 | not a protest article (its infobox is “calendar date today”) |
| March 13 | not a protest article (its infobox is “calendar date today”) |
| March 14 | not a protest article (its infobox is “calendar date today”) |
| March 14 Alliance | not a protest article (its infobox is “political party”) |
| March 15 | not a protest article (its infobox is “calendar date today”) |
| March 1901 | date outside 1974 to today (1901-03-01) |
| March 1904 | date outside 1974 to today (1904-03-23) |
| March 1909 | date outside 1974 to today (1909-03-01) |
| March 1912 | date outside 1974 to today (1912-03-01) |
| March 1913 | date outside 1974 to today (1913-03-01) |
| March 1914 | date outside 1974 to today (1914-03-29) |
| March 1917 | date outside 1974 to today (1917-03-01) |
| March 1918 | date outside 1974 to today (1918-03-01) |
| March 1919 | date outside 1974 to today (1919-03-01) |
| March 1920 | date outside 1974 to today (1920-03-01) |
| March 1921 | date outside 1974 to today (1921-03-01) |
| March 1922 | date outside 1974 to today (1922-03-01) |
| March 1923 | date outside 1974 to today (1923-03-01) |
| March 1926 | date outside 1974 to today (1926-03-01) |
| March 1928 | date outside 1974 to today (1928-03-01) |
| March 1930 | date outside 1974 to today (1930-03-01) |
| March 1931 | date outside 1974 to today (1931-03-01) |
| March 1932 | date outside 1974 to today (1932-03-01) |
| March 1933 | date outside 1974 to today (1933-03-01) |
| March 1934 | date outside 1974 to today (1934-03-01) |
| March 1935 | date outside 1974 to today (1935-03-01) |
| March 1936 | date outside 1974 to today (1936-03-01) |
| March 1937 | date outside 1974 to today (1937-03-01) |
| March 1938 | date outside 1974 to today (1938-03-01) |
| March 1940 | date outside 1974 to today (1940-03-01) |
| March 1941 | date outside 1974 to today (1941-03-01) |
| March 1943 | date outside 1974 to today (1943-03-01) |
| March 1944 | date outside 1974 to today (1944-03-01) |
| March 1948 | date outside 1974 to today (1948-03-01) |
| March 1949 | date outside 1974 to today (1949-03-01) |
| March 1950 | date outside 1974 to today (1950-03-01) |
| March 1955 | date outside 1974 to today (1955-03-01) |
| March 1956 | date outside 1974 to today (1956-03-01) |
| March 1958 | date outside 1974 to today (1958-03-01) |
| March 1961 | date outside 1974 to today (1961-03-01) |
| March 1962 | date outside 1974 to today (1962-03-01) |
| March 1963 | date outside 1974 to today (1963-03-01) |
| March 1964 | date outside 1974 to today (1964-03-01) |
| March 1965 | date outside 1974 to today (1965-03-01) |
| March 1966 | date outside 1974 to today (1966-03-01) |
| March 1967 | date outside 1974 to today (1967-03-01) |
| March 1968 | date outside 1974 to today (1968-03-01) |
| March 1969 | no protest infobox, and its title and categories don't both say protest |
| March 1970 | no protest infobox, and its title and categories don't both say protest |
| March 1971 | date outside 1974 to today (1971-03-01) |
| March 1973 | date outside 1974 to today (1973-03-01) |
| March 1974 | no place in the UK could be named |
| March 1978 | no place in the UK could be named |
| March 1982 Palestinian general strike | no place in the UK could be named |
| March 20 | not a protest article (its infobox is “calendar date today”) |
| March 2009 in sports | no place in the UK could be named |
| March 2018 Kabul suicide bombing | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| March 2025 Israeli attacks on the Gaza Strip | not a protest article (its infobox is “military operation”) |
| March 2026 No Kings protests | not in the UK (Wikidata country: several countries; no UK protest site named in the article) |
| March 21 | not a protest article (its infobox is “calendar date today”) |
| March 23 Movement | not a protest article (its infobox is “militant organization”) |
| March 24 | not a protest article (its infobox is “calendar date today”) |
| March 25 | not a protest article (its infobox is “calendar date today”) |
| March 3 | not a protest article (its infobox is “calendar date today”) |
| March 30 | not a protest article (its infobox is “calendar date today”) |
| March 31 | not a protest article (its infobox is “calendar date today”) |
| March 4 | not a protest article (its infobox is “calendar date today”) |
| March 5 | not a protest article (its infobox is “calendar date today”) |
| March 9 | not a protest article (its infobox is “calendar date today”) |
| March Against Antisemitism | no protest infobox, and its title and categories don't both say protest |
| March Against Fear | date outside 1974 to today (1966-06-26) |
| March Days | not a protest article (its infobox is “military conflict”) |
| March First Movement | date outside 1974 to today (1919-04-01) |
| March for Diversity | not a protest article (its infobox is “recurring event”) |
| March for Truth | no protest infobox, and its title and categories don't both say protest |
| March for the Republic and Against Antisemitism | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| March of Intellect | no protest infobox, and its title and categories don't both say protest |
| March on Rome | not a protest article (its infobox is “military conflict”) |
| March on Washington | date outside 1974 to today (1963-01-01) |
| March on Washington for Gaza | no protest infobox, and its title and categories don't both say protest |
| Marcher lord | date outside 1974 to today (no date found) |
| Marching Through Georgia | no protest infobox, and its title and categories don't both say protest |
| Market Basket protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Marlin Luanda missile strike | not a protest article (its infobox is “ship”) |
| Mass detentions in the Gaza war | no place in the UK could be named |
| Mass trespass of Kinder Scout | date outside 1974 to today (1932-01-01) |
| Massacre of St George's Fields | date outside 1974 to today (1768-05-10) |
| Massacre of Tbilisi | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Matchgirls' strike | no protest infobox, and its title and categories don't both say protest |
| Maverick a Strike | not a protest article (its infobox is “album”) |
| May 2002 Belfast riots | no protest infobox, and its title and categories don't both say protest |
| May 2013 Stockholm riots | not in the UK (Wikidata country: Sweden; no UK protest site named in the article) |
| May 68 | date outside 1974 to today (1968-05-02) |
| May Day Riots | no protest infobox, and its title and categories don't both say protest |
| McDonnell Douglas F-15E Strike Eagle | not a protest article (its infobox is “aircraft”) |
| McGill University pro-Palestinian encampment | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Memphis sanitation strike | date outside 1974 to today (1968-04-16) |
| Merthyr Rising | date outside 1974 to today (1831-01-01) |
| Metro Manila Pride March | not a protest article (its infobox is “recurring event”) |
| Metropolitan Police strike of 1890 | no protest infobox, and its title and categories don't both say protest |
| Million Mask March | no protest infobox, and its title and categories don't both say protest |
| Million People March | not in the UK (Wikidata country: Philippines; no UK protest site named in the article) |
| Miners' Strike: A Frontline Story | not a protest article (its infobox is “television”) |
| Miners' strike derby | not a protest article (its infobox is “sports rivalry”) |
| Minsk Spring | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Miss America protest | date outside 1974 to today (1968-09-07) |
| Miss World riots | not a protest article (its infobox is “civilian attack”) |
| Missile strike on the Black Sea Fleet headquarters | not a protest article (its infobox is “military operation”) |
| Mobile Strike | not a protest article (its infobox is “video game”) |
| Mogadishu riots of July 1989 | not a protest article (its infobox is “civilian attack”) |
| Moldovan protests (2022–2023) | not in the UK (Wikidata country: Moldova; no UK protest site named in the article) |
| Mongolian Revolution of 1990 | no place in the UK could be named |
| Monster Strike | not a protest article (its infobox is “video game”) |
| Montceau-les-Mines troubles | date outside 1974 to today (1878-01-27) |
| Montgomery bus boycott | date outside 1974 to today (1955-01-01) |
| Moratorium to End the War in Vietnam | date outside 1974 to today (1969-10-15) |
| Mount Zion Demonstration State Forest | no protest infobox, and its title and categories don't both say protest |
| Mountain Home Demonstration State Forest | not a protest article (its infobox is “protected area <!-- See Template:Infobox protected area -->”) |
| Movement for Peace with Justice and Dignity | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Mud March (suffragists) | date outside 1974 to today (1907-02-09) |
| Multi-role strike ship | not a protest article (its infobox is “ship”) |
| Mum's on Strike | not a protest article (its infobox is “television”) |
| Music Hall Strike of 1907 | no protest infobox, and its title and categories don't both say protest |
| Myanmar protests (2021–present) | not in the UK (Wikidata country: Myanmar; no UK protest site named in the article) |
| Mykolaiv government building missile strike | not a protest article (its infobox is “civilian attack”) |
| Māori land march | no place in the UK could be named |
| Māori protest movement | not in the UK (Wikidata country: New Zealand; no UK protest site named in the article) |
| Mława riot | not in the UK (Wikidata country: Poland; no UK protest site named in the article) |
| NYC Pride March | not a protest article (its infobox is “recurring event”) |
| Nahel Merzouk riots | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| Name and shame (campaign) | no single place, and the title doesn't describe a protest |
| Nashville sit-ins | date outside 1974 to today (1960-05-10) |
| National Hunger March, 1932 | no protest infobox, and its title and categories don't both say protest |
| National March on Washington: Free Palestine | no protest infobox, and its title and categories don't both say protest |
| National railway strike of 1911 | date outside 1974 to today (1911-01-01) |
| Nationwide student anti-war strike of 1970 | date outside 1974 to today (1970-01-01) |
| Naval Strike Missile | not a protest article (its infobox is “weapon”) |
| Naval Strike Wing | not a protest article (its infobox is “military unit”) |
| Navy Strike | not a protest article (its infobox is “video game”) |
| Nepalese democracy movement | date outside 1974 to today (1948-01-01) |
| New Art Riot | not a protest article (its infobox is “album”) |
| New Orleans school desegregation crisis | date outside 1974 to today (1960-11-14) |
| New Year's Day March | date outside 1974 to today (1960-01-01) |
| New York City tugboat strike of 1946 | date outside 1974 to today (1946-01-01) |
| New York Conspiracy of 1741 | date outside 1974 to today (1741-01-01) |
| New York Slave Revolt of 1712 | date outside 1974 to today (1712-04-06) |
| New York Tea Party | date outside 1974 to today (1774-04-22) |
| New York shirtwaist strike of 1909 | date outside 1974 to today (1909-11-01) |
| Newlyn riots | date outside 1974 to today (1896-05-01) |
| Newsboys' strike of 1899 | date outside 1974 to today (1899-01-01) |
| Nika riots | date outside 1974 to today (0532-01-01) |
| Nine Hours Strike | date outside 1974 to today (1871-08-01) |
| Niʻihau incident | date outside 1974 to today (1941-01-01) |
| No Kings protests | date outside 1974 to today (no date found) |
| Non-cooperation movement (1971) | date outside 1974 to today (1971-03-01) |
| Non-cooperation movement (2024) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Norfolk Anti-Inoculation Riot of 1768 | no protest infobox, and its title and categories don't both say protest |
| North Kosovo crisis (2011–2013) | no place in the UK could be named |
| Northern Ireland civil rights movement | date outside 1974 to today (1967-01-01) |
| Norwich women's grain protest | no protest infobox, and its title and categories don't both say protest |
| Nottingham cheese riot | date outside 1974 to today (1766-10-02) |
| November 1932 Geneva shooting | date outside 1974 to today (1932-11-09) |
| November 2024 Amsterdam riots | not in the UK (Wikidata country: Netherlands; no UK protest site named in the article) |
| Nuclear Strike (Spooks) | not a protest article (its infobox is “television episode”) |
| Nudity and protest | date outside 1974 to today (1903-01-01) |
| Nuit debout | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Nyasaland emergency of 1959 | date outside 1974 to today (1959-03-03) |
| Occupation of the Malheur National Wildlife Refuge | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy Boston | no place in the UK could be named |
| Occupy Canada | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy Dame Street | no place in the UK could be named |
| Occupy Los Angeles | no place in the UK could be named |
| Occupy Melbourne | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy Nigeria | no place in the UK could be named |
| Occupy Oakland | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy Sydney | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy Texas State | no place in the UK could be named |
| Occupy Wall Street | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy Windsor | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Occupy movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| October 13, 2021, North Kosovo riots | not in the UK (Wikidata country: Kosovo; no UK protest site named in the article) |
| October 2018 protests in Armenia | not in the UK (Wikidata country: Armenia; no UK protest site named in the article) |
| October 2024 Iranian strikes on Israel | not a protest article (its infobox is “military operation”) |
| October 2024 Israeli strikes on Iran | not a protest article (its infobox is “military operation”) |
| October 2025 No Kings protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| October 2026 No Kings protests | no place in the UK could be named |
| Odesa strikes (2022–present) | not a protest article (its infobox is “military conflict”) |
| Oil Strike North | not a protest article (its infobox is “television”) |
| Ole Miss riot of 1962 | date outside 1974 to today (1962-10-01) |
| Omaha race riot of 1919 | date outside 1974 to today (1919-01-01) |
| Ontario Biker War | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Operation Dragon Strike | not a protest article (its infobox is “military conflict”) |
| Operation Peninsula Strike | not a protest article (its infobox is “military conflict”) |
| Operation Phantom Strike | not a protest article (its infobox is “military conflict”) |
| Operation Raise the Colours | no single place, and the title doesn't describe a protest |
| Operation Saber Strike | no protest infobox, and its title and categories don't both say protest |
| Operation Sabre (Serbia) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Operation Strike | not a protest article (its infobox is “military conflict”) |
| Operation Strike of the Sword | not a protest article (its infobox is “military conflict”) |
| Operations on the Ancre, January–March 1917 | not a protest article (its infobox is “military conflict”) |
| Opposition to Francoism | date outside 1974 to today (1938-01-01) |
| Opposition to United States involvement in the Vietnam War | date outside 1974 to today (1965-03-08) |
| Opposition to Vladimir Putin in Russia | no place in the UK could be named |
| Opposition to World War I | date outside 1974 to today (1914-01-01) |
| Orange Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Orange Riots | date outside 1974 to today (1870-01-01) |
| Oregon State Capitol breach | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Overthrow of Slobodan Milošević | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Oyster Wars | date outside 1974 to today (1959-01-01) |
| Paganini Strikes Again | not a protest article (its infobox is “film”) |
| Paid protester | no protest infobox, and its title and categories don't both say protest |
| Pakistan Movement | date outside 1974 to today (1940-03-23) |
| Pakistani political crisis (2022–2024) | no place in the UK could be named |
| Paper Money Riot | date outside 1974 to today (1786-09-20) |
| Parade | date outside 1974 to today (no date found) |
| Park Street riot | date outside 1974 to today (1944-07-15) |
| Patriot Act | not a protest article (its infobox is “U.S. legislation”) |
| Patriot Prayer | not a protest article (its infobox is “organization”) |
| Peaceful Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Peasant March | date outside 1974 to today (1930-07-07) |
| Peasants' revolt of 996 in Normandy | date outside 1974 to today (no date found) |
| Peekskill riots | date outside 1974 to today (1949-08-27) |
| Pen-down strike | no protest infobox, and its title and categories don't both say protest |
| People power | date outside 1974 to today (no date found) |
| People's March for Jobs | no protest infobox, and its title and categories don't both say protest |
| Persian Constitutional Revolution | date outside 1974 to today (1905-01-01) |
| Peruvian political crisis (2016–present) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Peruvian protests (2022–2023) | not in the UK (Wikidata country: Peru; no UK protest site named in the article) |
| Peterhead Prison Riot | no protest infobox, and its title and categories don't both say protest |
| Philadelphia nativist riots | date outside 1974 to today (1844-01-01) |
| Philippine drug war | no place in the UK could be named |
| Pilgrimage of Grace | date outside 1974 to today (1536-01-01) |
| Pine Tree Riot | date outside 1974 to today (1772-04-14) |
| Pint Shot Riot | not a protest article (its infobox is “musical artist”) |
| Pistolerismo | date outside 1974 to today (1917-01-01) |
| Pittsburgh railroad strike of 1877 | date outside 1974 to today (1877-07-19) |
| Police riot | date outside 1974 to today (1968-01-01) |
| Police strike | date outside 1974 to today (no date found) |
| Poor People's Campaign | date outside 1974 to today (1968-06-24) |
| Porteous Riots | date outside 1974 to today (1736-04-14) |
| Post-coup unrest in Egypt (2013–2014) | not in the UK (Wikidata country: Egypt; no UK protest site named in the article) |
| Postal strike | no protest infobox, and its title and categories don't both say protest |
| Post–World War II demobilization strikes | date outside 1974 to today (1945-12-01) |
| Powder Alarm | date outside 1974 to today (1774-09-01) |
| Power-loom riots | no protest infobox, and its title and categories don't both say protest |
| Prayer Pilgrimage for Freedom | date outside 1974 to today (1957-05-17) |
| Precision Strike Missile | not a protest article (its infobox is “weapon”) |
| Priestley Riots | date outside 1974 to today (1791-01-01) |
| Prince of Wales riots | date outside 1974 to today (1921-11-17) |
| Prison riot | date outside 1974 to today (no date found) |
| Programming by demonstration | no protest infobox, and its title and categories don't both say protest |
| Protest | no place in the UK could be named |
| Protest (disambiguation) | no protest infobox, and its title and categories don't both say protest |
| Protest Songs (album) | a topic article about a kind of protest, not one event |
| Protest Songs 1924–2012 | a topic article about a kind of protest, not one event |
| Protest against MTR's musical instrument restrictions | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| Protest and dissent in China | date outside 1974 to today (no date found) |
| Protest camp | date outside 1974 to today (no date found) |
| Protest paradigm | no protest infobox, and its title and categories don't both say protest |
| Protest policing | no protest infobox, and its title and categories don't both say protest |
| Protest song | a topic article about a kind of protest, not one event |
| Protest songs in the United States | a topic article about a kind of protest, not one event |
| Protest the Hero | not a protest article (its infobox is “musical artist <!-- See Wikipedia:WikiProject Musicians -->”) |
| Protest tunnelling in the United Kingdom | no protest infobox, and its title and categories don't both say protest |
| Protesting the Dixie Chicks | not a protest article (its infobox is “film”) |
| Protests against Elon Musk | no protest infobox, and its title and categories don't both say protest |
| Protests against Emmanuel Macron | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| Protests against SOPA and PIPA | no place in the UK could be named |
| Protests against the second Trump administration | no protest infobox, and its title and categories don't both say protest |
| Protests and uprisings in Tibet since 1950 | date outside 1974 to today (1950-01-01) |
| Protests by Westboro Baptist Church | no protest infobox, and its title and categories don't both say protest |
| Protests in Canada against the Sri Lankan civil war | not in the UK (Wikidata country: Canada, Australia; no UK protest site named in the article) |
| Protests in Venezuela | no protest infobox, and its title and categories don't both say protest |
| Protests of 1968 | date outside 1974 to today (1968-01-05) |
| Protests regarding the Russo-Georgian War | date outside 1974 to today (no date found) |
| Pullman Strike | date outside 1974 to today (1894-01-01) |
| Punjabi Language Movement | date outside 1974 to today (1960-01-01) |
| Punjabi Suba movement | date outside 1974 to today (1947-01-01) |
| Purges in Turkey following the 2016 Turkish coup attempt | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Pussy Riot | not a protest article (its infobox is “musical artist”) |
| Pussy Riot: A Punk Prayer | not a protest article (its infobox is “film”) |
| Qatar National Unity Front | date outside 1974 to today (1963-05-01) |
| Quds Day demonstrations | no protest infobox, and its title and categories don't both say protest |
| Quebec Biker War | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Quit India Movement | date outside 1974 to today (1942-01-01) |
| RAF Strike Command | not a protest article (its infobox is “military unit”) |
| Radical War | date outside 1974 to today (1820-04-01) |
| Rail war in Belarus (2022–present) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Rail war in Russia (2022–present) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Rainbow Night | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Raising a Riot | not a protest article (its infobox is “film”) |
| Rally to Restore Sanity and/or Fear | no place in the UK could be named |
| Reactions to the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2005 French riots | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2014 Hong Kong protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2014 Venezuelan protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2017 Venezuelan protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2019–2020 Hong Kong protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2024 Gaza war protests at universities | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the 2025–2026 Iranian protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the George Floyd protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the Gezi Park protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Reactions to the Mahsa Amini protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Rebecca Riots | date outside 1974 to today (1839-05-13) |
| Red Week (Argentina) | date outside 1974 to today (1909-05-01) |
| Red Week (Italy) | date outside 1974 to today (1914-01-01) |
| Red line demonstrations | not in the UK (Wikidata country: Kingdom of the Netherlands; no UK protest site named in the article) |
| Reformasi (Malaysia) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Reg Strikes Back | not a protest article (its infobox is “album”) |
| Reggio revolt | date outside 1974 to today (1970-07-05) |
| Repression of early 1894 | date outside 1974 to today (1894-01-01) |
| Republic Protests | not in the UK (Wikidata country: Turkey; no UK protest site named in the article) |
| Republican marches | not in the UK (Wikidata country: France; no UK protest site named in the article) |
| Restoring Honor rally | no place in the UK could be named |
| Revolt of Horea, Cloșca, and Crișan | date outside 1974 to today (1784-10-31) |
| Revolution of 1719 | date outside 1974 to today (no date found) |
| Revolution of Dignity | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Revolutions of 1848 in the Austrian Empire | date outside 1974 to today (1848-03-01) |
| Revolutions of 1917–1923 | date outside 1974 to today (1917-03-08) |
| Revolutions of 1989 | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Rhodes Must Fall | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Rif Dimashq clashes (November 2011–March 2012) | not a protest article (its infobox is “military conflict”) |
| Riot | not a protest article (its infobox is “UK legislation”) |
| Riot (Damages) Act 1886 | not a protest article (its infobox is “UK legislation”) |
| Riot (Three Days Grace song) | not a protest article (its infobox is “song”) |
| Riot (XXXTentacion song) | not a protest article (its infobox is “song”) |
| Riot Act | not a protest article (its infobox is “UK legislation”) |
| Riot Act (album) | not a protest article (its infobox is “album”) |
| Riot Act 1411 | not a protest article (its infobox is “UK legislation”) |
| Riot Acts | no protest infobox, and its title and categories don't both say protest |
| Riot City Blues Tour | not a protest article (its infobox is “film”) |
| Riot City Ravens | not a protest article (its infobox is “roller derby league”) |
| Riot City Records | not a protest article (its infobox is “record label”) |
| Riot City: Protest and Rebellion in the Capital | not a protest article (its infobox is “book”) |
| Riot Compensation Act 2016 | not a protest article (its infobox is “UK legislation”) |
| Riot Live (album) | not a protest article (its infobox is “album”) |
| Riot Squad | no protest infobox, and its title and categories don't both say protest |
| Riot Squad (band) | not a protest article (its infobox is “musical artist <!-- See Wikipedia:WikiProject Musicians -->”) |
| Riot Women | not a protest article (its infobox is “television”) |
| Riot grrrl | not a protest article (its infobox is “music genre”) |
| Riot in Cell Block 11 | not a protest article (its infobox is “film”) |
| Riot on Redchurch Street | not a protest article (its infobox is “film”) |
| Riot on an Empty Street | not a protest article (its infobox is “album”) |
| Riot police | date outside 1974 to today (no date found) |
| Riot protection helmet | date outside 1974 to today (no date found) |
| Riot shield | date outside 1974 to today (no date found) |
| Riot! | not a protest article (its infobox is “album”) |
| Rivne strikes (2022–present) | not a protest article (its infobox is “military conflict”) |
| Road protest | a topic article about a kind of protest, not one event |
| Road protest in the United Kingdom | a topic article about a kind of protest, not one event |
| Rock Machine–Rebels conflict | no place in the UK could be named |
| Rolling strike | no protest infobox, and its title and categories don't both say protest |
| Romanian Royal strike | date outside 1974 to today (1945-08-21) |
| Rome sit-ins | date outside 1974 to today (1963-03-28) |
| Rosenstrasse protest | date outside 1974 to today (1943-03-01) |
| Rothbury riot | date outside 1974 to today (1929-12-16) |
| Rouen Riot | not a protest article (its infobox is “military conflict”) |
| Royal Air Force strikes of 1946 | date outside 1974 to today (1946-01-01) |
| Roșia Montană protests | not in the UK (Wikidata country: Romania; no UK protest site named in the article) |
| Runnin' Riot (band) | no protest infobox, and its title and categories don't both say protest |
| Russian strikes against Ukrainian infrastructure | not a protest article (its infobox is “civilian attack”) |
| Russian strikes on hospitals during the Russian invasion of Ukraine | no protest infobox, and its title and categories don't both say protest |
| Russian strikes on religious sites during the invasion of Ukraine | no protest infobox, and its title and categories don't both say protest |
| SWAT: Global Strike Team | not a protest article (its infobox is “video game”) |
| Sacheverell riots | date outside 1974 to today (1710-03-01) |
| Sadae Mazlomeen Dharna (Parachinar) | no place in the UK could be named |
| Saffron Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Salt March | date outside 1974 to today (1930-03-12) |
| Salvadoran gang crackdown | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Samlaut Uprising | date outside 1974 to today (1967-04-02) |
| San Diego free speech fight | date outside 1974 to today (1912-01-01) |
| San Francisco Trans March | no protest infobox, and its title and categories don't both say protest |
| San Francisco tech bus protests | no place in the UK could be named |
| Sanmu incident | date outside 1974 to today (1961-12-12) |
| Saskatchewan doctors' strike | date outside 1974 to today (1962-01-01) |
| Savannah Protest Movement | date outside 1974 to today (1960-03-16) |
| Save the Newchurch Guinea Pigs | no single place, and the title doesn't describe a protest |
| School strikes of 1911 | date outside 1974 to today (1911-01-01) |
| Scientology and the Internet | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Scots Herring Lassies strike in East Anglia 1938 | date outside 1974 to today (1938-01-01) |
| Second strike | no protest infobox, and its title and categories don't both say protest |
| Self-immolation protests by Tibetans in China | not in the UK (Wikidata country: People's Republic of China; no UK protest site named in the article) |
| Selma to Montgomery marches | date outside 1974 to today (1965-01-01) |
| September 1991 Mineriad | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| September 2024 Poltava strike | not a protest article (its infobox is “military attack”) |
| Serbia Against Violence | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Serhiivka missile strike | not a protest article (its infobox is “civilian attack”) |
| Sex/Work Strike | no protest infobox, and its title and categories don't both say protest |
| Shaheen Bagh protest | not in the UK (Wikidata country: India; no UK protest site named in the article) |
| Shays's Rebellion | date outside 1974 to today (1786-08-31) |
| Sheffield Gang Wars | date outside 1974 to today (1928-01-01) |
| Shelburne riots | not a protest article (its infobox is “civilian attack”) |
| Sheriff's March | no protest infobox, and its title and categories don't both say protest |
| Shutdown of the Min-kuo Jih-pao | date outside 1974 to today (1932-01-01) |
| Silent Parade | date outside 1974 to today (1917-07-28) |
| Singing Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Sinking of the Rainbow Warrior | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Sino-Albanian split | date outside 1974 to today (1971-01-01) |
| Sino-Soviet split | date outside 1974 to today (1961-01-01) |
| Sit-in | date outside 1974 to today (1961-01-01) |
| Sit-in movement | date outside 1974 to today (1960-02-01) |
| Sitdown strike | date outside 1974 to today (1936-01-01) |
| Skarlett Riot | not a protest article (its infobox is “musical artist”) |
| Songs of Protest and Anti-Protest | not a protest article (its infobox is “album”) |
| Soquel Demonstration State Forest | not a protest article (its infobox is “protected area”) |
| Soumoud Convoy | no place in the UK could be named |
| South Carolina in the civil rights movement | date outside 1974 to today (1954-01-01) |
| Southampton Dock strike of 1890 | date outside 1974 to today (1890-01-01) |
| Soviet Strike | not a protest article (its infobox is “video game”) |
| Spa Fields riots | date outside 1974 to today (1816-12-02) |
| Space Chimps 2: Zartog Strikes Back | not a protest article (its infobox is “film”) |
| Spanish Revolution of 1936 | date outside 1974 to today (1936-07-19) |
| Special Demonstration Squad | date outside 1974 to today (1968-01-01) |
| Special effects of The Empire Strikes Back | no protest infobox, and its title and categories don't both say protest |
| Spitalfield riots | date outside 1974 to today (1760-01-01) |
| Sports riot | no protest infobox, and its title and categories don't both say protest |
| Spring 1987 West Bank unrest | no place in the UK could be named |
| Sri Lankan economic crisis (2019–2024) | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| St Ann's riots | no protest infobox, and its title and categories don't both say protest |
| St Scholastica Day riot | date outside 1974 to today (1355-02-10) |
| St. Augustine movement | date outside 1974 to today (1963-01-01) |
| Stand in the Schoolhouse Door | date outside 1974 to today (1963-01-01) |
| Star Hotel riot | no UK place, and neither Wikidata nor the title says it was in the UK |
| Statutes concerning forcible entries and riots confirmed | not a protest article (its infobox is “UK legislation”) |
| Stonewall riots | date outside 1974 to today (1969-06-28) |
| Stop Asian Hate | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Stop Cop City | no place in the UK could be named |
| Stop The Game | date outside 1974 to today (no date found) |
| Storming of the Legislative Council Complex | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Storming of the Venezuelan National Congress | date outside 1974 to today (1848-01-24) |
| Stour Valley riots | date outside 1974 to today (1642-01-01) |
| Strike (2018 film) | not a protest article (its infobox is “film”) |
| Strike (TV series) | not a protest article (its infobox is “television”) |
| Strike (unit) | no protest infobox, and its title and categories don't both say protest |
| Strike Attack Operational Evaluation Unit | not a protest article (its infobox is “military unit”) |
| Strike Back (TV series) | not a protest article (its infobox is “television”) |
| Strike Back: Legacy | not a protest article (its infobox is “television season”) |
| Strike Back: Project Dawn | not a protest article (its infobox is “television season”) |
| Strike Back: Retribution | not a protest article (its infobox is “television season”) |
| Strike Back: Revolution | not a protest article (its infobox is “television season”) |
| Strike Back: Shadow Warfare | not a protest article (its infobox is “television season”) |
| Strike Back: Vendetta | not a protest article (its infobox is “television season”) |
| Strike Back: Vengeance | not a protest article (its infobox is “television season”) |
| Strike Force: Cobra | not a protest article (its infobox is “video game”) |
| Strike It Lucky | not a protest article (its infobox is “television”) |
| Strike It Rich (1933 film) | not a protest article (its infobox is “film”) |
| Strike It Rich (1986 game show) | not a protest article (its infobox is “television”) |
| Strike It Rich (1990 film) | not a protest article (its infobox is “film”) |
| Strike It Up | not a protest article (its infobox is “song”) |
| Strike Suit Zero | not a protest article (its infobox is “video game”) |
| Strike Witches | not a protest article (its infobox is “animanga/Header”) |
| Strike action | date outside 1974 to today (no date found) |
| Strike pay | no protest infobox, and its title and categories don't both say protest |
| Strike to the Body | not a protest article (its infobox is “song”) |
| Strike! (album) | not a protest article (its infobox is “album”) |
| Strike: An Uncivil War | not a protest article (its infobox is “film”) |
| Strikebreaker | date outside 1974 to today (no date found) |
| Strikes (Minimum Service Levels) Act 2023 | not a protest article (its infobox is “UK legislation”) |
| Strikes during the COVID-19 pandemic | no protest infobox, and its title and categories don't both say protest |
| Stuckist demonstrations | no protest infobox, and its title and categories don't both say protest |
| Student riot | date outside 1974 to today (no date found) |
| Students Solidarity March | no place in the UK could be named |
| Sudanese revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Suicide protest | no protest infobox, and its title and categories don't both say protest |
| Sunflower Student Movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Super League war | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Super Star Wars: The Empire Strikes Back | not a protest article (its infobox is “video game”) |
| Surgeons' Hall riot | no protest infobox, and its title and categories don't both say protest |
| Surgical Strike (video game) | not a protest article (its infobox is “video game”) |
| Swing Riots | date outside 1974 to today (1830-08-28) |
| Sydney Riot of 1879 | date outside 1974 to today (1879-02-08) |
| Sydney anti-Islam film protests | not a protest article (its infobox is “civilian attack”) |
| Sydney riots | no protest infobox, and its title and categories don't both say protest |
| Syrian revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Tactics and methods surrounding the 2019–2020 Hong Kong protests | no protest infobox, and its title and categories don't both say protest |
| Takebashi incident | date outside 1974 to today (1878-08-23) |
| Talbot Resolves | date outside 1974 to today (no date found) |
| Tales of Vesperia: The First Strike | not a protest article (its infobox is “film”) |
| Tallahassee bus boycott | date outside 1974 to today (1956-05-28) |
| Tax protester | date outside 1974 to today (no date found) |
| Taxi wars in South Africa | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Tea Party protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| Tenants' strike of 1907 | date outside 1974 to today (1907-10-01) |
| The Bay Strikes Back | not a protest article (its infobox is “concert”) |
| The Day We Fight Back | no single place, and the title doesn't describe a protest |
| The Empire Strikes Back | not a protest article (its infobox is “film”) |
| The Empire Strikes Back (soundtrack) | not a protest article (its infobox is “album”) |
| The Empire Strikes First | not a protest article (its infobox is “album”) |
| The Final Riot! | not a protest article (its infobox is “album”) |
| The Gordon Riots | not a protest article (its infobox is “artwork”) |
| The Imperial March | not a protest article (its infobox is “song”) |
| The Lost Riots | not a protest article (its infobox is “album”) |
| The March (1945) | date outside 1974 to today (1945-04-01) |
| The Mark, Tom, and Travis Show (The Enema Strikes Back!) | not a protest article (its infobox is “album”) |
| The Only Possible Argument in Support of a Demonstration of the Existence of God | not a protest article (its infobox is “book”) |
| The Pink Panther Strikes Again | not a protest article (its infobox is “film”) |
| The Postman Strikes Back | not a protest article (its infobox is “film”) |
| The Protester (periodical) | not a protest article (its infobox is “magazine”) |
| The Right to Strike | not a protest article (its infobox is “film”) |
| The Riot Club | not a protest article (its infobox is “film”) |
| The Riot Squad | not a protest article (its infobox is “musical artist”) |
| The Riots | not a protest article (its infobox is “play”) |
| The Rogue's March | no protest infobox, and its title and categories don't both say protest |
| The Strike (1904 film) | not a protest article (its infobox is “film”) |
| The Trumpton Riots EP | not a protest article (its infobox is “album”) |
| The lady doth protest too much, methinks | no protest infobox, and its title and categories don't both say protest |
| Thunder, Lightning, Strike | not a protest article (its infobox is “album”) |
| Tiananmen hunger strikes | no place in the UK could be named |
| Timeline of protests against Donald Trump | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of protests against Rodrigo Duterte | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of protests in Venezuela in 2016 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of reactions to the 2020 Hong Kong national security law (March 2021) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1946 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1947 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1948 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1951 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1953 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1964 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1967 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1970 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1973 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1974 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1975 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1976 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1977 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1978 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1979 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1980 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1981 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1982 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1983 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1984 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1985 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1986 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1987 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1988 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1989 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1990 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1991 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1992 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1993 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1994 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1995 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1996 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1997 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1998 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 1999 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2000 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2001 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2002 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2003 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2004 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2005 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2006 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2012 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2015 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2017 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2018 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2021 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2022 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2023 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2024 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2025 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of strikes in 2026 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2009 Iranian election protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2011 England riots | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2011 Libyan Civil War and military intervention (19 March – May) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2011–2012 Saudi Arabian protests (January–April 2011) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2011–2012 Saudi Arabian protests (January–June 2012) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2011–2012 Saudi Arabian protests (May–December 2011) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2011–2012 Saudi Arabian protests (from July 2012) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (April 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (August 2019) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (August 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (December 2019) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (January 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (July 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (June 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (May 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (November 2019) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (October 2019) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (September 2019) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2019–2020 Hong Kong protests (September 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2020 Canadian pipeline and railway protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the 2020 Thai protests (July 2020) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the COVID-19 pandemic in March 2020 | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the Canada convoy protest | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the Gezi Park protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the Mahsa Amini protests | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Timeline of the Russo-Ukrainian war (1 December 2023 – 31 March 2024) | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Tiverton riots | date outside 1974 to today (1738-05-01) |
| Tobacco Protest | date outside 1974 to today (1890-01-01) |
| Toho strikes | date outside 1974 to today (1946-01-01) |
| Tonypandy riots | date outside 1974 to today (1910-09-01) |
| Tottenham riots | no protest infobox, and its title and categories don't both say protest |
| Tragic Week (Spain) | date outside 1974 to today (1909-07-26) |
| Trans march | date outside 1974 to today (no date found) |
| Tricity Equality March | not a protest article (its infobox is “recurring event”) |
| Trieste riots | date outside 1974 to today (1953-11-03) |
| Tripoli protests and clashes (February 2011) | not a protest article (its infobox is “military conflict”) |
| Tron riot | date outside 1974 to today (1810-01-01) |
| Tulare labor camps rent strike | date outside 1974 to today (1965-03-01) |
| Tulip Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Tunisian National Dialogue Quartet | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Tunisian bread riots | not in the UK (Wikidata country: Tunisia; no UK protest site named in the article) |
| Tunisian revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Turkish–Azeri blockade of Armenia | not in the UK (Wikidata country: Armenia; no UK protest site named in the article) |
| Types Riot | date outside 1974 to today (1826-06-08) |
| Tyre Nichols protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| U.S. national anthem kneeling protests | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| U.S. national anthem protests | no protest infobox, and its title and categories don't both say protest |
| UEFA Euro 2016 riots | no protest infobox, and its title and categories don't both say protest |
| UK Carrier Strike Group | not a protest article (its infobox is “military unit”) |
| UK Gay Liberation Front 1971 Festival of Light action | date outside 1974 to today (1971-09-09) |
| UK miners' strike | no protest infobox, and its title and categories don't both say protest |
| UMW General coal strike (1922) | date outside 1974 to today (1922-09-11) |
| US–UK airstrikes on Yemen | not a protest article (its infobox is “military conflict”) |
| Unite the Right rally | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| United Kingdom Carrier Strike Group 21 | not a protest article (its infobox is “military operation”) |
| United Kingdom industrial disputes and strikes (2022–present) | no protest infobox, and its title and categories don't both say protest |
| United States Navy Strike Fighter Tactics Instructor program | not a protest article (its infobox is “military unit”) |
| United States abortion protests (2022–present) | not in the UK (Wikidata country: United States; no UK protest site named in the article) |
| United States strike wave of 1919 | date outside 1974 to today (1919-01-09) |
| United States strike wave of 1945–1946 | date outside 1974 to today (1945-01-01) |
| United States strikes on alleged drug traffickers during Operation Southern Spear | not a protest article (its infobox is “military attack”) |
| University of Chicago sit-ins | date outside 1974 to today (1962-02-05) |
| Urban Chaos: Riot Response | not a protest article (its infobox is “video game”) |
| Urban riot | date outside 1974 to today (no date found) |
| Ursuline Convent riots | date outside 1974 to today (1834-08-12) |
| Velvet Revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Venezuelan presidential crisis | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Vertical banner | date outside 1974 to today (1967-01-01) |
| Vietnamese democracy movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Vinnytsia strikes (2022–present) | not a protest article (its infobox is “civilian attack”) |
| Vita Cortex sit-in | no UK place, and neither Wikidata nor the title says it was in the UK |
| Waco siege | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Water Riots | date outside 1974 to today (1903-03-23) |
| Weinstein Hall occupation | date outside 1974 to today (1970-01-01) |
| Welsh coal strike of 1898 | date outside 1974 to today (1898-01-01) |
| West End Riots | no protest infobox, and its title and categories don't both say protest |
| Western Rising and disafforestation riots | no protest infobox, and its title and categories don't both say protest |
| Wheatland hop riot | date outside 1974 to today (1913-08-03) |
| When Disaster Strikes... | not a protest article (its infobox is “album”) |
| Whipsaw strike | no protest infobox, and its title and categories don't both say protest |
| White Light Riot | not a protest article (its infobox is “musical artist <!-- See Wikipedia:WikiProject Musicians -->”) |
| White Riot | not a protest article (its infobox is “song”) |
| White Riot (film) | no protest infobox, and its title and categories don't both say protest |
| Wildcat strike | no protest infobox, and its title and categories don't both say protest |
| Winter of Discontent | no protest infobox, and its title and categories don't both say protest |
| Wisconsin Walleye War | no place in the UK could be named |
| Witten Women's Protest | no protest infobox, and its title and categories don't both say protest |
| Woman, Life, Freedom movement | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Women in the yellow vests movement | no place in the UK could be named |
| Women's Coronation Procession | date outside 1974 to today (1911-06-17) |
| Women's March on Versailles | date outside 1974 to today (1789-10-05) |
| Women's Memorial March | not a protest article (its infobox is “holiday”) |
| Women's Sunday | date outside 1974 to today (1908-01-01) |
| Women's War | date outside 1974 to today (1929-11-01) |
| Women's liberation movement | date outside 1974 to today (1960-01-01) |
| Women's liberation movement in North America | date outside 1974 to today (1960-01-01) |
| Women's roles during the 1989 Tiananmen Square protests and massacre | not a protest article (a killing, attack, fire, list or timeline; protests that followed have their own articles) |
| Worldwide Protests for Free Expression in Bangladesh | not in the UK (Wikidata country: Bangladesh; no UK protest site named in the article) |
| Wuhan incident | date outside 1974 to today (1967-07-16) |
| Yangzhou riot | date outside 1974 to today (1868-08-22) |
| Yemeni revolution | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Yo Soy 132 | international article whose title doesn't describe a protest (e.g. a war, coup or movement overview) |
| Youth March for Integrated Schools (1958) | date outside 1974 to today (1958-10-25) |
| Youth March for Integrated Schools (1959) | date outside 1974 to today (1959-04-18) |
| Zaporizhzhia strikes (2022–present) | not a protest article (its infobox is “military conflict”) |
| Zimbabwe fuel protests | not in the UK (Wikidata country: Zimbabwe; no UK protest site named in the article) |
| Zoot Suit Riots | not a protest article (its infobox is “civilian attack”) |
| Ère des attentats | date outside 1974 to today (1892-03-11) |


## Sites removed

| Event | Place | Reason |
|---|---|---|
| 11 December 2013 Euromaidan assault | Kyiv | not in the UK (Kievan Rus', Golden Horde, Grand Duchy of Lithuania, Polish–Lithuanian Commonwealth, Tsardom of Russia, Russian Empire, Russian Republic, Ukrainian State, Ukrainian People's Republic, Soviet Union, Soviet Union, Reichskommissariat Ukraine, Soviet Union, Ukraine; resolved to Kyiv) |
| 19 January 2015 DRC protests | Kinshasa | not in the UK (Democratic Republic of the Congo, Zaire, Republic of the Congo (Léopoldville), Belgian Congo, Congo Free State; resolved to Kinshasa) |
| 19 January 2015 DRC protests | Bukavu | not in the UK (Democratic Republic of the Congo, Belgian Congo, Congo Free State, Democratic Republic of the Congo; resolved to Bukavu) |
| 19 January 2015 DRC protests | Goma | not in the UK (Democratic Republic of the Congo, Belgian Congo, Congo Free State; resolved to Goma) |
| 19 January 2015 DRC protests | Lubumbashi | not in the UK (Democratic Republic of the Congo; resolved to Lubumbashi) |
| 1974 Ethiopian Muslim protests | Addis Ababa | not in the UK (Ethiopia; resolved to Addis Ababa) |
| 1974 Ethiopian Muslim protests | Ethiopia | not in the UK (Ethiopia; resolved to Ethiopia) |
| 1989 Sukhumi riots | Sukhumi | not in the UK (Georgia, Byzantine Empire, Kingdom of Abkhazia, Kingdom of Georgia, Kingdom of Imereti, Ottoman Empire, Russian Empire, Russian Republic, Transcaucasian Democratic Federative Republic, Democratic Republic of Georgia, Socialist Soviet Republic of Abkhazia, Socialist Soviet Republic of Georgia, Transcaucasian Socialist Federative Soviet Republic, Soviet Union, Georgia, Republic of Abkhazia; resolved to Sukhumi) |
| 1989 Sukhumi riots | Abkhaz ASSR | not in the UK (Soviet Union; resolved to Abkhaz Autonomous Soviet Socialist Republic) |
| 1984 Summer Olympics boycott | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 1981 warning strike in Poland | Poland | not in the UK (Poland; resolved to Poland) |
| 1988 Summer Olympics boycott | Seoul | not in the UK (South Korea, Korea under Japanese rule; resolved to Seoul) |
| 1981 protests in Kosovo | SAP Kosovo | not in the UK (Socialist Federal Republic of Yugoslavia, Yugoslavia; resolved to Socialist Autonomous Province of Kosovo) |
| 1981 protests in Kosovo | SR Serbia | not in the UK (Democratic Federal Yugoslavia, Socialist Federal Republic of Yugoslavia, Kingdom of Yugoslavia, Yugoslavia; resolved to Socialist Republic of Serbia) |
| 1981 protests in Kosovo | SFR Yugoslavia | not in the UK (Socialist Federal Republic of Yugoslavia; resolved to Socialist Federal Republic of Yugoslavia) |
| 1982 Overtown riot | Overtown (Miami) | not in the UK (United States; resolved to Overtown (Miami)) |
| 1982 Overtown riot | Miami | not in the UK (United States; resolved to Miami) |
| 1982 Overtown riot | Florida | not in the UK (United States; resolved to Florida) |
| 1985–1986 New Bedford fishermen's strike | New Bedford, Massachusetts | not in the UK (United States; resolved to New Bedford, Massachusetts) |
| 1983 SEPTA Regional Rail strike | Greater Philadelphia | not in the UK (United States; resolved to Philadelphia metropolitan area) |
| 1983 SEPTA Regional Rail strike | Pennsylvania | not in the UK (United States; resolved to Pennsylvania) |
| 1982 Golan Heights Druze general strike | Golan Heights | not in the UK (Israel, Syria, French Mandate for Syria and the Lebanon, Syria; resolved to Golan Heights) |
| 1989 Soviet miners' strikes | Soviet Union | not in the UK (Soviet Union; resolved to Soviet Union) |
| 1989 Soviet miners' strikes | Kuznetsk Basin | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Kuznetsk Basin) |
| 1989 Soviet miners' strikes | Donbas | not in the UK (Ukraine, Soviet Union, Russian Empire, Russia; resolved to Donbas) |
| 1989 Soviet miners' strikes | Pechora coal basin | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Pechora coal basin) |
| 1985–1986 Dartmouth College anti-apartheid protests | Dartmouth College | not in the UK (United States; resolved to Dartmouth College) |
| 1985–1986 Dartmouth College anti-apartheid protests | Hanover, New Hampshire | not in the UK (United States; resolved to Hanover, New Hampshire) |
| 1984 Disneyland strike | Anaheim, California | not in the UK (United States; resolved to Anaheim, California) |
| 1992 Los Angeles riots | Los Angeles County, California | not in the UK (United States; resolved to Los Angeles County, California) |
| 1991 protests in Belgrade | Belgrade | not in the UK (Kingdom of Hungary, Ottoman Empire, Habsburg monarchy, Ottoman Empire, Principality of Serbia, Kingdom of Serbia, Kingdom of Yugoslavia, Territory of the Military Commander in Serbia, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia, Federal Republic of Yugoslavia, Serbia and Montenegro, Serbia, Federal People's Republic of Yugoslavia, Ottoman Empire, Revolutionary Serbia; resolved to Belgrade) |
| 1991 riot in Zadar | Zadar | not in the UK (Croatia, Republic of Venice, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia; resolved to Zadar) |
| 1991 riot in Zadar | Croatia | not in the UK (Croatia; resolved to Croatia) |
| 1991 protest in Split | Split, Croatia | not in the UK (Croatia, Socialist Federal Republic of Yugoslavia, Austrian Empire, Austria–Hungary; resolved to Split, Croatia) |
| 1991 protest in Split | Croatia | not in the UK (Croatia; resolved to Croatia) |
| 1991–1992 anti-war protests in Belgrade | Belgrade | not in the UK (Kingdom of Hungary, Ottoman Empire, Habsburg monarchy, Ottoman Empire, Principality of Serbia, Kingdom of Serbia, Kingdom of Yugoslavia, Territory of the Military Commander in Serbia, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia, Federal Republic of Yugoslavia, Serbia and Montenegro, Serbia, Federal People's Republic of Yugoslavia, Ottoman Empire, Revolutionary Serbia; resolved to Belgrade) |
| 1991–1992 anti-war protests in Belgrade | Republic of Serbia (1992–2006) | not in the UK (Serbia and Montenegro, Federal Republic of Yugoslavia, Socialist Federal Republic of Yugoslavia; resolved to Republic of Serbia (1992–2006)) |
| 1991–1992 anti-war protests in Belgrade | Yugoslavia | not in the UK (Yugoslavia; resolved to Yugoslavia) |
| 1991 Zaire unrest | Zaire | not in the UK (Zaire; resolved to Zaire) |
| 1990 Norwegian oil workers' strike | North Sea | coordinates outside the UK's boundaries (56.000, 3.000) |
| 1990 West Virginia teachers' strike | West Virginia | not in the UK (United States; resolved to West Virginia) |
| 1999 Seattle WTO protests | Seattle | not in the UK (United States; resolved to Seattle) |
| 2004 Redfern riots | Redfern, New South Wales | not in the UK (Australia; resolved to Redfern, New South Wales) |
| 2004 Republican National Convention protest activity | New York City, New York | not in the UK (United States; resolved to New York City) |
| 2005 Cronulla riots | Cronulla, New South Wales | not in the UK (Australia; resolved to Cronulla) |
| 2005 Cronulla riots | Maroubra, New South Wales | not in the UK (Australia; resolved to Maroubra, New South Wales) |
| 2005 Cronulla riots | Punchbowl, New South Wales | not in the UK (Australia; resolved to Punchbowl, New South Wales) |
| 2005 Cronulla riots | Lakemba, New South Wales | not in the UK (Australia; resolved to Lakemba, New South Wales) |
| 2005 Cronulla riots | Arncliffe, New South Wales | not in the UK (Australia; resolved to Arncliffe, New South Wales) |
| 2005 Cronulla riots | Brighton-Le-Sands, New South Wales | not in the UK (Australia; resolved to Brighton-Le-Sands, New South Wales) |
| 2005 Cronulla riots | Sydney | not in the UK (Australia; resolved to Sydney) |
| 2002 World Bank Oslo protests | Oslo, Norway | not in the UK (Norway, Union between Sweden and Norway, Kingdom of Norway, Denmark–Norway; resolved to Oslo) |
| 2000 UEFA Cup final riots | City Hall Square, Copenhagen | not in the UK (Denmark; resolved to City Hall Square, Copenhagen) |
| 1999 Mauritian riots | Roche Bois | no Wikipedia article or coordinates for this place |
| 1999 Mauritian riots | Port Louis | not in the UK (Mauritius; resolved to Port Louis) |
| 1999 Mauritian riots | Mauritius | not in the UK (Mauritius; resolved to Mauritius) |
| 2003 La Paz riots | La Paz | not in the UK (Bolivia; resolved to La Paz) |
| 2006 Dublin riots | O'Connell Street | not in the UK (Ireland; resolved to O'Connell Street) |
| 2006 Dublin riots | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2006 anti-NATO protests in Feodosia | Feodosia | not in the UK (Bosporan Kingdom, Crimean Khanate, Russian Empire, Soviet Union, Ukraine, territorial dispute, Russia, Ukraine; resolved to Feodosia) |
| 2006 anti-NATO protests in Feodosia | Ukraine | not in the UK (Ukraine; resolved to Ukraine) |
| 2007 Georgian demonstrations | Georgia (country) | not in the UK (Georgia; resolved to Georgia (country)) |
| 2008 Armenian presidential election protests | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| 2008 Tibetan unrest | Lhasa | not in the UK (People's Republic of China; resolved to Lhasa) |
| 2008 protests against Kosovo declaration of independence | Serbia | not in the UK (Serbia; resolved to Serbia) |
| 2008 protests against Kosovo declaration of independence | Bosnia and Herzegovina | not in the UK (no country on Wikidata; resolved to Bosnia and Herzegovina) |
| 2008 protests against Kosovo declaration of independence | Montenegro | not in the UK (Montenegro; resolved to Montenegro) |
| 2009 Iranian presidential election protests | Iran | not in the UK (Iran; resolved to Iran) |
| 2009 Iranian presidential election protests | Tehran | not in the UK (Iran, Qajar Iran, Pahlavi Iran; resolved to Tehran) |
| 2009 Iranian presidential election protests | Abadan | not in the UK (Iran; resolved to Abadan, Iran) |
| 2009 Iranian presidential election protests | Ahvaz | not in the UK (Iran; resolved to Ahvaz) |
| 2009 Iranian presidential election protests | Arak, Iran | not in the UK (Iran; resolved to Arak, Iran) |
| 2009 Iranian presidential election protests | Ardabil | not in the UK (Iran, Qajar Iran, Ṣafavid dynasty, 1501-1736; resolved to Ardabil) |
| 2009 Iranian presidential election protests | Bandar Abbas | not in the UK (Iran; resolved to Bandar Abbas) |
| 2009 Iranian presidential election protests | Birjand | not in the UK (Iran; resolved to Birjand) |
| 2009 Iranian presidential election protests | Bojnord | not in the UK (Iran; resolved to Bojnord) |
| 2009 Iranian presidential election protests | Borujerd | not in the UK (Iran; resolved to Borujerd) |
| 2009 Iranian presidential election protests | Dezful | not in the UK (Iran; resolved to Dezful) |
| 2009 Iranian presidential election protests | Sari, Iran | not in the UK (Iran; resolved to Sari, Iran) |
| 2009 Iranian presidential election protests | Babol | not in the UK (Iran; resolved to Babol) |
| 2009 Iranian presidential election protests | Bandar Torkaman | not in the UK (Iran; resolved to Bandar Torkaman) |
| 2009 Iranian presidential election protests | Bushehr | not in the UK (Iran; resolved to Bushehr) |
| 2009 Iranian presidential election protests | Hamadan | not in the UK (Iran; resolved to Hamadan) |
| 2009 Iranian presidential election protests | Isfahan | not in the UK (Iran; resolved to Isfahan) |
| 2009 Iranian presidential election protests | Ilam, Iran | not in the UK (Iran; resolved to Ilam, Iran) |
| 2009 Iranian presidential election protests | Karaj | not in the UK (Iran; resolved to Karaj) |
| 2009 Iranian presidential election protests | Kashan | not in the UK (Iran; resolved to Kashan) |
| 2009 Iranian presidential election protests | Kerman | not in the UK (Iran; resolved to Kerman) |
| 2009 Iranian presidential election protests | Kermanshah | not in the UK (Iran; resolved to Kermanshah) |
| 2009 Iranian presidential election protests | Khorramshahr | not in the UK (Iran; resolved to Khorramshahr) |
| 2009 Iranian presidential election protests | Khoy | not in the UK (Iran; resolved to Khoy) |
| 2009 Iranian presidential election protests | Mashhad | not in the UK (Iran; resolved to Mashhad) |
| 2009 Iranian presidential election protests | Najafabad | not in the UK (Iran; resolved to Najafabad) |
| 2009 Iranian presidential election protests | Qazvin | not in the UK (Iran, Safavid Iran; resolved to Qazvin) |
| 2009 Iranian presidential election protests | Qom | not in the UK (Iran; resolved to Qom) |
| 2009 Iranian presidential election protests | Rasht | not in the UK (Iran; resolved to Rasht) |
| 2009 Iranian presidential election protests | Sanandaj | not in the UK (Iran; resolved to Sanandaj) |
| 2009 Iranian presidential election protests | Shahr Kord | not in the UK (Iran; resolved to Shahr-e Kord) |
| 2009 Iranian presidential election protests | Shiraz | not in the UK (Iran; resolved to Shiraz) |
| 2009 Iranian presidential election protests | Tabriz | not in the UK (Iran, Sasanian Empire, Eldiguzid state, Ilkhanate, Qara Qoyunlu, Aq Qoyunlu, Safavid Iran; resolved to Tabriz) |
| 2009 Iranian presidential election protests | Urmia | not in the UK (Iran; resolved to Urmia) |
| 2009 Iranian presidential election protests | Yasuj | not in the UK (Iran; resolved to Yasuj) |
| 2009 Iranian presidential election protests | Yazd | not in the UK (Iran; resolved to Yazd) |
| 2009 Iranian presidential election protests | Zabol | not in the UK (Iran; resolved to Zabol) |
| 2009 Iranian presidential election protests | Zanjan Province | not in the UK (Iran; resolved to Zanjan province) |
| 2009 Iranian presidential election protests | Zahedan | not in the UK (Iran; resolved to Zahedan) |
| 2009 Iranian presidential election protests | Atlanta | not in the UK (United States; resolved to Atlanta) |
| 2009 Iranian presidential election protests | Charlotte, North Carolina | not in the UK (United States; resolved to Charlotte, North Carolina) |
| 2009 Iranian presidential election protests | Cincinnati | not in the UK (United States; resolved to Cincinnati) |
| 2009 Iranian presidential election protests | Preston, Iowa | not in the UK (United States; resolved to Preston, Iowa) |
| 2009 Iranian presidential election protests | Dallas | not in the UK (United States; resolved to Dallas) |
| 2009 Iranian presidential election protests | Denver | not in the UK (United States; resolved to Denver) |
| 2009 Iranian presidential election protests | Houston | not in the UK (United States; resolved to Houston) |
| 2009 Iranian presidential election protests | Indianapolis | not in the UK (United States; resolved to Indianapolis) |
| 2009 Iranian presidential election protests | Irvine, California | not in the UK (United States; resolved to Irvine, California) |
| 2009 Iranian presidential election protests | Kansas City, Missouri | not in the UK (United States; resolved to Kansas City, Missouri) |
| 2009 Iranian presidential election protests | Las Cruces, New Mexico | not in the UK (United States; resolved to Las Cruces, New Mexico) |
| 2009 Iranian presidential election protests | Las Vegas | not in the UK (United States; resolved to Las Vegas) |
| 2009 Iranian presidential election protests | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2009 Iranian presidential election protests | Madison, Wisconsin | not in the UK (United States; resolved to Madison, Wisconsin) |
| 2009 Iranian presidential election protests | Miami, Florida | not in the UK (United States; resolved to Miami) |
| 2009 Iranian presidential election protests | Minneapolis | not in the UK (United States; resolved to Minneapolis) |
| 2009 Iranian presidential election protests | New York City | not in the UK (United States; resolved to New York City) |
| 2009 Iranian presidential election protests | Orlando, Florida | not in the UK (United States; resolved to Orlando, Florida) |
| 2009 Iranian presidential election protests | Philadelphia | not in the UK (United States; resolved to Philadelphia) |
| 2009 Iranian presidential election protests | Portland, Oregon | not in the UK (United States; resolved to Portland, Oregon) |
| 2009 Iranian presidential election protests | San Diego | not in the UK (United States; resolved to San Diego) |
| 2009 Iranian presidential election protests | San Francisco | not in the UK (United States; resolved to San Francisco) |
| 2009 Iranian presidential election protests | San Jose, California | not in the UK (United States; resolved to San Jose, California) |
| 2009 Iranian presidential election protests | Seattle | not in the UK (United States; resolved to Seattle) |
| 2009 Iranian presidential election protests | State College, Pennsylvania | not in the UK (United States; resolved to State College, Pennsylvania) |
| 2009 Iranian presidential election protests | Tempe, Arizona | not in the UK (United States; resolved to Tempe, Arizona) |
| 2009 Iranian presidential election protests | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| 2009 Iranian presidential election protests | Calgary | not in the UK (Canada; resolved to Calgary) |
| 2009 Iranian presidential election protests | Edmonton | not in the UK (Canada; resolved to Edmonton) |
| 2009 Iranian presidential election protests | Halifax Regional Municipality | not in the UK (Canada; resolved to Halifax, Nova Scotia) |
| 2009 Iranian presidential election protests | Hamilton, Ontario | not in the UK (Canada; resolved to Hamilton, Ontario) |
| 2009 Iranian presidential election protests | London, Ontario | not in the UK (Canada; resolved to London, Ontario) |
| 2009 Iranian presidential election protests | Montreal | not in the UK (Canada; resolved to Montreal) |
| 2009 Iranian presidential election protests | Ottawa | not in the UK (Canada; resolved to Ottawa) |
| 2009 Iranian presidential election protests | Toronto | not in the UK (Canada; resolved to Toronto) |
| 2009 Iranian presidential election protests | Vancouver | not in the UK (Canada; resolved to Vancouver) |
| 2009 Iranian presidential election protests | Waterloo, Ontario | not in the UK (Canada; resolved to Waterloo, Ontario) |
| 2009 Iranian presidential election protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| 2009 Iranian presidential election protests | Bochum | not in the UK (Germany; resolved to Bochum) |
| 2009 Iranian presidential election protests | Cologne | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Prussia, First French Empire, Holy Roman Empire, Electorate of Cologne, East Francia, Francia, allied-occupied Germany, West Germany, Western Roman Empire, Roman Empire, Germany; resolved to Cologne) |
| 2009 Iranian presidential election protests | Dortmund | not in the UK (Germany, West Germany, allied-occupied Germany, Nazi Germany, Weimar Republic, German Empire; resolved to Dortmund) |
| 2009 Iranian presidential election protests | Düsseldorf | not in the UK (Germany; resolved to Düsseldorf) |
| 2009 Iranian presidential election protests | Frankfurt | not in the UK (Francia, East Francia, Holy Roman Empire, Grand Duchy of Frankfurt, Free City of Frankfurt, German Confederation, Kingdom of Prussia, German Reich, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany, Germany; resolved to Frankfurt) |
| 2009 Iranian presidential election protests | Hamburg | not in the UK (Holy Roman Empire, Hamburg, First French Empire, German Confederation, North German Confederation, German Empire, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany; resolved to Hamburg) |
| 2009 Iranian presidential election protests | Hannover | not in the UK (Germany, West Germany, allied-occupied Germany, Kingdom of Prussia, Kingdom of Hanover, Electorate of Hanover, Kingdom of Westphalia, Principality of Calenberg, German Reich; resolved to Hanover) |
| 2009 Iranian presidential election protests | Heidelberg | not in the UK (Germany, West Germany, allied-occupied Germany, Nazi Germany, Weimar Republic, German Empire, Grand Duchy of Baden, Electorate of Baden, Electoral Palatinate, Duchy of Franconia, Electoral Palatinate, Republic of Baden; resolved to Heidelberg) |
| 2009 Iranian presidential election protests | Münster | not in the UK (Germany, Kingdom of Prussia, France, Grand Duchy of Berg, Kingdom of Prussia, Prince-Bishopric of Münster; resolved to Münster) |
| 2009 Iranian presidential election protests | Stuttgart | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Württemberg, Electorate of Württemberg, Duchy of Württemberg; resolved to Stuttgart) |
| 2009 Iranian presidential election protests | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| 2009 Iranian presidential election protests | Gothenburg | not in the UK (Sweden; resolved to Gothenburg) |
| 2009 Iranian presidential election protests | Malmö | not in the UK (Sweden; resolved to Malmö) |
| 2009 Iranian presidential election protests | Skellefteå | not in the UK (Sweden; resolved to Skellefteå) |
| 2009 Iranian presidential election protests | Karlstad | not in the UK (Sweden; resolved to Karlstad) |
| 2009 Iranian presidential election protests | Sundsvall | not in the UK (Sweden; resolved to Sundsvall) |
| 2009 Iranian presidential election protests | Uppsala | not in the UK (Sweden; resolved to Uppsala) |
| 2009 Iranian presidential election protests | Helsingborg | not in the UK (Sweden, Denmark; resolved to Helsingborg) |
| 2009 Iranian presidential election protests | Umeå | not in the UK (Sweden; resolved to Umeå) |
| 2009 Iranian presidential election protests | Jönköping | not in the UK (Sweden; resolved to Jönköping) |
| 2009 Iranian presidential election protests | Uddevalla | not in the UK (Sweden; resolved to Uddevalla) |
| 2009 Iranian presidential election protests | Borås | not in the UK (Sweden; resolved to Borås) |
| 2009 Iranian presidential election protests | The Hague | not in the UK (Netherlands, Kingdom of Holland, First French Empire, Batavian Republic, Dutch Republic, Spanish Empire, Habsburg Netherlands, County of Holland; resolved to The Hague) |
| 2009 Iranian presidential election protests | Amsterdam | not in the UK (Netherlands, Reichskommissariat Niederlande, Netherlands, United Kingdom of the Netherlands, Sovereign Principality of the United Netherlands, France, Kingdom of Holland, Batavian Republic, Dutch Republic, Habsburg Netherlands, Burgundian Netherlands, County of Holland; resolved to Amsterdam) |
| 2009 Iranian presidential election protests | Delft | not in the UK (Netherlands; resolved to Delft) |
| 2009 Iranian presidential election protests | Leiden | not in the UK (Netherlands, Dutch Republic; resolved to Leiden) |
| 2009 Iranian presidential election protests | Groningen | not in the UK (Netherlands, Dutch Republic, Batavian Republic, Kingdom of Holland, France; resolved to Groningen) |
| 2009 Iranian presidential election protests | Maastricht | not in the UK (Netherlands; resolved to Maastricht) |
| 2009 Iranian presidential election protests | Rome | not in the UK (Italy, Papal States, Kingdom of Italy, Ostrogothic Kingdom, Byzantine Empire, Kingdom of Italy, Roman Kingdom, Roman Republic, Roman Empire, Western Roman Empire, Vatican City; resolved to Rome) |
| 2009 Iranian presidential election protests | Milan | not in the UK (Italy, Kingdom of Italy, Austrian Empire, Kingdom of Sardinia, Kingdom of Italy, Italian Republic, Cisalpine Republic, Transpadane Republic, Duchy of Milan, Signoria of Milan, Spanish Empire; resolved to Milan) |
| 2009 Iranian presidential election protests | Turin | not in the UK (Italy, Kingdom of Sardinia, Duchy of Savoy, County of Savoy, March of Turin, March of Ivrea, Carolingian Empire, Kingdom of the Lombards; resolved to Turin) |
| 2009 Iranian presidential election protests | Florence | not in the UK (Kingdom of Italy, March of Tuscany, Republic of Florence, Duchy of Florence, Grand Duchy of Tuscany, Kingdom of Etruria, France, Grand Duchy of Tuscany, United Provinces of Central Italy, Italy, Kingdom of Sardinia; resolved to Florence) |
| 2009 Iranian presidential election protests | Geneva | not in the UK (Switzerland, Republic of Geneva, France, Republic of Geneva; resolved to Geneva) |
| 2009 Iranian presidential election protests | Lausanne | not in the UK (Switzerland; resolved to Lausanne) |
| 2009 Iranian presidential election protests | Zürich | not in the UK (Switzerland, Old Swiss Confederacy, Helvetic Republic, Switzerland; resolved to Zurich) |
| 2009 Iranian presidential election protests | Bern | not in the UK (Switzerland; resolved to Bern) |
| 2009 Iranian presidential election protests | Sydney | not in the UK (Australia; resolved to Sydney) |
| 2009 Iranian presidential election protests | Melbourne | not in the UK (Australia; resolved to Melbourne) |
| 2009 Iranian presidential election protests | Canberra | not in the UK (Australia; resolved to Canberra) |
| 2009 Iranian presidential election protests | Adelaide | not in the UK (Australia, United Kingdom of Great Britain and Ireland; resolved to Adelaide) |
| 2009 Iranian presidential election protests | Barcelona | not in the UK (Spain; resolved to Barcelona) |
| 2009 Iranian presidential election protests | Madrid | not in the UK (Spain; resolved to Madrid) |
| 2009 Iranian presidential election protests | Kyiv | not in the UK (Kievan Rus', Golden Horde, Grand Duchy of Lithuania, Polish–Lithuanian Commonwealth, Tsardom of Russia, Russian Empire, Russian Republic, Ukrainian State, Ukrainian People's Republic, Soviet Union, Soviet Union, Reichskommissariat Ukraine, Soviet Union, Ukraine; resolved to Kyiv) |
| 2009 Iranian presidential election protests | Kharkiv | not in the UK (Ukraine, Soviet Union, Reichskommissariat Ukraine, Soviet Union, Ukrainian Soviet Socialist Republic, Ukrainian People's Republic, Russian Republic, Russian Empire, Tsardom of Russia, Cossack Hetmanate; resolved to Kharkiv) |
| 2009 Iranian presidential election protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2009 Iranian presidential election protests | Lyon | not in the UK (France, Roman Republic, Roman Empire, Western Roman Empire, Kingdom of the Burgundians, Francia, West Francia, Kingdom of France, French First Republic, First French Empire, France, Vichy France; resolved to Lyon) |
| 2009 Iranian presidential election protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2009 Iranian presidential election protests | Leuven | not in the UK (Belgium, United Kingdom of the Netherlands, France, Austrian Netherlands, Spanish Netherlands, Habsburg Netherlands, Burgundian Netherlands, Duchy of Brabant, Landgraviate of Brabant, Belgium; resolved to Leuven) |
| 2009 Iranian presidential election protests | Auckland | not in the UK (New Zealand; resolved to Auckland) |
| 2009 Iranian presidential election protests | Wellington | not in the UK (New Zealand; resolved to Wellington) |
| 2009 Iranian presidential election protests | Christchurch | not in the UK (New Zealand; resolved to Christchurch) |
| 2009 Iranian presidential election protests | Kuala Lumpur | not in the UK (Malaysia; resolved to Kuala Lumpur) |
| 2009 Iranian presidential election protests | Lisbon | not in the UK (Portugal, Roman Republic, Kingdom of the Suebi, Visigothic Kingdom, Umayyad Caliphate, Emirate of Córdoba, Caliphate of Córdoba, Taifa of Badajoz, Taifa of Lisbon, Taifa of Badajoz, Almoravid dynasty; resolved to Lisbon) |
| 2009 Iranian presidential election protests | Vienna | not in the UK (Austria, First Republic of Austria, Austria–Hungary, Republic of German-Austria, Austrian Empire, Federal State of Austria, Nazi Germany, Habsburg monarchy, Archduchy of Austria, Duchy of Austria, Margraviate of Austria, Duchy of Bavaria, Allied-occupied Austria; resolved to Vienna) |
| 2009 Iranian presidential election protests | Salzburg | not in the UK (Austria, Austrian Empire, Kingdom of Bavaria, Austrian Empire, Austria–Hungary, First Republic of Austria, Federal State of Austria, Nazi Germany, Prince-Archbishopric of Salzburg; resolved to Salzburg) |
| 2009 Iranian presidential election protests | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| 2009 Iranian presidential election protests | Budapest | not in the UK (Hungary, Kingdom of Hungary, Provisional Goverment of the Republic of Hungary, Hungarian Soviet Republic, First Hungarian Republic, Austria–Hungary, First Hungarian Republic, Second Hungarian Republic, Hungarian People's Republic; resolved to Budapest) |
| 2009 Iranian presidential election protests | Prague | not in the UK (Czech Republic, Czechoslovakia, Austria–Hungary, Austrian Empire, Kingdom of Bohemia, Duchy of Bohemia, Czechoslovakia, Protectorate of Bohemia and Moravia, Bohemia, Holy Roman Empire; resolved to Prague) |
| 2009 Iranian presidential election protests | Tokyo | not in the UK (Japan; resolved to Tokyo) |
| 2009 Iranian presidential election protests | Yokohama | not in the UK (Japan; resolved to Yokohama) |
| 2009 Iranian presidential election protests | Osaka | not in the UK (Japan; resolved to Osaka) |
| 2009 Iranian presidential election protests | Kyoto | not in the UK (Japan; resolved to Kyoto) |
| 2009 Iranian presidential election protests | Nagoya | not in the UK (Japan; resolved to Nagoya) |
| 2009 Iranian presidential election protests | Copenhagen | not in the UK (Denmark, Kingdom of Denmark; resolved to Copenhagen) |
| 2009 Iranian presidential election protests | Aarhus | not in the UK (Denmark; resolved to Aarhus) |
| 2009 Iranian presidential election protests | Oslo | not in the UK (Norway, Union between Sweden and Norway, Kingdom of Norway, Denmark–Norway; resolved to Oslo) |
| 2009 Iranian presidential election protests | Bergen | not in the UK (Norway, Union between Sweden and Norway, Kingdom of Norway, Denmark–Norway; resolved to Bergen) |
| 2009 Iranian presidential election protests | Trondheim | not in the UK (Norway; resolved to Trondheim) |
| 2009 Iranian presidential election protests | Stavanger | not in the UK (Norway, Union between Sweden and Norway, Kingdom of Norway, Denmark–Norway, Norway; resolved to Stavanger) |
| 2009 Iranian presidential election protests | Arendal (town) | not in the UK (Norway; resolved to Arendal (town)) |
| 2009 Iranian presidential election protests | Kristiansand (town) | not in the UK (Norway; resolved to Kristiansand) |
| 2009 Iranian presidential election protests | Seoul | not in the UK (South Korea, Korea under Japanese rule; resolved to Seoul) |
| 2009 Iranian presidential election protests | Busan | not in the UK (South Korea; resolved to Busan) |
| 2009 Iranian presidential election protests | Daegu | not in the UK (South Korea; resolved to Daegu) |
| 2009 Iranian presidential election protests | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| 2009 Iranian presidential election protests | Tel Aviv | not in the UK (Israel, Mandatory Palestine, Occupied Enemy Territory Administration, Ottoman Empire; resolved to Tel Aviv) |
| 2009 Iranian presidential election protests | Dubai | not in the UK (United Arab Emirates; resolved to Dubai) |
| 2009 Iranian presidential election protests | Istanbul | not in the UK (Turkey, Ottoman Empire, Byzantine Empire, Latin Empire, Byzantine Empire, Roman Empire; resolved to Istanbul) |
| 2009 Iranian presidential election protests | Ankara | not in the UK (Turkey, Ottoman Empire, Ottoman caliphate, Timurid Empire; resolved to Ankara) |
| 2009 Iranian presidential election protests | Islamabad | not in the UK (Pakistan; resolved to Islamabad) |
| 2009 Iranian presidential election protests | Karachi | not in the UK (Pakistan, Dominion of Pakistan, British Raj, Company rule in India, Talpur dynasty, Kalhora dynasty; resolved to Karachi) |
| 2009 Iranian presidential election protests | Lahore | not in the UK (Pakistan, Dominion of Pakistan, British Raj, Mughal Empire, Sikh Empire, India; resolved to Lahore) |
| 2009 Iranian presidential election protests | Peshawar | not in the UK (Pakistan, British Raj, Sikh Empire, Durrani Empire; resolved to Peshawar) |
| 2009 Iranian presidential election protests | Cairo | not in the UK (Egypt, Medieval Egypt, Khedivate of Egypt, Sultanate of Egypt, Kingdom of Egypt, Mamluk Sultanate of Egypt, Ottoman Empire; resolved to Cairo) |
| 2009 Iranian presidential election protests | Kuwait City | not in the UK (Kuwait; resolved to Kuwait City) |
| 2009 Iranian presidential election protests | Athens | not in the UK (Greece, Roman Empire, Byzantine Empire, Duchy of Athens, Ottoman Empire, First Hellenic Republic, Classical Athens, Kingdom of Greece, Third Hellenic Republic; resolved to Athens) |
| 2009 Iranian presidential election protests | Nicosia | not in the UK (Cyprus, Ottoman Empire, Northern Cyprus, British Empire; resolved to Nicosia) |
| 2009 Iranian presidential election protests | Sofia | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire, Roman Empire; resolved to Sofia) |
| 2009 Iranian presidential election protests | Baku | not in the UK (Russian Empire, Transcaucasian Commissariat, Transcaucasian Democratic Federative Republic, Azerbaijan Democratic Republic, Azerbaijan Soviet Socialist Republic, Azerbaijan; resolved to Baku) |
| 2009 Iranian presidential election protests | Warsaw | not in the UK (Poland, General Government, Second Polish Republic, Kingdom of Poland, Russian Empire, Duchy of Warsaw, Kingdom of Prussia, Polish–Lithuanian Commonwealth, Kingdom of Poland, Kingdom of Poland, Kingdom of Poland; resolved to Warsaw) |
| 2009 Iranian presidential election protests | Helsinki | not in the UK (Finland, Russian Empire, Sweden, Finnish Socialist Workers' Republic; resolved to Helsinki) |
| 2009 Iranian presidential election protests | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2009 Iranian presidential election protests | Hyderabad, India | not in the UK (India, Golconda Sultanate, Mughal Empire, Hyderabad State; resolved to Hyderabad) |
| 2009 Iranian presidential election protests | Dhaka | not in the UK (Bangladesh, Pakistan, Dominion of Pakistan, British Raj, Company rule in India; resolved to Dhaka) |
| 2009 Iranian presidential election protests | Manila | not in the UK (Philippines; resolved to Manila) |
| 2009–2010 California college tuition hike protests | California | not in the UK (United States; resolved to California) |
| 2009–2010 California college tuition hike protests | United States | not in the UK (United States; resolved to United States) |
| 2010 G20 Toronto summit protests | Toronto | not in the UK (Canada; resolved to Toronto) |
| 2010 G20 Toronto summit protests | Ontario | not in the UK (Canada; resolved to Ontario) |
| 2010 Catalan autonomy protest | Barcelona | not in the UK (Spain; resolved to Barcelona) |
| 2010 Catalan autonomy protest | Catalonia | not in the UK (Spain; resolved to Catalonia) |
| 2010 Kashmir unrest | Kashmir Division, Jammu and Kashmir | not in the UK (India; resolved to Kashmir division) |
| 2010 student protest in Dublin | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2010–2012 Algerian protests | Algeria | not in the UK (Algeria; resolved to Algeria) |
| 2010 Rinkeby riots | Rinkeby | not in the UK (Sweden; resolved to Rinkeby) |
| 2010 Rinkeby riots | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| 2010 Rinkeby riots | Sweden | not in the UK (no country on Wikidata; resolved to Sweden) |
| 2011–2012 Jordanian protests | Jordan | not in the UK (Jordan; resolved to Jordan) |
| 2011 Iraqi protests | Iraq | not in the UK (Iraq; resolved to Iraq) |
| 2011 Wisconsin protests | Madison, Wisconsin | not in the UK (United States; resolved to Madison, Wisconsin) |
| 2011 Djiboutian protests | Djibouti | not in the UK (Djibouti; resolved to Djibouti) |
| 2011 Omani protests | Oman | not in the UK (Oman; resolved to Oman) |
| 2011 Lebanese protests | Lebanon | not in the UK (Lebanon; resolved to Lebanon) |
| 2011 Azerbaijani protests | Azerbaijan | not in the UK (Azerbaijan; resolved to Azerbaijan) |
| 2011 Western Saharan protests | Western Sahara | not in the UK (Spanish Empire, Spanish West Africa, Spanish Sahara, Sahrawi Arab Democratic Republic; resolved to Western Sahara) |
| 2011 Western Saharan protests | Morocco | not in the UK (Morocco; resolved to Morocco) |
| 2011 Malawian protests | Malawi | not in the UK (Malawi; resolved to Malawi) |
| 2011 Kurdish protests in Iraq | Iraqi Kurdistan | not in the UK (Iraq; resolved to Iraqi Kurdistan) |
| 2011 Israeli social justice protests | Israel | not in the UK (Israel; resolved to Israel) |
| 2011 Oakland general strike | Oakland, California | not in the UK (United States; resolved to Oakland, California) |
| 2011 Bolivian Indigenous rights protests | Bolivia | not in the UK (Bolivia; resolved to Bolivia) |
| 2011 Khuzestan protests | Ahvaz | not in the UK (Iran; resolved to Ahvaz) |
| 2011 Khuzestan protests | Iran | not in the UK (Iran; resolved to Iran) |
| 2011 Turkish Cypriot protests | North Nicosia | not in the UK (Northern Cyprus, Cyprus; resolved to North Nicosia) |
| 2011 Turkish Cypriot protests | Northern Cyprus | not in the UK (Northern Cyprus; resolved to Northern Cyprus) |
| 2011–2012 Moroccan protests | Morocco | not in the UK (Morocco; resolved to Morocco) |
| 2011–2013 Sudanese protests | Sudan | not in the UK (Sudan; resolved to Sudan) |
| 2011–2012 Palestinian protests | Palestine | not in the UK (Palestine; resolved to Palestine) |
| 2011–2012 Palestinian protests | West Bank | not in the UK (Palestine, Israel, Jordan; resolved to West Bank) |
| 2011–2012 Palestinian protests | Gaza Strip | not in the UK (Palestine, United Arab Republic, Israeli-occupied territories, Palestinian National Authority, occupation of the Gaza Strip by the United Arab Republic; resolved to Gaza Strip) |
| 2011–2013 Russian protests | Russia | not in the UK (Russia; resolved to Russia) |
| 2011–2013 Russian protests | Moscow | not in the UK (Duchy of Moscow, Grand Principality of Moscow, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Moscow) |
| 2011–2013 Russian protests | Saint Petersburg | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Empire, Russian Republic, Tsardom of Russia; resolved to Saint Petersburg) |
| 2012 Romanian protests | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| 2012 Romanian protests | Vienna | not in the UK (Austria, First Republic of Austria, Austria–Hungary, Republic of German-Austria, Austrian Empire, Federal State of Austria, Nazi Germany, Habsburg monarchy, Archduchy of Austria, Duchy of Austria, Margraviate of Austria, Duchy of Bavaria, Allied-occupied Austria; resolved to Vienna) |
| 2012 Romanian protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2012 Romanian protests | Montreal | not in the UK (Canada; resolved to Montreal) |
| 2012 Romanian protests | Aarhus | not in the UK (Denmark; resolved to Aarhus) |
| 2012 Romanian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2012 Romanian protests | Strasbourg | not in the UK (France, German Empire, Nazi Germany, France, France, Holy Roman Empire; resolved to Strasbourg) |
| 2012 Romanian protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| 2012 Romanian protests | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2012 Romanian protests | Brescia | not in the UK (Italy, Kingdom of Lombardy–Venetia, Kingdom of Italy, Italian Republic, Cisalpine Republic, Republic of Venice; resolved to Brescia) |
| 2012 Romanian protests | Padua | not in the UK (Italy, Austrian Empire, Kingdom of Italy, Austrian Empire, Habsburg monarchy, Republic of Venice; resolved to Padua) |
| 2012 Romanian protests | Rome | not in the UK (Italy, Papal States, Kingdom of Italy, Ostrogothic Kingdom, Byzantine Empire, Kingdom of Italy, Roman Kingdom, Roman Republic, Roman Empire, Western Roman Empire, Vatican City; resolved to Rome) |
| 2012 Romanian protests | Trieste | not in the UK (Kingdom of Italy, Habsburg monarchy, Austrian Empire, Austria–Hungary, Free Territory of Trieste, Italy, Republic of Venice; resolved to Trieste) |
| 2012 Romanian protests | Chișinău | not in the UK (Moldova, Soviet Union, Kingdom of Romania, Soviet Union, Kingdom of Romania, Moldavian Democratic Republic, Russian Empire, Principality of Moldavia, Russian Republic; resolved to Chișinău) |
| 2012 Romanian protests | The Hague | not in the UK (Netherlands, Kingdom of Holland, First French Empire, Batavian Republic, Dutch Republic, Spanish Empire, Habsburg Netherlands, County of Holland; resolved to The Hague) |
| 2012 Romanian protests | Lisbon | not in the UK (Portugal, Roman Republic, Kingdom of the Suebi, Visigothic Kingdom, Umayyad Caliphate, Emirate of Córdoba, Caliphate of Córdoba, Taifa of Badajoz, Taifa of Lisbon, Taifa of Badajoz, Almoravid dynasty; resolved to Lisbon) |
| 2012 Romanian protests | Madrid | not in the UK (Spain; resolved to Madrid) |
| 2012 Romanian protests | Zaragoza | not in the UK (Spain; resolved to Zaragoza) |
| 2012 Romanian protests | London | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2012 Romanian protests | Vatican City | not in the UK (Vatican City; resolved to Vatican City) |
| 2011–2012 Mauritanian protests | Mauritania | not in the UK (Mauritania; resolved to Mauritania) |
| 2012 Afghanistan Quran burning protests | Afghanistan | not in the UK (Afghanistan; resolved to Afghanistan) |
| 2012 Asturian miners' strike | Asturias | not in the UK (Spain; resolved to Asturias) |
| 2013 Bulgarian protests against the first Borisov cabinet | Austria | not in the UK (Austria; resolved to Austria) |
| 2013 Bulgarian protests against the first Borisov cabinet | France | not in the UK (France; resolved to France) |
| 2013 Bulgarian protests against the first Borisov cabinet | Germany | not in the UK (Germany; resolved to Germany) |
| 2013 Bulgarian protests against the first Borisov cabinet | Greece | not in the UK (Greece; resolved to Greece) |
| 2013 Bulgarian protests against the first Borisov cabinet | Spain | not in the UK (Spain; resolved to Spain) |
| 2012–2013 Iraqi protests | Iraq | not in the UK (Iraq; resolved to Iraq) |
| 2013 Armenian protests | Armenia | not in the UK (Armenia; resolved to Armenia) |
| 2013 Armenian protests | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| 2013 Armenian protests | Gyumri | not in the UK (Armenia, Soviet Union; resolved to Gyumri) |
| 2013 Armenian protests | Vanadzor | not in the UK (Armenia, Armenian Soviet Socialist Republic, First Republic of Armenia, Transcaucasian Democratic Federative Republic, Transcaucasian Commissariat, Special Transcaucasian Committee, Russian Empire, Kingdom of Kartli-Kakheti, Kingdom of Kartli, Kingdom of Georgia, Kingdom of Lori; resolved to Vanadzor) |
| 2013 Armenian protests | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2013 Armenian protests | New York City | not in the UK (United States; resolved to New York City) |
| 2013 Armenian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2013 Armenian protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2012–2014 Romanian protests against shale gas | Romania | not in the UK (Romania; resolved to Romania) |
| 2012–2015 unrest in Romania | Romania | not in the UK (Romania; resolved to Romania) |
| 2013 Shahbag protests | Bangladesh | not in the UK (Bangladesh; resolved to Bangladesh) |
| 2013 Shahbag protests | Shahbag Square | not in the UK (Bangladesh; resolved to Shahbag) |
| 2013 Shahbag protests | Dhaka | not in the UK (Bangladesh, Pakistan, Dominion of Pakistan, British Raj, Company rule in India; resolved to Dhaka) |
| 2013 anti-Sri Lanka protests | Tamil Nadu | not in the UK (India; resolved to Tamil Nadu) |
| 2013 anti-Sri Lanka protests | India | not in the UK (India; resolved to India) |
| 2013 Shapla Square protests | Dhaka | not in the UK (Bangladesh, Pakistan, Dominion of Pakistan, British Raj, Company rule in India; resolved to Dhaka) |
| 2013 Tbilisi anti-homophobia rally protests | Tbilisi | not in the UK (Georgia, Soviet Union, Transcaucasian Socialist Federative Soviet Republic, Democratic Republic of Georgia, Transcaucasian Democratic Federative Republic, Transcaucasian Commissariat, Russian Republic, Russian Empire, Kingdom of Kartli-Kakheti, Kingdom of Kartli, Kingdom of Georgia; resolved to Tbilisi) |
| 2013–2014 Bulgarian protests against the Oresharski cabinet | Bulgaria | not in the UK (Bulgaria; resolved to Bulgaria) |
| 2013–2014 Bulgarian protests against the Oresharski cabinet | Sofia | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire, Roman Empire; resolved to Sofia) |
| 2013 Trappes riots | Trappes | not in the UK (France; resolved to Trappes) |
| 2013 Trappes riots | Yvelines | not in the UK (France; resolved to Yvelines) |
| 2013 Trappes riots | Île-de-France | not in the UK (France; resolved to Île-de-France) |
| 2014 unrest in Bosnia and Herzegovina | Bosnia and Herzegovina | not in the UK (no country on Wikidata; resolved to Bosnia and Herzegovina) |
| 2014 unrest in Bosnia and Herzegovina | Federation of Bosnia and Herzegovina | not in the UK (Bosnia and Herzegovina; resolved to Federation of Bosnia and Herzegovina) |
| 2014 pro-Russian unrest in Ukraine | Crimea | not in the UK (Ukraine, Russia, Soviet Union, Russian Empire, Crimean Khanate; resolved to Crimea) |
| 2014 pro-Russian unrest in Ukraine | Donetsk | not in the UK (Russian Empire, Soviet Union, Ukraine; resolved to Donetsk) |
| 2014 pro-Russian unrest in Ukraine | Luhansk | not in the UK (Russian Empire, Soviet Union, Ukraine, Luhansk People's Republic, Russia; resolved to Luhansk) |
| 2014 pro-Russian unrest in Ukraine | Kharkiv | not in the UK (Ukraine, Soviet Union, Reichskommissariat Ukraine, Soviet Union, Ukrainian Soviet Socialist Republic, Ukrainian People's Republic, Russian Republic, Russian Empire, Tsardom of Russia, Cossack Hetmanate; resolved to Kharkiv) |
| 2014 pro-Russian unrest in Ukraine | Odesa | not in the UK (Russian Empire, Ukrainian People's Republic, Ukrainian People's Republic, Ukrainian Soviet Socialist Republic, Soviet Union, Kingdom of Romania, Soviet Union, Ukraine, Russian Republic, Odesa Soviet Republic; resolved to Odesa) |
| 2014 anti-war protests in Russia | Moscow | not in the UK (Duchy of Moscow, Grand Principality of Moscow, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Moscow) |
| 2014 anti-war protests in Russia | Saint Petersburg | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Empire, Russian Republic, Tsardom of Russia; resolved to Saint Petersburg) |
| 2014 anti-war protests in Russia | Russia | not in the UK (Russia; resolved to Russia) |
| 2014 Vietnam anti-China protests | Bình Dương Province | not in the UK (Vietnam; resolved to Bình Dương province) |
| 2014 Vietnam anti-China protests | Cần Thơ | not in the UK (Vietnam; resolved to Cần Thơ) |
| 2014 Vietnam anti-China protests | Đồng Nai Province | not in the UK (Vietnam; resolved to Đồng Nai) |
| 2014 Vietnam anti-China protests | Hà Tĩnh Province | not in the UK (Vietnam; resolved to Hà Tĩnh province) |
| 2014 Vietnam anti-China protests | Hải Phòng | not in the UK (Vietnam; resolved to Haiphong) |
| 2014 Vietnam anti-China protests | Hà Nội | not in the UK (Vietnam; resolved to Hanoi) |
| 2014 Vietnam anti-China protests | Ho Chi Minh City | not in the UK (Vietnam, South Vietnam; resolved to Ho Chi Minh City) |
| 2014 Vietnam anti-China protests | Thái Bình Province | not in the UK (Vietnam; resolved to Thái Bình province) |
| 2014 Vietnam anti-China protests | Haikou | not in the UK (People's Republic of China; resolved to Haikou) |
| 2014 Vietnam anti-China protests | Sanya | not in the UK (People's Republic of China; resolved to Sanya) |
| 2014 Vietnam anti-China protests | Melbourne | not in the UK (Australia; resolved to Melbourne) |
| 2014 Vietnam anti-China protests | Montreal | not in the UK (Canada; resolved to Montreal) |
| 2014 Vietnam anti-China protests | Italy | not in the UK (Italy; resolved to Italy) |
| 2014 Vietnam anti-China protests | Milan | not in the UK (Italy, Kingdom of Italy, Austrian Empire, Kingdom of Sardinia, Kingdom of Italy, Italian Republic, Cisalpine Republic, Transpadane Republic, Duchy of Milan, Signoria of Milan, Spanish Empire; resolved to Milan) |
| 2014 Vietnam anti-China protests | Frankfurt | not in the UK (Francia, East Francia, Holy Roman Empire, Grand Duchy of Frankfurt, Free City of Frankfurt, German Confederation, Kingdom of Prussia, German Reich, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany, Germany; resolved to Frankfurt) |
| 2014 Vietnam anti-China protests | Warsaw | not in the UK (Poland, General Government, Second Polish Republic, Kingdom of Poland, Russian Empire, Duchy of Warsaw, Kingdom of Prussia, Polish–Lithuanian Commonwealth, Kingdom of Poland, Kingdom of Poland, Kingdom of Poland; resolved to Warsaw) |
| 2014 Vietnam anti-China protests | Houston | not in the UK (United States; resolved to Houston) |
| 2014 Vietnam anti-China protests | Orange County, California | not in the UK (United States; resolved to Orange County, California) |
| 2014 Vietnam anti-China protests | San Diego | not in the UK (United States; resolved to San Diego) |
| 2014 Vietnam anti-China protests | San Jose, California | not in the UK (United States; resolved to San Jose, California) |
| 2014 Lahore clash | Model Town, Lahore | not in the UK (Pakistan; resolved to Model Town, Lahore) |
| 2014 Lahore clash | Lahore | not in the UK (Pakistan, Dominion of Pakistan, British Raj, Mughal Empire, Sikh Empire, India; resolved to Lahore) |
| 2014 People's Climate March | New York City | not in the UK (United States; resolved to New York City) |
| 2014 Jadavpur University protests | Kolkata | not in the UK (India, British Raj, Company rule in India; resolved to Kolkata) |
| 2014 Jadavpur University protests | Delhi | not in the UK (India, British Raj, Mughal Empire, Sur Empire, Mughal Empire, Delhi Sultanate, Ghurid Empire, Chahamanas of Shakambhari, Tomaras of Delhi; resolved to Delhi) |
| 2014 Jadavpur University protests | Mumbai | not in the UK (India, Portuguese Empire, Kingdom of England, Company rule in India, British Raj; resolved to Mumbai) |
| 2014 Jadavpur University protests | Hyderabad | not in the UK (India, Golconda Sultanate, Mughal Empire, Hyderabad State; resolved to Hyderabad) |
| 2014 Jadavpur University protests | Bengaluru | not in the UK (India, Company rule in India, Bijapur Sultanate, Vijayanagara Empire; resolved to Bengaluru) |
| 2014 Jadavpur University protests | Chennai | not in the UK (India, Company rule in India, British Raj, India; resolved to Chennai) |
| 2014 Jadavpur University protests | Guwahati | not in the UK (India; resolved to Guwahati) |
| 2014 Hong Kong protests | Admiralty, Hong Kong | not in the UK (People's Republic of China; resolved to Admiralty, Hong Kong) |
| 2014 Hong Kong protests | Causeway Bay | not in the UK (People's Republic of China; resolved to Causeway Bay) |
| 2014 Hong Kong protests | Mong Kok | not in the UK (Hong Kong; resolved to Mong Kok) |
| 2014 Hong Kong protests | Tsim Sha Tsui | not in the UK (People's Republic of China; resolved to Tsim Sha Tsui) |
| 2014 Burkina Faso uprising | Ouagadougou | not in the UK (Burkina Faso, Mossi Kingdoms, French Sudan, Upper Senegal and Niger, French Upper Volta, French Ivory Coast, French Upper Volta, Republic of Upper Volta; resolved to Ouagadougou) |
| 2014 Burkina Faso uprising | Bobo-Dioulasso | not in the UK (Burkina Faso, Republic of Upper Volta, French Upper Volta, French Upper Volta; resolved to Bobo-Dioulasso) |
| 2014 Burkina Faso uprising | Ouahigouya | not in the UK (Burkina Faso; resolved to Ouahigouya) |
| 2014 Odesa clashes | Odesa | not in the UK (Russian Empire, Ukrainian People's Republic, Ukrainian People's Republic, Ukrainian Soviet Socialist Republic, Soviet Union, Kingdom of Romania, Soviet Union, Ukraine, Russian Republic, Odesa Soviet Republic; resolved to Odesa) |
| 2014 Odesa clashes | Ukraine | not in the UK (Ukraine; resolved to Ukraine) |
| 2014–2016 Oromo protests | Oromia Region | not in the UK (Ethiopia; resolved to Oromia) |
| 2014–2016 Oromo protests | Addis Ababa | not in the UK (Ethiopia; resolved to Addis Ababa) |
| 2014–2016 Oromo protests | Ambo, Ethiopia | not in the UK (Ethiopia; resolved to Ambo, Ethiopia) |
| 2014–2016 Oromo protests | Dembi Dolo | not in the UK (Ethiopia; resolved to Dembidolo) |
| 2014–2016 Oromo protests | Nekemte | not in the UK (Ethiopia; resolved to Nekemte) |
| 2014–2016 Oromo protests | Amhara Region | not in the UK (Ethiopia; resolved to Amhara Region) |
| 2014–2016 Oromo protests | Gondar | not in the UK (Ethiopia; resolved to Gondar) |
| 2014–2016 Oromo protests | Bahir Dar | not in the UK (Ethiopia; resolved to Bahir Dar) |
| 2015 Macedonian protests | Skopje | not in the UK (North Macedonia, Kingdom of Serbia, Kingdom of Yugoslavia, Ottoman Empire, Bulgaria, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia; resolved to Skopje) |
| 2015 Macedonian protests | Republic of Macedonia | not in the UK (North Macedonia; resolved to North Macedonia) |
| 2015 Macedonian protests | Bitola | not in the UK (North Macedonia, Ottoman Empire, Serbia, Kingdom of Yugoslavia, Bulgaria, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia; resolved to Bitola) |
| 2015 Macedonian protests | Kumanovo | not in the UK (North Macedonia, Ottoman Empire, Kingdom of Serbia, Kingdom of Serbs, Croats and Slovenes, Kingdom of Yugoslavia, Kingdom of Bulgaria, Democratic Federal Yugoslavia, Socialist Federal Republic of Yugoslavia; resolved to Kumanovo) |
| 2015 Macedonian protests | Ohrid | not in the UK (North Macedonia, Socialist Federal Republic of Yugoslavia, Bulgaria, Kingdom of Yugoslavia, Kingdom of Yugoslavia, Bulgaria, Kingdom of Serbia, Ottoman Empire; resolved to Ohrid) |
| 2015 Macedonian protests | Prilep | not in the UK (North Macedonia, Ottoman Empire, Kingdom of Serbs, Croats and Slovenes, Yugoslavia, Kingdom of Yugoslavia, Lordship of Prilep, Kingdom of Serbia, Byzantine Empire; resolved to Prilep) |
| 2015 Romanian protests | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| 2015 Romanian protests | Constanța | not in the UK (Romania, Ottoman Empire, Roman Empire, Byzantine Empire, First Bulgarian Empire, Byzantine Empire, Second Bulgarian Empire, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Despotate of Dobruja; resolved to Constanța) |
| 2015 Romanian protests | Timișoara | not in the UK (Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Ottoman Empire, Eastern Hungarian Kingdom, Kingdom of Serbs, Croats and Slovenes, Banat Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, First Hungarian Republic, Principality of Transylvania, Kingdom of Hungary; resolved to Timișoara) |
| 2015 Romanian protests | Craiova | not in the UK (Romania, Principality of Wallachia, Habsburg monarchy, United Principalities of Moldavia and Wallachia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Principality of Wallachia; resolved to Craiova) |
| 2015 Romanian protests | Iași | not in the UK (Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania; resolved to Iași) |
| 2015 Romanian protests | Cluj-Napoca | not in the UK (Kingdom of Romania, Kingdom of Hungary, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, Kingdom of Hungary; resolved to Cluj-Napoca) |
| 2015 Romanian protests | Galați | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia; resolved to Galați) |
| 2015 Romanian protests | Sibiu | not in the UK (Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, First Hungarian Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, Kingdom of Romania, Kingdom of Hungary; resolved to Sibiu) |
| 2015 Romanian protests | Brașov | not in the UK (Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, Romanian People's Republic, Kingdom of Romania, Socialist Republic of Romania, Romania, Kingdom of Hungary; resolved to Brașov) |
| 2015 Romanian protests | Oradea | not in the UK (Kingdom of Romania, Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Ottoman Empire, Principality of Transylvania, Eastern Hungarian Kingdom, Romanian People's Republic, Socialist Republic of Romania, Romania, First Hungarian Republic, Kingdom of Hungary, Kingdom of Hungary; resolved to Oradea) |
| 2015 Romanian protests | Suceava | not in the UK (Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Moldavia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Principality of Moldavia; resolved to Suceava) |
| 2015 Romanian protests | Focșani | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia; resolved to Focșani) |
| 2015 Romanian protests | London | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2015 Romanian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2015 Romanian protests | Madrid | not in the UK (Spain; resolved to Madrid) |
| 2015 Romanian protests | Turin | not in the UK (Italy, Kingdom of Sardinia, Duchy of Savoy, County of Savoy, March of Turin, March of Ivrea, Carolingian Empire, Kingdom of the Lombards; resolved to Turin) |
| 2015 Romanian protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| 2015 Romanian protests | New York City | not in the UK (United States; resolved to New York City) |
| 2015–2016 protests in Moldova | Chișinău | not in the UK (Moldova, Soviet Union, Kingdom of Romania, Soviet Union, Kingdom of Romania, Moldavian Democratic Republic, Russian Empire, Principality of Moldavia, Russian Republic; resolved to Chișinău) |
| 2015–2016 protests in Moldova | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| 2015–2016 protests in Moldova | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2015–2016 protests in Moldova | Vicenza | not in the UK (Italy; resolved to Vicenza) |
| 2016–2017 Zimbabwe protests | Zimbabwe | not in the UK (Zimbabwe; resolved to Zimbabwe) |
| 2017 pro-jallikattu protests | Tamil Nadu | not in the UK (India; resolved to Tamil Nadu) |
| 2017 pro-jallikattu protests | India | not in the UK (India; resolved to India) |
| 2017–2019 Romanian protests | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| 2017–2019 Romanian protests | Constanța | not in the UK (Romania, Ottoman Empire, Roman Empire, Byzantine Empire, First Bulgarian Empire, Byzantine Empire, Second Bulgarian Empire, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Despotate of Dobruja; resolved to Constanța) |
| 2017–2019 Romanian protests | Ploieşti | not in the UK (Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania; resolved to Ploiești) |
| 2017–2019 Romanian protests | Drobeta-Turnu Severin | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia; resolved to Drobeta-Turnu Severin) |
| 2017–2019 Romanian protests | Timișoara | not in the UK (Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Ottoman Empire, Eastern Hungarian Kingdom, Kingdom of Serbs, Croats and Slovenes, Banat Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, First Hungarian Republic, Principality of Transylvania, Kingdom of Hungary; resolved to Timișoara) |
| 2017–2019 Romanian protests | Craiova | not in the UK (Romania, Principality of Wallachia, Habsburg monarchy, United Principalities of Moldavia and Wallachia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Principality of Wallachia; resolved to Craiova) |
| 2017–2019 Romanian protests | Iași | not in the UK (Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania; resolved to Iași) |
| 2017–2019 Romanian protests | Cluj-Napoca | not in the UK (Kingdom of Romania, Kingdom of Hungary, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, Kingdom of Hungary; resolved to Cluj-Napoca) |
| 2017–2019 Romanian protests | Satu Mare | not in the UK (Kingdom of Hungary, First Hungarian Republic, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Principality of Transylvania, Eastern Hungarian Kingdom, Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Kingdom of Romania, Kingdom of Hungary; resolved to Satu Mare) |
| 2017–2019 Romanian protests | Baia Mare | not in the UK (Romania, Austrian Empire, Austria–Hungary, Kingdom of Hungary, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, First Hungarian Republic, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, Kingdom of Hungary; resolved to Baia Mare) |
| 2017–2019 Romanian protests | Bistrița | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Kingdom of Hungary, Kingdom of Romania, First Hungarian Republic, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, Kingdom of Hungary; resolved to Bistrița) |
| 2017–2019 Romanian protests | Galați | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia; resolved to Galați) |
| 2017–2019 Romanian protests | Suceava | not in the UK (Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Moldavia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Principality of Moldavia; resolved to Suceava) |
| 2017–2019 Romanian protests | Alba Iulia | not in the UK (Romania, Austria–Hungary, Austrian Empire, Principality of Transylvania, Habsburg monarchy, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, First Hungarian Republic, Eastern Hungarian Kingdom, Kingdom of Hungary; resolved to Alba Iulia) |
| 2017–2019 Romanian protests | Sibiu | not in the UK (Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, First Hungarian Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, Kingdom of Romania, Kingdom of Hungary; resolved to Sibiu) |
| 2017–2019 Romanian protests | Brașov | not in the UK (Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, Romanian People's Republic, Kingdom of Romania, Socialist Republic of Romania, Romania, Kingdom of Hungary; resolved to Brașov) |
| 2017–2019 Romanian protests | Oradea | not in the UK (Kingdom of Romania, Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Ottoman Empire, Principality of Transylvania, Eastern Hungarian Kingdom, Romanian People's Republic, Socialist Republic of Romania, Romania, First Hungarian Republic, Kingdom of Hungary, Kingdom of Hungary; resolved to Oradea) |
| 2017–2019 Romanian protests | Brăila | not in the UK (Kingdom of Romania, Principality of Wallachia, Ottoman Empire, United Principalities of Moldavia and Wallachia, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Brăila) |
| 2017–2019 Romanian protests | Târgu Mureș | not in the UK (Kingdom of Romania, Kingdom of Hungary, Kingdom of Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, First Hungarian Republic, Romanian People's Republic, Socialist Republic of Romania, Romania, Kingdom of Hungary; resolved to Târgu Mureș) |
| 2017–2019 Romanian protests | Bacău | not in the UK (Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania; resolved to Bacău) |
| 2017–2019 Romanian protests | Arad, Romania | not in the UK (Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Ottoman Empire, Ottoman Empire, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, First Hungarian Republic, Eastern Hungarian Kingdom, Kingdom of Hungary; resolved to Arad, Romania) |
| 2017–2019 Romanian protests | Târgoviște | not in the UK (Romania, Principality of Wallachia, United Principalities of Moldavia and Wallachia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania; resolved to Târgoviște) |
| 2017–2019 Romanian protests | Reşiţa | not in the UK (Romania, Austria–Hungary, Austrian Empire, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Kingdom of Serbs, Croats and Slovenes, Banat Republic, First Hungarian Republic, Habsburg monarchy, Ottoman Empire; resolved to Reșița) |
| 2017–2019 Romanian protests | Zalău | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Kingdom of Hungary, Kingdom of Romania, First Hungarian Republic, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, Kingdom of Hungary; resolved to Zalău) |
| 2017–2019 Romanian protests | Râmnicu Vâlcea | not in the UK (Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia, Habsburg monarchy, Principality of Wallachia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania; resolved to Râmnicu Vâlcea) |
| 2017–2019 Romanian protests | Piatra Neamț | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia; resolved to Piatra Neamț) |
| 2017–2019 Romanian protests | Deva, Romania | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, First Hungarian Republic, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, Kingdom of Hungary; resolved to Deva, Romania) |
| 2017–2019 Romanian protests | Drăgăşani | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia, Habsburg monarchy, Principality of Wallachia; resolved to Drăgășani) |
| 2017–2019 Romanian protests | Blaj | not in the UK (Kingdom of Hungary, Eastern Hungarian Kingdom, Principality of Transylvania, Habsburg monarchy, Austrian Empire, Austria–Hungary, First Hungarian Republic, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Blaj) |
| 2017–2019 Romanian protests | Slatina, Romania | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia; resolved to Slatina, Romania) |
| 2017–2019 Romanian protests | Piteşti | not in the UK (Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania; resolved to Pitești) |
| 2017–2019 Romanian protests | Caracal, Romania | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia, Habsburg monarchy, Principality of Wallachia; resolved to Caracal, Romania) |
| 2017–2019 Romanian protests | Tulcea | not in the UK (Romania, Ottoman Empire, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia; resolved to Tulcea) |
| 2017–2019 Romanian protests | Sighetu Marmației | not in the UK (Romania, First Hungarian Republic, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, Kingdom of Hungary, Kingdom of Hungary; resolved to Sighetu Marmației) |
| 2017–2019 Romanian protests | Focşani | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia; resolved to Focșani) |
| 2017–2019 Romanian protests | Mediaş | not in the UK (Romania, Austria–Hungary, Austrian Empire, Habsburg monarchy, Principality of Transylvania, Eastern Hungarian Kingdom, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, First Hungarian Republic, Kingdom of Hungary; resolved to Mediaș) |
| 2017–2019 Romanian protests | Alexandria, Romania | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia; resolved to Alexandria, Romania) |
| 2017–2019 Romanian protests | Slobozia | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia; resolved to Slobozia) |
| 2017–2019 Romanian protests | Urziceni | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Wallachia, Romania; resolved to Urziceni) |
| 2017–2019 Romanian protests | Odobeşti | not in the UK (Romania, Socialist Republic of Romania, Romanian People's Republic, Kingdom of Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia; resolved to Odobești) |
| 2017–2019 Romanian protests | Chișinău | not in the UK (Moldova, Soviet Union, Kingdom of Romania, Soviet Union, Kingdom of Romania, Moldavian Democratic Republic, Russian Empire, Principality of Moldavia, Russian Republic; resolved to Chișinău) |
| 2017–2019 Romanian protests | Melbourne | not in the UK (Australia; resolved to Melbourne) |
| 2017–2019 Romanian protests | Perth | not in the UK (Australia; resolved to Perth) |
| 2017–2019 Romanian protests | Sydney | not in the UK (Australia; resolved to Sydney) |
| 2017–2019 Romanian protests | Vienna | not in the UK (Austria, First Republic of Austria, Austria–Hungary, Republic of German-Austria, Austrian Empire, Federal State of Austria, Nazi Germany, Habsburg monarchy, Archduchy of Austria, Duchy of Austria, Margraviate of Austria, Duchy of Bavaria, Allied-occupied Austria; resolved to Vienna) |
| 2017–2019 Romanian protests | Linz | not in the UK (Austria, Austria–Hungary; resolved to Linz) |
| 2017–2019 Romanian protests | Salzburg | not in the UK (Austria, Austrian Empire, Kingdom of Bavaria, Austrian Empire, Austria–Hungary, First Republic of Austria, Federal State of Austria, Nazi Germany, Prince-Archbishopric of Salzburg; resolved to Salzburg) |
| 2017–2019 Romanian protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2017–2019 Romanian protests | Toronto | not in the UK (Canada; resolved to Toronto) |
| 2017–2019 Romanian protests | Montreal | not in the UK (Canada; resolved to Montreal) |
| 2017–2019 Romanian protests | Quebec City | not in the UK (Canada; resolved to Quebec City) |
| 2017–2019 Romanian protests | Prague | not in the UK (Czech Republic, Czechoslovakia, Austria–Hungary, Austrian Empire, Kingdom of Bohemia, Duchy of Bohemia, Czechoslovakia, Protectorate of Bohemia and Moravia, Bohemia, Holy Roman Empire; resolved to Prague) |
| 2017–2019 Romanian protests | Brno | not in the UK (Czech Republic, Czechoslovakia, Protectorate of Bohemia and Moravia, Czechoslovakia, Austria–Hungary, Austrian Empire, Habsburg monarchy, Lands of the Bohemian Crown; resolved to Brno) |
| 2017–2019 Romanian protests | Copenhagen | not in the UK (Denmark, Kingdom of Denmark; resolved to Copenhagen) |
| 2017–2019 Romanian protests | Aarhus | not in the UK (Denmark; resolved to Aarhus) |
| 2017–2019 Romanian protests | Aalborg | not in the UK (Denmark; resolved to Aalborg) |
| 2017–2019 Romanian protests | Helsinki | not in the UK (Finland, Russian Empire, Sweden, Finnish Socialist Workers' Republic; resolved to Helsinki) |
| 2017–2019 Romanian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2017–2019 Romanian protests | Marseille | not in the UK (France; resolved to Marseille) |
| 2017–2019 Romanian protests | Bordeaux | not in the UK (France; resolved to Bordeaux) |
| 2017–2019 Romanian protests | Lyon | not in the UK (France, Roman Republic, Roman Empire, Western Roman Empire, Kingdom of the Burgundians, Francia, West Francia, Kingdom of France, French First Republic, First French Empire, France, Vichy France; resolved to Lyon) |
| 2017–2019 Romanian protests | Montpellier | not in the UK (France; resolved to Montpellier) |
| 2017–2019 Romanian protests | Grenoble | not in the UK (France; resolved to Grenoble) |
| 2017–2019 Romanian protests | Toulouse | not in the UK (France; resolved to Toulouse) |
| 2017–2019 Romanian protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| 2017–2019 Romanian protests | Hamburg | not in the UK (Holy Roman Empire, Hamburg, First French Empire, German Confederation, North German Confederation, German Empire, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany; resolved to Hamburg) |
| 2017–2019 Romanian protests | Frankfurt | not in the UK (Francia, East Francia, Holy Roman Empire, Grand Duchy of Frankfurt, Free City of Frankfurt, German Confederation, Kingdom of Prussia, German Reich, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany, Germany; resolved to Frankfurt) |
| 2017–2019 Romanian protests | Stuttgart | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Württemberg, Electorate of Württemberg, Duchy of Württemberg; resolved to Stuttgart) |
| 2017–2019 Romanian protests | Bonn | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Prussia, France, Electorate of Cologne; resolved to Bonn) |
| 2017–2019 Romanian protests | Munich | not in the UK (Germany, West Germany, allied-occupied Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Bavaria, Electorate of Bavaria, Duchy of Bavaria; resolved to Munich) |
| 2017–2019 Romanian protests | Heidelberg | not in the UK (Germany, West Germany, allied-occupied Germany, Nazi Germany, Weimar Republic, German Empire, Grand Duchy of Baden, Electorate of Baden, Electoral Palatinate, Duchy of Franconia, Electoral Palatinate, Republic of Baden; resolved to Heidelberg) |
| 2017–2019 Romanian protests | Cologne | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Prussia, First French Empire, Holy Roman Empire, Electorate of Cologne, East Francia, Francia, allied-occupied Germany, West Germany, Western Roman Empire, Roman Empire, Germany; resolved to Cologne) |
| 2017–2019 Romanian protests | Freiburg | not in the UK (Germany, French occupation zone in Germany, Grand Duchy of Baden, Electorate of Baden, German Reich, Germany; resolved to Freiburg im Breisgau) |
| 2017–2019 Romanian protests | Nuremberg | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Bavaria, Electorate of Bavaria, Duchy of Bavaria, West Germany, allied-occupied Germany; resolved to Nuremberg) |
| 2017–2019 Romanian protests | Tbilisi | not in the UK (Georgia, Soviet Union, Transcaucasian Socialist Federative Soviet Republic, Democratic Republic of Georgia, Transcaucasian Democratic Federative Republic, Transcaucasian Commissariat, Russian Republic, Russian Empire, Kingdom of Kartli-Kakheti, Kingdom of Kartli, Kingdom of Georgia; resolved to Tbilisi) |
| 2017–2019 Romanian protests | Athens | not in the UK (Greece, Roman Empire, Byzantine Empire, Duchy of Athens, Ottoman Empire, First Hellenic Republic, Classical Athens, Kingdom of Greece, Third Hellenic Republic; resolved to Athens) |
| 2017–2019 Romanian protests | Thessaloniki | not in the UK (Greece, Ottoman Empire, Empire of Nicaea, Byzantine Empire, Despotate of Epirus, Kingdom of Thessalonica, Republic of Venice, Byzantine Empire, Roman Empire, Roman Republic, Macedonia, Macedonia; resolved to Thessaloniki) |
| 2017–2019 Romanian protests | Budapest | not in the UK (Hungary, Kingdom of Hungary, Provisional Goverment of the Republic of Hungary, Hungarian Soviet Republic, First Hungarian Republic, Austria–Hungary, First Hungarian Republic, Second Hungarian Republic, Hungarian People's Republic; resolved to Budapest) |
| 2017–2019 Romanian protests | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2017–2019 Romanian protests | Tel Aviv | not in the UK (Israel, Mandatory Palestine, Occupied Enemy Territory Administration, Ottoman Empire; resolved to Tel Aviv) |
| 2017–2019 Romanian protests | Rome | not in the UK (Italy, Papal States, Kingdom of Italy, Ostrogothic Kingdom, Byzantine Empire, Kingdom of Italy, Roman Kingdom, Roman Republic, Roman Empire, Western Roman Empire, Vatican City; resolved to Rome) |
| 2017–2019 Romanian protests | Milan | not in the UK (Italy, Kingdom of Italy, Austrian Empire, Kingdom of Sardinia, Kingdom of Italy, Italian Republic, Cisalpine Republic, Transpadane Republic, Duchy of Milan, Signoria of Milan, Spanish Empire; resolved to Milan) |
| 2017–2019 Romanian protests | Turin | not in the UK (Italy, Kingdom of Sardinia, Duchy of Savoy, County of Savoy, March of Turin, March of Ivrea, Carolingian Empire, Kingdom of the Lombards; resolved to Turin) |
| 2017–2019 Romanian protests | Verona | not in the UK (Italy; resolved to Verona) |
| 2017–2019 Romanian protests | Bologna | not in the UK (Italy, Papal States, Holy Roman Empire, Kingdom of Sardinia; resolved to Bologna) |
| 2017–2019 Romanian protests | Luxembourg City | not in the UK (Luxembourg; resolved to Luxembourg City) |
| 2017–2019 Romanian protests | Valletta | not in the UK (Malta; resolved to Valletta) |
| 2017–2019 Romanian protests | Amsterdam | not in the UK (Netherlands, Reichskommissariat Niederlande, Netherlands, United Kingdom of the Netherlands, Sovereign Principality of the United Netherlands, France, Kingdom of Holland, Batavian Republic, Dutch Republic, Habsburg Netherlands, Burgundian Netherlands, County of Holland; resolved to Amsterdam) |
| 2017–2019 Romanian protests | Haugesund | not in the UK (Norway; resolved to Haugesund) |
| 2017–2019 Romanian protests | Ålesund | not in the UK (Norway; resolved to Ålesund) |
| 2017–2019 Romanian protests | Kraków | not in the UK (Poland, General Government, Second Polish Republic, Grand Duchy of Cracow, Free City of Kraków, Duchy of Warsaw, Austrian Empire, Habsburg monarchy, Polish–Lithuanian Commonwealth, Kingdom of Poland, Kingdom of Poland, Duchy of Kraków; resolved to Kraków) |
| 2017–2019 Romanian protests | Madrid | not in the UK (Spain; resolved to Madrid) |
| 2017–2019 Romanian protests | Barcelona | not in the UK (Spain; resolved to Barcelona) |
| 2017–2019 Romanian protests | Valencia | not in the UK (Spain, Crown of Aragon; resolved to Valencia) |
| 2017–2019 Romanian protests | Zaragoza | not in the UK (Spain; resolved to Zaragoza) |
| 2017–2019 Romanian protests | Bilbao | not in the UK (Spain; resolved to Bilbao) |
| 2017–2019 Romanian protests | Ibiza | not in the UK (Spain; resolved to Ibiza) |
| 2017–2019 Romanian protests | Palma de Mallorca | not in the UK (Spain; resolved to Palma de Mallorca) |
| 2017–2019 Romanian protests | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| 2017–2019 Romanian protests | Gothenburg | not in the UK (Sweden; resolved to Gothenburg) |
| 2017–2019 Romanian protests | Zürich | not in the UK (Switzerland, Old Swiss Confederacy, Helvetic Republic, Switzerland; resolved to Zurich) |
| 2017–2019 Romanian protests | London | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Birmingham | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Leicester | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Glasgow | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Manchester | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Edinburgh | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Leeds | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Cambridge | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Oxford | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Bristol | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Cardiff | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Newcastle upon Tyne | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2017–2019 Romanian protests | Washington D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| 2017–2019 Romanian protests | New York City | not in the UK (United States; resolved to New York City) |
| 2017–2019 Romanian protests | Chicago | not in the UK (United States; resolved to Chicago) |
| 2017–2019 Romanian protests | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2017–2019 Romanian protests | Seattle | not in the UK (United States; resolved to Seattle) |
| 2017–2019 Romanian protests | San Francisco | not in the UK (United States; resolved to San Francisco) |
| 2017–2019 Romanian protests | San Diego | not in the UK (United States; resolved to San Diego) |
| 2017–2019 Romanian protests | Dallas | not in the UK (United States; resolved to Dallas) |
| 2017–2019 Romanian protests | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| 2017–2019 Romanian protests | Antarctica | not in the UK (no country on Wikidata; resolved to Antarctica) |
| 2017 Belarusian protests | Minsk | not in the UK (Belarus, Russian Empire, Belarusian People's Republic, Grand Duchy of Lithuania, Second Polish Republic, Soviet Union, Principality of Minsk, Socialist Soviet Republic of Byelorussia, Lithuanian–Byelorussian Soviet Socialist Republic, Soviet Union, Reichskommissariat Ostland, Soviet Union; resolved to Minsk) |
| 2017 Belarusian protests | Belarus | not in the UK (Belarus; resolved to Belarus) |
| 2017 Belarusian protests | Gomel | not in the UK (Belarus, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire; resolved to Gomel) |
| 2017 Belarusian protests | Mogilev | not in the UK (Belarus, Soviet Union, Russian Empire, Russian Republic; resolved to Mogilev) |
| 2017 Belarusian protests | Vitebsk | not in the UK (Belarus, Soviet Union, Soviet Union, Russian Republic, Russian Socialist Federative Soviet Republic, Russian Empire, Polish–Lithuanian Commonwealth, Grand Duchy of Lithuania; resolved to Vitebsk) |
| 2017 Belarusian protests | Grodno | not in the UK (Belarus, Soviet Union, Nazi Germany, Soviet Union, Second Polish Republic, Russian Socialist Federative Soviet Republic, Second Polish Republic, Belarusian People's Republic, Ober Ost, Russian Empire, Polish–Lithuanian Commonwealth, Grand Duchy of Lithuania, Principality of Goroden; resolved to Grodno) |
| 2017 Belarusian protests | Brest, Belarus | not in the UK (Belarus, Soviet Union, Reichskommissariat Ukraine, Soviet Union, Second Polish Republic, Soviet Union, Lithuanian–Byelorussian Soviet Socialist Republic, Second Polish Republic, Soviet Union, Belarusian People's Republic, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire, Polish–Lithuanian Commonwealth, Grand Duchy of Lithuania; resolved to Brest, Belarus) |
| 2017–2018 Russian protests | Moscow | not in the UK (Duchy of Moscow, Grand Principality of Moscow, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Moscow) |
| 2017–2018 Russian protests | Saint-Petersburg | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Empire, Russian Republic, Tsardom of Russia; resolved to Saint Petersburg) |
| 2017–2018 Russian protests | Novosibirsk | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire; resolved to Novosibirsk) |
| 2017–2018 Russian protests | Yekaterinburg | not in the UK (Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Yekaterinburg) |
| 2017–2018 Russian protests | Nizhny Novgorod | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire, Tsardom of Russia, Grand Principality of Moscow, Principality of Suzdal—Nizhny Novgorod, Principality of Gorodets, Grand Principality of Vladimir, Principality of Suzdal; resolved to Nizhny Novgorod) |
| 2017–2018 Russian protests | Kazan | not in the UK (Russia, Soviet Union, Russian Empire, Khanate of Qazan, Russian Socialist Federative Soviet Republic, Tsardom of Russia, Volga Bulgaria, Golden Horde; resolved to Kazan) |
| 2017–2018 Russian protests | Chelyabinsk | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire; resolved to Chelyabinsk) |
| 2017–2018 Russian protests | Omsk | not in the UK (Russia, Russian Socialist Federative Soviet Republic, Russian State, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Omsk) |
| 2017–2018 Russian protests | Samara | not in the UK (Russia, Soviet Union, Russian Empire, Tsardom of Russia, Russian Socialist Federative Soviet Republic, Russian Republic; resolved to Samara) |
| 2017–2018 Russian protests | Rostov-on-Don | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire; resolved to Rostov-on-Don) |
| 2017–2018 Russian protests | Ufa | not in the UK (Russia, Soviet Union, Russian Empire, Tsardom of Russia; resolved to Ufa) |
| 2017–2018 Russian protests | Krasnoyarsk | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Krasnoyarsk) |
| 2017–2018 Russian protests | Perm, Russia | not in the UK (Russia, Soviet Union, Russian Empire, Russian Socialist Federative Soviet Republic, Russian Republic, Provisional All-Russian Government; resolved to Perm, Russia) |
| 2017–2018 Russian protests | Voronezh | not in the UK (Tsardom of Russia, Russian Empire, Soviet Union, Russia; resolved to Voronezh) |
| 2017–2018 Russian protests | Volgograd | not in the UK (Russia, Soviet Union, Russian Empire, Tsardom of Russia; resolved to Volgograd) |
| 2017–2018 Russian protests | Krasnodar | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire, Kuban People's Republic, South Russia; resolved to Krasnodar) |
| 2017–2018 Russian protests | Saratov | not in the UK (Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Saratov) |
| 2017–2018 Russian protests | Tyumen | not in the UK (Russia, Soviet Union, Russian Empire, Russian Socialist Federative Soviet Republic, Tsardom of Russia; resolved to Tyumen) |
| 2017–2018 Russian protests | Tolyatti | not in the UK (Russia, Soviet Union, Russian Empire; resolved to Tolyatti) |
| 2017–2018 Russian protests | Izhevsk | not in the UK (Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Izhevsk) |
| 2017–2018 Russian protests | Barnaul | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Barnaul) |
| 2017–2018 Russian protests | Ulyanovsk | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire, Tsardom of Russia; resolved to Ulyanovsk) |
| 2017–2018 Russian protests | Irkutsk | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Irkutsk) |
| 2017–2018 Russian protests | Khabarovsk | not in the UK (Russia, Soviet Union, Russian Empire; resolved to Khabarovsk) |
| 2017–2018 Russian protests | Yaroslavl | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Empire, Russian Republic, Tsardom of Russia, Grand Duchy of Yaroslavl; resolved to Yaroslavl) |
| 2017–2018 Russian protests | Vladivostok | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire; resolved to Vladivostok) |
| 2017–2018 Russian protests | Makhachkala | not in the UK (Russian Empire, Soviet Union, Russia; resolved to Makhachkala) |
| 2017–2018 Russian protests | Tomsk | not in the UK (Tsardom of Russia, Russian Empire, Soviet Union, Russia; resolved to Tomsk) |
| 2017–2018 Russian protests | Orenburg | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire; resolved to Orenburg) |
| 2017–2018 Russian protests | Kemerovo | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia, Russian State, Siberian Republic, Russian Socialist Federative Soviet Republic; resolved to Kemerovo) |
| 2017–2018 Russian protests | Novokuznetsk | not in the UK (Russia, Soviet Union, Russian Empire, Tsardom of Russia; resolved to Novokuznetsk) |
| 2017–2018 Russian protests | Ryazan | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia, Russian Socialist Federative Soviet Republic; resolved to Ryazan) |
| 2017–2018 Russian protests | Astrakhan | not in the UK (Russia, Soviet Union, Russian Socialist Federative Soviet Republic, Russian Republic, Russian Empire, Tsardom of Russia; resolved to Astrakhan) |
| 2017–2018 Russian protests | Naberezhnye Chelny | not in the UK (Russia, Soviet Union, Russian Empire, Tsardom of Russia; resolved to Naberezhnye Chelny) |
| 2017–2018 Russian protests | Penza | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Penza) |
| 2017–2018 Russian protests | Lipetsk | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Lipetsk) |
| 2017–2018 Russian protests | Cheboksary | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Cheboksary) |
| 2017–2018 Russian protests | Tula, Russia | not in the UK (Russia, Russian Socialist Federative Soviet Republic, Russian Empire, Tsardom of Russia, Russian Republic, Soviet Union; resolved to Tula, Russia) |
| 2017–2018 Russian protests | Kaliningrad | not in the UK (State of the Teutonic Order, Duchy of Prussia, Kingdom of Prussia, Nazi Germany, Soviet Union, Russia; resolved to Kaliningrad) |
| 2017–2018 Russian protests | Balashikha | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Balashikha) |
| 2017–2018 Russian protests | Kursk | not in the UK (Russia, Soviet Union, Russian Empire, Tsardom of Russia, Russia; resolved to Kursk) |
| 2017–2018 Russian protests | Sevastopol | not in the UK (Ottoman Empire, Russian Empire, Soviet Union, Ukraine, Republic of Crimea, Russian Socialist Federative Soviet Republic, Russia; resolved to Sevastopol) |
| 2017–2018 Russian protests | Sochi | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Sochi) |
| 2017–2018 Russian protests | Stavropol | not in the UK (Russia, Soviet Union, Russian Empire; resolved to Stavropol) |
| 2017–2018 Russian protests | Ulan-Ude | not in the UK (Russia, Soviet Union, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic; resolved to Ulan-Ude) |
| 2017–2018 Russian protests | Tver | not in the UK (Russia, Principality of Tver, Soviet Union, Russian Empire, Tsardom of Russia; resolved to Tver) |
| 2017–2018 Russian protests | Magnitogorsk | not in the UK (Russia, Soviet Union; resolved to Magnitogorsk) |
| 2017–2018 Russian protests | Ivanovo | not in the UK (Russia, Russian Empire; resolved to Ivanovo) |
| 2017–2018 Russian protests | Bryansk | not in the UK (Russia, Soviet Union, Russian Empire, Principality of Chernigov, Briansk Principality, Principality of Smolensk, Grand Duchy of Lithuania, Tsardom of Russia; resolved to Bryansk) |
| 2017–2018 Russian protests | Belgorod | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Belgorod) |
| 2017–2018 Russian protests | Surgut | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia; resolved to Surgut) |
| 2017–2018 Russian protests | Vladimir, Russia | not in the UK (Russia, Russian Empire, Soviet Union, Tsardom of Russia, Grand Principality of Moscow, Grand Principality of Vladimir; resolved to Vladimir, Russia) |
| 2017–2018 Russian protests | Nizhny Tagil | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Nizhny Tagil) |
| 2017 Venezuelan protests | Venezuela | not in the UK (no country on Wikidata; resolved to Venezuela) |
| 2017 CUHK democracy wall standoff | Hong Kong | not in the UK (People's Republic of China, British Empire; resolved to Hong Kong) |
| 2017–2018 Iranian protests | Iran | not in the UK (Iran; resolved to Iran) |
| 2018 Bangladesh road-safety protests | Bangladesh | not in the UK (Bangladesh; resolved to Bangladesh) |
| 2018 Alabama Coca-Cola strike | Leroy, Alabama | not in the UK (United States; resolved to Leroy, Alabama) |
| 2018 Alabama Coca-Cola strike | Mobile, Alabama | not in the UK (United States; resolved to Mobile, Alabama) |
| 2018 Alabama Coca-Cola strike | Robertsdale, Alabama | not in the UK (United States; resolved to Robertsdale, Alabama) |
| 2018 Alabama Coca-Cola strike | Ocean Springs, Mississippi | not in the UK (United States; resolved to Ocean Springs, Mississippi) |
| 2015 May Day protests in the Maldives | Malé | not in the UK (Maldives; resolved to Malé) |
| 2018–2019 Gaza border protests | Gaza Strip | not in the UK (Palestine, United Arab Republic, Israeli-occupied territories, Palestinian National Authority, occupation of the Gaza Strip by the United Arab Republic; resolved to Gaza Strip) |
| 2018–2020 Serbian protests | Serbia | not in the UK (Serbia; resolved to Serbia) |
| 2018 Nicaraguan protests | Nicaragua | not in the UK (Nicaragua; resolved to Nicaragua) |
| 2019 Stop & Shop strike | New England | not in the UK (United States; resolved to New England) |
| 2019 Stop & Shop strike | Massachusetts | not in the UK (United States; resolved to Massachusetts) |
| 2019 Stop & Shop strike | Rhode Island | not in the UK (United States; resolved to Rhode Island) |
| 2019 Stop & Shop strike | Connecticut | not in the UK (United States; resolved to Connecticut) |
| 2019 Lyft and Uber drivers' strikes | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2019 Lyft and Uber drivers' strikes | San Diego | not in the UK (United States; resolved to San Diego) |
| 2019 Lyft and Uber drivers' strikes | San Francisco | not in the UK (United States; resolved to San Francisco) |
| 2019 Lyft and Uber drivers' strikes | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| 2019 Lyft and Uber drivers' strikes | Chicago | not in the UK (United States; resolved to Chicago) |
| 2019 Lyft and Uber drivers' strikes | Minneapolis | not in the UK (United States; resolved to Minneapolis) |
| 2019 Lyft and Uber drivers' strikes | Philadelphia | not in the UK (United States; resolved to Philadelphia) |
| 2019 Lyft and Uber drivers' strikes | Stamford, Connecticut | not in the UK (United States; resolved to Stamford, Connecticut) |
| 2019 Lyft and Uber drivers' strikes | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| 2019 Papua protests | Papua (province) | not in the UK (Indonesia; resolved to Papua (province)) |
| 2019 Papua protests | West Papua (province) | not in the UK (Indonesia; resolved to West Papua (province)) |
| 2019 Egyptian protests | Egypt | not in the UK (Egypt; resolved to Egypt) |
| 2019 Indonesian protests and riots | Indonesia | not in the UK (Indonesia; resolved to Indonesia) |
| 2019–2020 Iranian protests | Iran | not in the UK (Iran; resolved to Iran) |
| 2019–2020 Maltese protests | Malta | not in the UK (Malta, Kingdom of Great Britain; resolved to Malta) |
| 2019–2020 Maltese protests | Belgium | not in the UK (Belgium; resolved to Belgium) |
| 2019–2020 Maltese protests | Spain | not in the UK (Spain; resolved to Spain) |
| 2019–2020 Maltese protests | Netherlands | not in the UK (Kingdom of the Netherlands; resolved to Netherlands) |
| 2019–2020 Maltese protests | Germany | not in the UK (Germany; resolved to Germany) |
| 2019 Montenegrin anti-corruption protests | Podgorica | not in the UK (Montenegro, Serbia and Montenegro, Socialist Federal Republic of Yugoslavia, Kingdom of Yugoslavia, Kingdom of Montenegro, Principality of Montenegro, Federal Republic of Yugoslavia, Montenegro; resolved to Podgorica) |
| 2019 Montenegrin anti-corruption protests | Montenegro | not in the UK (Montenegro; resolved to Montenegro) |
| 2018 Vietnam protests | Ho Chi Minh City | not in the UK (Vietnam, South Vietnam; resolved to Ho Chi Minh City) |
| 2018 Vietnam protests | Hanoi | not in the UK (Vietnam; resolved to Hanoi) |
| 2018 Vietnam protests | Da Nang | not in the UK (Vietnam; resolved to Da Nang) |
| 2018 Vietnam protests | Binh Thuan Province | not in the UK (Vietnam; resolved to Bình Thuận province) |
| 2018 Vietnam protests | Ha Tinh Province | not in the UK (Vietnam; resolved to Hà Tĩnh province) |
| 2018 Vietnam protests | Khanh Hoa Province | not in the UK (Vietnam; resolved to Khánh Hòa province) |
| 2018 Vietnam protests | Tay Ninh Province | not in the UK (Vietnam; resolved to Tây Ninh province) |
| 2019–2024 Amaravati protests | Andhra Pradesh | not in the UK (India; resolved to Andhra Pradesh) |
| 2019–2024 Amaravati protests | India | not in the UK (India; resolved to India) |
| 2020–2021 Belarusian protests | Belarus | not in the UK (Belarus; resolved to Belarus) |
| 2020 Bath shipbuilders' strike | Bath, Maine | not in the UK (United States; resolved to Bath, Maine) |
| 2020 Bath shipbuilders' strike | Maine | not in the UK (United States; resolved to Maine) |
| 2020 Bath shipbuilders' strike | United States | not in the UK (United States; resolved to United States) |
| 2020–2022 Serbian protests | Nikola Pašić Square | not in the UK (Serbia; resolved to Nikola Pašić Square) |
| 2020–2022 Serbian protests | Belgrade | not in the UK (Kingdom of Hungary, Ottoman Empire, Habsburg monarchy, Ottoman Empire, Principality of Serbia, Kingdom of Serbia, Kingdom of Yugoslavia, Territory of the Military Commander in Serbia, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia, Federal Republic of Yugoslavia, Serbia and Montenegro, Serbia, Federal People's Republic of Yugoslavia, Ottoman Empire, Revolutionary Serbia; resolved to Belgrade) |
| 2020–2022 Serbian protests | Novi Sad | not in the UK (Serbia, Serbia and Montenegro, Federal Republic of Yugoslavia, Socialist Federal Republic of Yugoslavia, Kingdom of Hungary, Kingdom of Yugoslavia, First Hungarian Republic, Austria–Hungary, Austrian Empire, Habsburg monarchy; resolved to Novi Sad) |
| 2020–2022 Serbian protests | Niš | not in the UK (Serbia, Serbia and Montenegro, Federal Republic of Yugoslavia, Socialist Federal Republic of Yugoslavia, Roman Empire, Byzantine Empire, First Bulgarian Empire, Byzantine Empire, Kingdom of Serbia, Serbian Empire, Moravian Serbia, Ottoman Empire, Serbian Despotate, Ottoman Empire, Kingdom of Serbia, Kingdom of Yugoslavia; resolved to Niš) |
| 2020–2022 Serbian protests | Smederevo | not in the UK (Serbia; resolved to Smederevo) |
| 2020–2022 Serbian protests | Kragujevac | not in the UK (Serbia, Yugoslavia; resolved to Kragujevac) |
| 2020–2022 Serbian protests | Kruševac | not in the UK (Serbia, Serbia and Montenegro, Federal Republic of Yugoslavia, Socialist Federal Republic of Yugoslavia, Democratic Federal Yugoslavia, Axis occupation of Serbia, Kingdom of Yugoslavia, Kingdom of Serbia, Principality of Serbia, Ottoman Empire, Serbian Despotate, Moravian Serbia; resolved to Kruševac) |
| 2020–2022 Serbian protests | Kraljevo | not in the UK (Serbia, Serbia and Montenegro, Yugoslavia; resolved to Kraljevo) |
| 2020–2022 Serbian protests | Čačak | not in the UK (Serbia; resolved to Čačak) |
| 2020–2022 Serbian protests | Zrenjanin | not in the UK (Serbia, Serbia and Montenegro, Federal Republic of Yugoslavia, Socialist Federal Republic of Yugoslavia, Territory of the Military Commander in Serbia, Kingdom of Yugoslavia, Kingdom of Serbs, Croats and Slovenes, Kingdom of Serbia, Kingdom of Hungary, Austrian Empire, Habsburg monarchy, Ottoman Empire; resolved to Zrenjanin) |
| 2020–2022 Serbian protests | Vranje | not in the UK (Serbia; resolved to Vranje) |
| 2020–2022 Serbian protests | New York City | not in the UK (United States; resolved to New York City) |
| 2020–2022 Serbian protests | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| 2020–2022 Serbian protests | Vancouver | not in the UK (Canada; resolved to Vancouver) |
| 2020–2022 Serbian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2020–2022 Serbian protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| 2020–2022 Serbian protests | Hamburg | not in the UK (Holy Roman Empire, Hamburg, First French Empire, German Confederation, North German Confederation, German Empire, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany; resolved to Hamburg) |
| 2020–2022 Serbian protests | Prague | not in the UK (Czech Republic, Czechoslovakia, Austria–Hungary, Austrian Empire, Kingdom of Bohemia, Duchy of Bohemia, Czechoslovakia, Protectorate of Bohemia and Moravia, Bohemia, Holy Roman Empire; resolved to Prague) |
| 2020–2022 Serbian protests | Amsterdam | not in the UK (Netherlands, Reichskommissariat Niederlande, Netherlands, United Kingdom of the Netherlands, Sovereign Principality of the United Netherlands, France, Kingdom of Holland, Batavian Republic, Dutch Republic, Habsburg Netherlands, Burgundian Netherlands, County of Holland; resolved to Amsterdam) |
| 2020–2022 Serbian protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2020–2022 Serbian protests | Zürich | not in the UK (Switzerland, Old Swiss Confederacy, Helvetic Republic, Switzerland; resolved to Zurich) |
| 2020–2022 Serbian protests | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| 2020–2022 Serbian protests | Helsinki | not in the UK (Finland, Russian Empire, Sweden, Finnish Socialist Workers' Republic; resolved to Helsinki) |
| 2020–2022 Serbian protests | Oslo | not in the UK (Norway, Union between Sweden and Norway, Kingdom of Norway, Denmark–Norway; resolved to Oslo) |
| 2020–2022 Serbian protests | Luxembourg | not in the UK (Luxembourg; resolved to Luxembourg) |
| 2020–2022 Serbian protests | Vienna | not in the UK (Austria, First Republic of Austria, Austria–Hungary, Republic of German-Austria, Austrian Empire, Federal State of Austria, Nazi Germany, Habsburg monarchy, Archduchy of Austria, Duchy of Austria, Margraviate of Austria, Duchy of Bavaria, Allied-occupied Austria; resolved to Vienna) |
| 2020–2021 Bulgarian protests | Bulgaria | not in the UK (Bulgaria; resolved to Bulgaria) |
| 2020–2021 Bulgarian protests | Sofia | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire, Roman Empire; resolved to Sofia) |
| 2020–2021 Bulgarian protests | Burgas | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Eastern Rumelia, Ottoman Empire; resolved to Burgas) |
| 2020–2021 Bulgarian protests | Plovdiv | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Eastern Rumelia, Ottoman Empire; resolved to Plovdiv) |
| 2020–2021 Bulgarian protests | Varna, Bulgaria | not in the UK (Bulgaria, Ottoman Empire, Principality of Bulgaria, Kingdom of Bulgaria, People's Republic of Bulgaria; resolved to Varna, Bulgaria) |
| 2020–2021 Bulgarian protests | Blagoevgrad | not in the UK (Bulgaria, Ottoman Empire, Kingdom of Bulgaria, People's Republic of Bulgaria, Occupation zone of the Balkan Union; resolved to Blagoevgrad) |
| 2020–2021 Bulgarian protests | Veliko Tarnovo | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire, Second Bulgarian Empire, Byzantine Empire; resolved to Veliko Tarnovo) |
| 2020–2021 Bulgarian protests | Gabrovo | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire; resolved to Gabrovo) |
| 2020–2021 Bulgarian protests | Kyustendil | not in the UK (Bulgaria, Ottoman Empire; resolved to Kyustendil) |
| 2020–2021 Bulgarian protests | Lovech | not in the UK (Bulgaria, Ottoman Empire; resolved to Lovech) |
| 2020–2021 Bulgarian protests | Vratsa | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire; resolved to Vratsa) |
| 2020–2021 Bulgarian protests | Haskovo | not in the UK (Bulgaria, Eastern Rumelia, Ottoman Empire, Principality of Bulgaria, Kingdom of Bulgaria, People's Republic of Bulgaria; resolved to Haskovo) |
| 2020–2021 Bulgarian protests | Pazardzhik | not in the UK (Bulgaria, Eastern Rumelia, Ottoman Empire, Principality of Bulgaria, Kingdom of Bulgaria, People's Republic of Bulgaria; resolved to Pazardzhik) |
| 2020–2021 Bulgarian protests | Ruse, Bulgaria | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire; resolved to Ruse, Bulgaria) |
| 2020–2021 Bulgarian protests | Silistra | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Romania, Kingdom of Bulgaria, Kingdom of Romania, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire, Principality of Wallachia, Despotate of Dobruja, Second Bulgarian Empire, Byzantine Empire, First Bulgarian Empire, Byzantine Empire, Kievan Rus', First Bulgarian Empire, Byzantine Empire, Roman Empire; resolved to Silistra) |
| 2020–2021 Bulgarian protests | Sliven | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Eastern Rumelia, Ottoman Empire; resolved to Sliven) |
| 2020–2021 Bulgarian protests | Smolyan | not in the UK (Bulgaria, Occupation zone of the Balkan Union, Ottoman Empire; resolved to Smolyan) |
| 2020–2021 Bulgarian protests | Yambol | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Eastern Rumelia, Ottoman Empire; resolved to Yambol) |
| 2020–2021 Bulgarian protests | Karlovo | not in the UK (Bulgaria, Ottoman Empire, Eastern Rumelia; resolved to Karlovo) |
| 2020–2021 Bulgarian protests | Stara Zagora | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Eastern Rumelia, Ottoman Empire; resolved to Stara Zagora) |
| 2020–2021 Bulgarian protests | Bankya | not in the UK (Bulgaria, Ottoman Empire, Principality of Bulgaria, Kingdom of Bulgaria, People's Republic of Bulgaria; resolved to Bankya) |
| 2020–2021 Bulgarian protests | Oxford | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2020–2021 Bulgarian protests | Exeter | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2020–2021 Bulgarian protests | Manchester | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2020–2021 Bulgarian protests | Birmingham | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2020–2021 Bulgarian protests | Brighton and Hove | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2020–2021 Bulgarian protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| 2020–2021 Bulgarian protests | Cologne | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Prussia, First French Empire, Holy Roman Empire, Electorate of Cologne, East Francia, Francia, allied-occupied Germany, West Germany, Western Roman Empire, Roman Empire, Germany; resolved to Cologne) |
| 2020–2021 Bulgarian protests | Nuremberg | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Bavaria, Electorate of Bavaria, Duchy of Bavaria, West Germany, allied-occupied Germany; resolved to Nuremberg) |
| 2020–2021 Bulgarian protests | Munich | not in the UK (Germany, West Germany, allied-occupied Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Bavaria, Electorate of Bavaria, Duchy of Bavaria; resolved to Munich) |
| 2020–2021 Bulgarian protests | Frankfurt am Main | not in the UK (Francia, East Francia, Holy Roman Empire, Grand Duchy of Frankfurt, Free City of Frankfurt, German Confederation, Kingdom of Prussia, German Reich, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany, Germany; resolved to Frankfurt) |
| 2020–2021 Bulgarian protests | Mannheim | not in the UK (Germany, German Empire, allied-occupied Germany, West Germany, Nazi Germany, Weimar Republic, Grand Duchy of Baden, Confederation of the Rhine, Electoral Palatinate, Electorate of Baden; resolved to Mannheim) |
| 2020–2021 Bulgarian protests | Hamburg | not in the UK (Holy Roman Empire, Hamburg, First French Empire, German Confederation, North German Confederation, German Empire, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany; resolved to Hamburg) |
| 2020–2021 Bulgarian protests | Münster | not in the UK (Germany, Kingdom of Prussia, France, Grand Duchy of Berg, Kingdom of Prussia, Prince-Bishopric of Münster; resolved to Münster) |
| 2020–2021 Bulgarian protests | The Hague | not in the UK (Netherlands, Kingdom of Holland, First French Empire, Batavian Republic, Dutch Republic, Spanish Empire, Habsburg Netherlands, County of Holland; resolved to The Hague) |
| 2020–2021 Bulgarian protests | Amsterdam | not in the UK (Netherlands, Reichskommissariat Niederlande, Netherlands, United Kingdom of the Netherlands, Sovereign Principality of the United Netherlands, France, Kingdom of Holland, Batavian Republic, Dutch Republic, Habsburg Netherlands, Burgundian Netherlands, County of Holland; resolved to Amsterdam) |
| 2020–2021 Bulgarian protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2020–2021 Bulgarian protests | Luxembourg City | not in the UK (Luxembourg; resolved to Luxembourg City) |
| 2020–2021 Bulgarian protests | Copenhagen | not in the UK (Denmark, Kingdom of Denmark; resolved to Copenhagen) |
| 2020–2021 Bulgarian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2020–2021 Bulgarian protests | Lyon | not in the UK (France, Roman Republic, Roman Empire, Western Roman Empire, Kingdom of the Burgundians, Francia, West Francia, Kingdom of France, French First Republic, First French Empire, France, Vichy France; resolved to Lyon) |
| 2020–2021 Bulgarian protests | Marseille | not in the UK (France; resolved to Marseille) |
| 2020–2021 Bulgarian protests | Milan | not in the UK (Italy, Kingdom of Italy, Austrian Empire, Kingdom of Sardinia, Kingdom of Italy, Italian Republic, Cisalpine Republic, Transpadane Republic, Duchy of Milan, Signoria of Milan, Spanish Empire; resolved to Milan) |
| 2020–2021 Bulgarian protests | Vienna | not in the UK (Austria, First Republic of Austria, Austria–Hungary, Republic of German-Austria, Austrian Empire, Federal State of Austria, Nazi Germany, Habsburg monarchy, Archduchy of Austria, Duchy of Austria, Margraviate of Austria, Duchy of Bavaria, Allied-occupied Austria; resolved to Vienna) |
| 2020–2021 Bulgarian protests | Prague | not in the UK (Czech Republic, Czechoslovakia, Austria–Hungary, Austrian Empire, Kingdom of Bohemia, Duchy of Bohemia, Czechoslovakia, Protectorate of Bohemia and Moravia, Bohemia, Holy Roman Empire; resolved to Prague) |
| 2020–2021 Bulgarian protests | Warsaw | not in the UK (Poland, General Government, Second Polish Republic, Kingdom of Poland, Russian Empire, Duchy of Warsaw, Kingdom of Prussia, Polish–Lithuanian Commonwealth, Kingdom of Poland, Kingdom of Poland, Kingdom of Poland; resolved to Warsaw) |
| 2020–2021 Bulgarian protests | Istanbul | not in the UK (Turkey, Ottoman Empire, Byzantine Empire, Latin Empire, Byzantine Empire, Roman Empire; resolved to Istanbul) |
| 2020–2021 Bulgarian protests | Ankara | not in the UK (Turkey, Ottoman Empire, Ottoman caliphate, Timurid Empire; resolved to Ankara) |
| 2020–2021 Bulgarian protests | Barcelona | not in the UK (Spain; resolved to Barcelona) |
| 2020–2021 Bulgarian protests | Madrid | not in the UK (Spain; resolved to Madrid) |
| 2020–2021 Bulgarian protests | Chicago | not in the UK (United States; resolved to Chicago) |
| 2020–2021 Bulgarian protests | New York City | not in the UK (United States; resolved to New York City) |
| 2020–2021 Bulgarian protests | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| 2020–2021 Bulgarian protests | Washington D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| 2020–2021 Bulgarian protests | Montreal | not in the UK (Canada; resolved to Montreal) |
| 2020–2021 Bulgarian protests | Toronto | not in the UK (Canada; resolved to Toronto) |
| 2020–2021 Bulgarian protests | Ottawa | not in the UK (Canada; resolved to Ottawa) |
| 2020–2021 Bulgarian protests | Melbourne | not in the UK (Australia; resolved to Melbourne) |
| 2020–2021 Bulgarian protests | Sydney | not in the UK (Australia; resolved to Sydney) |
| 2020–2021 Bulgarian protests | Auckland | not in the UK (New Zealand; resolved to Auckland) |
| 2020–2021 Bulgarian protests | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| 2020–2021 Bulgarian protests | Helsinki | not in the UK (Finland, Russian Empire, Sweden, Finnish Socialist Workers' Republic; resolved to Helsinki) |
| 2020–2021 Bulgarian protests | Oslo | not in the UK (Norway, Union between Sweden and Norway, Kingdom of Norway, Denmark–Norway; resolved to Oslo) |
| 2020 Port of Montreal strike | Montreal | not in the UK (Canada; resolved to Montreal) |
| 2020 Port of Montreal strike | Quebec | not in the UK (Canada; resolved to Quebec) |
| 2020 Michigan graduate students' strike | University of Michigan | not in the UK (United States; resolved to University of Michigan) |
| 2020 Michigan graduate students' strike | Ann Arbor | not in the UK (United States; resolved to Ann Arbor, Michigan) |
| 2020 Michigan graduate students' strike | Michigan | not in the UK (United States; resolved to Michigan) |
| 2020 Michigan graduate students' strike | United States | not in the UK (United States; resolved to United States) |
| 2020–2021 women's strike protests in Poland | Poland | not in the UK (Poland; resolved to Poland) |
| 2020–2021 Indian farmers' protest | India | not in the UK (India; resolved to India) |
| 2020 Mi'kmaq lobster dispute | Digby County | not in the UK (Canada; resolved to Digby County) |
| 2020 Mi'kmaq lobster dispute | Yarmouth County | not in the UK (Canada; resolved to Yarmouth County) |
| 2020 Mi'kmaq lobster dispute | Nova Scotia | not in the UK (Canada; resolved to Nova Scotia) |
| 2020 Mi'kmaq lobster dispute | Canada | not in the UK (Canada; resolved to Canada) |
| 2020 Guatemalan protests | Guatemala City | not in the UK (Guatemala; resolved to Guatemala City) |
| 2020 Azerbaijani protests | Baku | not in the UK (Russian Empire, Transcaucasian Commissariat, Transcaucasian Democratic Federative Republic, Azerbaijan Democratic Republic, Azerbaijan Soviet Socialist Republic, Azerbaijan; resolved to Baku) |
| 2020 Azerbaijani protests | Sumgayit | not in the UK (Azerbaijan, Azerbaijan Soviet Socialist Republic; resolved to Sumgait) |
| 2020 Azerbaijani protests | Qobu | not in the UK (Azerbaijan; resolved to Qobu) |
| 2020 Azerbaijani protests | Azerbaijan | not in the UK (Azerbaijan; resolved to Azerbaijan) |
| 2021 Russian protests | Russia | not in the UK (Russia; resolved to Russia) |
| 2021 Colombian protests | Colombia | not in the UK (Colombia; resolved to Colombia) |
| 2021 Dublin riots | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2021 Nigerian doctors' strike | Nigeria | not in the UK (Nigeria; resolved to Nigeria) |
| 2021 Tripura riots | Tripura | not in the UK (India; resolved to Tripura) |
| 2021–2022 Saint Vincent Hospital strike | Worcester, Massachusetts | not in the UK (United States; resolved to Worcester, Massachusetts) |
| 2021–2023 Eswatini protests | Eswatini | not in the UK (Eswatini; resolved to Eswatini) |
| 2021–2023 Eswatini protests | South Africa | not in the UK (South Africa; resolved to South Africa) |
| 2021 anti-LGBTQ riots in Georgia | Tbilisi | not in the UK (Georgia, Soviet Union, Transcaucasian Socialist Federative Soviet Republic, Democratic Republic of Georgia, Transcaucasian Democratic Federative Republic, Transcaucasian Commissariat, Russian Republic, Russian Empire, Kingdom of Kartli-Kakheti, Kingdom of Kartli, Kingdom of Georgia; resolved to Tbilisi) |
| 2021 anti-LGBTQ riots in Georgia | Georgia (country) | not in the UK (Georgia; resolved to Georgia (country)) |
| 2021 anti-Pakistan protests | Afghanistan | not in the UK (Afghanistan; resolved to Afghanistan) |
| 2021 anti-Pakistan protests | Austria | not in the UK (Austria; resolved to Austria) |
| 2021 anti-Pakistan protests | Belgium | not in the UK (Belgium; resolved to Belgium) |
| 2021 anti-Pakistan protests | Canada | not in the UK (Canada; resolved to Canada) |
| 2021 anti-Pakistan protests | Germany | not in the UK (Germany; resolved to Germany) |
| 2021 anti-Pakistan protests | Greece | not in the UK (Greece; resolved to Greece) |
| 2021 anti-Pakistan protests | India | not in the UK (India; resolved to India) |
| 2021 anti-Pakistan protests | Iran | not in the UK (Iran; resolved to Iran) |
| 2021 anti-Pakistan protests | Pakistan | not in the UK (Pakistan; resolved to Pakistan) |
| 2021 anti-Pakistan protests | Sweden | not in the UK (no country on Wikidata; resolved to Sweden) |
| 2021 anti-Pakistan protests | United States | not in the UK (United States; resolved to United States) |
| 2021–2022 Serbian environmental protests | Serbia | not in the UK (Serbia; resolved to Serbia) |
| 2022 Kazakh unrest | Kazakhstan | not in the UK (Kazakhstan; resolved to Kazakhstan) |
| 2022 Wellington protest | New Zealand | not in the UK (New Zealand; resolved to New Zealand) |
| 2022 Moscow rally | Moscow | not in the UK (Duchy of Moscow, Grand Principality of Moscow, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Moscow) |
| 2022 Moscow rally | Russia | not in the UK (Russia; resolved to Russia) |
| 2022 Moscow rally | Luzhniki Stadium | not in the UK (Russia, Soviet Union; resolved to Luzhniki Stadium) |
| 2022 protests in Russian-occupied Ukraine | Ukraine | not in the UK (Ukraine; resolved to Ukraine) |
| 2022 Peruvian economic protests | Peru | not in the UK (Peru; resolved to Peru) |
| 2022 Khargone violence | Khargone | not in the UK (India; resolved to Khargone) |
| 2022 Khargone violence | Madhya Pradesh | not in the UK (India; resolved to Madhya Pradesh) |
| 2022 North Caucasian protests | Northern Caucasus | not in the UK (Russia; resolved to North Caucasus) |
| 2022 Beijing Sitong Bridge protest | Haidian, Beijing | not in the UK (People's Republic of China; resolved to Haidian, Beijing) |
| 2022 Beijing Sitong Bridge protest | Beijing | not in the UK (People's Republic of China, Republic of China, Wang Jingwei regime, Provisional Government of the Republic of China, Republic of China, Beiyang Government, Qing dynasty, Ming dynasty; resolved to Beijing) |
| 2022 COVID-19 protests in China | Mainland China | not in the UK (People's Republic of China; resolved to Mainland China) |
| 2023 Armenian protests | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| 2023 Israeli judicial reform protests | Israel | not in the UK (Israel; resolved to Israel) |
| 2023 Israeli judicial reform protests | United States | not in the UK (United States; resolved to United States) |
| 2023 French pension reform strikes | France | not in the UK (France; resolved to France) |
| 2023 Pakistani protests | Pakistan | not in the UK (Pakistan; resolved to Pakistan) |
| 2023 Writers Guild of America strike | New York City | not in the UK (United States; resolved to New York City) |
| 2023 Writers Guild of America strike | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2023 Writers Guild of America strike | Burbank, California | not in the UK (United States; resolved to Burbank, California) |
| 2023 Writers Guild of America strike | Culver City, California | not in the UK (United States; resolved to Culver City, California) |
| 2023 Writers Guild of America strike | Chicago | not in the UK (United States; resolved to Chicago) |
| 2023 Writers Guild of America strike | Atlanta | not in the UK (United States; resolved to Atlanta) |
| 2023 Writers Guild of America strike | Santa Clarita, California | not in the UK (United States; resolved to Santa Clarita, California) |
| 2023 SAG-AFTRA strike | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2023 SAG-AFTRA strike | New York City | not in the UK (United States; resolved to New York City) |
| 2023 SAG-AFTRA strike | Atlanta | not in the UK (United States; resolved to Atlanta) |
| 2023 SAG-AFTRA strike | Honolulu | not in the UK (United States, Kingdom of Hawaiʻi, Provisional Government of Hawaii, Republic of Hawaii; resolved to Honolulu) |
| 2023 SAG-AFTRA strike | San Francisco | not in the UK (United States; resolved to San Francisco) |
| 2023 Democratic National Committee protests | Democratic National Committee | not in the UK (United States; resolved to Democratic National Committee) |
| 2023 Democratic National Committee protests | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| 2023 Democratic National Committee protests | United States | not in the UK (United States; resolved to United States) |
| 2023 Dublin riot | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| 2023 Bitung clashes | Bitung | not in the UK (Indonesia; resolved to Bitung) |
| 2023 Bitung clashes | North Sulawesi | not in the UK (Indonesia; resolved to North Sulawesi) |
| 2023–2024 European Union farmers' protests | European Union | not in the UK (internationality; resolved to European Union) |
| 2024 Boston University strikes | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| 2024 Boston University strikes | Massachusetts | not in the UK (United States; resolved to Massachusetts) |
| 2024 Boston University strikes | United States | not in the UK (United States; resolved to United States) |
| 2024 Armenian protests | Armenia | not in the UK (Armenia; resolved to Armenia) |
| 2024 Armenian protests | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| 2024 Armenian protests | Tavush Province | not in the UK (Armenia; resolved to Tavush Province) |
| 2024 Armenian protests | Almelo | not in the UK (Netherlands; resolved to Almelo) |
| 2024 Armenian protests | Beirut | not in the UK (Lebanon, Lebanese Republic under French mandate, State of Greater Lebanon, Occupied Enemy Territory Administration, Ottoman Empire; resolved to Beirut) |
| 2024 Armenian protests | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| 2024 Armenian protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| 2024 Armenian protests | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| 2024 Armenian protests | Copenhagen | not in the UK (Denmark, Kingdom of Denmark; resolved to Copenhagen) |
| 2024 Armenian protests | London | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| 2024 Armenian protests | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| 2024 Armenian protests | New York City | not in the UK (United States; resolved to New York City) |
| 2024 Armenian protests | Nicosia | not in the UK (Cyprus, Ottoman Empire, Northern Cyprus, British Empire; resolved to Nicosia) |
| 2024 Armenian protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| 2024 Armenian protests | Sofia | not in the UK (Bulgaria, People's Republic of Bulgaria, Kingdom of Bulgaria, Principality of Bulgaria, Ottoman Empire, Roman Empire; resolved to Sofia) |
| 2024 Armenian protests | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| 2024 Armenian protests | Thessaloniki | not in the UK (Greece, Ottoman Empire, Empire of Nicaea, Byzantine Empire, Despotate of Epirus, Kingdom of Thessalonica, Republic of Venice, Byzantine Empire, Roman Empire, Roman Republic, Macedonia, Macedonia; resolved to Thessaloniki) |
| 2024 Armenian protests | Toronto | not in the UK (Canada; resolved to Toronto) |
| 2024 Armenian protests | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| 2024 New Caledonia unrest | New Caledonia | not in the UK (France; resolved to New Caledonia) |
| 2024 Faizabad sit-in | Faizabad Interchange | not in the UK (Pakistan; resolved to Fayzabad Interchange) |
| 2024 Faizabad sit-in | Rawalpindi | not in the UK (Pakistan, India; resolved to Rawalpindi) |
| 2024 Mexican judicial reform protests | Mexico | not in the UK (Mexico; resolved to Mexico) |
| 2024 Kansas City metropolitan area rent strike | Kansas City metropolitan area | not in the UK (United States; resolved to Kansas City metropolitan area) |
| 2024 Kansas City metropolitan area rent strike | Kansas City, Missouri | not in the UK (United States; resolved to Kansas City, Missouri) |
| 2024 Kansas City metropolitan area rent strike | Independence, Missouri | not in the UK (United States; resolved to Independence, Missouri) |
| 2024 Abkhazian protests | Abkhazia | not in the UK (Georgia, Republic of Abkhazia; resolved to Abkhazia) |
| 2024 Abkhazian protests | Sukhumi | not in the UK (Georgia, Byzantine Empire, Kingdom of Abkhazia, Kingdom of Georgia, Kingdom of Imereti, Ottoman Empire, Russian Empire, Russian Republic, Transcaucasian Democratic Federative Republic, Democratic Republic of Georgia, Socialist Soviet Republic of Abkhazia, Socialist Soviet Republic of Georgia, Transcaucasian Socialist Federative Soviet Republic, Soviet Union, Georgia, Republic of Abkhazia; resolved to Sukhumi) |
| 2023 Taiwanese anti–Indian migrant worker protest | Ketagalan Boulevard | not in the UK (Taiwan; resolved to Ketagalan Boulevard) |
| 2023 Taiwanese anti–Indian migrant worker protest | Taipei | not in the UK (Taiwan; resolved to Taipei) |
| 2023 Taiwanese anti–Indian migrant worker protest | Taiwan | not in the UK (Taiwan; resolved to Taiwan) |
| 2024 University of Oregon pro-Palestinian campus occupation | University of Oregon | not in the UK (United States; resolved to University of Oregon) |
| 2024 University of Oregon pro-Palestinian campus occupation | Eugene, Oregon | not in the UK (United States; resolved to Eugene, Oregon) |
| 2024 University of Amsterdam pro-Palestinian campus occupations | University of Amsterdam | not in the UK (Netherlands; resolved to University of Amsterdam) |
| 2024 University of Amsterdam pro-Palestinian campus occupations | Amsterdam | not in the UK (Netherlands, Reichskommissariat Niederlande, Netherlands, United Kingdom of the Netherlands, Sovereign Principality of the United Netherlands, France, Kingdom of Holland, Batavian Republic, Dutch Republic, Habsburg Netherlands, Burgundian Netherlands, County of Holland; resolved to Amsterdam) |
| 2024 Venezuelan presidential election protests | Venezuela | not in the UK (no country on Wikidata; resolved to Venezuela) |
| 2024 University of Texas at Austin pro-Palestinian campus protests | University of Texas at Austin | not in the UK (United States; resolved to University of Texas at Austin) |
| 2024 University of Texas at Austin pro-Palestinian campus protests | Austin, Texas | not in the UK (United States; resolved to Austin, Texas) |
| 2024 United States port strike | United States East Coast | not in the UK (United States; resolved to East Coast of the United States) |
| 2024 United States port strike | Gulf Coast | not in the UK (United States; resolved to Gulf Coast of the United States) |
| 2024–2026 Georgian protests | Georgia (country) | not in the UK (Georgia; resolved to Georgia (country)) |
| 2024–2026 Georgian protests | Tbilisi | not in the UK (Georgia, Soviet Union, Transcaucasian Socialist Federative Soviet Republic, Democratic Republic of Georgia, Transcaucasian Democratic Federative Republic, Transcaucasian Commissariat, Russian Republic, Russian Empire, Kingdom of Kartli-Kakheti, Kingdom of Kartli, Kingdom of Georgia; resolved to Tbilisi) |
| 2024–2026 Georgian protests | Kutaisi | not in the UK (Georgia, Soviet Union, Russian Empire; resolved to Kutaisi) |
| 2024–2026 Georgian protests | Batumi | not in the UK (Georgia; resolved to Batumi) |
| 2024–2026 Georgian protests | Zugdidi | not in the UK (Georgia; resolved to Zugdidi) |
| 2024–2026 Georgian protests | Telavi | not in the UK (Georgia; resolved to Telavi) |
| 2024–2026 Georgian protests | European Union | not in the UK (internationality; resolved to European Union) |
| 2024–2026 Georgian protests | United States | not in the UK (United States; resolved to United States) |
| 2024–2026 Serbian anti-corruption protests | Serbia | not in the UK (Serbia; resolved to Serbia) |
| 2025 Balochistan protests | Balochistan, Pakistan | not in the UK (Pakistan; resolved to Balochistan, Pakistan) |
| 2025 Gaza Strip anti-Hamas protests | Gaza Strip | not in the UK (Palestine, United Arab Republic, Israeli-occupied territories, Palestinian National Authority, occupation of the Gaza Strip by the United Arab Republic; resolved to Gaza Strip) |
| 2025 Chicago ACTA rent strikes | Chicago | not in the UK (United States; resolved to Chicago) |
| 2025 Nepalese Gen Z protests | Nepal | not in the UK (Nepal; resolved to Nepal) |
| 2025 Italian general strikes and protests for Gaza | Italy | not in the UK (Italy; resolved to Italy) |
| 2025 Italian general strikes and protests for Gaza | San Marino | not in the UK (San Marino; resolved to San Marino) |
| 2025 Italian general strikes and protests for Gaza | Ticino | not in the UK (Switzerland; resolved to Ticino) |
| 2025 Maldivian protests | Malé | not in the UK (Maldives; resolved to Malé) |
| 2024 University of Twente pro-Palestinian campus protests | University of Twente | not in the UK (Netherlands; resolved to University of Twente) |
| 2024 University of Twente pro-Palestinian campus protests | Enschede | not in the UK (Netherlands; resolved to Enschede) |
| 2025 Sydney Harbour Bridge protest | Sydney | not in the UK (Australia; resolved to Sydney) |
| 2025 Sydney Harbour Bridge protest | Australia | not in the UK (Australia; resolved to Australia) |
| 2025 Sydney Harbour Bridge protest | Sydney Harbour Bridge | not in the UK (Australia; resolved to Sydney Harbour Bridge) |
| 2025 Sulaymaniyah clashes | Sulaymaniyah | not in the UK (Iraq; resolved to Sulaymaniyah) |
| 2025 Sulaymaniyah clashes | Kurdistan Region | not in the UK (Iraq; resolved to Kurdistan Region) |
| 2025 Timor-Leste protests | Dili | not in the UK (Timor-Leste, Indonesia; resolved to Dili) |
| 2025–2026 Portland, Oregon, protests | South Waterfront, Portland, Oregon | not in the UK (United States; resolved to South Waterfront, Portland, Oregon) |
| 2025–2026 Portland, Oregon, protests | Portland, Oregon | not in the UK (United States; resolved to Portland, Oregon) |
| 2025 Tehreek-e-Labbaik Pakistan protests | Lahore | not in the UK (Pakistan, Dominion of Pakistan, British Raj, Mughal Empire, Sikh Empire, India; resolved to Lahore) |
| 2025 Tehreek-e-Labbaik Pakistan protests | Muridke | not in the UK (Pakistan; resolved to Muridke) |
| 2025 Tehreek-e-Labbaik Pakistan protests | Islamabad | not in the UK (Pakistan; resolved to Islamabad) |
| 2025 Tehreek-e-Labbaik Pakistan protests | Rawalpindi | not in the UK (Pakistan, India; resolved to Rawalpindi) |
| 2025 Tehreek-e-Labbaik Pakistan protests | Pakistan | not in the UK (Pakistan; resolved to Pakistan) |
| 2025–2026 Bulgarian protests | Bulgaria | not in the UK (Bulgaria; resolved to Bulgaria) |
| 2026 Irish fuel protests | Republic of Ireland | not in the UK (Ireland; resolved to Republic of Ireland) |
| 2026 Azad Kashmir protests | Azad Kashmir | not in the UK (Pakistan; resolved to Azad Kashmir) |
| 2026 Delhi Jantar Mantar protests | Jantar Mantar, New Delhi | not in the UK (India; resolved to Jantar Mantar, New Delhi) |
| 2026 Irish public sector strikes | Republic of Ireland | not in the UK (Ireland; resolved to Republic of Ireland) |
| 8888 Uprising | Myanmar | not in the UK (Myanmar; resolved to Myanmar) |
| Aftermath of the George Floyd protests in Minneapolis–Saint Paul | Minneapolis–Saint Paul | not in the UK (United States; resolved to Minneapolis–Saint Paul) |
| Aftermath of the George Floyd protests in Minneapolis–Saint Paul | Minnesota | not in the UK (United States; resolved to Minnesota) |
| April 2009 Moldovan parliamentary election protests | Chișinău | not in the UK (Moldova, Soviet Union, Kingdom of Romania, Soviet Union, Kingdom of Romania, Moldavian Democratic Republic, Russian Empire, Principality of Moldavia, Russian Republic; resolved to Chișinău) |
| April 2009 Moldovan parliamentary election protests | Cahul | not in the UK (Moldova, Russian Empire, Soviet Union, Romania, Soviet Union, Romania, Moldavian Democratic Republic, Russian Republic, Romania, United Principalities of Moldavia and Wallachia, Principality of Moldavia, Russian Empire, Principality of Moldavia; resolved to Cahul) |
| April 2009 Moldovan parliamentary election protests | Orhei | not in the UK (Moldova, Soviet Union, Romania, Soviet Union, Romania, Moldavian Democratic Republic, Russian Republic, Russian Empire, Principality of Moldavia; resolved to Orhei) |
| April 2009 Moldovan parliamentary election protests | Bălți | not in the UK (Moldova, Russian Empire, Kingdom of Romania, Soviet Union, Kingdom of Romania, Soviet Union, Principality of Moldavia, Moldavian Democratic Republic, Russian Republic; resolved to Bălți) |
| April 2009 Moldovan parliamentary election protests | Romania | not in the UK (Romania; resolved to Romania) |
| April 2009 Moldovan parliamentary election protests | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| April 2009 Moldovan parliamentary election protests | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| April 2009 Moldovan parliamentary election protests | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| April 2009 Moldovan parliamentary election protests | New York City | not in the UK (United States; resolved to New York City) |
| April 2009 Moldovan parliamentary election protests | London | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| Anti-austerity movement in Portugal | Portugal | not in the UK (Portugal; resolved to Portugal) |
| Ashura protests | Iran | not in the UK (Iran; resolved to Iran) |
| Arab Spring | North Africa | not in the UK (Algeria, Egypt, Libya, Morocco, Sudan, Tunisia, Western Sahara, Ceuta; resolved to North Africa) |
| Arab Spring | Middle East | not in the UK (Iran, Iraq, Turkey, Bahrain, Qatar, Kuwait, Oman, Yemen, United Arab Emirates, Saudi Arabia, Egypt, Jordan, Israel, Palestine, Lebanon, Syria, Cyprus, Northern Cyprus, Afghanistan; resolved to Middle East) |
| Arab Spring | Arab world | not in the UK (United Arab Emirates, Bahrain, Kuwait, Iraq, Saudi Arabia, Yemen, Oman, Qatar, Lebanon, Syria, Palestine, Jordan, Egypt, Libya, Tunisia, Algeria, Morocco, Eritrea, Sudan, Somalia; resolved to Arab world) |
| April 2024 Israeli settler rampages | West Bank | not in the UK (Palestine, Israel, Jordan; resolved to West Bank) |
| Attack on protestors at the Turkish embassy in Washington, D.C | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| Australia–China trade war | Australia | not in the UK (Australia; resolved to Australia) |
| Australia–China trade war | China | not in the UK (People's Republic of China; resolved to China) |
| Belarus–European Union border crisis | Belarus | not in the UK (Belarus; resolved to Belarus) |
| Belarus–European Union border crisis | Poland | not in the UK (Poland; resolved to Poland) |
| Belarus–European Union border crisis | Lithuania | not in the UK (Lithuania; resolved to Lithuania) |
| Belarus–European Union border crisis | Latvia | not in the UK (Latvia; resolved to Latvia) |
| Blockade of the Gaza Strip | Gaza Strip | not in the UK (Palestine, United Arab Republic, Israeli-occupied territories, Palestinian National Authority, occupation of the Gaza Strip by the United Arab Republic; resolved to Gaza Strip) |
| Belgrade anti-gay riot | Belgrade | not in the UK (Kingdom of Hungary, Ottoman Empire, Habsburg monarchy, Ottoman Empire, Principality of Serbia, Kingdom of Serbia, Kingdom of Yugoslavia, Territory of the Military Commander in Serbia, Kingdom of Yugoslavia, Socialist Federal Republic of Yugoslavia, Federal Republic of Yugoslavia, Serbia and Montenegro, Serbia, Federal People's Republic of Yugoslavia, Ottoman Empire, Revolutionary Serbia; resolved to Belgrade) |
| Bersih 2.0 rally | Kuala Lumpur | not in the UK (Malaysia; resolved to Kuala Lumpur) |
| Bersih 3.0 rally | Kuala Lumpur | not in the UK (Malaysia; resolved to Kuala Lumpur) |
| Bersih 3.0 rally | Malaysia | not in the UK (Malaysia; resolved to Malaysia) |
| Bersih 4 rally | Kuala Lumpur | not in the UK (Malaysia; resolved to Kuala Lumpur) |
| Bersih 4 rally | Kota Kinabalu | not in the UK (Malaysia; resolved to Kota Kinabalu) |
| Bersih 4 rally | Kuching | not in the UK (Malaysia; resolved to Kuching) |
| Britney Spears conservatorship case | Stanley Mosk Courthouse | not in the UK (United States; resolved to Stanley Mosk Courthouse) |
| COVID-19 protests in the United States | United States | not in the UK (United States; resolved to United States) |
| COVID-19 protests in Germany | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| Citizenship Amendment Act protests | India | not in the UK (India; resolved to India) |
| Coors strike and boycott | Golden, Colorado | not in the UK (United States; resolved to Golden, Colorado) |
| Coors strike and boycott | Colorado | not in the UK (United States; resolved to Colorado) |
| Coors strike and boycott | United States | not in the UK (United States; resolved to United States) |
| Convoy to Canberra | Canberra | not in the UK (Australia; resolved to Canberra) |
| Crown Heights riot | Crown Heights, Brooklyn | not in the UK (United States; resolved to Crown Heights) |
| D-Chowk Dharna | D-Chowk (Islamabad) | not in the UK (Pakistan; resolved to D-Chowk (Islamabad)) |
| D-Chowk Dharna | Islamabad | not in the UK (Pakistan; resolved to Islamabad) |
| December 2016 Congolese protests | Boma, Democratic Republic of the Congo | not in the UK (Democratic Republic of the Congo; resolved to Boma, Democratic Republic of the Congo) |
| December 2016 Congolese protests | Goma | not in the UK (Democratic Republic of the Congo, Belgian Congo, Congo Free State; resolved to Goma) |
| December 2016 Congolese protests | Kinshasa | not in the UK (Democratic Republic of the Congo, Zaire, Republic of the Congo (Léopoldville), Belgian Congo, Congo Free State; resolved to Kinshasa) |
| December 2016 Congolese protests | Lubumbashi | not in the UK (Democratic Republic of the Congo; resolved to Lubumbashi) |
| December 2016 Congolese protests | Matadi | not in the UK (Democratic Republic of the Congo; resolved to Matadi) |
| December 2016 Congolese protests | Pretoria | not in the UK (South Africa; resolved to Pretoria) |
| December 2016 Congolese protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| December 2019 impeachment protests in the United States | United States | not in the UK (United States; resolved to United States) |
| Dharam Yudh Morcha | Punjab, India | not in the UK (India; resolved to Punjab, India) |
| Dharam Yudh Morcha | Delhi | not in the UK (India, British Raj, Mughal Empire, Sur Empire, Mughal Empire, Delhi Sultanate, Ghurid Empire, Chahamanas of Shakambhari, Tomaras of Delhi; resolved to Delhi) |
| English Channel scallop fishing dispute | Le Havre | not in the UK (France; resolved to Le Havre) |
| Dutch farmers' protests | Netherlands | not in the UK (Kingdom of the Netherlands; resolved to Netherlands) |
| Dutch farmers' protests | Belgium | not in the UK (Belgium; resolved to Belgium) |
| Dutch farmers' protests | Germany | not in the UK (Germany; resolved to Germany) |
| Dutch farmers' protests | Canada | not in the UK (Canada; resolved to Canada) |
| Eastman memos | Arizona | not in the UK (United States; resolved to Arizona) |
| Eastman memos | Georgia (U.S. state) | not in the UK (United States; resolved to Georgia (U.S. state)) |
| Eastman memos | Michigan | not in the UK (United States; resolved to Michigan) |
| Eastman memos | Nevada | not in the UK (United States; resolved to Nevada) |
| Eastman memos | Pennsylvania | not in the UK (United States; resolved to Pennsylvania) |
| Eastman memos | Wisconsin | not in the UK (United States; resolved to Wisconsin) |
| Eastman memos | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| Dupax del Norte anti-mining protests | Dupax del Norte | not in the UK (Philippines; resolved to Dupax del Norte) |
| Dupax del Norte anti-mining protests | Nueva Vizcaya | not in the UK (Philippines; resolved to Nueva Vizcaya) |
| February 1999 Kurdish protests | Ankara | not in the UK (Turkey, Ottoman Empire, Ottoman caliphate, Timurid Empire; resolved to Ankara) |
| February 1999 Kurdish protests | Diyarbakır | not in the UK (Turkey; resolved to Diyarbakır) |
| February 1999 Kurdish protests | Istanbul | not in the UK (Turkey, Ottoman Empire, Byzantine Empire, Latin Empire, Byzantine Empire, Roman Empire; resolved to Istanbul) |
| February 1999 Kurdish protests | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| February 1999 Kurdish protests | Sydney | not in the UK (Australia; resolved to Sydney) |
| February 1999 Kurdish protests | Vienna | not in the UK (Austria, First Republic of Austria, Austria–Hungary, Republic of German-Austria, Austrian Empire, Federal State of Austria, Nazi Germany, Habsburg monarchy, Archduchy of Austria, Duchy of Austria, Margraviate of Austria, Duchy of Bavaria, Allied-occupied Austria; resolved to Vienna) |
| February 1999 Kurdish protests | Brussels | not in the UK (Belgium; resolved to Brussels) |
| February 1999 Kurdish protests | Montreal | not in the UK (Canada; resolved to Montreal) |
| February 1999 Kurdish protests | Ottawa | not in the UK (Canada; resolved to Ottawa) |
| February 1999 Kurdish protests | Vancouver | not in the UK (Canada; resolved to Vancouver) |
| February 1999 Kurdish protests | Copenhagen | not in the UK (Denmark, Kingdom of Denmark; resolved to Copenhagen) |
| February 1999 Kurdish protests | Paris | not in the UK (France, Kingdom of France, Francia, German military administration in occupied France during World War II, France, First French Empire, French First Republic; resolved to Paris) |
| February 1999 Kurdish protests | Marseille | not in the UK (France; resolved to Marseille) |
| February 1999 Kurdish protests | Strasbourg | not in the UK (France, German Empire, Nazi Germany, France, France, Holy Roman Empire; resolved to Strasbourg) |
| February 1999 Kurdish protests | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| February 1999 Kurdish protests | Bonn | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Prussia, France, Electorate of Cologne; resolved to Bonn) |
| February 1999 Kurdish protests | Düsseldorf | not in the UK (Germany; resolved to Düsseldorf) |
| February 1999 Kurdish protests | Hamburg | not in the UK (Holy Roman Empire, Hamburg, First French Empire, German Confederation, North German Confederation, German Empire, Weimar Republic, Nazi Germany, allied-occupied Germany, West Germany, Germany; resolved to Hamburg) |
| February 1999 Kurdish protests | Stuttgart | not in the UK (Germany, Nazi Germany, Weimar Republic, German Empire, Kingdom of Württemberg, Electorate of Württemberg, Duchy of Württemberg; resolved to Stuttgart) |
| February 1999 Kurdish protests | Athens | not in the UK (Greece, Roman Empire, Byzantine Empire, Duchy of Athens, Ottoman Empire, First Hellenic Republic, Classical Athens, Kingdom of Greece, Third Hellenic Republic; resolved to Athens) |
| February 1999 Kurdish protests | Sanandaj | not in the UK (Iran; resolved to Sanandaj) |
| February 1999 Kurdish protests | Kermanshah | not in the UK (Iran; resolved to Kermanshah) |
| February 1999 Kurdish protests | Mahabad | not in the UK (Iran; resolved to Mahabad) |
| February 1999 Kurdish protests | Urmia | not in the UK (Iran; resolved to Urmia) |
| February 1999 Kurdish protests | Tehran | not in the UK (Iran, Qajar Iran, Pahlavi Iran; resolved to Tehran) |
| February 1999 Kurdish protests | Milan | not in the UK (Italy, Kingdom of Italy, Austrian Empire, Kingdom of Sardinia, Kingdom of Italy, Italian Republic, Cisalpine Republic, Transpadane Republic, Duchy of Milan, Signoria of Milan, Spanish Empire; resolved to Milan) |
| February 1999 Kurdish protests | The Hague | not in the UK (Netherlands, Kingdom of Holland, First French Empire, Batavian Republic, Dutch Republic, Spanish Empire, Habsburg Netherlands, County of Holland; resolved to The Hague) |
| February 1999 Kurdish protests | Moscow | not in the UK (Duchy of Moscow, Grand Principality of Moscow, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Moscow) |
| February 1999 Kurdish protests | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| February 1999 Kurdish protests | Bern | not in the UK (Switzerland; resolved to Bern) |
| February 1999 Kurdish protests | Geneva | not in the UK (Switzerland, Republic of Geneva, France, Republic of Geneva; resolved to Geneva) |
| February 1999 Kurdish protests | Zurich | not in the UK (Switzerland, Old Swiss Confederacy, Helvetic Republic, Switzerland; resolved to Zurich) |
| February 1999 Kurdish protests | New York City | not in the UK (United States; resolved to New York City) |
| February 1999 Kurdish protests | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| Ferguson unrest | Ferguson, Missouri | not in the UK (United States; resolved to Ferguson, Missouri) |
| Ferguson unrest | St. Louis, Missouri | not in the UK (United States; resolved to St. Louis) |
| First 'Ndrangheta war | Calabria | not in the UK (Italy; resolved to Calabria) |
| Freedom Convoy | United States | not in the UK (United States; resolved to United States) |
| Flower protests | Russia | not in the UK (Russia; resolved to Russia) |
| Gdeim Izik protest camp | El Aaiún | not in the UK (Morocco, Spanish Sahara, Sahrawi Arab Democratic Republic; resolved to Laayoune) |
| Gdeim Izik protest camp | Western Sahara | not in the UK (Spanish Empire, Spanish West Africa, Spanish Sahara, Sahrawi Arab Democratic Republic; resolved to Western Sahara) |
| Gaza war protests at Ohio State University | Ohio State University | not in the UK (United States; resolved to Ohio State University) |
| Gaza war protests at Ohio State University | Columbus, Ohio | not in the UK (United States; resolved to Columbus, Ohio) |
| Gezi Park protests | Istanbul | not in the UK (Turkey, Ottoman Empire, Byzantine Empire, Latin Empire, Byzantine Empire, Roman Empire; resolved to Istanbul) |
| Gezi Park protests | Ankara | not in the UK (Turkey, Ottoman Empire, Ottoman caliphate, Timurid Empire; resolved to Ankara) |
| Gezi Park protests | İzmir | not in the UK (Turkey, Kingdom of Greece, Ottoman Empire; resolved to İzmir) |
| Gezi Park protests | Hatay Province | not in the UK (Turkey; resolved to Hatay Province) |
| Gezi Park protests | Balıkesir | not in the UK (Turkey; resolved to Balıkesir) |
| Gezi Park protests | Bursa | not in the UK (Turkey, Ottoman Empire; resolved to Bursa) |
| Gezi Park protests | Kahramanmaraş | not in the UK (Turkey; resolved to Kahramanmaraş) |
| Gezi Park protests | Adana | not in the UK (Turkey, Ottoman Empire; resolved to Adana) |
| Gezi Park protests | Mersin | not in the UK (Turkey; resolved to Mersin) |
| Gezi Park protests | Kayseri | not in the UK (Turkey, Ottoman Empire, Byzantine Empire, Roman Empire, Sultanate of Rum; resolved to Kayseri) |
| Gezi Park protests | Konya | not in the UK (Turkey, Ottoman Empire, Sultanate of Rum, Turkey; resolved to Konya) |
| Gezi Park protests | Eskişehir | not in the UK (Turkey; resolved to Eskişehir) |
| Gezi Park protests | Antalya | not in the UK (Turkey; resolved to Antalya) |
| Gezi Park protests | Isparta | not in the UK (Turkey; resolved to Isparta) |
| Gezi Park protests | Denizli | not in the UK (Turkey; resolved to Denizli) |
| Gezi Park protests | Muğla | not in the UK (Turkey; resolved to Muğla) |
| Gezi Park protests | Trabzon | not in the UK (Turkey, Ottoman Empire, Empire of Trebizond, Byzantine Empire; resolved to Trabzon) |
| Gezi Park protests | Edirne | not in the UK (Turkey, Roman Empire, Byzantine Empire, Ottoman Empire; resolved to Edirne) |
| Gezi Park protests | Erzurum | not in the UK (Turkey; resolved to Erzurum) |
| Gezi Park protests | Malatya | not in the UK (Turkey; resolved to Malatya) |
| Gezi Park protests | Samsun | not in the UK (Turkey; resolved to Samsun) |
| George Floyd protests in Washington (state) | Washington (state) | not in the UK (United States; resolved to Washington (state)) |
| George Floyd protests in California | California | not in the UK (United States; resolved to California) |
| George Floyd protests in Ohio | Ohio | not in the UK (United States; resolved to Ohio) |
| George Floyd protests in Virginia | Virginia | not in the UK (United States; resolved to Virginia) |
| George Floyd protests in Philadelphia | Philadelphia | not in the UK (United States; resolved to Philadelphia) |
| George Floyd protests in Philadelphia | Pennsylvania | not in the UK (United States; resolved to Pennsylvania) |
| George Floyd protests in Seattle | Seattle | not in the UK (United States; resolved to Seattle) |
| George Floyd protests in Seattle | Washington (state) | not in the UK (United States; resolved to Washington (state)) |
| George Floyd protests in Alabama | Alabama | not in the UK (United States; resolved to Alabama) |
| George Floyd protests in Arizona | Arizona | not in the UK (United States; resolved to Arizona) |
| George Floyd protests in Connecticut | Connecticut | not in the UK (United States; resolved to Connecticut) |
| George Floyd protests in Maine | Maine | not in the UK (United States; resolved to Maine) |
| George Floyd protests in New Hampshire | New Hampshire | not in the UK (United States; resolved to New Hampshire) |
| George Floyd protests in Rhode Island | Rhode Island | not in the UK (United States; resolved to Rhode Island) |
| George Floyd protests in Tennessee | Tennessee | not in the UK (United States; resolved to Tennessee) |
| George Floyd protests in Tennessee | United States | not in the UK (United States; resolved to United States) |
| George Floyd protests in Minneapolis–Saint Paul | Minneapolis–Saint Paul | not in the UK (United States; resolved to Minneapolis–Saint Paul) |
| George Floyd protests in Minneapolis–Saint Paul | Minnesota | not in the UK (United States; resolved to Minnesota) |
| George Floyd protests in the San Francisco Bay Area | San Francisco Bay Area | not in the UK (United States; resolved to San Francisco Bay Area) |
| George Floyd protests in the San Francisco Bay Area | California | not in the UK (United States; resolved to California) |
| George Floyd protests in San Diego County, California | San Diego County, California | not in the UK (United States; resolved to San Diego County, California) |
| George Floyd protests in San Diego County, California | California | not in the UK (United States; resolved to California) |
| Global March to Gaza | Arish | not in the UK (Egypt; resolved to Arish) |
| Global March to Gaza | Rafah border crossing | not in the UK (Egypt, Palestine; resolved to Rafah Border Crossing) |
| Global March to Gaza | Gaza Strip | not in the UK (Palestine, United Arab Republic, Israeli-occupied territories, Palestinian National Authority, occupation of the Gaza Strip by the United Arab Republic; resolved to Gaza Strip) |
| Gwangju Uprising | Gwangju | not in the UK (South Korea; resolved to Gwangju) |
| Gwangju Uprising | Fourth Republic of Korea | not in the UK (no country on Wikidata; resolved to Fourth Republic of Korea) |
| Hachalu Hundessa riots | Ethiopia | not in the UK (Ethiopia; resolved to Ethiopia) |
| Hachalu Hundessa riots | Oromia Region | not in the UK (Ethiopia; resolved to Oromia) |
| Hachalu Hundessa riots | Addis Ababa | not in the UK (Ethiopia; resolved to Addis Ababa) |
| Hachalu Hundessa riots | Shashemene | not in the UK (Ethiopia; resolved to Shashamane) |
| Hachalu Hundessa riots | Ambo, Oromia | not in the UK (Ethiopia; resolved to Ambo, Ethiopia) |
| Guyana–Venezuela crisis (2023–2024) | Guayana Esequiba | not in the UK (no country on Wikidata; resolved to Guyana–Venezuela territorial dispute) |
| Hands off Greenland protests | Kingdom of Denmark | not in the UK (no country on Wikidata; resolved to Danish Realm) |
| Hands off Greenland protests | Denmark | not in the UK (Kingdom of Denmark; resolved to Denmark) |
| Hands off Greenland protests | Greenland | not in the UK (Kingdom of Denmark; resolved to Greenland) |
| Hands off Greenland protests | Nunavut | not in the UK (Canada; resolved to Nunavut) |
| Hands off Greenland protests | Canada | not in the UK (Canada; resolved to Canada) |
| Insulate Britain protests | Port of Dover | coordinates outside the UK's boundaries (51.119, 1.329) |
| July 2009 Ürümqi riots | Ürümqi | not in the UK (People's Republic of China; resolved to Ürümqi) |
| Irish anti-immigration protests | County Clare | not in the UK (Ireland; resolved to County Clare) |
| Irish anti-immigration protests | County Cork | not in the UK (Ireland; resolved to County Cork) |
| Irish anti-immigration protests | County Dublin | not in the UK (Ireland, Irish Free State, United Kingdom of Great Britain and Ireland, Kingdom of Ireland; resolved to County Dublin) |
| Irish anti-immigration protests | County Galway | not in the UK (Ireland; resolved to County Galway) |
| Irish anti-immigration protests | County Kildare | not in the UK (Ireland; resolved to County Kildare) |
| Irish anti-immigration protests | County Leitrim | not in the UK (Ireland; resolved to County Leitrim) |
| Irish anti-immigration protests | County Waterford | not in the UK (Ireland; resolved to County Waterford) |
| Irish anti-immigration protests | County Westmeath | not in the UK (Ireland; resolved to County Westmeath) |
| Irish anti-immigration protests | County Wexford | not in the UK (Ireland; resolved to County Wexford) |
| Irish anti-immigration protests | County Wicklow | not in the UK (Ireland; resolved to County Wicklow) |
| January 23, 2026 Minnesota protests against ICE | Minnesota | not in the UK (United States; resolved to Minnesota) |
| January 30, 2026 protests against ICE | United States | not in the UK (United States; resolved to United States) |
| Kenosha unrest | Kenosha | not in the UK (United States; resolved to Kenosha, Wisconsin) |
| July Uprising | Bangladesh | not in the UK (Bangladesh; resolved to Bangladesh) |
| June 2025 Los Angeles protests against mass deportation | Greater Los Angeles | not in the UK (United States; resolved to Greater Los Angeles) |
| June 26 Revolution | Gaza City | not in the UK (Palestine, Israeli occupation of the Gaza Strip, United Arab Republic, Mandatory Palestine, Ottoman Empire, Byzantine Empire, early Islamic period in Palestine, Mamluk Sultanate of Egypt, Kingdom of Jerusalem, Roman Empire, Macedonian Empire; resolved to Gaza City) |
| June 26 Revolution | Khan Younis | not in the UK (United Arab Republic, Israeli-occupied territories, Palestine, Mandatory Palestine, All-Palestine Government; resolved to Khan Yunis) |
| Kuwaiti protests (2011–2012) | Kuwait | not in the UK (Kuwait; resolved to Kuwait) |
| March for Our Lives (demonstration) | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| March 1982 Palestinian general strike | Occupied Palestinian Territories | not in the UK (Palestine; resolved to Palestine) |
| March 1982 Palestinian general strike | Israel | not in the UK (Israel; resolved to Israel) |
| March 2026 No Kings protests | American Samoa | not in the UK (United States; resolved to American Samoa) |
| March 2026 No Kings protests | Puerto Rico | not in the UK (United States; resolved to Puerto Rico) |
| May 2013 Stockholm riots | Husby, Stockholm | not in the UK (Sweden; resolved to Husby, Stockholm) |
| May 2013 Stockholm riots | Stockholm | not in the UK (Sweden, Kalmar Union, Union between Sweden and Norway; resolved to Stockholm) |
| May 2013 Stockholm riots | Sweden | not in the UK (no country on Wikidata; resolved to Sweden) |
| Market Basket protests | New England | not in the UK (United States; resolved to New England) |
| Market Basket protests | Massachusetts | not in the UK (United States; resolved to Massachusetts) |
| Mass detentions in the Gaza war | Israel | not in the UK (Israel; resolved to Israel) |
| Mass detentions in the Gaza war | Palestinian territories | not in the UK (Palestine; resolved to Palestine) |
| March for the Republic and Against Antisemitism | France | not in the UK (France; resolved to France) |
| Million People March | Luneta Park | not in the UK (Philippines; resolved to Rizal Park) |
| Million People March | Manila | not in the UK (Philippines; resolved to Manila) |
| Moldovan protests (2022–2023) | Chișinău | not in the UK (Moldova, Soviet Union, Kingdom of Romania, Soviet Union, Kingdom of Romania, Moldavian Democratic Republic, Russian Empire, Principality of Moldavia, Russian Republic; resolved to Chișinău) |
| Moldovan protests (2022–2023) | Bucharest | not in the UK (Principality of Wallachia, United Principalities of Moldavia and Wallachia, Kingdom of Romania, Romanian People's Republic, Socialist Republic of Romania, Romania; resolved to Bucharest) |
| Moldovan protests (2022–2023) | Strasbourg | not in the UK (France, German Empire, Nazi Germany, France, France, Holy Roman Empire; resolved to Strasbourg) |
| Mława riot | Mława | not in the UK (Poland; resolved to Mława) |
| Māori land march | New Zealand | not in the UK (New Zealand; resolved to New Zealand) |
| Myanmar protests (2021–present) | Myanmar | not in the UK (Myanmar; resolved to Myanmar) |
| Nahel Merzouk riots | France | not in the UK (France; resolved to France) |
| North Kosovo crisis (2011–2013) | North Kosovo | not in the UK (Serbia, Kosovo; resolved to North Kosovo) |
| November 2024 Amsterdam riots | Amsterdam | not in the UK (Netherlands, Reichskommissariat Niederlande, Netherlands, United Kingdom of the Netherlands, Sovereign Principality of the United Netherlands, France, Kingdom of Holland, Batavian Republic, Dutch Republic, Habsburg Netherlands, Burgundian Netherlands, County of Holland; resolved to Amsterdam) |
| Occupy Los Angeles | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| Occupy Los Angeles | California | not in the UK (United States; resolved to California) |
| Occupy Los Angeles | United States | not in the UK (United States; resolved to United States) |
| Occupy Boston | Boston | not in the UK (United States, Province of Massachusetts Bay, Massachusetts Bay Colony; resolved to Boston) |
| Occupy Boston | Massachusetts | not in the UK (United States; resolved to Massachusetts) |
| Occupy Texas State | San Marcos, Texas | not in the UK (United States; resolved to San Marcos, Texas) |
| Occupy Texas State | Texas | not in the UK (United States; resolved to Texas) |
| Occupy Dame Street | Dublin | not in the UK (United Kingdom of Great Britain and Ireland, Kingdom of Ireland, Ireland, Irish Free State, Lordship of Ireland; resolved to Dublin) |
| Occupy Dame Street | Republic of Ireland | not in the UK (Ireland; resolved to Republic of Ireland) |
| Occupy Nigeria | Nigeria | not in the UK (Nigeria; resolved to Nigeria) |
| October 2018 protests in Armenia | Armenia | not in the UK (Armenia; resolved to Armenia) |
| October 2018 protests in Armenia | Yerevan | not in the UK (Armenia, Soviet Union, First Republic of Armenia, Russian Empire, Bagratid Armenia, Ottoman Empire, Safavid Iran; resolved to Yerevan) |
| October 2018 protests in Armenia | Gyumri | not in the UK (Armenia, Soviet Union; resolved to Gyumri) |
| October 2018 protests in Armenia | Vanadzor | not in the UK (Armenia, Armenian Soviet Socialist Republic, First Republic of Armenia, Transcaucasian Democratic Federative Republic, Transcaucasian Commissariat, Special Transcaucasian Committee, Russian Empire, Kingdom of Kartli-Kakheti, Kingdom of Kartli, Kingdom of Georgia, Kingdom of Lori; resolved to Vanadzor) |
| October 2018 protests in Armenia | Abovyan | not in the UK (Armenia; resolved to Abovyan) |
| October 2018 protests in Armenia | Sevan, Armenia | not in the UK (Armenia; resolved to Sevan, Armenia) |
| October 2018 protests in Armenia | Gavar | not in the UK (Armenia, Soviet Union, Russian Empire; resolved to Gavar) |
| October 2018 protests in Armenia | Artashat, Armenia | not in the UK (Armenia; resolved to Artashat, Armenia) |
| October 2018 protests in Armenia | Armavir, Armenia | not in the UK (Armenia, Socialist Soviet Republic of Armenia, First Republic of Armenia, Russian Empire; resolved to Armavir, Armenia) |
| October 2018 protests in Armenia | Ashtarak | not in the UK (Armenia, Soviet Union, Socialist Soviet Republic of Armenia, First Republic of Armenia, Transcaucasian Socialist Federative Soviet Republic, Transcaucasian Democratic Federative Republic, Russian Empire, Qajar Iran, Afsharid Iran; resolved to Ashtarak) |
| October 2018 protests in Armenia | Vagharshapat | not in the UK (Armenia, Armenian Soviet Socialist Republic, First Republic of Armenia, Russian Empire, Qajar Iran, Afsharid Iran; resolved to Vagharshapat) |
| October 2018 protests in Armenia | Kapan | not in the UK (Armenia; resolved to Kapan) |
| October 2018 protests in Armenia | Stepanavan | not in the UK (Armenia; resolved to Stepanavan) |
| October 2018 protests in Armenia | Spitak | not in the UK (Armenia; resolved to Spitak) |
| October 2018 protests in Armenia | Dilijan | not in the UK (Armenia, Soviet Union, First Republic of Armenia; resolved to Dilijan) |
| October 2018 protests in Armenia | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| October 2018 protests in Armenia | Glendale, California | not in the UK (United States; resolved to Glendale, California) |
| October 2018 protests in Armenia | Moscow | not in the UK (Duchy of Moscow, Grand Principality of Moscow, Tsardom of Russia, Russian Empire, Russian Republic, Russian Socialist Federative Soviet Republic, Soviet Union, Russia; resolved to Moscow) |
| October 2018 protests in Armenia | Marseille | not in the UK (France; resolved to Marseille) |
| October 2018 protests in Armenia | Toronto | not in the UK (Canada; resolved to Toronto) |
| October 2018 protests in Armenia | Montreal | not in the UK (Canada; resolved to Montreal) |
| October 2018 protests in Armenia | Sochi | not in the UK (Russia, Russian Empire, Soviet Union; resolved to Sochi) |
| October 2018 protests in Armenia | Vancouver | not in the UK (Canada; resolved to Vancouver) |
| October 2018 protests in Armenia | Athens | not in the UK (Greece, Roman Empire, Byzantine Empire, Duchy of Athens, Ottoman Empire, First Hellenic Republic, Classical Athens, Kingdom of Greece, Third Hellenic Republic; resolved to Athens) |
| October 2018 protests in Armenia | London | international event: no sentence describes a protest at this UK place (with the UK named nearby or in its section) |
| October 2018 protests in Armenia | Berlin | not in the UK (Margraviate of Brandenburg, Brandenburg-Prussia, Kingdom of Prussia, North German Confederation, German Empire, Weimar Republic, Nazi Germany, Soviet occupation zone of Germany, East Germany, Germany, West Germany; resolved to Berlin) |
| October 2018 protests in Armenia | Buenos Aires | not in the UK (Argentina; resolved to Buenos Aires) |
| October 2018 protests in Armenia | Chicago | not in the UK (United States; resolved to Chicago) |
| October 2018 protests in Armenia | São Paulo | not in the UK (Brazil; resolved to São Paulo) |
| October 13, 2021, North Kosovo riots | Northern Kosovo | not in the UK (Serbia, Kosovo; resolved to North Kosovo) |
| Opposition to Vladimir Putin in Russia | Russia | not in the UK (Russia; resolved to Russia) |
| Protests against Executive Order 13769 | United States | not in the UK (United States; resolved to United States) |
| Protest against MTR's musical instrument restrictions | Tai Wai station | not in the UK (People's Republic of China, British Hong Kong; resolved to Tai Wai station) |
| Protest against MTR's musical instrument restrictions | Sha Tin station | not in the UK (People's Republic of China, British Hong Kong; resolved to Sha Tin station) |
| Protests in Canada against the Sri Lankan civil war | Toronto | not in the UK (Canada; resolved to Toronto) |
| Protests in Canada against the Sri Lankan civil war | Ottawa | not in the UK (Canada; resolved to Ottawa) |
| Protests in Canada against the Sri Lankan civil war | Ontario | not in the UK (Canada; resolved to Ontario) |
| Rally to Restore Sanity and/or Fear | National Mall | not in the UK (United States; resolved to National Mall) |
| Rally to Restore Sanity and/or Fear | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| Rally to Restore Sanity and/or Fear | Austin, Texas | not in the UK (United States; resolved to Austin, Texas) |
| Rally to Restore Sanity and/or Fear | Los Angeles | not in the UK (United States; resolved to Los Angeles) |
| Rally to Restore Sanity and/or Fear | Burlington, Vermont | not in the UK (United States; resolved to Burlington, Vermont) |
| Rally to Restore Sanity and/or Fear | Chicago | not in the UK (United States; resolved to Chicago) |
| Rally to Restore Sanity and/or Fear | Denver | not in the UK (United States; resolved to Denver) |
| Rally to Restore Sanity and/or Fear | Honolulu | not in the UK (United States, Kingdom of Hawaiʻi, Provisional Government of Hawaii, Republic of Hawaii; resolved to Honolulu) |
| Rally to Restore Sanity and/or Fear | Boise, Idaho | not in the UK (United States; resolved to Boise, Idaho) |
| Protests against the Russo-Ukrainian war (2022–present) | Albania | not in the UK (Albania; resolved to Albania) |
| Protests against the Russo-Ukrainian war (2022–present) | Andorra | not in the UK (Andorra; resolved to Andorra) |
| Protests against the Russo-Ukrainian war (2022–present) | Argentina | not in the UK (Argentina; resolved to Argentina) |
| Protests against the Russo-Ukrainian war (2022–present) | Armenia | not in the UK (Armenia; resolved to Armenia) |
| Protests against the Russo-Ukrainian war (2022–present) | Austria | not in the UK (Austria; resolved to Austria) |
| Protests against the Russo-Ukrainian war (2022–present) | Australia | not in the UK (Australia; resolved to Australia) |
| Protests against the Russo-Ukrainian war (2022–present) | Azerbaijan | not in the UK (Azerbaijan; resolved to Azerbaijan) |
| Protests against the Russo-Ukrainian war (2022–present) | Belarus | not in the UK (Belarus; resolved to Belarus) |
| Protests against the Russo-Ukrainian war (2022–present) | Belgium | not in the UK (Belgium; resolved to Belgium) |
| Protests against the Russo-Ukrainian war (2022–present) | Bolivia | not in the UK (Bolivia; resolved to Bolivia) |
| Protests against the Russo-Ukrainian war (2022–present) | Bosnia and Herzegovina | not in the UK (no country on Wikidata; resolved to Bosnia and Herzegovina) |
| Protests against the Russo-Ukrainian war (2022–present) | Brazil | not in the UK (Portuguese Empire, Brazil; resolved to Brazil) |
| Protests against the Russo-Ukrainian war (2022–present) | Bulgaria | not in the UK (Bulgaria; resolved to Bulgaria) |
| Protests against the Russo-Ukrainian war (2022–present) | Canada | not in the UK (Canada; resolved to Canada) |
| Protests against the Russo-Ukrainian war (2022–present) | Chile | not in the UK (Chile; resolved to Chile) |
| Protests against the Russo-Ukrainian war (2022–present) | Colombia | not in the UK (Colombia; resolved to Colombia) |
| Protests against the Russo-Ukrainian war (2022–present) | Costa Rica | not in the UK (Costa Rica; resolved to Costa Rica) |
| Protests against the Russo-Ukrainian war (2022–present) | Croatia | not in the UK (Croatia; resolved to Croatia) |
| Protests against the Russo-Ukrainian war (2022–present) | Cyprus | not in the UK (Cyprus; resolved to Cyprus) |
| Protests against the Russo-Ukrainian war (2022–present) | Czech Republic | not in the UK (Czech Republic; resolved to Czech Republic) |
| Protests against the Russo-Ukrainian war (2022–present) | Denmark | not in the UK (Kingdom of Denmark; resolved to Denmark) |
| Protests against the Russo-Ukrainian war (2022–present) | Estonia | not in the UK (Estonia; resolved to Estonia) |
| Protests against the Russo-Ukrainian war (2022–present) | Ecuador | not in the UK (Ecuador; resolved to Ecuador) |
| Protests against the Russo-Ukrainian war (2022–present) | Finland | not in the UK (Finland; resolved to Finland) |
| Protests against the Russo-Ukrainian war (2022–present) | France | not in the UK (France; resolved to France) |
| Protests against the Russo-Ukrainian war (2022–present) | Georgia (country) | not in the UK (Georgia; resolved to Georgia (country)) |
| Protests against the Russo-Ukrainian war (2022–present) | Germany | not in the UK (Germany; resolved to Germany) |
| Protests against the Russo-Ukrainian war (2022–present) | Greece | not in the UK (Greece; resolved to Greece) |
| Protests against the Russo-Ukrainian war (2022–present) | Hungary | not in the UK (Hungary; resolved to Hungary) |
| Protests against the Russo-Ukrainian war (2022–present) | Hong Kong | not in the UK (People's Republic of China, British Empire; resolved to Hong Kong) |
| Protests against the Russo-Ukrainian war (2022–present) | Iceland | not in the UK (Iceland; resolved to Iceland) |
| Protests against the Russo-Ukrainian war (2022–present) | India | not in the UK (India; resolved to India) |
| Protests against the Russo-Ukrainian war (2022–present) | Indonesia | not in the UK (Indonesia; resolved to Indonesia) |
| Protests against the Russo-Ukrainian war (2022–present) | Iran | not in the UK (Iran; resolved to Iran) |
| Protests against the Russo-Ukrainian war (2022–present) | Republic of Ireland | not in the UK (Ireland; resolved to Republic of Ireland) |
| Protests against the Russo-Ukrainian war (2022–present) | Israel | not in the UK (Israel; resolved to Israel) |
| Protests against the Russo-Ukrainian war (2022–present) | Italy | not in the UK (Italy; resolved to Italy) |
| Protests against the Russo-Ukrainian war (2022–present) | Japan | not in the UK (Japan; resolved to Japan) |
| Protests against the Russo-Ukrainian war (2022–present) | Kazakhstan | not in the UK (Kazakhstan; resolved to Kazakhstan) |
| Protests against the Russo-Ukrainian war (2022–present) | Kosovo | not in the UK (Kosovo; resolved to Kosovo) |
| Protests against the Russo-Ukrainian war (2022–present) | Kyrgyzstan | not in the UK (Kyrgyzstan; resolved to Kyrgyzstan) |
| Protests against the Russo-Ukrainian war (2022–present) | Latvia | not in the UK (Latvia; resolved to Latvia) |
| Protests against the Russo-Ukrainian war (2022–present) | Lebanon | not in the UK (Lebanon; resolved to Lebanon) |
| Protests against the Russo-Ukrainian war (2022–present) | Lithuania | not in the UK (Lithuania; resolved to Lithuania) |
| Protests against the Russo-Ukrainian war (2022–present) | Luxembourg | not in the UK (Luxembourg; resolved to Luxembourg) |
| Protests against the Russo-Ukrainian war (2022–present) | Malaysia | not in the UK (Malaysia; resolved to Malaysia) |
| Protests against the Russo-Ukrainian war (2022–present) | Malta | not in the UK (Malta, Kingdom of Great Britain; resolved to Malta) |
| Protests against the Russo-Ukrainian war (2022–present) | Mexico | not in the UK (Mexico; resolved to Mexico) |
| Protests against the Russo-Ukrainian war (2022–present) | Moldova | not in the UK (Moldova; resolved to Moldova) |
| Protests against the Russo-Ukrainian war (2022–present) | Mongolia | not in the UK (Mongolia; resolved to Mongolia) |
| Protests against the Russo-Ukrainian war (2022–present) | Montenegro | not in the UK (Montenegro; resolved to Montenegro) |
| Protests against the Russo-Ukrainian war (2022–present) | Nepal | not in the UK (Nepal; resolved to Nepal) |
| Protests against the Russo-Ukrainian war (2022–present) | Netherlands | not in the UK (Kingdom of the Netherlands; resolved to Netherlands) |
| Protests against the Russo-Ukrainian war (2022–present) | New Zealand | not in the UK (New Zealand; resolved to New Zealand) |
| Protests against the Russo-Ukrainian war (2022–present) | North Macedonia | not in the UK (North Macedonia; resolved to North Macedonia) |
| Protests against the Russo-Ukrainian war (2022–present) | Norway | not in the UK (Norway; resolved to Norway) |
| Protests against the Russo-Ukrainian war (2022–present) | Pakistan | not in the UK (Pakistan; resolved to Pakistan) |
| Protests against the Russo-Ukrainian war (2022–present) | Panama | not in the UK (Panama; resolved to Panama) |
| Protests against the Russo-Ukrainian war (2022–present) | Peru | not in the UK (Peru; resolved to Peru) |
| Protests against the Russo-Ukrainian war (2022–present) | Philippines | not in the UK (Philippines; resolved to Philippines) |
| Protests against the Russo-Ukrainian war (2022–present) | Poland | not in the UK (Poland; resolved to Poland) |
| Protests against the Russo-Ukrainian war (2022–present) | Portugal | not in the UK (Portugal; resolved to Portugal) |
| Protests against the Russo-Ukrainian war (2022–present) | Romania | not in the UK (Romania; resolved to Romania) |
| Protests against the Russo-Ukrainian war (2022–present) | Russia | not in the UK (Russia; resolved to Russia) |
| Protests against the Russo-Ukrainian war (2022–present) | Serbia | not in the UK (Serbia; resolved to Serbia) |
| Protests against the Russo-Ukrainian war (2022–present) | Slovakia | not in the UK (Slovakia; resolved to Slovakia) |
| Protests against the Russo-Ukrainian war (2022–present) | South Africa | not in the UK (South Africa; resolved to South Africa) |
| Protests against the Russo-Ukrainian war (2022–present) | South Korea | not in the UK (South Korea; resolved to South Korea) |
| Protests against the Russo-Ukrainian war (2022–present) | Spain | not in the UK (Spain; resolved to Spain) |
| Protests against the Russo-Ukrainian war (2022–present) | Sri Lanka | not in the UK (Sri Lanka, Portuguese Empire, British Empire, Dutch Empire; resolved to Sri Lanka) |
| Protests against the Russo-Ukrainian war (2022–present) | Sweden | not in the UK (no country on Wikidata; resolved to Sweden) |
| Protests against the Russo-Ukrainian war (2022–present) | Switzerland | not in the UK (no country on Wikidata; resolved to Switzerland) |
| Protests against the Russo-Ukrainian war (2022–present) | Taiwan | not in the UK (Taiwan; resolved to Taiwan) |
| Protests against the Russo-Ukrainian war (2022–present) | Thailand | not in the UK (no country on Wikidata; resolved to Thailand) |
| Protests against the Russo-Ukrainian war (2022–present) | Turkey | not in the UK (Turkey; resolved to Turkey) |
| Protests against the Russo-Ukrainian war (2022–present) | United States | not in the UK (United States; resolved to United States) |
| Protests against the Russo-Ukrainian war (2022–present) | Uruguay | not in the UK (Uruguay; resolved to Uruguay) |
| Protests against the Russo-Ukrainian war (2022–present) | Venezuela | not in the UK (no country on Wikidata; resolved to Venezuela) |
| Republic Protests | Ankara | not in the UK (Turkey, Ottoman Empire, Ottoman caliphate, Timurid Empire; resolved to Ankara) |
| Republic Protests | Istanbul | not in the UK (Turkey, Ottoman Empire, Byzantine Empire, Latin Empire, Byzantine Empire, Roman Empire; resolved to Istanbul) |
| Republic Protests | Manisa | not in the UK (Turkey; resolved to Manisa) |
| Republic Protests | Çanakkale | not in the UK (Turkey; resolved to Çanakkale) |
| Republic Protests | İzmir | not in the UK (Turkey, Kingdom of Greece, Ottoman Empire; resolved to İzmir) |
| Republican marches | France | not in the UK (France; resolved to France) |
| Republican marches | #Main places | no Wikipedia article or coordinates for this place |
| Restoring Honor rally | National Mall | not in the UK (United States; resolved to National Mall) |
| Restoring Honor rally | Washington, D.C. | not in the UK (United States; resolved to Washington, D.C.) |
| Sadae Mazlomeen Dharna (Parachinar) | Parachinar | not in the UK (Pakistan; resolved to Parachinar) |
| Rock Machine–Rebels conflict | Perth | not in the UK (Australia; resolved to Perth) |
| San Francisco tech bus protests | San Francisco | not in the UK (United States; resolved to San Francisco) |
| San Francisco tech bus protests | Oakland, California | not in the UK (United States; resolved to Oakland, California) |
| Shaheen Bagh protest | Shaheen Bagh | not in the UK (India; resolved to Shaheen Bagh) |
| Star Hotel riot | Newcastle, New South Wales | not in the UK (Australia; resolved to Newcastle, New South Wales) |
| Spring 1987 West Bank unrest | Occupied Palestinian Territories | not in the UK (Palestine; resolved to Palestine) |
| Spring 1987 West Bank unrest | West Bank | not in the UK (Palestine, Israel, Jordan; resolved to West Bank) |
| Soumoud Convoy | Sirte | not in the UK (Libya; resolved to Sirte) |
| Stop Cop City | Cop City | not in the UK (United States; resolved to Cop City) |
| Stop Cop City | South River Forest | not in the UK (United States; resolved to South River Forest) |
| Stop Cop City | DeKalb County, Georgia | not in the UK (United States; resolved to DeKalb County, Georgia) |
| Students Solidarity March | Pakistan | not in the UK (Pakistan; resolved to Pakistan) |
| Tax March | United States | not in the UK (United States; resolved to United States) |
| Tunisian bread riots | Tunisia | not in the UK (Tunisia; resolved to Tunisia) |
| Turkish–Azeri blockade of Armenia | Armenia | not in the UK (Armenia; resolved to Armenia) |
| Turkish–Azeri blockade of Armenia | Republic of Artsakh | not in the UK (no country on Wikidata; resolved to Republic of Artsakh) |
| Unite the Right rally | Charlottesville, Virginia | not in the UK (United States; resolved to Charlottesville, Virginia) |
| United States racial unrest (2020–2023) | United States | not in the UK (United States; resolved to United States) |
| Vita Cortex sit-in | Cork (city) | not in the UK (Ireland; resolved to Cork (city)) |
| Vita Cortex sit-in | Republic of Ireland | not in the UK (Ireland; resolved to Republic of Ireland) |
| Violence and controversies during the George Floyd protests | United States | not in the UK (United States; resolved to United States) |
| Yellow vests protests | France | not in the UK (France; resolved to France) |
| Zimbabwe fuel protests | Zimbabwe | not in the UK (Zimbabwe; resolved to Zimbabwe) |

## Places too broad for a point (the event counts for the nation)

| Event | Place | Why |
|---|---|---|
| 1981 Brixton riot | South London | too broad to place (subregion): counts for E92000001 |
| 1984–1985 United Kingdom miners' strike | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 1984–1985 United Kingdom miners' strike | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| 1984–1985 United Kingdom miners' strike | North East England | too broad to place (region of England ITL 1 statistical regions of England): counts for E92000001 |
| 1984–1985 United Kingdom miners' strike | Derbyshire | too broad to place (ceremonial county of England): counts for E92000001 |
| 1984–1985 United Kingdom miners' strike | Yorkshire | too broad to place (historic county of England historical region): counts for E92000001 |
| 1984–1985 United Kingdom miners' strike | South Wales | too broad to place (region statistical territorial entity): counts for W92000004 |
| 1984–1985 United Kingdom miners' strike | Kent | too broad to place (ceremonial county of England): counts for E92000001 |
| 1985 Brixton riot | South London | too broad to place (subregion): counts for E92000001 |
| 1993 Dundee Timex Strike | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| 1992 Coalisland riots | County Tyrone | too broad to place (county of Northern Ireland historic county of the United Kingdom): counts for N92000002 |
| 1992 Coalisland riots | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 1989–1990 British ambulance strike | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2001 Oldham riots | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| 2001 Harehills riot | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| 2005 Belfast riots | County Antrim | too broad to place (county of Northern Ireland historic county of the United Kingdom): counts for N92000002 |
| 2005 Belfast riots | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2002 Short Strand clashes | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2009 Upton Park riot | East London | too broad to place (subregion): counts for E92000001 |
| 2009 Leeds refuse workers' strike | West Yorkshire | too broad to place (metropolitan county ceremonial county of England): counts for E92000001 |
| 2010 Northern Ireland riots | County Armagh | too broad to place (county of Northern Ireland historic county of the United Kingdom): counts for N92000002 |
| 2011 London anti-cuts protest | Central London | too broad to place (region): counts for E92000001 |
| 2011 England riots | Greater London | too broad to place (ceremonial county of England urban agglomeration): counts for E92000001 |
| 2011 England riots | West Midlands (region) | too broad to place (region of England ITL 1 statistical regions of England): counts for E92000001 |
| 2011 England riots | Merseyside | too broad to place (metropolitan county ceremonial county of England): counts for E92000001 |
| 2011 England riots | East Midlands | too broad to place (region of England ITL 1 statistical regions of England): counts for E92000001 |
| 2011 England riots | Greater Manchester | too broad to place (ceremonial county of England metropolitan county): counts for E92000001 |
| 2013 Bulgarian protests against the first Borisov cabinet | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2012–2013 Ecuador–United Kingdom diplomatic crisis | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2016–2019 United Kingdom railway strikes | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2018 Derry riots | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2019–2020 Maltese protests | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2020 University of Manchester protests | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| 2021 Go North West strike | Greater Manchester | too broad to place (ceremonial county of England metropolitan county): counts for E92000001 |
| 2021 anti-Pakistan protests | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2022–2024 United Kingdom railway strikes | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| 2022–2024 United Kingdom railway strikes | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| 2022–2024 United Kingdom railway strikes | Wales | too broad to place (constituent country of the United Kingdom nation administrative region country nationality for sports): counts for W92000004 |
| 2022–2024 United Kingdom railway strikes | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2022 Scotland bin strikes | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| 2022 Leicester unrest | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| 2022–2023 United Kingdom postal workers' strikes | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2022 Kirkton riot | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| 2022–2024 National Health Service strikes | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2023 Cardiff riot | Wales | too broad to place (constituent country of the United Kingdom nation administrative region country nationality for sports): counts for W92000004 |
| 2024 Harehills riot | West Yorkshire | too broad to place (metropolitan county ceremonial county of England): counts for E92000001 |
| 2024–2026 United Kingdom farmers' protests | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| 2025 Northern Ireland riots | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2025–2026 Birmingham bin strike | West Midlands (county) | too broad to place (metropolitan county ceremonial county of England): counts for E92000001 |
| 2026 Irish fuel protests | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2026 Northern Ireland riots | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| 2026 Northern Ireland riots | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| Anti-austerity movement in the United Kingdom | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| Battle of Orgreave | South Yorkshire | too broad to place (metropolitan county ceremonial county of England): counts for E92000001 |
| Battle of Brightlingsea | Essex | too broad to place (ceremonial county of England): counts for E92000001 |
| Belfast City Hall flag protests | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| George Floyd protests in the United Kingdom | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| Holy Cross dispute | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| July 2001 Belfast riots | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| Occupy Glasgow | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| Occupy Glasgow | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| Occupy Edinburgh | Scotland | too broad to place (constituent country of the United Kingdom nation country): counts for S92000003 |
| Occupy Bath | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| Operation Raise the Colours | Great Britain | too broad to place (island): counts for E92000001 |
| Protests against the Russo-Ukrainian war (2022–present) | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |
| Save the Newchurch Guinea Pigs | Staffordshire | too broad to place (ceremonial county of England): counts for E92000001 |
| Sheffield tree felling protests | South Yorkshire | too broad to place (metropolitan county ceremonial county of England): counts for E92000001 |
| Sheffield tree felling protests | England | too broad to place (constituent country of the United Kingdom cultural area nation country): counts for E92000001 |
| Ulster Workers' Council strike | Northern Ireland | too broad to place (constituent country of the United Kingdom integral overseas territory stateless nation country): counts for N92000002 |
| United Kingdom anti-immigration protests (2025–present) | United Kingdom | too broad to place (sovereign state country colonial power island country): counts for E92000001 |

## Ambiguous place names and how they were resolved

| Event | Name | Resolved to | Wikidata | Country | Decision |
|---|---|---|---|---|---|
| 15 February 2003 Iraq War protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 15 October 2011 global protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 1981 Irish hunger strike | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 1980 St Pauls riot | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1981 England riots | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1981 England riots | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 1981 England riots | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1981 Moss Side riot | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1981 Handsworth riots | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1987 Chapeltown riot | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 1987 Chapeltown riot | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1988 United Kingdom postal workers strike | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 1985 Handsworth riots | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1991 Handsworth riots | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 1991 Handsworth riots | Oxford | Oxford | Q34217 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 20 March 2003 anti-war protest | Aberdeen | Aberdeen | Q36405 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of Scotland, United Kingdom | kept: UK item inside the UK |
| 2005 Birmingham riots | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2006 Islamist demonstration outside the Embassy of Denmark in London | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2009 Iranian presidential election protests | Halifax Regional Municipality | Halifax, Nova Scotia | Q2141 | Canada | removed: not in the UK |
| 2009 Iranian presidential election protests | Hamilton, Ontario | Hamilton, Ontario | Q133116 | Canada | removed: not in the UK |
| 2009 Iranian presidential election protests | London, Ontario | London, Ontario | Q92561 | Canada | removed: not in the UK |
| 2009 Iranian presidential election protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2009 Iranian presidential election protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2009 Iranian presidential election protests | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2009 Iranian presidential election protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2009 Iranian presidential election protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2009 Iranian presidential election protests | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2009 Royal Mail industrial disputes | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2011 Chinese pro-democracy protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2011 England riots | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2012 Romanian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2013 May Day protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2015 Romanian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2017 Women's March | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Perth | Perth | Q3183 | Australia | removed: not in the UK |
| 2017–2019 Romanian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Cambridge | Cambridge | Q350 | United Kingdom, Kingdom of Great Britain, Kingdom of England, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Oxford | Oxford | Q34217 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2017–2019 Romanian protests | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| 2018–2023 United Kingdom higher education strikes | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2018–2023 United Kingdom higher education strikes | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2018–2023 United Kingdom higher education strikes | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2018–2023 United Kingdom higher education strikes | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2019 Lyft and Uber drivers' strikes | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| 2019 Lyft and Uber drivers' strikes | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2020–2022 Serbian protests | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| 2020–2022 Serbian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2020–2021 Bulgarian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2020–2021 Bulgarian protests | Oxford | Oxford | Q34217 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2020–2021 Bulgarian protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2020–2021 Bulgarian protests | Birmingham, UK | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2020–2021 Bulgarian protests | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| 2020–2021 Bulgarian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2020–2021 women's strike protests in Poland | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2020–2021 women's strike protests in Poland | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2020–2021 women's strike protests in Poland | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2020 Indian general strike | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2021 Pakistani protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2021 Brazilian protests | Cambridge | Cambridge | Q350 | United Kingdom, Kingdom of Great Britain, Kingdom of England, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2020 University of Manchester protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2022 Albanian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2023 University of Manchester protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2023 University of Brighton protests | Brighton | Brighton | Q131491 | United Kingdom, United Kingdom of Great Britain and Ireland | kept: UK item inside the UK |
| 2024 Boston University strikes | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| 2024 Armenian protests | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| 2024 Armenian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2024 United Kingdom riots | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2024 United Kingdom riots | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2025–2026 Birmingham bin strike | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2026 Iranian diaspora protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2026 Iranian diaspora protests | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2026 Clapham unrest | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2026 Delhi Jantar Mantar protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| 2026 Delhi Jantar Mantar protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Actions against memorials in the United Kingdom during the George Floyd protests | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| 2026 Victoria and Albert Museum strikes | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| April 2009 Moldovan parliamentary election protests | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| April 2009 Moldovan parliamentary election protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Balcombe drilling protest | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Battle of Lewisham | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Bersih 2.0 rally | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Bersih 3.0 rally | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Bersih 3.0 rally | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Camp for Climate Action | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| COVID-19 protests in the United Kingdom | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| COVID-19 protests in the United Kingdom | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| COVID-19 protests in the United Kingdom | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| COVID-19 protests in the United Kingdom | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Citizenship Amendment Act protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Crisis situations and unrest in Europe since 2000 | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Crisis situations and unrest in Europe since 2000 | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Deaths in March 2012 | Portsmouth | Portsmouth | Q72259 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Dupax del Norte anti-mining protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| February 1999 Kurdish protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Ferguson unrest | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Freedom Convoy | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Fuel protests in the United Kingdom | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Gaza war protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Gaza war protests | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Gaza war protests in the United Kingdom | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Gaza war protests in the United Kingdom | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Gaza war protests in the United Kingdom | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Gaza war protests at universities | Oxford | Oxford | Q34217 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Gaza war protests at universities | Cambridge | Cambridge | Q350 | United Kingdom, Kingdom of Great Britain, Kingdom of England, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| George Floyd protests | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Grunwick dispute | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Halloween 2002 anti-war protest | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Halloween 2002 anti-war protest | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Halloween 2002 anti-war protest | Brighton | Brighton | Q131491 | United Kingdom, United Kingdom of Great Britain and Ireland | kept: UK item inside the UK |
| Halloween 2002 anti-war protest | Cambridge | Cambridge | Q350 | United Kingdom, Kingdom of Great Britain, Kingdom of England, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Hunger strike | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Hunger strike | Aberdeen | Aberdeen | Q36405 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of Scotland, United Kingdom | kept: UK item inside the UK |
| International Women's Strike | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| June 2013 Egyptian protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| June 2025 No Kings protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| M11 link road protest | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| March 19, 2008, anti-war protest | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| March 1980 | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| March 1981 | Newport, Wales | Newport, Wales | Q101254 | United Kingdom | kept: UK item inside the UK |
| March 1982 | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| March 1977 | Newport, Wales | Newport, Wales | Q101254 | United Kingdom | kept: UK item inside the UK |
| March 1976 | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| March for Our Lives (demonstration) | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| March for Science 2018 | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Media censorship and disinformation during the Gezi Park protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Occupation (protest) | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Occupy Boston | Boston | Boston | Q100 | United States, Province of Massachusetts Bay, Massachusetts Bay Colony | removed: not in the UK |
| Occupy London | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| October 2018 protests in Armenia | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| People's March | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| People's March | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Picketing | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against the Iraq War | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against the Iraq War | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against the Iraq War | Brighton | Brighton | Q131491 | United Kingdom, United Kingdom of Great Britain and Ireland | kept: UK item inside the UK |
| Protests against the Iraq War | Oxford | Oxford | Q34217 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Project Chanology | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Project Chanology | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Project Chanology | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Project Chanology | York | York | Q42462 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England, Kingdom of Northumbria | kept: UK item inside the UK |
| Protests against the 2011 military intervention in Libya | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against Donald Trump | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against Donald Trump | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against Executive Order 13769 | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against Executive Order 13769 | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against responses to the COVID-19 pandemic | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against responses to the COVID-19 pandemic | Birmingham | Birmingham | Q2256 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against responses to the COVID-19 pandemic | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against the 2026 Iran war | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against the war in Afghanistan | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against the war in Afghanistan | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Protests against the Sri Lankan civil war | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Protests against the Russo-Ukrainian war (2022–present) | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Riot control | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Riot control | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Rock Machine–Rebels conflict | Perth | Perth | Q3183 | Australia | removed: not in the UK |
| Scottish football referee strike | Aberdeen | Aberdeen | Q36405 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of Scotland, United Kingdom | kept: UK item inside the UK |
| September 2019 climate strikes | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| September 2019 climate strikes | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| September 2019 climate strikes | Brighton | Brighton | Q131491 | United Kingdom, United Kingdom of Great Britain and Ireland | kept: UK item inside the UK |
| September 2019 climate strikes | Dover | Dover | Q179224 | United Kingdom | kept: UK item inside the UK |
| Star Hotel riot | Newcastle, New South Wales | Newcastle, New South Wales | Q57278 | Australia | removed: not in the UK |
| Stop the City | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Strangeways Prison riot | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Student protest | Manchester | Manchester | Q18125 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Student protest | Brighton | Brighton | Q131491 | United Kingdom, United Kingdom of Great Britain and Ireland | kept: UK item inside the UK |
| Student protest | Newport, Wales | Newport, Wales | Q101254 | United Kingdom | kept: UK item inside the UK |
| Tax March | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| United States racial unrest (2020–2023) | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| United States racial unrest (2020–2023) | Bristol | Bristol | Q23154 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of England | kept: UK item inside the UK |
| Wapping dispute | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Violence and controversies during the George Floyd protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| Yellow vests protests | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| YS4C Protests 14 February 2020 | London | London | Q84 | Roman Empire, Kingdom of Essex, Kingdom of Mercia, Kingdom of Wessex, Kingdom of England, Kingdom of Great Britain, United Kingdom of Great Britain and Ireland, United Kingdom | kept: UK item inside the UK |
| YS4C Protests 14 February 2020 | Aberdeen | Aberdeen | Q36405 | United Kingdom, United Kingdom of Great Britain and Ireland, Kingdom of Great Britain, Kingdom of Scotland, United Kingdom | kept: UK item inside the UK |
| YS4C Protests 14 February 2020 | Brighton | Brighton | Q131491 | United Kingdom, United Kingdom of Great Britain and Ireland | kept: UK item inside the UK |

## UK parts of international protests

| Event | UK sites kept | Crowd shown |
|---|---|---|
| 15 October 2011 global protests | London, Edinburgh | UK figure from the article: “In what became known as Occupy London, 5,000 people gathered outside the London Stock Exchange, ending up setting a camp that remained there for three” |
| 2006 Islamist demonstration outside the Embassy of Denmark in London | London, Downing Street | none (global figure only) |
| 2009 Iranian presidential election protests | London, Edinburgh, Glasgow, Manchester, Sheffield, Nottingham, Bristol | none (global figure only) |
| 2011 Chinese pro-democracy protests | London | none (global figure only) |
| 2017 Women's March | London | none (global figure only) |
| 2020–2021 Bulgarian protests | London | none (global figure only) |
| 2020–2021 women's strike protests in Poland | London, Manchester, Leeds, Sheffield, Bristol, Nottingham, Glasgow, Edinburgh | none (global figure only) |
| 2020 Indian general strike | London | none (global figure only) |
| 2021 Pakistani protests | London | none (global figure only) |
| 2021 Brazilian protests | Cambridge | none (global figure only) |
| 2026 Iranian diaspora protests | London, Birmingham | none (global figure only) |
| 2026 Azad Kashmir protests | Sheffield, Nottingham | none (global figure only) |
| 2026 Delhi Jantar Mantar protests | London, Manchester, Glasgow, Edinburgh, Trafalgar Square | none (global figure only) |
| Bersih 2.0 rally | London | none (global figure only) |
| Bersih 3.0 rally | London, Manchester, Newcastle upon Tyne, Nottingham, Edinburgh | none (global figure only) |
| Citizenship Amendment Act protests | London, Edinburgh | none (global figure only) |
| Dupax del Norte anti-mining protests | London | none (global figure only) |
| Ferguson unrest | London | none (global figure only) |
| Freedom Convoy | London | none (global figure only) |
| Gaza war protests | London, Manchester, Glasgow, Edinburgh, Cardiff, Exeter, Parliament Square | none (global figure only) |
| Gaza war protests at universities | Oxford, Cambridge, Exeter | none (global figure only) |
| George Floyd protests | Bristol | none (global figure only) |
| International Women's Strike | London | none (global figure only) |
| June 2013 Egyptian protests | London | UK figure from the article: “Unjum Mirza of Britain's RMT Union gave a speech of solidarity with the protesters in Egypt on behalf of the union in front of the Egyptian embassy in” |
| June 2025 No Kings protests | London, Edinburgh | none (global figure only) |
| March for Our Lives (demonstration) | London, Edinburgh | none (global figure only) |
| March for Science 2018 | London | none (global figure only) |
| People's March | London, Manchester, Liverpool, Sheffield | none (global figure only) |
| Protests against the Iraq War | London, Manchester, Glasgow, Edinburgh, Brighton, Oxford, Trafalgar Square | none (global figure only) |
| Protests against Donald Trump | London, Manchester, Liverpool, Edinburgh, Trafalgar Square | UK figure from the article: “One large rally was held at Trafalgar Square, London with UK opposition leader Jeremy Corbyn among speakers who spoke to reportedly over 100,000 atten” |
| Protests against Executive Order 13769 | London, Manchester, Liverpool, Leeds, Sheffield, Newcastle upon Tyne, Leicester, Glasgow | none (global figure only) |
| Protests against responses to the COVID-19 pandemic | London, Birmingham, Manchester, Liverpool, Leeds, Glasgow, Belfast | none (global figure only) |
| Protests against the 2026 Iran war | London | none (global figure only) |
| Protests against the war in Afghanistan | London, Manchester, Glasgow, Edinburgh, Trafalgar Square, Hyde Park, London, Downing Street | UK figure from the article: “In Glasgow, Scotland, United Kingdom, around 1,500 people gathered in George Square for a rally against the military action in Afghanistan.” |
| Protests against the Russo-Ukrainian war (2022–present) | London | none (global figure only) |
| September 2019 climate strikes | London, Bristol, Edinburgh, Brighton, Dover | UK figure from the article: “Organisers said that roughly 300,000 people participated in strikes across the country, with 100,000 attendees of a London rally, where politician Jer” |
| Tax March | London | none (global figure only) |
| United States racial unrest (2020–2023) | London, Bristol, Parliament Square | none (global figure only) |
| Violence and controversies during the George Floyd protests | London, Newcastle upon Tyne, Hyde Park, London, Downing Street, Parliament Square | none (global figure only) |
| Yellow vests protests | London | none (global figure only) |

## Changes since the previous file (Atlas 1.7)

- Events no longer included: 32: 1997 Coalisland attack; 2001 South Armagh attacks; 2006 Dublin riots; 2010 United Kingdom student protests; 2010 student protest in Dublin; 2012 Romanian constitutional crisis; 2012 Romanian protests; 2015 Romanian protests; 2017–2019 Romanian protests; 2018 Armenian Revolution; 2021 Dublin riots; 2023 Dublin riot; 2024 Armenian protests; 2024 Southport stabbings; 2026 Irish fuel protests; 2026 Irish public sector strikes; Anti-austerity movement in Ireland; April 2009 Moldovan parliamentary election protests; Death of Edson Da Costa; Death of Ian Tomlinson; Death of Jill Phipps; Death of Joy Gardner; Drogheda feud; Irish anti-immigration protests; Killing of Mark Duggan; Murder of Yvonne Fletcher; Occupy Dame Street; October 2018 protests in Armenia; Stardust fire; Thames Diamond Jubilee Pageant; Timeline of the 2011 England riots; Vita Cortex sit-in
- New events: 112: 15 February 2003 Iraq War protests; 15 October 2011 global protests; 1975 Chapeltown riot; 1981 Irish hunger strike; 1981 Moss Side riot; 1987 Chapeltown riot; 1988 United Kingdom postal workers strike; 1989–1990 British ambulance strike; 1991 Handsworth riots; 1995 Brixton riot; 20 March 2003 anti-war protest; 2002–2003 United Kingdom firefighter dispute; 2006 Islamist demonstration outside the Embassy of Denmark in London; 2009 G20 London summit protests; 2009 Lindsey Oil Refinery strikes; 2009 Royal Mail industrial disputes; 2011 Chinese pro-democracy protests; 2011 Hetherington House Occupation; 2013 May Day protests; 2013 United Kingdom higher education strike; 2016–2019 United Kingdom railway strikes; 2017 Women's March; 2018–2023 United Kingdom higher education strikes; 2020 Indian general strike; 2020–2021 women's strike protests in Poland; 2021 Brazilian protests; 2021 Pakistani protests; 2021–2023 Stagecoach strikes; 2022 Albanian protests; 2022 BT Group strikes; 2022 Scotland bin strikes; 2022–2023 United Kingdom postal workers' strikes; 2022–2024 National Health Service strikes; 2022–2024 United Kingdom railway strikes; 2023 United Kingdom pupil protests; 2024–2026 United Kingdom farmers' protests; 2025 Prisoners for Palestine hunger strike; 2026 Azad Kashmir protests; 2026 Delhi Jantar Mantar protests; 2026 Iranian diaspora protests; Actions against memorials in the United Kingdom during the George Floyd protests; Armagh Prison no-wash protest; Balcombe drilling protest; Bersih 2.0 rally; Bersih 3.0 rally; Broadwater Farm riot; COVID-19 protests in the United Kingdom; Camp Bling; Camp for Climate Action; Citizenship Amendment Act protests; Crisis situations and unrest in Europe since 2000; Deaths in March 2012; Dirty protest; Dupax del Norte anti-mining protests; Faslane Peace Camp; Ferguson unrest; Freedom Convoy; Fuel protests in the United Kingdom; Gaza war protests; Gaza war protests at universities; Gaza war protests in the United Kingdom; George Floyd protests; George Floyd protests in the United Kingdom; Glasgow school closures protest, 2009; Grunwick dispute; Halloween 2002 anti-war protest; Hunger strike; International Women's Strike; June 2013 Egyptian protests; June 2025 No Kings protests; March 19, 2008, anti-war protest; March 1976; March 1977; March 1979; March 1980; March 1981; March 1982; March and Rally for Scottish Independence; March for Our Lives (demonstration); March for Science 2018; Media censorship and disinformation during the Gezi Park protests; November 2001 Belfast riots; Nursery nurses strike; Occupation (protest); Peace Parade UK; People's March; Picketing; Political demonstration; Project Chanology; Protests against Donald Trump; Protests against Executive Order 13769; Protests against responses to the COVID-19 pandemic; Protests against the 2011 military intervention in Libya; Protests against the 2026 Iran war; Protests against the Iraq War; Protests against the Sri Lankan civil war; Protests against the war in Afghanistan; Riot control; Scottish football referee strike; September 2019 climate strikes; September 24, 2005, anti-war protest; Stop the City; Strangeways Prison riot; Student protest; Tax March; Ulster Says No; Ulster Workers' Council strike; United States racial unrest (2020–2023); Violence and controversies during the George Floyd protests; Wapping dispute; YS4C Protests 14 February 2020; Yellow vests protests

Sites removed from events that stayed:

| Event | Site |
|---|---|
| 1981 Brixton riot | South London |
| Battle of Orgreave | South Yorkshire |
| 1984–1985 United Kingdom miners' strike | North East England |
| 1984–1985 United Kingdom miners' strike | Derbyshire |
| 1984–1985 United Kingdom miners' strike | Yorkshire |
| 1984–1985 United Kingdom miners' strike | South Wales |
| 1984–1985 United Kingdom miners' strike | Kent |
| 1985 Brixton riot | South London |
| M11 link road protest | M11 link road protest |
| Cardiff Ely bread riots | Cardiff Ely bread riots |
| Battle of Brightlingsea | Essex |
| 2005 Belfast riots | County Antrim |
| 2009 Iranian presidential election protests | Dublin |
| 2009 Upton Park riot | East London |
| 2009 Leeds refuse workers' strike | West Yorkshire |
| 2010 Northern Ireland riots | County Armagh |
| 2011 London anti-cuts protest | Central London |
| 2011 England riots | Greater London |
| 2011 England riots | West Midlands (region) |
| 2011 England riots | Merseyside |
| 2011 England riots | East Midlands |
| 2011 England riots | Greater Manchester |
| Occupy London | Occupy London |
| Sheffield tree felling protests | South Yorkshire |
| 2020–2021 Bulgarian protests | Oxford |
| 2020–2021 Bulgarian protests | Exeter |
| 2020–2021 Bulgarian protests | Manchester |
| 2020–2021 Bulgarian protests | Birmingham |
| 2020–2021 Bulgarian protests | Brighton and Hove |
| Insulate Britain protests | Port of Dover |
| 2021 Go North West strike | Greater Manchester |
| Protests against the Russo-Ukrainian war (2022–present) | Republic of Ireland |
| 2024 Harehills riot | West Yorkshire |
| 2024 United Kingdom riots | 2024 United Kingdom riots |
| 2025–2026 Birmingham bin strike | West Midlands (county) |

Sites moved by more than 1 km:

_None._


## Spot check: 15 events against their Wikipedia articles

`pipeline/spotcheck_protests.py` re-read each article on 2026-10-28 and compared it with Atlas's record. 14 of 15 agree on every point; the 15th agrees on reading (note below).

| Event | Date | Places | Crowd | Verdict |
|---|---|---|---|---|
| Ulster Workers' Council strike | match | no point: counted for N92000002 | none shown | agrees |
| 1981 England riots | match | 6 of 6 named | none shown | agrees |
| 1985 Handsworth riots | match | 2 of 2 named | none shown | agrees |
| 1992 Coalisland riots | match | 1 of 1 named | none shown | agrees |
| July 2001 Belfast riots | match | 1 of 1 named | none shown | agrees |
| 2006 Islamist demonstration outside the Embassy of Denmark in London | match | 2 of 2 named | none shown (The source's crowd figure is for the whole international protest, so none is shown for the UK) | agrees |
| Camp for Climate Action | match | 3 of 3 named | none shown | agrees |
| 2011 England riots | match | 1 of 1 named | none shown | agrees |
| 2013 United Kingdom higher education strike | match | 1 of 1 named | none shown | agrees |
| 2018–2023 United Kingdom higher education strikes | match | 7 of 8 named | none shown | check |
| United States racial unrest (2020–2023) | match | 3 of 3 named | none shown (The source's crowd figure is for the whole international protest, so none is shown for the UK) | agrees |
| Camp Beagle | match | 1 of 1 named | none shown | agrees |
| 2022–2023 University of Sheffield protests | match | 1 of 1 named | none shown | agrees |
| People's March | match | 4 of 4 named | none shown (The source's crowd figure is for the whole international protest, so none is shown for the UK) | agrees |
| 2026 Victoria and Albert Museum strikes | match | 1 of 1 named | found (700) | agrees |

- 2018–2023 United Kingdom higher education strikes: the eighth site, Newcastle upon Tyne, is named in the article as “Newcastle” (the city's university), in its UK section; Atlas files it under the city's full name. Agrees on reading.
- Reviewed by hand as well: the dates match each infobox, every point lies in the town the article names, and the three international events show no crowd because their articles give only worldwide figures.
- Known gap: one of the 20 Wikipedia searches (a CirrusSearch query) was refused as “too busy” during the first crawl; the category crawl and the other searches cover the same ground, and re-running fetch_protests.py repeats it.
