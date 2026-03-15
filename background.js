const STORAGE_KEYS = {
  PASSWORD_HASH: "passwordHash",
  LOCK_ENABLED: "lockEnabled",
  LOCK_UNTIL: "lockUntil"
};

function hashPassword(password) {
  // Simple hash for demo; not for real security
  let hash = 0;
  if (!password) return "0";
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return String(hash);
}

async function getState() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.PASSWORD_HASH,
    STORAGE_KEYS.LOCK_ENABLED,
    STORAGE_KEYS.LOCK_UNTIL
  ]);
  const now = Date.now();
  let lockEnabled = Boolean(result[STORAGE_KEYS.LOCK_ENABLED]);
  let lockUntil = result[STORAGE_KEYS.LOCK_UNTIL] || 0;

  if (lockUntil && now > lockUntil) {
    lockEnabled = false;
    lockUntil = 0;
    await chrome.storage.local.set({
      [STORAGE_KEYS.LOCK_ENABLED]: false,
      [STORAGE_KEYS.LOCK_UNTIL]: 0
    });
  }

  return {
    passwordHash: result[STORAGE_KEYS.PASSWORD_HASH] || null,
    lockEnabled,
    lockUntil
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "SET_PASSWORD") {
      const hash = hashPassword(message.password || "");
      await chrome.storage.local.set({
        [STORAGE_KEYS.PASSWORD_HASH]: hash
      });
      sendResponse({ success: true });
      return;
    }

    if (message.type === "TOGGLE_LOCK") {
      const { password, enable, durationMinutes } = message;
      const state = await getState();
      const expectedHash = state.passwordHash;

      if (!expectedHash) {
        sendResponse({
          success: false,
          error: "No password set. Please set a password first."
        });
        return;
      }

      const incoming = hashPassword(password || "");
      if (incoming !== expectedHash) {
        sendResponse({
          success: false,
          error: "Incorrect password."
        });
        return;
      }

      let lockUntil = 0;
      let lockEnabled = Boolean(enable);

      if (enable && durationMinutes && durationMinutes > 0) {
        lockUntil = Date.now() + durationMinutes * 60 * 1000;
      }

      if (!enable) {
        lockEnabled = false;
        lockUntil = 0;
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.LOCK_ENABLED]: lockEnabled,
        [STORAGE_KEYS.LOCK_UNTIL]: lockUntil
      });

      sendResponse({
        success: true,
        lockEnabled,
        lockUntil
      });
      return;
    }

    if (message.type === "GET_STATE") {
      const state = await getState();
      sendResponse({
        success: true,
        ...state
      });
      return;
    }
  })();

  return true; // keep channel open for async response
});

