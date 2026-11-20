import { useCallback, useEffect, useState } from "react";
import { useTitles, useSystemAudio } from "@/hooks";
import { listen } from "@tauri-apps/api/event";
import {
  safeLocalStorage,
  migrateLocalStorageToSQLite,
  isToggleWindowShortcut,
} from "@/lib";
import { getShortcutsConfig } from "@/lib/storage";
import { invoke } from "@tauri-apps/api/core";

export const useApp = () => {
  const systemAudio = useSystemAudio();
  const [isHidden, setIsHidden] = useState(false);
  // Initialize title management
  useTitles();

  // Initialize shortcuts from localStorage on app startup
  useEffect(() => {
    const initializeShortcuts = async () => {
      try {
        const config = getShortcutsConfig();
        await invoke("update_shortcuts", { config });
      } catch (error) {
        console.error("Failed to initialize shortcuts:", error);
      }
    };

    initializeShortcuts();
  }, []);

  // Migrate localStorage chat history to SQLite on app startup
  useEffect(() => {
    const runMigration = async () => {
      try {
        // Early exit: Check if migration already completed
        const migrationKey = "chat_history_migrated_to_sqlite";
        const alreadyMigrated =
          safeLocalStorage.getItem(migrationKey) === "true";

        if (alreadyMigrated) {
          return; // Migration already complete, skip
        }

        const result = await migrateLocalStorageToSQLite();

        if (result.success) {
          if (result.migratedCount > 0) {
            console.log(
              `Successfully migrated ${result.migratedCount} conversations to SQLite`
            );
          }
        } else if (result.error) {
          // Migration failed - log error
          console.error("Migration error:", result.error);
        }
      } catch (error) {
        // Critical error during migration
        console.error("Critical migration failure:", error);
      }
    };
    runMigration();
  }, []);

  const handleSelectConversation = (conversation: any) => {
    // useCompletion will fetch the full conversation from SQLite by id
    window.dispatchEvent(
      new CustomEvent("conversationSelected", {
        detail: { id: conversation.id },
      })
    );
  };

  const handleNewConversation = () => {
    // Trigger new conversation event
    window.dispatchEvent(new CustomEvent("newConversation"));
  };

  const toggleWindowVisibility = useCallback(() => {
    setIsHidden((prev) => !prev);
  }, []);

  // Global keyboard shortcut (default F9) to disappear/reappear main screen windows
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const config = getShortcutsConfig();
      const toggleBinding = config.bindings?.toggle_window;
      if (isToggleWindowShortcut(event, toggleBinding)) {
        event.preventDefault();
        event.stopPropagation();
        setIsHidden((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Ensure any portaled popovers also disappear cleanly when window is hidden
  useEffect(() => {
    const popovers = document.querySelectorAll<HTMLElement>(
      '[data-slot="popover-content"]'
    );
    if (isHidden) {
      popovers.forEach((popover) => {
        popover.dataset.hiddenByWindow = "true";
        popover.style.setProperty("display", "none", "important");
      });
    } else {
      popovers.forEach((popover) => {
        if (popover.dataset.hiddenByWindow === "true") {
          popover.style.removeProperty("display");
          delete popover.dataset.hiddenByWindow;
        }
      });
    }
  }, [isHidden]);

  // WINDOWS HIDE/SHOW TOGGLE WINDOW WORKAROUND FOR SHORTCUTS
  useEffect(() => {
    const unlistenPromise = listen<boolean>(
      "toggle-window-visibility",
      (event) => {
        if (typeof event.payload === "boolean") {
          setIsHidden(!event.payload);
        }
      }
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const handleShortcutRegistrationError = (
      event: Event | CustomEvent<Array<[string, string, string]>>
    ) => {
      const detail =
        (event as CustomEvent<Array<[string, string, string]>>)?.detail ?? [];

      if (!detail.length) {
        return;
      }

      const formatted = detail
        .map(([action, key, error]) => ({ action, key, error }))
        .filter(({ action, key }) => action && key);

      if (!formatted.length) {
        return;
      }

      console.warn(
        "Some shortcuts could not be registered:",
        formatted.map(({ action, key, error }) => ({
          action,
          key,
          error,
        }))
      );
    };

    window.addEventListener(
      "shortcutRegistrationError",
      handleShortcutRegistrationError as EventListener
    );

    return () => {
      window.removeEventListener(
        "shortcutRegistrationError",
        handleShortcutRegistrationError as EventListener
      );
    };
  }, []);

  return {
    isHidden,
    setIsHidden,
    toggleWindowVisibility,
    handleSelectConversation,
    handleNewConversation,
    systemAudio,
  };
};
