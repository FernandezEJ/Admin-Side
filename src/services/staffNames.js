// Staff and donor list APIs expose full-name strings rather than separate fields.
// Only interior single-letter tokens are initials; full words and first/last
// tokens remain intact. This formatter never changes stored or editable values.
export function formatStaffName(value) {
  if (typeof value !== 'string') return '';
  const count = value.match(/\S+/gu)?.length ?? 0;
  let index = 0;
  return value.replace(/\S+/gu, (token) => {
    const middle = index > 0 && index < count - 1;
    index++;
    return middle && /^\p{L}\p{M}*\.*$/u.test(token) ? token.replace(/\.+$/, '') + '.' : token;
  });
}


export const formatDonorName = formatStaffName;
