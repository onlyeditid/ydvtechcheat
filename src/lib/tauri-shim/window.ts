import type { UnlistenFn } from "./event";

export interface WebWindowShim {
  label: string;
  onFocusChanged: (
    handler: (event: { payload: boolean }) => void
  ) => Promise<UnlistenFn>;
  setFocus: () => Promise<void>;
  show: () => Promise<void>;
  hide: () => Promise<void>;
  close: () => Promise<void>;
}

function createWindowShim(): WebWindowShim {
  const path =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const label = path === "/" ? "main" : "dashboard";

  return {
    label,
    onFocusChanged: async (handler) => {
      if (typeof window === "undefined") return () => {};
      const onFocus = () => handler({ payload: true });
      const onBlur = () => handler({ payload: false });
      window.addEventListener("focus", onFocus);
      window.addEventListener("blur", onBlur);
      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("blur", onBlur);
      };
    },
    setFocus: async () => {
      if (typeof window !== "undefined") window.focus();
    },
    show: async () => {},
    hide: async () => {},
    close: async () => {},
  };
}

export function getCurrentWindow(): WebWindowShim {
  return createWindowShim();
}

export function getCurrentWebviewWindow(): WebWindowShim {
  return createWindowShim();
}
