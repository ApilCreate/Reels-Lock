const YT_LOCK_KEYS = {
  LOCK_ENABLED: "lockEnabled",
  LOCK_UNTIL: "lockUntil"
};

let ytLockActive = false;

function ytIsReelsUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!/youtube\.com$/.test(u.hostname) && !/youtube\.com$/.test(u.hostname.replace(/^m\./, ""))) {
      return false;
    }
    if (u.pathname.startsWith("/shorts")) return true;
    return false;
  } catch {
    return false;
  }
}

function ytHideReelsButtons() {
  const selectors = [
    'a[href^="/shorts"]',
    'a[title="Shorts"]',
    'a[aria-label="Shorts"]'
  ];

  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.display = "none";
    });
  }
}

function ytShowBlockedOverlay() {
  if (document.getElementById("yt-reels-lock-overlay")) return;

  document.documentElement.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.id = "yt-reels-lock-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "#020617";
  overlay.style.color = "#e5e7eb";
  overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  overlay.style.zIndex = "2147483647";

  overlay.innerHTML = `
    <div style="text-align:center; max-width: 420px; padding: 24px; border-radius: 16px; background:#020617; box-shadow: 0 18px 45px rgba(15,23,42,0.9); border:1px solid #1f2937;">
      <h1 style="font-size:22px; margin:0 0 8px; color:#f9fafb;">Page not available</h1>
      <p style="margin:0 0 4px; font-size:14px; color:#9ca3af;">
        Access to YouTube Shorts has been locked.
      </p>
      <p style="margin:0; font-size:13px; color:#6b7280;">
        Stay focused — come back later.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
}

function ytApplyLockState() {
  if (!ytLockActive) {
    const overlay = document.getElementById("yt-reels-lock-overlay");
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    return;
  }

  ytHideReelsButtons();

  if (ytIsReelsUrl(location.href)) {
    ytShowBlockedOverlay();
  }
}

function ytRefreshLockFromStorage(reloadOnDisable = false) {
  chrome.storage.local.get([YT_LOCK_KEYS.LOCK_ENABLED, YT_LOCK_KEYS.LOCK_UNTIL], (result) => {
    const enabled = Boolean(result[YT_LOCK_KEYS.LOCK_ENABLED]);
    const until = result[YT_LOCK_KEYS.LOCK_UNTIL] || 0;
    const now = Date.now();
    const active = enabled && (!until || now <= until);

    if (!active && ytLockActive && reloadOnDisable) {
      ytLockActive = false;
      location.reload();
      return;
    }

    ytLockActive = active;
    ytApplyLockState();
  });
}

ytRefreshLockFromStorage(false);

const ytObserver = new MutationObserver(() => {
  if (ytLockActive) {
    ytHideReelsButtons();
  }
});

ytObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!("lockEnabled" in changes) && !("lockUntil" in changes)) return;
  ytRefreshLockFromStorage(true);
});

