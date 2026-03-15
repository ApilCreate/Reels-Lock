const IG_LOCK_KEYS = {
  LOCK_ENABLED: "lockEnabled",
  LOCK_UNTIL: "lockUntil"
};

let igLockActive = false;

function igIsReelsPath(pathname) {
  return pathname.startsWith("/reels") || pathname.startsWith("/reel/");
}

function igHideReelsButtons() {
  const selectors = [
    'a[href^="/reels"]',
    'a[href^="/reel/"]',
    'svg[aria-label="Reels"]',
    'a[aria-label="Reels"]'
  ];

  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const link = el.closest("a") || el;
      link.style.display = "none";
    });
  }
}

function igShowBlockedOverlay() {
  if (document.getElementById("ig-reels-lock-overlay")) return;

  document.documentElement.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.id = "ig-reels-lock-overlay";
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
        Access to Instagram Reels has been locked.
      </p>
      <p style="margin:0; font-size:13px; color:#6b7280;">
        Stay focused — come back later.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
}

function igApplyLockState() {
  if (!igLockActive) {
    const overlay = document.getElementById("ig-reels-lock-overlay");
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    return;
  }

  igHideReelsButtons();

  if (igIsReelsPath(location.pathname)) {
    igShowBlockedOverlay();
  }
}

function igRefreshLockFromStorage(reloadOnDisable = false) {
  chrome.storage.local.get([IG_LOCK_KEYS.LOCK_ENABLED, IG_LOCK_KEYS.LOCK_UNTIL], (result) => {
    const enabled = Boolean(result[IG_LOCK_KEYS.LOCK_ENABLED]);
    const until = result[IG_LOCK_KEYS.LOCK_UNTIL] || 0;
    const now = Date.now();
    const active = enabled && (!until || now <= until);

    if (!active && igLockActive && reloadOnDisable) {
      igLockActive = false;
      location.reload();
      return;
    }

    igLockActive = active;
    igApplyLockState();
  });
}

igRefreshLockFromStorage(false);

const igObserver = new MutationObserver(() => {
  if (igLockActive) {
    igHideReelsButtons();
  }
});

igObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!("lockEnabled" in changes) && !("lockUntil" in changes)) return;
  igRefreshLockFromStorage(true);
});

