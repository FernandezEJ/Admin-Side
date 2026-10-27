// Only read-request coordination; writes retain their existing confirmation/locking paths.
export function createReadGate() {
  let active = null;
  return {
    start(key = '') {
      if (active?.key === key) return null;
      const ticket = { key };active = ticket;return ticket;
    },
    finish(ticket) { if (active === ticket) active = null; },
    clear() { active = null; },
  };
}

export function watchSlowRequest(loading, notify, clock = globalThis) {
  notify(false);
  if (!loading) return () => {};
  const timer = clock.setTimeout(() => notify(true), 3000);
  return () => clock.clearTimeout(timer);
}

export function readErrorFeedback(status, description) {
  if (status === 401) return { title: 'Session expired', description: 'Please sign in again to continue.', retry: false };
  if (status === 403) return { title: 'Access not permitted', description: 'Your account does not have permission to access this information.', retry: false };
  if (status === 404) return { title: 'No longer available', description: 'This record could not be found. It may have been removed.', retry: false };
  if (status >= 500) return { description: 'Something went wrong on our side. Please try again.', retry: true };
  if (/(?:unable to reach|cannot connect|failed to connect|failed to fetch|network|connection|offline)/i.test(description)) return {
    title: 'Connection Problem', description: "We couldn't reach the server. Check your internet connection and try again.", retry: true,
  };
  return { description, retry: true };
}
