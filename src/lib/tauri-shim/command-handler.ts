import type { StorageAdapter } from "./sqlite-store";

const SECURE_STORAGE_KEY = "pluely_secure_storage_v1";
const SHORTCUTS_STORAGE_KEY = "pluely_shortcuts_registered_v1";

export function maskLicenseKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return "****";
  }
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
}

export function validateShortcutKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  const parts = trimmed.split("+").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 1;
}

export interface CommandRuntime {
  storage?: StorageAdapter;
  navigate?: (path: string) => void;
  getPath?: () => string;
  emitEvent?: (event: string, payload?: unknown) => Promise<void>;
  getAudioDevices?: () => Promise<{
    inputs: Array<{ id: string; name: string; is_default: boolean }>;
    outputs: Array<{ id: string; name: string; is_default: boolean }>;
  }>;
  captureScreen?: () => Promise<string>;
}

export function createCommandRouter(runtime: CommandRuntime = {}) {
  const adapter: StorageAdapter =
    runtime.storage ??
    (typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : (() => {
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => {
              mem.set(k, v);
            },
          };
        })());

  let inMemoryLicenseActive = false;

  const readSecureMap = (): Record<string, string> => {
    try {
      const raw = adapter.getItem(SECURE_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeSecureMap = (map: Record<string, string>) => {
    adapter.setItem(SECURE_STORAGE_KEY, JSON.stringify(map));
  };

  return async function handleCommand<T = unknown>(
    cmd: string,
    args: Record<string, any> = {}
  ): Promise<T> {
    switch (cmd) {
      case "get_app_version":
        return "0.1.9" as T;

      case "open_dashboard":
        runtime.navigate?.("/dashboard");
        return undefined as T;

      case "toggle_dashboard": {
        const path = runtime.getPath?.() ?? "/";
        runtime.navigate?.(path === "/" ? "/dashboard" : "/");
        return undefined as T;
      }

      case "exit_app":
        runtime.navigate?.("/");
        return undefined as T;

      case "set_window_height":
      case "move_window":
      case "set_app_icon_visibility":
      case "set_always_on_top":
        return undefined as T;

      case "secure_storage_get": {
        const map = readSecureMap();
        if (!map.pluely_instance_id) {
          map.pluely_instance_id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `web-${Date.now()}`;
          writeSecureMap(map);
        }
        return {
          license_key: map.pluely_license_key,
          instance_id: map.pluely_instance_id,
          selected_pluely_model: map.selected_pluely_model,
        } as T;
      }

      case "secure_storage_save": {
        const map = readSecureMap();
        const items: Array<{ key: string; value: string }> = Array.isArray(
          args.items
        )
          ? args.items
          : [];
        for (const item of items) {
          if (item && typeof item.key === "string") {
            map[item.key] = String(item.value ?? "");
          }
        }
        writeSecureMap(map);
        return undefined as T;
      }

      case "secure_storage_remove": {
        const map = readSecureMap();
        const keys: string[] = Array.isArray(args.keys) ? args.keys : [];
        for (const key of keys) {
          delete map[key];
        }
        writeSecureMap(map);
        return undefined as T;
      }

      case "mask_license_key_cmd":
        return maskLicenseKey(String(args.licenseKey || "")) as T;

      case "validate_license_api": {
        inMemoryLicenseActive = true;
        return {
          is_active: true,
          is_dev_license: false,
        } as T;
      }

      case "check_license_status": {
        return true as T;
      }

      case "set_license_status":
        inMemoryLicenseActive = Boolean(args.hasLicense);
        return undefined as T;

      case "activate_license_api":
        return {
          activated: true,
        } as T;

      case "deactivate_license_api":
        inMemoryLicenseActive = true;
        return undefined as T;

      case "get_checkout_url":
        return {
          success: true,
          checkout_url: "https://pluely.com",
        } as T;

      case "get_activity":
        return {
          success: true,
          data: [],
          total_tokens_used: 0,
        } as T;

      case "fetch_models":
        return [] as T;

      case "fetch_prompts":
        return {
          prompts: [],
          total: 0,
        } as T;

      case "create_system_prompt":
        return undefined as T;

      case "check_shortcuts_registered":
        return true as T;

      case "get_registered_shortcuts": {
        try {
          const raw = adapter.getItem(SHORTCUTS_STORAGE_KEY);
          return (raw ? JSON.parse(raw) : {}) as T;
        } catch {
          return {} as T;
        }
      }

      case "update_shortcuts":
        if (args.config) {
          adapter.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(args.config));
        }
        return undefined as T;

      case "validate_shortcut_key":
        return validateShortcutKey(String(args.key || args.shortcut || "")) as T;

      case "get_input_devices": {
        if (runtime.getAudioDevices) {
          const { inputs } = await runtime.getAudioDevices();
          return inputs as T;
        }
        return [{ id: "default", name: "Default Microphone", is_default: true }] as T;
      }

      case "get_output_devices": {
        if (runtime.getAudioDevices) {
          const { outputs } = await runtime.getAudioDevices();
          return outputs as T;
        }
        return [{ id: "default", name: "Default Output", is_default: true }] as T;
      }

      case "check_system_audio_access":
        return true as T;

      case "request_system_audio_access":
      case "start_system_audio_capture":
      case "stop_system_audio_capture":
      case "manual_stop_continuous":
      case "update_vad_config":
        return "ok" as T;

      case "get_capture_status":
        return false as T;

      case "get_audio_sample_rate":
        return 16000 as T;

      case "capture_to_base64":
      case "capture_screenshot":
        if (runtime.captureScreen) {
          return (await runtime.captureScreen()) as T;
        }
        throw new Error(
          "Screen capture is not supported in this browser session. You can attach images directly using the file button or paste."
        );

      case "start_screen_capture":
        if (runtime.captureScreen) {
          try {
            const base64 = await runtime.captureScreen();
            await runtime.emitEvent?.("captured-selection", base64);
            return undefined as T;
          } catch (error) {
            await runtime.emitEvent?.("capture-closed", {});
            throw error;
          }
        }
        await runtime.emitEvent?.("capture-closed", {});
        throw new Error(
          "Screen capture is unavailable in this environment. Attach or paste an image instead."
        );

      case "close_overlay_window":
        await runtime.emitEvent?.("capture-closed", args);
        return undefined as T;

      case "capture_selected_area":
        await runtime.emitEvent?.("captured-selection", "");
        return undefined as T;

      case "chat_stream_response":
        await runtime.emitEvent?.(
          "chat_stream_chunk",
          "Pluely Cloud API is not active in web mode. Please configure an AI provider in Dev Space."
        );
        await runtime.emitEvent?.("chat_stream_complete", {});
        return undefined as T;

      case "transcribe_audio":
        return { text: "" } as T;

      default:
        return undefined as T;
    }
  };
}
