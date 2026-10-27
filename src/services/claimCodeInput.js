// Display/input normalization only. The claim model still validates the full code.
export function claimCodeSuffix(value) {
  return String(value ?? '').trim().toUpperCase().replace(/^LFW[\s-]+/, '').replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
