"""End-to-end smoke test. Run: python3 tests/smoke.py
Serves the repo on a local port and drives the app in Chromium (and WebKit when installed)
at an iPhone-sized 390x844 viewport and a 1280x800 desktop viewport, in light and dark mode.
Screenshots go to screenshots/."""
import functools, http.server, os, socketserver, sys, threading, json, re
from playwright.sync_api import sync_playwright, expect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.path.join(ROOT, "screenshots")
os.makedirs(SHOTS, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/"

NOTE = "Remind me to call the florist tomorrow at 10am. Maya's birthday is March 4, 1992. Maya's favorite food is pad thai."
results = []

def check(name, fn):
    try:
        fn(); results.append((name, True, "")); print("  ok  ", name)
    except Exception as e:
        results.append((name, False, str(e).splitlines()[0][:300])); print("  FAIL", name, "->", str(e).splitlines()[0][:300])

def run(p, engine, w, h, scheme):
    mobile = w < 861
    tag = f"{engine}-{w}x{h}-{scheme}"
    print(f"\n[{tag}]")
    browser = getattr(p, engine).launch()
    ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme=scheme, accept_downloads=True,
                              device_scale_factor=2 if mobile else 1, has_touch=mobile)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_selector("#items .item")
    shot = lambda n: page.screenshot(path=os.path.join(SHOTS, f"{tag}-{n}.png"))

    def nav(view):
        if mobile:
            if page.locator("#dbBack").is_visible(): page.click("#dbBack")
            if page.locator("#back").is_visible(): page.click("#back")
            page.click(f"#chips [data-view={view}]")
        else:
            page.click(f"#side [data-view={view}]")

    def shell():
        expect(page.locator("#items")).to_be_visible(); shot("1-list")
        r = page.request.get(URL + "manifest.webmanifest"); assert r.ok and json.loads(r.text())["display"] == "standalone"
        assert page.request.get(URL + "sw.js").ok and page.request.get(URL + "icons/apple-touch-icon.png").ok
        page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r=>!!r)", timeout=10000) if engine == "chromium" else None
    check("app shell, manifest, service worker", shell)

    def create():
        page.click("#newBtn"); page.fill("#ta", NOTE)
        expect(page.locator("#remBox")).to_contain_text("Tomorrow")
        expect(page.locator("#remCal")).to_be_visible()
        expect(page.locator("#calHint")).to_be_visible()
        shot("2-editor")
    check("create note + date detected + calendar button", create)

    def person_auto():
        page.evaluate("document.activeElement.blur()")
        expect(page.locator("#toast")).to_contain_text("Maya")
        nav("people")
        row = page.locator("[data-pid]", has_text="Maya")
        expect(row).to_have_count(1); expect(row).to_contain_text("pad thai")
        row.click()
        expect(page.locator("[data-pf=bm]")).to_have_value("3"); expect(page.locator("[data-pf=bd]")).to_have_value("4")
        expect(page.locator("[data-pf=by]")).to_have_value("1992")
        expect(page.locator("#bnote")).to_contain_text(re.compile(r"Birthday (in \d+ days|today|tomorrow)", re.I))
        expect(page.locator("#ment [data-mention]")).to_contain_text("Remind me to call the florist")
        shot("4-person")
    check("person auto-created with birthday + favorite + mentions", person_auto)

    def birthday_no_reminder():
        # the birthday sentence alone must not create a reminder; the florist reminder must be the only new one
        n = page.evaluate("S.notes.filter(n=>n.body.includes('florist'))[0].reminder.at")
        assert abs(n - page.evaluate("(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);return +d})()")) < 1000
    check("birthday sentence does not hijack the reminder", birthday_no_reminder)

    def mention_link():
        page.locator("#ment [data-mention]").first.click()
        expect(page.locator("#ta")).to_have_value(NOTE)
    check("'Mentioned in' links back to the note", mention_link)

    def reminders():
        nav("reminders")
        expect(page.locator("#items .item", has_text="call the florist")).to_have_count(1)
        expect(page.locator("#items [data-cal]").first).to_be_visible()
        expect(page.locator("#items")).to_contain_text("Birthdays")
        shot("3-reminders")
    check("reminder appears under Reminders (+ calendar button, birthdays)", reminders)

    def manual_person():
        nav("people"); page.click("#newBtn"); page.fill("#pname", "Lee Park")
        page.select_option("[data-pf=bm]", "12"); page.fill("[data-pf=bd]", "25")
        expect(page.locator("#bnote")).to_contain_text(re.compile(r"Birthday (in \d+ days|today|tomorrow)", re.I))
        with page.expect_download() as d: page.click("#pcal")
        ics = open(d.value.path()).read()
        assert "RRULE:FREQ=YEARLY" in ics and "Lee Park's birthday" in ics, ics[:200]
        page.click("#pdel"); expect(page.locator("[data-pid]", has_text="Lee Park")).to_have_count(0)
        page.click("#tAct"); expect(page.locator("[data-pid]", has_text="Lee Park").first).to_be_visible()
        page.wait_for_timeout(400); page.reload(); page.wait_for_selector("#items .item")
        assert page.evaluate("S.people.filter(p=>p.name==='Lee Park').length") == 1, "undo did not persist"
    check("add person manually, yearly .ics, delete + undo", manual_person)

    def first_name_match():
        nav("all"); page.click("#newBtn"); page.fill("#ta", "Lee's favorite drink is matcha.")
        page.evaluate("document.activeElement.blur()")
        expect(page.locator("#toast")).to_contain_text("Updated Lee")
        assert page.evaluate("S.people.filter(p=>p.name.startsWith('Lee')).length") == 1
        assert page.evaluate("S.people.find(p=>p.name==='Lee Park').favorites.some(f=>f.v==='matcha')")
    check("existing person matched by first name", first_name_match)

    def persist():
        page.wait_for_timeout(600)  # let debounced IndexedDB writes land
        page.reload(); page.wait_for_selector("#items .item")
        assert page.evaluate("S.notes.some(n=>n.body.includes('florist'))")
        assert page.evaluate("S.people.some(p=>p.name==='Maya'&&p.birthday&&p.birthday.m===3)")
    check("data survives reload", persist)

    def roundtrip():
        nav("db"); expect(page.locator("#dbview")).to_be_visible(); shot("5-database")
        with page.expect_download() as d: page.click("#exJson")
        path = d.value.path(); data = json.load(open(path))
        assert data["app"] == "recall" and any("florist" in n["body"] for n in data["notes"])
        before = page.evaluate("S.notes.length")
        page.evaluate("(async()=>{for(const n of S.notes.filter(n=>n.body.includes('florist'))){S.notes.splice(S.notes.indexOf(n),1);await dbDel(n.id)}})()")
        assert page.evaluate("S.notes.length") == before - 1
        page.set_input_files("#impF", path)
        expect(page.locator("#toast")).to_contain_text("Imported")
        assert page.evaluate("S.notes.length") == before
        with page.expect_download() as d: page.click("#exCsv")
        assert "florist" in open(d.value.path()).read()
    check("export JSON/CSV then import round-trips", roundtrip)

    def delete_undo():
        nav("all"); page.locator("#items .item", has_text="call the florist").click()
        page.click("#del"); expect(page.locator("#items .item", has_text="call the florist")).to_have_count(0)
        page.click("#tAct"); expect(page.locator("#items .item", has_text="call the florist")).to_have_count(1)
        page.wait_for_timeout(300); page.reload(); page.wait_for_selector("#items .item")
        assert page.evaluate("S.notes.some(n=>n.body.includes('florist'))")
    check("delete then undo (and undo persists)", delete_undo)

    def capture_fallback():
        # Simulate iPhone Home Screen app with built-in dictation unavailable.
        page.evaluate("srBroken=true")
        nav("all"); page.click("#fab")
        expect(page.locator("#ta")).to_be_focused()
        expect(page.locator("#toast")).to_contain_text("Tap the microphone on your keyboard.")
        expect(page.locator("#kbHint")).to_be_visible()
        shot("6-capture-fallback")
    check("Capture focuses text area; keyboard-mic fallback", capture_fallback)

    def links():
        nav("all"); page.click("#newBtn"); page.fill("#ta", "Trip plan\nPack light.")
        if mobile: page.click("#back")
        page.click("#newBtn"); page.fill("#ta", "Packing list\nSee [[Trip plan]] and [[Budget sheet]]")
        expect(page.locator("#linkBox [data-mention]", has_text="Trip plan")).to_have_count(1)
        expect(page.locator("#linkBox [data-newlink]")).to_contain_text("Budget sheet")
        shot("7-links")
        page.locator("#linkBox [data-mention]", has_text="Trip plan").click()
        expect(page.locator("#ta")).to_have_value("Trip plan\nPack light.")
        expect(page.locator("#linkBox")).to_contain_text("Linked from")
        expect(page.locator("#linkBox [data-mention]", has_text="Packing list")).to_have_count(1)
        page.locator("#linkBox [data-mention]", has_text="Packing list").click()
        page.click("#linkBox [data-newlink]")
        expect(page.locator("#ta")).to_have_value("Budget sheet\n")
        assert page.evaluate("S.notes.filter(n=>n.body.startsWith('Budget sheet')).length") == 1
    check("[[links]], backlinks, create-from-link", links)

    def learned():
        page.evaluate("""(async()=>{const old=newNote('Learned: old lesson about tides');old.created=Date.now()-21*864e5;S.notes.push(old);await dbPut(old)})()""")
        nav("learning")
        expect(page.locator("#ltitle")).to_have_text("What I learned")
        expect(page.locator("#items .grp").first).to_contain_text("This week")
        expect(page.locator("#items .grp", has_text="Week of")).to_have_count(1)
        shot("8-learned")
    check("What I learned grouped by week", learned)

    def no_overflow():
        for v in ["all", "reminders", "people", "db"]:
            nav(v); page.wait_for_timeout(100)
            sw = page.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)")
            assert sw <= w + 1, f"{v}: page is {sw}px wide in a {w}px viewport"
    check("no horizontal overflow", no_overflow)

    def no_console_errors():
        bad = [e for e in errors if "favicon" not in e]
        assert not bad, bad
    check("no console errors", no_console_errors)
    ctx.close(); browser.close()

with sync_playwright() as p:
    engines = ["chromium"]
    try:
        b = p.webkit.launch(); b.close(); engines.append("webkit")
    except Exception as e:
        print("webkit unavailable:", str(e).splitlines()[0])
    only = os.environ.get("SMOKE_QUICK"); pick = os.environ.get("SMOKE_ONLY", "")
    for engine in engines:
        for (w, h) in [(390, 844), (1280, 800)]:
            for scheme in (["light"] if only else ["light", "dark"]):
                if pick in f"{engine}-{w}": run(p, engine, w, h, scheme)

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
srv.shutdown()
sys.exit(1 if failed else 0)
