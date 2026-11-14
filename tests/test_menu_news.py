"""
Atlas 0.13 (Mo's note, 13 Nov): in a heading's contents page, opening a section makes it grow to the left over two
columns, the other sections go, and News about it fills the other two: three stories, the most relevant first with its
picture, two more below without. Each story names its source and links to it. Choosing a row in the section re-aims the
news at that row; closing the section brings every column back. Political money has Who got it, Biggest donors, Money
and contracts and Access; sections with identical rows appear once.   python tests/test_menu_news.py
"""
from atlas_test import server, browser, open_atlas, Report

COLS = "() => [...document.querySelectorAll('#mega .mgc-col [data-mcol]')].map(x => x.querySelector('span').textContent)"


def main():
    rep = Report("menu_news")
    with server() as base, browser() as b:
        page = open_atlas(b, base, (1440, 900), query="debug#app=markets")
        js = page.evaluate
        page.wait_for_timeout(2500)
        js("() => document.querySelector('[data-agroup=\"0\"]').click()"); page.wait_for_timeout(900)
        trade = js(COLS)
        rep.check(not ("Export partners" in trade and "Who buys from us" in trade) and len(trade) == len(set(trade)), f"sections with the same rows appear once ({trade})")
        n0 = len(trade)
        js("() => [...document.querySelectorAll('#mega [data-mcol]')][1].click()"); page.wait_for_timeout(4500)
        s = js("""() => { const w = document.querySelector('#mega .mgc-wide'), n = document.querySelector('#mega .mgc-news'), gs = e => getComputedStyle(e);
          return { cols: document.querySelectorAll('#mega .mgc-col').length, wide: w && gs(w).gridColumnStart + '/' + gs(w).gridColumnEnd, news: n && gs(n).gridColumnStart + '/' + gs(n).gridColumnEnd,
            wl: w && Math.round(w.getBoundingClientRect().left), nl: n && Math.round(n.getBoundingClientRect().left), stories: [...document.querySelectorAll('#mega .mgc-ns')].map(a => ({ lead: a.classList.contains('lead'), img: !!a.querySelector('img'), href: a.href, src: a.querySelector('small').textContent, blank: a.target })) }; }""")
        rep.check(s["cols"] == 1 and s["wide"] == "1/span 2", f"the open section grows to the left over two columns and the others go ({s['cols']}, {s['wide']})")
        rep.check(s["news"] == "3/span 2" and s["nl"] > s["wl"], f"News takes the other two columns ({s['news']})")
        st = s["stories"]
        rep.check(len(st) == 3, f"three stories ({len(st)})")
        rep.check(len(st) == 3 and st[0]["lead"] and not st[1]["img"] and not st[2]["img"], "the first is the lead; the two below have no pictures")
        rep.check(any(x["img"] for x in st[:1]), "the lead story has a picture")
        rep.check(all(x["href"].startswith("http") and x["blank"] == "_blank" and len(x["src"]) > 4 for x in st), f"each names its source and links to the original ({[x['src'][:30] for x in st]})")
        about0 = js("() => document.querySelector('#mega .mgc-nabout').textContent")
        js("() => document.querySelector('#mega .mgc-it .mg-go').click()"); page.wait_for_timeout(3500)
        row = js("() => document.querySelector('#mega .mgc-it.on .mg-l')?.textContent")
        about1 = js("() => document.querySelector('#mega .mgc-nabout')?.textContent")
        rep.check(row and about1 == row and about1 != about0, f"choosing a row re-aims the news at it ({about0!r} → {about1!r})")
        js("() => document.querySelector('#mega .mgc-wide [data-mcol]').click()"); page.wait_for_timeout(700)
        rep.check(js("() => document.querySelectorAll('#mega .mgc-col').length") == n0 and not js("() => !!document.querySelector('#mega .mgc-news')"), "closing it brings every section back")
        page.keyboard.press("Escape"); page.wait_for_timeout(300)
        js("() => document.querySelector('[data-agroup=\"3\"]').click()"); page.wait_for_timeout(900)
        money = js(COLS)
        rep.check(money[:4] == ["Who got it", "Biggest donors", "Money and contracts", "Access"], f"Political money: Who got it, Biggest donors, Money and contracts, Access ({money})")
        rep.check(not page.errors, f"no errors ({page.errors[:3]})")
    rep.done()


if __name__ == "__main__":
    main()
