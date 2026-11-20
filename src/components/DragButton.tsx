import { GripVerticalIcon } from "lucide-react";
import { Button } from "@/components";

export const DragButton = () => {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Drag handle"
      className="-ml-[2px] w-fit"
      data-tauri-drag-region={true}
    >
      <GripVerticalIcon className="h-4 w-4" />
    </Button>
  );
};
