export function recoveryDates(timestamp = new Date().toISOString()) {
  return { deleted_at: timestamp, scheduled_for_deletion_at: new Date(Date.parse(timestamp) + 30 * 86400000).toISOString() };
}
export function clearRecoveryDates() {
  return { deleted_at: null, scheduled_for_deletion_at: null };
}
export function isRecoverable(record, now = Date.now()) {
  return Boolean(record.scheduled_for_deletion_at) && now < Date.parse(record.scheduled_for_deletion_at);
}
export function monthKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).formatToParts(new Date(value));
  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}`;
}
