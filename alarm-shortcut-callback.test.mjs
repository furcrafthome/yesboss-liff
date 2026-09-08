// 🧪 ปุ่ม "ตั้งปลุกในเครื่อง" บน iPhone ต้องไม่มีทางตัน
//
// แผลจริง (ลูกค้า U30a6dee 5 ก.ย. + เครื่องบอส 6 ก.ย.): เครื่องที่ยังไม่มีทางลัด yesboss
//   กดปุ่ม → iOS เปิดแอปคำสั่งลัดขึ้นมาโชว์ "ไม่พบคำสั่งลัด" → หน้าเว็บเห็นแค่ว่า "หลุดออกจากหน้าไปแล้ว"
//   จึงนับเป็นสำเร็จ + ปั๊มธง ybAlarmReady=1 → รอบต่อไป auto-fire เข้า error เดิมซ้ำ
//   และปุ่ม "เปิดระบบปลุกอัตโนมัติ" ไม่มีวันโผล่ (โผล่เฉพาะตอน "กดแล้วไม่ขยับ") = ลูกค้าตันสนิท
//
// เทสนี้ "รันสคริปต์ตัวจริง" ที่ฝังใน alarm.html (ไม่ได้ก๊อปตรรกะมาเขียนใหม่) บน DOM ปลอม
// โค้ดเปลี่ยนรูปเมื่อไหร่เทสพังทันที — เจตนา
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./alarm.html", import.meta.url), "utf8");
const setupHtml = readFileSync(new URL("./alarm-setup.html", import.meta.url), "utf8");
const code = html.slice(html.indexOf("<script>") + "<script>".length, html.lastIndexOf("</script>"));

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; 23021RAA2Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36";
const QS = "?t=09%3A30&msg=" + encodeURIComponent("ประชุมกับพี่ฟ้า");

function run({ ua = IPHONE, search = QS, stored = {}, hidden = false } = {}) {
  const store = { ...stored };
  const els = {};
  const el = (id) => (els[id] ||= { textContent: "", className: "", style: { display: "" } });
  const nav = [];      // URL ทุกใบที่โค้ดสั่งเบราว์เซอร์ให้ไป (ตัวชี้ขาดว่ายิงทางลัดจริงไหม)
  const timers = [];
  const document = { getElementById: el, addEventListener() {}, removeEventListener() {}, hidden };
  const window = { addEventListener() {}, removeEventListener() {} };
  const location = {
    search, origin: "https://app.yesboss.club", pathname: "/alarm.html", hash: "",
    get href() { return "https://app.yesboss.club/alarm.html" + search; },
    set href(v) { nav.push(v); },
  };
  const navigator = { userAgent: ua, maxTouchPoints: ua.includes("iPhone") ? 5 : 1, clipboard: { writeText() {} } };
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  const api = new Function(
    "location", "navigator", "document", "window", "localStorage", "setTimeout",
    code + "\n;return { setAlarm: setAlarm, fired: fired };",
  )(location, navigator, document, window, localStorage, setTimeout);
  const flush = () => { while (timers.length) timers.shift().fn(); };
  return { api, nav, el, store, timers, flush, document };
}

const shot = (nav) => nav.find((u) => u.startsWith("shortcuts:"));
const param = (url, k) => new URL(url.replace("shortcuts://", "https://")).searchParams.get(k);

test("iPhone: ปุ่มติดตั้ง (ตาข่ายกันตัน) ต้องโผล่ตั้งแต่โหลดหน้า ไม่ต้องรอให้พังก่อน", () => {
  const r = run();
  assert.equal(r.el("setupBtn").style.display, "block", "ปุ่มเปิดระบบปลุกต้องเห็นได้เสมอบน iPhone");
});

test("iPhone: กดปุ่ม → ยิงผ่าน x-callback-url พร้อมทางกลับครบ ok/err/cancel", () => {
  const r = run();
  r.api.setAlarm(true);
  const u = shot(r.nav);
  assert.ok(u, "ต้องมีการยิง shortcuts://");
  assert.ok(u.startsWith("shortcuts://x-callback-url/run-shortcut?"), "ต้องใช้ x-callback-url ไม่ใช่ run-shortcut เปล่าๆ");
  assert.equal(param(u, "name"), "yesboss");
  assert.equal(param(u, "text"), "09:30", "ต้องส่งเวลานัดจริง");
  for (const k of ["x-success", "x-error", "x-cancel"]) {
    const back = param(u, k);
    assert.ok(back && back.startsWith("https://app.yesboss.club/alarm.html?"), `${k} ต้องเป็น URL เต็มกลับมาหน้านี้`);
    assert.equal(new URL(back).searchParams.get("t"), "09:30", `${k} ต้องพกเวลากลับมาด้วย ไม่งั้นหน้าโล่ง`);
    assert.equal(new URL(back).searchParams.get("msg"), "ประชุมกับพี่ฟ้า", `${k} ต้องพกชื่อนัดกลับมาด้วย`);
  }
  assert.equal(new URL(param(u, "x-error")).searchParams.get("cb"), "err");
});

test("🩹 หัวใจของบั๊ก: 'หลุดออกจากหน้า' ห้ามปั๊มธง auto-fire อีกต่อไป", () => {
  const r = run({ hidden: true });          // = เครื่องเด้งไปแอปคำสั่งลัด (จะสำเร็จหรือ error ก็หน้าตาแบบนี้)
  r.api.setAlarm(true);
  r.flush();
  assert.equal(r.store.ybAlarmReady, undefined, "เดาเอาแล้วปั๊มธง = ต้นเหตุลูปตาย ห้ามกลับมาอีก");
  assert.equal(r.el("okmsg").style.display, "block", "แต่ยังโชว์ ✅ บนจอได้ (ไม่ได้ทำให้ลูกค้าสับสน)");
});

test("cb=err (iOS บอกเองว่าไม่พบทางลัด): ล้างธง + กางทางออก + ห้ามยิงซ้ำ", () => {
  const r = run({ search: QS + "&cb=err&errorMessage=" + encodeURIComponent("ไม่พบคำสั่งลัด yesboss"), stored: { ybAlarmReady: "1" } });
  r.flush();
  assert.equal(r.store.ybAlarmReady, undefined, "ธงที่เคยตั้งผิดต้องถูกล้าง ไม่งั้นวนเข้า error เดิมตลอดชีพ");
  assert.equal(shot(r.nav), undefined, "หน้าที่เด้งกลับมาพร้อม error ห้าม auto-fire ซ้ำ = กันลูป");
  assert.equal(r.el("setupBtn").style.display, "block");
  assert.equal(r.el("how").style.display, "block", "ต้องกางวิธีตั้งเอง 15 วิให้ทันที");
  assert.match(r.el("note").textContent, /ยังไม่มีทางลัด/);
  assert.match(r.el("diag").textContent, /ไม่พบคำสั่งลัด/, "ข้อความ error จากเครื่องต้องโชว์ไว้ ให้สกรีนช็อตเดียวรู้เรื่อง");
});

test("cb=ok (ระบบยืนยันเอง): ตั้งธงได้ทางนี้ทางเดียว + ขึ้น ✅", () => {
  const r = run({ search: QS + "&cb=ok" });
  r.flush();
  assert.equal(r.store.ybAlarmReady, "1");
  assert.equal(r.el("okmsg").style.display, "block");
  assert.equal(shot(r.nav), undefined, "ยิงเสร็จแล้ว ห้ามยิงซ้ำ");
});

test("cb=cancel: ไม่ตั้งธง ไม่ยิงซ้ำ และไม่ด่าลูกค้า", () => {
  const r = run({ search: QS + "&cb=cancel" });
  r.flush();
  assert.equal(r.store.ybAlarmReady, undefined);
  assert.equal(shot(r.nav), undefined);
  assert.match(r.el("note").textContent, /ยกเลิก/);
});

test("เครื่องที่เคยยืนยันแล้ว (ธงจริง) ยังได้ auto-fire เหมือนเดิม — ไม่ถอยความสะดวก", () => {
  const r = run({ stored: { ybAlarmReady: "1" } });
  r.flush();
  assert.ok(shot(r.nav), "ธงจริงต้องยิงให้เองตั้งแต่เปิดหน้า");
});

test("Android ไม่ถูกแตะ: ไม่ยิง shortcuts:// และไม่มีปุ่มติดตั้งทางลัดมาหลอก", () => {
  const r = run({ ua: ANDROID });
  r.flush();
  assert.equal(shot(r.nav), undefined, "แอนดรอยด์เรียกแอปนาฬิกาจากเว็บไม่ได้ (พิสูจน์บน emulator 28 ส.ค.)");
  assert.equal(r.el("setupBtn").style.display, "", "ปุ่มติดตั้งทางลัดเป็นของ iPhone เท่านั้น");
});

test("ห้ามเหลือ shortcuts://run-shortcut แบบไม่มีทางกลับในไฟล์ไหนอีก", () => {
  for (const [name, src] of [["alarm.html", html], ["alarm-setup.html", setupHtml]])
    assert.ok(!/shortcuts:\/\/run-shortcut/.test(src), `${name} ยังยิงแบบเก่า = กลับไปตันเหมือนเดิม`);
});

test("alarm-setup: ปุ่มทดสอบต้องรู้ผลจริง (x-callback) และตั้งธงเฉพาะตอน cb=ok", () => {
  assert.ok(/shortcuts:\/\/x-callback-url\/run-shortcut/.test(setupHtml));
  const setFlag = [...setupHtml.matchAll(/setItem\(\s*['"]ybAlarmReady/g)];
  assert.equal(setFlag.length, 1, "ตั้งธงได้จุดเดียว");
  const idx = setupHtml.indexOf("setItem('ybAlarmReady") >= 0 ? setupHtml.indexOf("setItem('ybAlarmReady") : setupHtml.indexOf('setItem("ybAlarmReady');
  assert.ok(setupHtml.lastIndexOf('cb === "ok"', idx) > setupHtml.lastIndexOf("if (left", idx), "ธงต้องอยู่ใต้สาขา cb=ok ไม่ใช่สาขาเดาจากการหลุดหน้า");
});
