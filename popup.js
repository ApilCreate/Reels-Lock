const currentStateEl = document.getElementById("currentState");
const badgeStatusEl = document.getElementById("badgeStatus");
const passwordInput = document.getElementById("password");
const savePasswordBtn = document.getElementById("savePassword");
const passwordStatusEl = document.getElementById("passwordStatus");

const lockPasswordInput = document.getElementById("lockPassword");
const durationInput = document.getElementById("duration");
const enableLockBtn = document.getElementById("enableLock");
const disableLockBtn = document.getElementById("disableLock");
const lockStatusEl = document.getElementById("lockStatus");

const STORAGE_KEYS = {
  PASSWORD_HASH: "passwordHash",
  LOCK_ENABLED: "lockEnabled",
  LOCK_UNTIL: "lockUntil"
};

function hashPassword(password) {
  let hash = 0;
  if (!password) return "0";
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return String(hash);
}

function formatUntil(lockUntil) {
  if (!lockUntil) return "until you disable it";
  const d = new Date(lockUntil);
  return `until ${d.toLocaleTimeString()}`;
}

function showState(state) {
  if (!state.lockEnabled) {
    currentStateEl.textContent = "Lock is currently OFF.";
    if (badgeStatusEl) {
      badgeStatusEl.textContent = "OFF";
      badgeStatusEl.classList.remove("active");
    }
  } else {
    currentStateEl.textContent = `Lock is ON ${formatUntil(state.lockUntil)}.`;
    if (badgeStatusEl) {
      badgeStatusEl.textContent = "ON";
      badgeStatusEl.classList.add("active");
    }
  }
}

function refreshState() {
  chrome.storage.local.get(
    [STORAGE_KEYS.PASSWORD_HASH, STORAGE_KEYS.LOCK_ENABLED, STORAGE_KEYS.LOCK_UNTIL],
    (result) => {
      let lockEnabled = Boolean(result[STORAGE_KEYS.LOCK_ENABLED]);
      let lockUntil = result[STORAGE_KEYS.LOCK_UNTIL] || 0;
      const now = Date.now();

      if (lockUntil && now > lockUntil) {
        lockEnabled = false;
        lockUntil = 0;
        chrome.storage.local.set({
          [STORAGE_KEYS.LOCK_ENABLED]: false,
          [STORAGE_KEYS.LOCK_UNTIL]: 0
        });
      }

      showState({ lockEnabled, lockUntil });
    }
  );
}

savePasswordBtn.addEventListener("click", () => {
  const pwd = passwordInput.value.trim();
  if (!pwd) {
    passwordStatusEl.textContent = "Password cannot be empty.";
    passwordStatusEl.className = "status error";
    return;
  }

  const hash = hashPassword(pwd);
  chrome.storage.local.set(
    {
      [STORAGE_KEYS.PASSWORD_HASH]: hash
    },
    () => {
      passwordStatusEl.textContent = "Password saved.";
      passwordStatusEl.className = "status success";
      passwordInput.value = "";
    }
  );
});

enableLockBtn.addEventListener("click", () => {
  const pwd = lockPasswordInput.value.trim();
  const duration = Number(durationInput.value);
  chrome.storage.local.get(
    [STORAGE_KEYS.PASSWORD_HASH],
    (result) => {
      const expectedHash = result[STORAGE_KEYS.PASSWORD_HASH];
      if (!expectedHash) {
        lockStatusEl.textContent = "No password set. Please set a password first.";
        lockStatusEl.className = "status error";
        return;
      }
      const incoming = hashPassword(pwd || "");
      if (incoming !== expectedHash) {
        lockStatusEl.textContent = "Incorrect password.";
        lockStatusEl.className = "status error";
        return;
      }

      const now = Date.now();
      let lockUntil = 0;
      if (!isNaN(duration) && duration > 0) {
        lockUntil = now + duration * 60 * 1000;
      }

      chrome.storage.local.set(
        {
          [STORAGE_KEYS.LOCK_ENABLED]: true,
          [STORAGE_KEYS.LOCK_UNTIL]: lockUntil
        },
        () => {
          lockStatusEl.textContent = `Lock enabled ${formatUntil(lockUntil)}.`;
          lockStatusEl.className = "status success";
          lockPasswordInput.value = "";
          refreshState();
        }
      );
    }
  );
});

disableLockBtn.addEventListener("click", () => {
  const pwd = lockPasswordInput.value.trim();
  chrome.storage.local.get(
    [STORAGE_KEYS.PASSWORD_HASH],
    (result) => {
      const expectedHash = result[STORAGE_KEYS.PASSWORD_HASH];
      if (!expectedHash) {
        lockStatusEl.textContent = "No password set. Please set a password first.";
        lockStatusEl.className = "status error";
        return;
      }
      const incoming = hashPassword(pwd || "");
      if (incoming !== expectedHash) {
        lockStatusEl.textContent = "Incorrect password.";
        lockStatusEl.className = "status error";
        return;
      }

      chrome.storage.local.set(
        {
          [STORAGE_KEYS.LOCK_ENABLED]: false,
          [STORAGE_KEYS.LOCK_UNTIL]: 0
        },
        () => {
          lockStatusEl.textContent = "Lock disabled.";
          lockStatusEl.className = "status success";
          lockPasswordInput.value = "";
          refreshState();
        }
      );
    }
  );
});

refreshState();

