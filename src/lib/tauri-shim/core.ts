import { createCommandRouter } from "./command-handler";
import { emit } from "./event";

async function getBrowserAudioDevices() {
  const defaultInput = [
    { id: "default", name: "Default Microphone", is_default: true },
  ];
  const defaultOutput = [
    { id: "default", name: "Default Output", is_default: true },
  ];

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.enumerateDevices
  ) {
    return { inputs: defaultInput, outputs: defaultOutput };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices
      .filter((d) => d.kind === "audioinput")
      .map((d, i) => ({
        id: d.deviceId || `input-${i}`,
        name: d.label || `Microphone ${i + 1}`,
        is_default: d.deviceId === "default" || i === 0,
      }));
    const outputs = devices
      .filter((d) => d.kind === "audiooutput")
      .map((d, i) => ({
        id: d.deviceId || `output-${i}`,
        name: d.label || `Speaker ${i + 1}`,
        is_default: d.deviceId === "default" || i === 0,
      }));
    return {
      inputs: inputs.length > 0 ? inputs : defaultInput,
      outputs: outputs.length > 0 ? outputs : defaultOutput,
    };
  } catch {
    return { inputs: defaultInput, outputs: defaultOutput };
  }
}

async function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("loadedmetadata", done);
      resolve();
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("loadedmetadata", done);
    setTimeout(done, 800);
  });
}

async function captureBrowserScreen(): Promise<string> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getDisplayMedia
  ) {
    throw new Error(
      "Screen sharing is unavailable in this browser. Click the attach image button or paste (Ctrl+V / Cmd+V) a screenshot instead."
    );
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "NotAllowedError"
        ? "Screen sharing permission was cancelled or blocked by this frame."
        : "Screen sharing could not start.";
    throw new Error(
      `${reason} You can still attach a screenshot image via the paperclip button or paste (Ctrl+V / Cmd+V).`
    );
  }

  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await waitForVideoFrame(video);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to capture screenshot frame");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.replace(/^data:image\/png;base64,/, "");
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

const router = createCommandRouter({
  navigate: (path: string) => {
    if (typeof window !== "undefined") {
      if (window.location.pathname !== path) {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  },
  getPath: () =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  emitEvent: emit,
  getAudioDevices: getBrowserAudioDevices,
  captureScreen: captureBrowserScreen,
});

export async function invoke<T = unknown>(
  cmd: string,
  args?: Record<string, any>
): Promise<T> {
  return router<T>(cmd, args);
}
