import { useCallback, useMemo, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import type { FileCollection } from "@/types";
import { Hint } from "./hint";
import { Button } from "./ui/button";
import { CopyIcon } from "lucide-react";
import { CodeView } from "./code-view";
import { convertFilesToTree } from "@/lib/utils";
import { TreeView } from "./tree-view";

interface FileExplorerProps {
  files: FileCollection;
}

const getLanguageFromExtension = (filename: string): string => {
  return filename.split(".").pop()?.toLowerCase() ?? "text";
};

export const FileExplorer = ({ files }: FileExplorerProps) => {
  const [activeFile, setActiveFile] = useState<string | null>(() => {
    const fileKeys = Object.keys(files);
    return fileKeys.length > 0 ? fileKeys[0] : null;
  });

  const treeData = useMemo(() => convertFilesToTree(files), [files]);
  const handleFileSelect = useCallback(
    (path: string) => {
      if (files[path]) {
        setActiveFile(path);
      }
    },
    [files],
  );

  return (
    <ResizablePanelGroup>
      <ResizablePanel defaultSize={30} minSize={30} className="bg-sidebar">
        <TreeView
          data={treeData}
          value={activeFile}
          onSelect={handleFileSelect}
        />
      </ResizablePanel>
      <ResizableHandle className="hover:bg-primary transition-colors" />
      <ResizablePanel defaultSize={70} minSize={50}>
        {activeFile && files[activeFile] ? (
          <div className="h-full w-full flex flex-col">
            <div className="border-b bg-sidebar px-4 py-2 flex justify-between items-center gap-x-2">
              {/* TODO: File breadcrumb */}
              <Hint text="Copy to clipboard" side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-auto"
                  onClick={() => navigator.clipboard.writeText(files[activeFile])}
                >
                  <CopyIcon />
                </Button>
              </Hint>
            </div>
            <div className="flex-1 overflow-auto">
              <CodeView
                code={files[activeFile]}
                lang={getLanguageFromExtension(activeFile)}
              />
            </div>
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
