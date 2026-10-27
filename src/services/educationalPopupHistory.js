// The gallery adds a same-URL history entry, so Back dismisses the popup first.
// Capture guarded Back events before BrowserRouter can unmount a dirty editor.
export function protectEducationalPopup(browser, { getProtection, requestClose, dismiss }) {
  const index = browser.history.state?.idx;
  let restoring = false, closing = false;
  const pop = event => {
    if (restoring) {
      event.stopImmediatePropagation();
      if (Number.isInteger(index) && Number.isInteger(event.state?.idx) && event.state.idx !== index) {
        browser.history.go(index - event.state.idx);
        return;
      }
      restoring = false;
      if (closing) browser.history.back();
      else if (!getProtection().busy) requestClose();
      return;
    }
    const { dirty, busy } = getProtection();
    if (!closing && (dirty || busy)) {
      event.stopImmediatePropagation();
      restoring = true;
      const distance = Number.isInteger(index) && Number.isInteger(event.state?.idx) ? index - event.state.idx : 1;
      browser.history.go(distance || 1);
    } else dismiss();
  };
  browser.addEventListener('popstate', pop, true);
  return {
    close() { if (!closing) { closing = true;if (!restoring) browser.history.back(); } },
    dispose() { browser.removeEventListener('popstate', pop, true); },
  };
}
