"""v1 -> v2 data migration, end to end. Run: python3 tests/migration_e2e.py
Seeds a real v1 IndexedDB (db "recall" version 2, stores notes + people, exactly as v1 created it),
then loads the current app against it and checks nothing was lost, data was upgraded, a safety
snapshot exists, and a second load changes nothing."""
import functools, http.server, os, socketserver, sys, threading, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/"

V1_NOTES = [
    {"id": "n1", "body": "Call the caterer tomorrow at 10am #events", "type": "task", "tags": ["events"], "pinned": True,
     "created": 1700000000000, "updated": 1700000500000, "reminder": {"at": 4102444800000, "auto": True, "done": False, "notified": False}},
    {"id": "n2", "body": "Idea: monthly open-mic night\nRecord each set.", "type": "idea", "tags": [], "pinned": False,
     "created": 1700001000000, "updated": 1700001000000, "reminder": None, "typeLocked": True},
    {"id": "n3", "body": "Maya's birthday is March 4, 1992.", "type": "note", "tags": [], "pinned": False,
     "created": 1700002000000, "updated": 1700002000000, "reminder": None, "ex": {"b:Mayamarch 4, 1992": 1}, "noAuto": True},
]
V1_PEOPLE = [{"id": "p1", "name": "Maya Lopez", "relation": "Friend", "birthday": {"m": 3, "d": 4, "y": 1992},
              "favorites": [{"k": "Favorite food", "v": "Pad thai"}], "notes": "Met at the studio.", "created": 1700002000000, "updated": 1700002000000}]

SEED_JS = """async ([notes, people]) => {
  await new Promise((res, rej) => { const r = indexedDB.deleteDatabase('recall'); r.onsuccess = res; r.onerror = rej; r.onblocked = res; });
  const db = await new Promise((res, rej) => { const r = indexedDB.open('recall', 2);
    r.onupgradeneeded = () => { ['notes','people'].forEach(n => r.result.createObjectStore(n, {keyPath: 'id'})); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  await new Promise((res, rej) => { const t = db.transaction(['notes','people'], 'readwrite');
    notes.forEach(n => t.objectStore('notes').put(n)); people.forEach(p => t.objectStore('people').put(p));
    t.oncomplete = res; t.onerror = () => rej(t.error); });
  db.close();
  localStorage.setItem('recall.seeded', '1'); localStorage.setItem('recall.seededP', '1');
}"""

READ_JS = """async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('recall'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = (st) => !db.objectStoreNames.contains(st) ? Promise.resolve([]) : new Promise(res => { const r = db.transaction(st).objectStore(st).getAll(); r.onsuccess = () => res(r.result); });
  const out = { version: db.version, stores: [...db.objectStoreNames], notes: await get('notes'), people: await get('people'), meta: await get('meta') };
  db.close(); return out;
}"""

fails = []
def check(name, cond, info=""):
    print(("  ok   " if cond else "  FAIL ") + name + ("" if cond else f" -> {info}"))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 390, "height": 844}); page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(URL + "lib.js")  # same origin, doesn't start the app
    page.evaluate(SEED_JS, [V1_NOTES, V1_PEOPLE])
    before = page.evaluate(READ_JS)
    check("seeded database is version 2 with no meta store", before["version"] == 2 and "meta" not in before["stores"], before["stores"])

    page.goto(URL); page.wait_for_selector("body")
    page.wait_for_function("document.querySelectorAll('.item').length > 0", timeout=10000)
    after = page.evaluate(READ_JS)
    check("database upgraded to version 3 with meta store", after["version"] == 3 and "meta" in after["stores"], (after["version"], after["stores"]))
    check("same number of notes and people", len(after["notes"]) == 3 and len(after["people"]) == 1, (len(after["notes"]), len(after["people"])))

    byid = {n["id"]: n for n in after["notes"]}
    lost = [(i, k) for o in V1_NOTES for k, v in o.items() for i in [o["id"]] if byid[i].get(k) != v]
    check("every v1 note field kept its exact value", not lost, lost)
    check("v1 person kept every field", all(after["people"][0].get(k) == v for k, v in V1_PEOPLE[0].items()))
    check("notes stamped schemaV 3 with new defaults", all(n["schemaV"] == 3 and n["thread"] == [] and n["priority"] is None for n in after["notes"]))

    snap = [m for m in after["meta"] if m["key"] == "preMigrationBackup"]
    check("safety snapshot of the v1 data was stored", len(snap) == 1 and len(snap[0]["value"]["notes"]) == 3)
    if snap:
        orig = {n["id"]: n for n in snap[0]["value"]["notes"]}
        check("snapshot holds the untouched v1 notes (no schemaV)", all("schemaV" not in n for n in orig.values()) and orig["n1"]["body"] == V1_NOTES[0]["body"])

    stamp = {n["id"]: n["updated"] for n in after["notes"]}
    page.reload(); page.wait_for_function("document.querySelectorAll('.item').length > 0", timeout=10000)
    again = page.evaluate(READ_JS)
    check("second load changes nothing (idempotent)", {n["id"]: n["updated"] for n in again["notes"]} == stamp and len(again["meta"]) == len(after["meta"]))
    check("no console errors", not errors, errors[:3])
    b.close()

print(f"\n{'FAILED: ' + ', '.join(fails) if fails else 'all migration e2e checks passed'}")
sys.exit(1 if fails else 0)
