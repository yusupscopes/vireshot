import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import type { FileCollection } from "@/types";

interface FileExplorerProps {
  files: FileCollection;
}

export const FileExplorer = ({ files }: FileExplorerProps) => {
  const [activeFile, setActiveFile] = useState<string | null>(() => {
    const fileKeys = Object.keys(files);
    return fileKeys.length > 0 ? fileKeys[0] : null;
  });

  return (
    <ResizablePanelGroup>
      <ResizablePanel defaultSize={30} minSize={30} className="bg-sidebar">
        <p>TODO: Tree View</p>
      </ResizablePanel>
      <ResizableHandle className="hover:bg-primary transition-colors" />
      <ResizablePanel defaultSize={70} minSize={50}>
        {activeFile && files[activeFile] ? (
          <div>
            <p>TODO: Code View</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a file to view its contents</p>
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
