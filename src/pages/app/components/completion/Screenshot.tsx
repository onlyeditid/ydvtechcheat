import { Button } from "@/components";
import { CameraIcon, Loader2, MousePointer2Icon } from "lucide-react";
import { UseCompletionReturn } from "@/types";
import { MAX_FILES } from "@/config";
import { useApp } from "@/contexts";

export const Screenshot = ({
  screenshotConfiguration,
  attachedFiles,
  isLoading,
  captureScreenshot,
  isScreenshotLoading,
}: UseCompletionReturn) => {
  const { supportsImages } = useApp();
  const captureMode = screenshotConfiguration.enabled
    ? "Screenshot"
    : "Selection";
  const processingMode = screenshotConfiguration.mode;

  const isDisabled =
    attachedFiles.length >= MAX_FILES || isLoading || isScreenshotLoading;

  return (
    <Button
      type="button"
      size="sm"
      variant={attachedFiles.length > 0 ? "default" : "outline"}
      className="cursor-pointer shrink-0 h-9 px-3 gap-1.5"
      aria-label="Capture screenshot"
      title={
        !supportsImages
          ? "Current provider may not support images. Click to capture or switch to a vision-capable free model."
          : `${captureMode} mode (${processingMode}) - ${attachedFiles.length}/${MAX_FILES} files`
      }
      onClick={captureScreenshot}
      disabled={isDisabled}
    >
      {isScreenshotLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : screenshotConfiguration.enabled ? (
        <CameraIcon className="h-4 w-4" />
      ) : (
        <MousePointer2Icon className="h-4 w-4" />
      )}
      <span className="text-xs font-medium hidden sm:inline">Screenshot</span>
      {attachedFiles.length > 0 && (
        <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
          {attachedFiles.length}
        </span>
      )}
    </Button>
  );
};
