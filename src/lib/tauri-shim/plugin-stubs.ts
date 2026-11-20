// Stubs for native-only Tauri plugins in web runtime

// @tauri-apps/plugin-autostart
export async function enable(): Promise<void> {}
export async function disable(): Promise<void> {}
export async function isEnabled(): Promise<boolean> {
  return false;
}

// @tauri-apps/plugin-updater
export interface Update {
  version: string;
  body?: string;
  downloadAndInstall: (
    onEvent?: (event: { event: string; data: any }) => void
  ) => Promise<void>;
}

export async function check(): Promise<Update | null> {
  return null;
}

// @tauri-apps/plugin-process
export async function relaunch(): Promise<void> {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export async function exit(_code?: number): Promise<void> {}

// tauri-plugin-macos-permissions-api
export async function checkMicrophonePermission(): Promise<boolean> {
  return true;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  return true;
}

export async function checkScreenRecordingPermission(): Promise<boolean> {
  return true;
}

export async function requestScreenRecordingPermission(): Promise<boolean> {
  return true;
}

// tauri-plugin-posthog-api
export const PostHog = {
  capture: async (_event: string, _properties?: Record<string, any>) => {},
};
