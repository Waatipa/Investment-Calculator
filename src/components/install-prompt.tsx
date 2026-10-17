import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "investico-install-dismissed-at";
const DISMISS_DAYS = 7;

function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.matchMedia("(max-width: 767px)").matches;
  return coarse || small;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function dismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobileBrowser() || isStandalone() || dismissedRecently()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS has no beforeinstallprompt — show manual instructions instead.
    if (isIos()) setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt().catch(() => {});
    const choice = await deferred.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Investico Academy"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-xl md:hidden"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-6 text-sm font-semibold text-foreground">Install Investico Academy</p>
      {deferred ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the app to your home screen for quick, full-screen access.
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-3 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Add to home screen
          </button>
        </>
      ) : (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          Tap <Share className="inline h-3.5 w-3.5" aria-hidden /> Share, then
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Plus className="inline h-3.5 w-3.5" aria-hidden /> Add to Home Screen
          </span>
          to install the app.
        </p>
      )}
    </div>
  );
}
