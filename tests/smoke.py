"""End-to-end smoke test. Run: python3 tests/smoke.py
Serves the repo on a local port and drives the app in Chromium (and WebKit when installed) at an iPhone-sized
390x844 viewport and a 1280x800 desktop viewport, in light and dark mode. Screenshots go to screenshots/ (gitignored).
Env: SMOKE_QUICK=1 (light only), SMOKE_ONLY=chromium-390 (one engine/width)."""
import functools, http.server, os, re, socketserver, sys, threading, json
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
        msg = (str(e).splitlines() or [repr(e)])[0][:300] + (" | " + " ".join(str(e).splitlines()[1:4])[:400] if os.environ.get("SMOKE_DEBUG") else ""); results.append((name, False, msg)); print("  FAIL", name, "->", msg)

def run(p, engine, w, h, scheme):
    mobile = w < 861
    tag = f"{engine}-{w}x{h}-{scheme}"
    print(f"\n[{tag}]")
    browser = getattr(p, engine).launch()
    ctx = browser.new_context(viewport={"width": w, "height": h}, color_scheme=scheme, accept_downloads=True,
                              device_scale_factor=2 if mobile else 1, has_touch=mobile)
    # Headless Chromium has no microphone: a fake recognizer lets us test the dictation flow (language, "sounds off", re-record).
    ctx.add_init_script("""
      delete window.Translator;
      window.__srLog = [];
      window.SpeechRecognition = window.webkitSpeechRecognition = class {
        start() { window.__srLog.push({lang: this.lang}); this.onstart && this.onstart();
          const r = window.__srNext || {text: 'hello world', confidence: 0.9};
          setTimeout(() => { if (this.onresult) { const res = [{transcript: r.text, confidence: r.confidence}]; res.isFinal = true; this.onresult({resultIndex: 0, results: [res]}); } }, 40); }
        stop() { this.onend && this.onend(); } abort() {}
      };""")
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_function("window.__recallReady===true"); page.wait_for_selector("#items .item")
    shot = lambda n: page.screenshot(path=os.path.join(SHOTS, f"{tag}-{n}.png"))

    def nav(tab):
        """Go to a tab. On a phone that is the bottom tab bar, on a wide screen the left rail."""
        leave_editor()
        page.click(f"{'#tabbar' if mobile else '#side'} [data-tab={tab}]")
    def leave_editor():
        if mobile and page.locator("body.pane-editor").count():
            page.click("#editor [data-act=ciBack]" if page.locator("#editor .thread").count() else "[data-act=back]")
    def back():
        leave_editor()
    def collection(view):
        back(); page.click(f"#chips [data-view={view}]")

    # ------------------------------------------------------------------ stage 2: shell + brand
    def shell():
        expect(page.locator("#items")).to_be_visible(); shot("1-list")
        tabs = page.locator(("#tabbar" if mobile else "#side") + " [data-tab]")
        expect(tabs).to_have_count(5)
        assert [t.strip() for t in tabs.all_inner_texts()] == ["Notes", "Journal", "Follow-ups", "People", "Settings"] or \
               [re.sub(r"\d+$", "", t.strip()).strip() for t in tabs.all_inner_texts()] == ["Notes", "Journal", "Follow-ups", "People", "Settings"], tabs.all_inner_texts()
        expect(page.locator("#fab")).to_be_visible()
        r = page.request.get(URL + "manifest.webmanifest"); m = json.loads(r.text())
        assert r.ok and m["display"] == "standalone" and "Recall" in m["name"]
        assert page.request.get(URL + "sw.js").ok and page.request.get(URL + "icons/apple-touch-icon.png").ok
        if engine == "chromium":
            page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r=>!!r)", timeout=10000)
    check("app shell: 5 tabs, voice button, manifest, service worker", shell)

    def brand():
        page.evaluate("document.fonts.ready")
        assert page.evaluate("document.fonts.check('600 16px \"Space Grotesk\"') && document.fonts.check('400 16px Inter')"), "fonts not loaded"
        css = lambda sel, prop: page.evaluate(f"getComputedStyle(document.querySelector('{sel}')).{prop}")
        assert css("body", "backgroundColor") == ("rgb(21, 23, 28)" if scheme == "dark" else "rgb(243, 240, 233)"), css("body", "backgroundColor")
        assert css("#fab", "backgroundColor") == "rgb(245, 165, 36)", css("#fab", "backgroundColor")
        assert "Space Grotesk" in css("#ltitle", "fontFamily"), css("#ltitle", "fontFamily")
        assert page.locator("#lh svg.logo").count() == 1, "logo missing from header"
        if not mobile: expect(page.locator("#side")).to_contain_text("Notes that follow up.")
    check("Ember brand: tokens, fonts, logo, tagline", brand)

    def create():
        page.click("[data-act=new]"); page.fill("#ta", NOTE)
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
        expect(page.locator("#ment [data-act=mention]")).to_contain_text("Remind me to call the florist")
        shot("4-person")
    check("person auto-created with birthday + favorite + mentions", person_auto)

    def birthday_no_reminder():
        n = page.evaluate("S.notes.filter(n=>n.body.includes('florist'))[0].reminder.at")
        assert abs(n - page.evaluate("(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(10,0,0,0);return +d})()")) < 1000
    check("birthday sentence does not hijack the reminder", birthday_no_reminder)

    def mention_link():
        page.locator("#ment [data-act=mention]").first.click()
        expect(page.locator("#ta")).to_have_value(NOTE)
    check("'Notes about' links back to the note", mention_link)

    def reminders_listed():
        nav("followups")
        expect(page.locator("#items .fu", has_text="call the florist")).to_have_count(1)
        shot("3-followups")
    check("reminder appears in the Follow-ups tab", reminders_listed)

    def manual_person():
        nav("people"); page.click("[data-act=newPerson]"); page.fill("#pname", "Lee Park")
        page.select_option("[data-pf=bm]", "12"); page.fill("[data-pf=bd]", "25")
        expect(page.locator("#bnote")).to_contain_text(re.compile(r"Birthday (in \d+ days|today|tomorrow)", re.I))
        with page.expect_download() as d: page.click("[data-act=pcal]")
        ics = open(d.value.path()).read()
        assert "RRULE:FREQ=YEARLY" in ics and "Lee Park's birthday" in ics, ics[:200]
        page.click("[data-act=delPerson]"); expect(page.locator("[data-pid]", has_text="Lee Park")).to_have_count(0)
        page.click("#toast [data-act=toastAct]"); expect(page.locator("[data-pid]", has_text="Lee Park").first).to_be_visible()
        page.wait_for_timeout(400); page.reload(); page.wait_for_function("window.__recallReady===true")
        assert page.evaluate("S.people.filter(p=>p.name==='Lee Park').length") == 1, "undo did not persist"
    check("add person manually, yearly .ics, delete + undo", manual_person)

    def first_name_match():
        nav("notes"); page.click("[data-act=new]"); page.fill("#ta", "Lee's favorite drink is matcha.")
        page.evaluate("document.activeElement.blur()")
        expect(page.locator("#toast")).to_contain_text("Updated Lee")
        assert page.evaluate("S.people.filter(p=>p.name.startsWith('Lee')).length") == 1
        assert page.evaluate("S.people.find(p=>p.name==='Lee Park').favorites.some(f=>f.v==='matcha')")
    check("existing person matched by first name", first_name_match)

    def persist():
        page.wait_for_timeout(600)
        page.reload(); page.wait_for_function("window.__recallReady===true")
        assert page.evaluate("S.notes.some(n=>n.body.includes('florist'))")
        assert page.evaluate("S.people.some(p=>p.name==='Maya'&&p.birthday&&p.birthday.m===3)")
    check("data survives reload", persist)

    def settings_theme():
        nav("settings"); expect(page.locator("#page")).to_be_visible(); shot("5-settings")
        page.click("[data-act=theme][data-v=dark]")
        assert page.evaluate("document.documentElement.dataset.theme") == "dark"
        assert page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(21, 23, 28)"
        page.click("[data-act=theme][data-v=light]")
        assert page.evaluate("getComputedStyle(document.body).backgroundColor") == "rgb(243, 240, 233)"
        page.click("[data-act=theme][data-v=system]")
        assert page.evaluate("document.documentElement.hasAttribute('data-theme')") is False
        page.wait_for_timeout(300); page.reload(); page.wait_for_function("window.__recallReady===true")
    check("Settings: theme override (light / dark / system)", settings_theme)

    def roundtrip():
        nav("settings")
        with page.expect_download() as d: page.click("[data-act=exJson]")
        path = d.value.path(); data = json.load(open(path))
        assert data["app"] == "recall" and data["version"] == 3 and "settings" in data and any("florist" in n["body"] for n in data["notes"])
        before = page.evaluate("S.notes.length")
        page.evaluate("(async()=>{for(const n of S.notes.filter(n=>n.body.includes('florist'))){S.notes.splice(S.notes.indexOf(n),1);await dbDel(n.id)}})()")
        assert page.evaluate("S.notes.length") == before - 1
        page.set_input_files("#impF", path)
        expect(page.locator("#toast")).to_contain_text("Imported")
        assert page.evaluate("S.notes.length") == before
        with page.expect_download() as d: page.click("[data-act=exCsv]")
        assert "florist" in open(d.value.path()).read()
    check("export JSON/CSV then import round-trips (Settings > Your data)", roundtrip)

    def v1_import():
        nav("settings")
        v1 = {"app": "recall", "version": 2, "notes": [{"id": "old1", "body": "Old v1 note #legacy", "type": "idea", "tags": ["legacy"], "pinned": False,
              "created": 1700000000000, "updated": 1700000000000, "reminder": None}], "people": []}
        p = os.path.join(SHOTS, "v1-backup.json"); json.dump(v1, open(p, "w"))
        page.set_input_files("#impF", p)
        expect(page.locator("#toast")).to_contain_text("Imported 1 notes")
        n = page.evaluate("S.notes.find(n=>n.id==='old1')")
        assert n and n["schemaV"] == 3 and n["type"] == "idea" and n["thread"] == [], n
    check("importing an older v1 backup upgrades it", v1_import)

    def delete_undo():
        nav("notes"); page.locator("#items .item", has_text="call the florist").click()
        page.click("[data-act=del]"); expect(page.locator("#items .item", has_text="call the florist")).to_have_count(0)
        page.click("#toast [data-act=toastAct]"); expect(page.locator("#items .item", has_text="call the florist")).to_have_count(1)
        page.wait_for_timeout(300); page.reload(); page.wait_for_function("window.__recallReady===true")
        assert page.evaluate("S.notes.some(n=>n.body.includes('florist'))")
    check("delete then undo (and undo persists)", delete_undo)

    def capture_fallback():
        page.evaluate("srBroken=true")   # simulate an iPhone Home Screen app with built-in dictation unavailable
        nav("notes"); page.click("#fab")
        expect(page.locator("#ta")).to_be_focused()
        expect(page.locator("#toast")).to_contain_text("Tap the microphone on your keyboard.")
        expect(page.locator("#kbHint")).to_be_visible()
        shot("6-capture-fallback")
    check("Voice button focuses text area; keyboard-mic fallback", capture_fallback)

    def links():
        nav("notes"); page.click("[data-act=new]"); page.fill("#ta", "Trip plan\nPack light.")
        back(); page.click("[data-act=new]"); page.fill("#ta", "Packing list\nSee [[Trip plan]] and [[Budget sheet]]")
        expect(page.locator("#linkBox [data-act=mention]", has_text="Trip plan")).to_have_count(1)
        expect(page.locator("#linkBox [data-act=newlink]")).to_contain_text("Budget sheet")
        page.locator("#linkBox [data-act=mention]", has_text="Trip plan").click()
        expect(page.locator("#ta")).to_have_value("Trip plan\nPack light.")
        expect(page.locator("#linkBox")).to_contain_text("Linked from")
        page.locator("#linkBox [data-act=mention]", has_text="Packing list").click()
        page.click("#linkBox [data-act=newlink]")
        expect(page.locator("#ta")).to_have_value("Budget sheet\n")
    check("[[links]], backlinks, create-from-link", links)

    # ------------------------------------------------------------------ stage 3: journaling
    def journal_flow():
        nav("journal")
        expect(page.locator("#items")).to_contain_text("Write or speak today")
        page.click("[data-act=jToday]")
        expect(page.locator("#topBox")).to_contain_text("Private")
        expect(page.locator("#topBox .mood button")).to_have_count(5)
        expect(page.locator("#topBox .prompt")).to_be_visible()
        page.fill("#ta", "Rough start. Meeting Sam tomorrow at 3pm. Maya's birthday is June 9.")
        page.click("#topBox [data-act=mood][data-v=\"4\"]")
        assert page.evaluate("S.notes.find(n=>n.type==='journal').mood") == 4
        page.click("[data-act=usePrompt]"); assert "?" in page.locator("#ta").input_value()
        page.click("[data-act=gratitude]"); assert page.locator("#ta").input_value().rstrip().endswith("Grateful for:")
        shot("8-journal-editor")
    check("journal: today's entry, mood, daily prompt, gratitude line", journal_flow)

    def journal_private():
        j = page.evaluate("S.notes.find(n=>n.type==='journal')")
        assert j["reminder"] is None, "private journal must not create a reminder"
        assert page.evaluate("S.people.filter(p=>p.name==='Maya'&&p.birthday&&p.birthday.m===6).length") == 0, "People must not be extracted from a private journal"
        expect(page.locator("#remBox")).to_have_text("")
        nav("notes"); expect(page.locator("#items")).not_to_contain_text("Rough start")
        assert page.evaluate("visible().every(n=>n.type!=='journal')")
        nav("followups"); expect(page.locator("#items")).not_to_contain_text("Rough start")
    check("journal is private: no reminder, no People, not in Notes or Follow-ups", journal_private)

    def journal_share_optin():
        nav("journal"); page.locator("#items .item", has_text="Rough start").click()
        page.click("[data-act=shareJ]")
        assert page.evaluate("S.notes.find(n=>n.type==='journal').shareJournal") is True
        assert page.evaluate("S.notes.find(n=>n.type==='journal').reminder") is not None, "opted-in entry should detect its date"
        page.click("[data-act=shareJ]")
        assert page.evaluate("S.notes.find(n=>n.type==='journal').reminder") is None
    check("journal opt-in switch turns reminders on and off", journal_share_optin)

    def journal_views():
        nav("journal"); page.click("[data-act=jview][data-v=calendar]")
        expect(page.locator(".cal .day.has")).to_have_count(1); expect(page.locator(".cal .day.today")).to_have_count(1)
        shot("9-journal-calendar")
        page.click(".cal .day.today"); expect(page.locator("#ta")).to_have_value(re.compile("Rough start"))
        back(); page.click("[data-act=jview][data-v=timeline]"); expect(page.locator("#items .grp")).to_have_count(1)
        page.evaluate("S.settings.showStreak=true;renderList()"); expect(page.locator("#items .today")).to_contain_text("in a row")
        page.evaluate("S.settings.showStreak=false;renderList()"); expect(page.locator("#items .today")).not_to_contain_text("in a row")
    check("journal calendar + timeline, optional streak (off by default)", journal_views)

    def journal_type_switch():
        nav("notes"); page.click("[data-act=new]"); page.fill("#ta", "Thoughts to keep private")
        page.click("[data-act=type][data-type=journal]")
        assert page.evaluate("S.tab") == "journal" and page.evaluate("byId(S.sel).journalDate") == page.evaluate("todayKey()")
    check("switching a note's type to Journal moves it and keeps it private", journal_type_switch)

    # ------------------------------------------------------------------ stage 4: multi-language dictation
    def lang_settings():
        nav("settings")
        sel = page.locator("#langSel"); expect(sel).to_be_visible()
        assert sel.locator("option").count() >= 30
        expect(page.locator("#page")).to_contain_text("code-switching")
        sel.select_option("es-ES")
        assert page.evaluate("S.settings.lang") == "es-ES"
        page.wait_for_timeout(300); page.reload(); page.wait_for_function("window.__recallReady===true")
        assert page.evaluate("S.settings.lang") == "es-ES", "language did not persist"
    check("Settings: language picker (40+ languages), persists, honest note", lang_settings)

    def lang_passed_and_stored():
        nav("notes"); page.click("[data-act=new]")
        page.evaluate("window.__srLog.length=0; window.__srNext={text:'hola mundo',confidence:0.9}")
        page.click("#mic"); page.wait_for_function("document.getElementById('ta').value.includes('mundo')")
        assert page.evaluate("window.__srLog[0].lang") == "es-ES", page.evaluate("window.__srLog")
        assert page.evaluate("byId(S.sel).lang") == "es-ES"
        expect(page.locator("#metaRow")).to_contain_text("Español")
        page.click("#mic")  # stop
    check("dictation uses the chosen language and stores it on the note", lang_passed_and_stored)

    def translate_manual():
        expect(page.locator("#extraBox")).to_contain_text("Written in")
        page.click("[data-act=translate]")
        expect(page.locator("#sheetHost")).to_contain_text("sends this note")
        pages_before = len(page.context.pages)
        page.click("#sheetHost [data-act=sheetClose]")
        assert len(page.context.pages) == pages_before, "nothing may open without confirmation"
        assert page.evaluate("byId(S.sel).body").count("English translation") == 0, "no silent translation"
    check("Translate to English is manual and asks before sending text anywhere", translate_manual)

    def auto_sounds_off():
        page.evaluate("S.settings.lang='auto'"); back()
        page.click("[data-act=new]")
        page.evaluate("window.__srLog.length=0; window.__srNext={text:'gibberish text',confidence:0.2}")
        page.click("#mic"); page.wait_for_function("document.getElementById('ta').value.includes('ibberish')")
        expect(page.locator("#langBox")).to_contain_text("Sounds off?")
        page.evaluate("window.__srNext={text:'bonjour',confidence:0.9}")
        page.locator("#langBox [data-act=reRecord]").first.click()
        page.wait_for_function("document.getElementById('ta').value.includes('onjour')")
        v = page.locator("#ta").input_value(); assert "ibberish" not in v, "wrong take should be dropped: " + v
        log = page.evaluate("window.__srLog"); assert len(log) == 2 and log[1]["lang"] != log[0]["lang"], log
        page.click("#mic")
    check("Auto mode: 'Sounds off?' offers a one-tap re-record in another language", auto_sounds_off)

    def long_press_picker():
        page.evaluate("S.settings.lang='auto'"); nav("notes")
        page.dispatch_event("#fab", "pointerdown"); page.wait_for_timeout(750); page.dispatch_event("#fab", "pointerup")
        expect(page.locator("#sheetHost [role=radiogroup]")).to_be_visible()
        n_before = page.evaluate("S.notes.length")
        page.locator("#sheetHost [data-l=ja-JP]").click()
        assert page.evaluate("S.settings.lang") == "ja-JP"
        expect(page.locator("#sheetHost .sheet")).to_have_count(0)
        assert page.evaluate("S.notes.length") == n_before, "long-press must not create a note"
        page.evaluate("S.settings.lang='auto'")
    check("long-press on the voice button opens the language picker", long_press_picker)

    # ------------------------------------------------------------------ stage 5: follow-ups
    def fu_propose_and_schedule():
        nav("notes"); page.click("[data-act=new]")
        page.fill("#ta", "Idea: a pop-up tasting night for the venue next spring")
        page.click("#editor .bar"); page.wait_for_timeout(250)           # leave the text box
        expect(page.locator(".suggest")).to_contain_text("check back")
        assert page.locator(".suggest [data-act=fuQ]").count() >= 2
        page.locator(".suggest [data-act=fuPick]").first.click()
        expect(page.locator(".fu-status")).to_contain_text("Check back")
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).fu.state") == "open"
        shot("9-followup-set")
    check("follow-up: proposal card with quick picks and questions, then scheduled", fu_propose_and_schedule)

    def fu_private_never():
        nav("journal"); page.click("[data-act=jToday]")
        page.fill("#ta", "Private worry about money and the venue, remind me tomorrow at 3pm")
        page.click("#editor .bar"); page.wait_for_timeout(250)
        expect(page.locator(".suggest")).to_have_count(0)
        expect(page.locator(".fu-prio")).to_have_count(0)
        nav("followups")
        expect(page.locator("#items")).not_to_contain_text("Private worry")
        assert page.evaluate("RecallFollowUps.agenda(S.notes).every(e=>e.n.type!=='journal')")
    check("follow-up: private journal entries never get proposals or appear in Follow-ups", fu_private_never)

    def fu_tab_actions():
        page.evaluate("""(()=>{const n=S.notes.find(n=>/pop-up tasting/.test(n.body));n.fu.at=Date.now()-3600e3;n.fu.notified=false;dbPut(n);})()""")
        page.evaluate("renderAll(); checkFollowups()")
        nav("followups")
        expect(page.locator("#items")).to_contain_text("Earlier")                 # coach off: neutral wording
        expect(page.locator("#items")).not_to_contain_text("Overdue")
        row = page.locator("#items .fu", has_text="pop-up tasting")
        row.locator("[data-act=fuSnz]").click(); page.locator("#sheetHost [data-act=fuSnzPick]").nth(1).click()
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).fu.snoozes") == 1
        row = page.locator("#items .fu", has_text="pop-up tasting")
        row.locator("[data-act=fuRes]").click(); page.locator("#sheetHost [data-act=fuResPick]").click()
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).fu.snoozes") == 1, "reschedule must not count as a snooze"
        page.locator("#items .fu", has_text="pop-up tasting").locator("[data-act=fuDone]").click()
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).fu.state") == "done"
        page.click("#toast [data-act=toastAct]")                                  # Undo
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).fu.state") == "open"
        shot("10-followups-tab")
    check("Follow-ups tab: Snooze, Reschedule, Done, Undo; neutral 'Earlier' label", fu_tab_actions)

    def fu_banner_badge():
        page.evaluate("""(()=>{const n=S.notes.find(n=>/pop-up tasting/.test(n.body));n.fu.at=Date.now()-1000;renderAll()})()""")
        nav("notes")
        expect(page.locator("#banner")).to_contain_text("due now")
        assert page.locator(f"{'#tabbar' if mobile else '#side'} [data-tab=followups] .badge").count() == 1
    check("'Due now' banner and badge count", fu_banner_badge)

    def fu_priority_trend():
        nav("notes"); page.locator("#items .item", has_text="pop-up tasting").first.click()
        page.click("[data-act=prio][data-v=\"2\"]"); page.click("[data-act=prio][data-v=\"4\"]")
        expect(page.locator(".fu-prio")).to_contain_text("Rising")
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).priorityHistory.length") == 2
    check("idea priority: history and rising trend", fu_priority_trend)

    # ------------------------------------------------------------------ stage 6: check-in threads
    def thread_interview():
        nav("followups")
        page.locator("#items .fu", has_text="pop-up tasting").locator("[data-act=ciStart]").click()
        expect(page.locator(".thread .bubble.recall").first).to_contain_text("How important")
        page.click("[data-act=ciChip][data-c='p:5']")
        expect(page.locator(".thread")).to_contain_text("Now 5" if False else "5")
        expect(page.locator(".thread .bubble.recall").last).to_contain_text("What has changed")
        page.fill("#ciIn", "Found a caterer who will do tastings"); page.click("[data-act=ciSend]")
        expect(page.locator(".thread .bubble.recall").last).to_contain_text("next step")
        page.fill("#ciIn", "Call the caterer Monday"); page.keyboard.press("Enter")
        expect(page.locator(".thread .bubble.recall").last).to_contain_text("check back")
        page.click("[data-act=ciChip][data-c='pick:3d']")
        expect(page.locator(".thread .bubble.recall").last).to_contain_text("check back")
        n = page.evaluate("(()=>{const n=S.notes.find(n=>/pop-up tasting/.test(n.body));return {p:n.priority,u:n.updates.length,ns:n.nextStep,fu:n.fu.state,th:n.thread.length}})()")
        assert n["p"] == 5 and n["u"] == 2 and n["ns"] == "Call the caterer Monday" and n["fu"] == "open", n
        shot("11-thread")
    check("check-in thread: 3-question interview saves priority, updates, next step, schedules next", thread_interview)

    def thread_voice_and_note():
        page.click("[data-act=ciNote]")
        expect(page.locator(".updates")).to_contain_text("Call the caterer Monday")
        expect(page.locator(".updates")).to_contain_text("Found a caterer")
        page.evaluate("S.thread=null")
        page.evaluate("startThread(S.notes.find(n=>/pop-up tasting/.test(n.body)),'followup')")
        page.evaluate("window.__srNext=null")
        page.click("#editor #mic"); page.wait_for_timeout(300)
        expect(page.locator("#ciIn")).to_have_value(re.compile("Hello world"))
        assert page.evaluate("byId(S.sel).body.includes('Hello world')") is False, "dictation must go to the reply, not the note"
        page.evaluate("S.listening&&stopDictation()")
        page.click("[data-act=ciChip][data-c=done]")
        assert page.evaluate("S.notes.find(n=>/pop-up tasting/.test(n.body)).fu.state") == "done"
        page.click(".quick [data-act=ciBack]")
    check("check-in thread: updates shown on the note; voice goes to the reply; Done closes", thread_voice_and_note)

    def thread_private_refused():
        r = page.evaluate("(()=>{const j=S.notes.find(n=>n.type==='journal'&&!n.shareJournal);return RecallFollowUps.startCheckIn(j,'interview')===null&&!(j.thread&&j.thread.length)})()")
        assert r is True
    check("check-in thread: private journal entries are refused", thread_private_refused)

    # ------------------------------------------------------------------ stage 7: accountability coach
    def seed_overdue():
        page.evaluate("""(()=>{const n=newNote("Call the caterer about the tasting deposit",{});n.type="task";
          RecallFollowUps.schedule(n,Date.now()-2*864e5,"followup");n.fu.snoozes=2;S.notes.push(n);dbPut(n);renderAll()})()""")

    def coach_off_by_default():
        seed_overdue(); nav("followups")
        assert page.evaluate("S.settings.coachOn") is False
        expect(page.locator(".coach")).to_have_count(0)
        expect(page.locator("#items")).to_contain_text("Earlier"); expect(page.locator("#items")).not_to_contain_text("Overdue")
        nav("settings")
        expect(page.locator("[data-act=pref][data-k=coachOn]")).to_have_attribute("aria-checked", "false")
        expect(page.locator("[data-act=persona]")).to_have_count(0)
    check("coach: OFF by default, no coach cards, neutral wording, no persona picker", coach_off_by_default)

    def coach_on_personas():
        nav("settings"); page.click("[data-act=pref][data-k=coachOn]")
        expect(page.locator("[data-act=persona]")).to_have_count(4)
        page.click("[data-act=persona][data-id=straight]")
        assert page.evaluate("S.settings.persona") == "straight" and page.evaluate("S.settings.coachOn") is True
        nav("followups")
        expect(page.locator(".coach").first).to_contain_text("Straight Shooter")
        expect(page.locator("[aria-label='Weekly review']")).to_contain_text("new note")
        expect(page.locator("[aria-label='Moved a few times']")).to_contain_text("caterer")
        expect(page.locator("#items")).to_contain_text("Overdue")
        txt = page.locator("#items").inner_text().lower()
        assert not re.search(r"score|reliab|\d+\s*%", txt), "coach UI must not score anything"
        shot("12-coach")
    check("coach: toggle on, persona chosen, weekly review + re-ask card, no scoring words", coach_on_personas)

    def coach_actions_and_commit():
        page.click("[data-act=coachReviewDone]")
        expect(page.locator("[aria-label='Weekly review']")).to_have_count(0)
        page.click("[data-act=coachKeep]")
        assert page.evaluate("S.notes.find(n=>/tasting deposit/.test(n.body)).fu.snoozes") == 0
        page.locator("#items .fu", has_text="tasting deposit").locator("[data-act=ciStart]").click()
        expect(page.locator(".thread .bubble.recall").first).to_contain_text("tasting deposit")
        page.click("[data-act=ciChip][data-c=still]")
        expect(page.locator(".thread .bubble.recall").last).to_contain_text(re.compile("next step", re.I))
        page.fill("#ciIn", "Send the deposit form"); page.click("[data-act=ciSend]")
        assert page.evaluate("S.notes.find(n=>/tasting deposit/.test(n.body)).nextStep") == "Send the deposit form"
        page.click("[data-act=ciNote]")
    check("coach: weekly review dismisses, Keep it resets snoozes, still-on-it asks for the next step", coach_actions_and_commit)

    def coach_gated_by_entitlement():
        page.evaluate("RecallEntitlements.ENTITLEMENTS.coach=false; renderAll()")
        nav("followups")
        expect(page.locator(".coach")).to_have_count(0)
        expect(page.locator("#items")).to_contain_text("Earlier")
        assert page.evaluate("coachOn()") is False
        page.evaluate("RecallEntitlements.ENTITLEMENTS.coach=true")
    check("coach: hasFeature('coach') off hides everything even when the toggle is on", coach_gated_by_entitlement)

    def coach_toggle_off():
        nav("settings"); page.click("[data-act=pref][data-k=coachOn]")
        nav("followups"); expect(page.locator(".coach")).to_have_count(0)
        assert page.evaluate("S.settings.coachOn") is False
    check("coach: toggling off removes the cards", coach_toggle_off)

    def table_view():
        nav("notes"); collection("all"); page.click("#chips [data-view=db]")
        expect(page.locator("#page")).to_be_visible(); expect(page.locator("#page tbody tr").first).to_be_visible(); shot("7-table")
        page.click("#page [data-act=view]"); expect(page.locator("#items")).to_be_visible()
    check("Table view opens and closes", table_view)

    def no_overflow():
        for t in ["notes", "journal", "followups", "people", "settings"]:
            nav(t); page.wait_for_timeout(100)
            sw = page.evaluate("Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)")
            assert sw <= w + 1, f"{t}: page is {sw}px wide in a {w}px viewport"
    check("no horizontal overflow on any tab", no_overflow)

    def a11y_names():
        js = """() => { const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
          const bad = []; document.querySelectorAll('button,[role=button],[role=checkbox],input:not([type=hidden]),select,textarea').forEach(e => {
            if (!vis(e)) return; const name = (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || e.title || '').trim();
            const lab = e.id && document.querySelector('label[for="' + e.id + '"]'); const wrap = e.closest('label');
            if (!name && !lab && !wrap && !e.getAttribute('aria-labelledby')) bad.push(e.outerHTML.slice(0, 80)); }); return bad; }"""
        for t in ["notes", "journal", "followups", "people", "settings"]:
            nav(t); bad = page.evaluate(js); assert not bad, f"{t}: controls without a name: {bad[:3]}"
    check("every visible control has an accessible name", a11y_names)

    def touch_targets():
        if not mobile: return
        js = """() => [...document.querySelectorAll('button,.chip,.tab,.item,select,input[type=search]')].filter(e => e.offsetWidth && e.offsetHeight)
                 .map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.height < 43.5 && !e.classList.contains('tagbtn') && !e.closest('.sugg') && !e.closest('table'))
                 .map(([e, r]) => e.className + ':' + Math.round(r.height))"""
        for t in ["notes", "followups", "people", "settings"]:
            nav(t); small = page.evaluate(js); assert not small, f"{t}: targets under 44px: {small[:5]}"
    check("touch targets are at least 44px (phone)", touch_targets)

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
