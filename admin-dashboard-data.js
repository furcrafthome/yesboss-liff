const empty = () => ({
  ts: '', users_total: 0, users_consented: 0, users_onboarded: 0,
  users: [],
  new_1d: 0, new_7d: 0, new_30d: 0, active_1d: 0, active_7d: 0, active_30d: 0,
  plan_breakdown: [], growth: { daily: [], message_daily: [] },
  revenue: { paid_30d_thb: 0, donations_30d_thb: 0, payment_count_30d: 0, paid_by_plan: [] },
  engagement: { reminders_7d: 0, reminders_sent_7d: 0, tasks_created_7d: 0, tasks_done_7d: 0, expenses_7d: 0, documents_7d: 0, facts_7d: 0, intents: [] },
  reminders: { pending: 0, overdue: 0, failed_24h: 0 },
  tasks: { open: 0, overdue: 0, blocked: 0 },
  ai: { cost_today_usd: 0, cost_7d_usd: 0, calls_7d: 0, by_intent: [] },
  health: { overall: 'unknown', openai: 'unknown', cron_ok_10m: 0, line_quota_used: null, line_quota_cap: null },
  support: { reviews_30d: 0, average_rating: null, frustration_signals_24h: 0 },
  data_health: { pdpa_pending: 0, unconsented: 0, docs_without_hash: 0, events_7d: 0 },
  referrals: { new_7d: 0, new_30d: 0 },
  executive: { current: {}, previous: {} },
  funnel: { registered: 0, consented: 0, onboarded: 0, messaged: 0, paid: 0, by_channel: [] },
});

function object(value, fallback) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...fallback, ...value } : fallback;
}

export function normalizeDashboardPayload(payload) {
  const base = empty();
  const source = object(payload, {});
  return {
    ...base,
    ...source,
    growth: object(source.growth, base.growth),
    revenue: object(source.revenue, base.revenue),
    engagement: object(source.engagement, base.engagement),
    reminders: object(source.reminders, base.reminders),
    tasks: object(source.tasks, base.tasks),
    ai: object(source.ai, base.ai),
    health: object(source.health, base.health),
    support: object(source.support, base.support),
    data_health: object(source.data_health, base.data_health),
    referrals: object(source.referrals, base.referrals),
    plan_breakdown: Array.isArray(source.plan_breakdown) ? source.plan_breakdown : [],
    users: Array.isArray(source.users) ? source.users.slice(0, 100).map((u) => ({
      user_id: u?.user_id ?? '', picture_url: typeof u?.picture_url === 'string' && u.picture_url.startsWith('https://') ? u.picture_url : '', name: u?.name ?? 'ผู้ใช้ไม่ระบุชื่อ', plan: u?.plan ?? 'free', last_active_at: u?.last_active_at ?? '',
      messages_7d: u?.messages_7d ?? 0, reminders_open: u?.reminders_open ?? 0, tasks_open: u?.tasks_open ?? 0,
      docs_total: u?.docs_total ?? 0, facts_active: u?.facts_active ?? 0, acq_channel: u?.acq_channel ?? '',
      chat_preview: Array.isArray(u?.chat_preview) ? u.chat_preview.slice(-50).map((m) => ({ role: m?.role ?? 'user', text: m?.text ?? '', at: m?.at ?? '' })) : [],
    })) : [],
  };
}

export function formatMoneyTHB(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number.isFinite(Number(value)) ? `฿${Math.round(Number(value)).toLocaleString('th-TH')}` : '—';
}

export function healthTone(status) {
  if (status === 'ok') return 'ok';
  if (status === 'warning') return 'warn';
  if (status === 'down') return 'danger';
  return 'neutral';
}

export function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('th-TH') : '—';
}

export function formatUsd(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : '—';
}

// ใช้เฉพาะ ?demo=1: ตัวเลขสมมติสำหรับดูหน้าตา ห้ามใช้ตัดสินใจธุรกิจ
export function dashboardRangeParams(start, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return null;
  const from = new Date(`${start}T00:00:00Z`); const to = new Date(`${end}T00:00:00Z`);
  if (Number.isNaN(+from) || Number.isNaN(+to) || to < from || (to - from) / 86400000 > 366) return null;
  return { start, end };
}

export function demoDashboardPayload() {
  return {
    is_demo: true, ts: 'DEMO · 24 ก.ค. 2026 12:00', users_total: 1010, users_consented: 424, users_onboarded: 800,
    new_1d: 5, new_7d: 31, new_30d: 120, active_1d: 83, active_7d: 312, active_30d: 995,
    plan_breakdown: [{ plan: 'free', count: 900 }, { plan: 'pro', count: 110 }],
    users: [
      { name: 'มะลิ (ตัวอย่าง)', plan: 'pro', messages_7d: 31, reminders_open: 2, tasks_open: 4, docs_total: 7, facts_active: 12, last_active_at: 'วันนี้ 11:42', acq_channel: 'Facebook', chat_preview: [{ role: 'user', text: 'พรุ่งนี้ 10 โมง เตือนประชุมทีมให้หน่อย', at: '11:42' }, { role: 'bossy', text: 'ได้เลยครับ ตั้งเตือนประชุมทีมพรุ่งนี้ 10:00 ให้แล้วครับ', at: '11:42' }] },
      { name: 'นนท์ (ตัวอย่าง)', plan: 'free', messages_7d: 18, reminders_open: 1, tasks_open: 1, docs_total: 1, facts_active: 4, last_active_at: 'วันนี้ 10:18', acq_channel: 'Referral', chat_preview: [{ role: 'user', text: 'สรุปรายจ่ายวันนี้ให้หน่อย', at: '10:18' }, { role: 'bossy', text: 'วันนี้บันทึกรายจ่าย 3 รายการ รวม ฿1,240 ครับ', at: '10:18' }] },
      { name: 'แป้ง (ตัวอย่าง)', plan: 'pro', messages_7d: 15, reminders_open: 0, tasks_open: 3, docs_total: 5, facts_active: 9, last_active_at: 'เมื่อวาน 20:07', acq_channel: 'TikTok', chat_preview: [{ role: 'user', text: 'เพิ่มงานส่งใบเสนอราคาวันศุกร์', at: '20:07' }, { role: 'bossy', text: 'เพิ่มงานส่งใบเสนอราคา ภายในวันศุกร์แล้วครับ', at: '20:07' }] },
      { name: 'โต้ง (ตัวอย่าง)', plan: 'free', messages_7d: 8, reminders_open: 1, tasks_open: 0, docs_total: 0, facts_active: 2, last_active_at: 'เมื่อวาน 17:20', acq_channel: 'Facebook', chat_preview: [{ role: 'user', text: 'เตือนจ่ายค่าน้ำวันสิ้นเดือน', at: '17:20' }, { role: 'bossy', text: 'รับทราบครับ จะเตือนจ่ายค่าน้ำในวันสิ้นเดือนครับ', at: '17:20' }] },
      { name: 'กิ่ง (ตัวอย่าง)', plan: 'free', messages_7d: 3, reminders_open: 0, tasks_open: 1, docs_total: 0, facts_active: 1, last_active_at: '3 วันที่แล้ว', acq_channel: 'Organic', chat_preview: [{ role: 'user', text: 'พรุ่งนี้มีอะไรต้องทำบ้าง', at: '09:12' }, { role: 'bossy', text: 'พรุ่งนี้มีงานติดตาม 1 งานครับ: โทรหาลูกค้าเวลา 14:00', at: '09:12' }] },
    ],
    growth: { daily: [{ day: '20 Jul', users: 10 }, { day: '21 Jul', users: 22 }, { day: '22 Jul', users: 18 }, { day: '23 Jul', users: 31 }], message_daily: [{ day: '20 Jul', messages: 250 }, { day: '21 Jul', messages: 410 }, { day: '22 Jul', messages: 380 }, { day: '23 Jul', messages: 510 }] },
    revenue: { paid_30d_thb: 31900, donations_30d_thb: 4200, payment_count_30d: 110, paid_by_plan: [{ plan: 'pro', payments: 100, amount: 29000 }, { plan: 'founding', payments: 10, amount: 2900 }] },
    engagement: { reminders_7d: 405, reminders_sent_7d: 398, tasks_created_7d: 206, tasks_done_7d: 177, expenses_7d: 221, documents_7d: 56, facts_7d: 103, intents: [{ intent: 'reminder', count: 405 }, { intent: 'money', count: 221 }, { intent: 'chat', count: 130 }] },
    reminders: { pending: 18, overdue: 2, failed_24h: 1 }, tasks: { open: 71, overdue: 9, blocked: 3 },
    ai: { cost_today_usd: 4.1, cost_7d_usd: 27.5, calls_7d: 12891, by_intent: [{ intent: 'chat', calls: 6000, usd: 11.3 }, { intent: 'reminder', calls: 4050, usd: 8.4 }] },
    health: { overall: 'warning', openai: 'ok', cron_ok_10m: 1, line_quota_used: 19500, line_quota_cap: 55000 },
    support: { reviews_30d: 23, average_rating: 4.7, frustration_signals_24h: 4 }, data_health: { pdpa_pending: 0, unconsented: 586, docs_without_hash: 3, events_7d: 14421 }, referrals: { new_7d: 31, new_30d: 97 },
  };
}
