import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import type { FileCollection } from "@/types";
import { Hint } from "./hint";
import { Button } from "./ui/button";
import { CopyCheckIcon, CopyIcon } from "lucide-react";
import { CodeView } from "./code-view";
import { convertFilesToTree } from "@/lib/utils";
import { TreeView } from "./tree-view";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbEllipsis,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

interface FileExplorerProps {
  files: FileCollection;
}

const getLanguageFromExtension = (filename: string): string => {
  return filename.split(".").pop()?.toLowerCase() ?? "text";
};

interface FileBreadcrumbProps {
  path: string;
}

const FileBreadcrumb = ({ path }: FileBreadcrumbProps) => {
  const pathSegments = path.split("/");
  const maxSegments = 3;

  const renderBreadcrumbItems = () => {
    if (pathSegments.length <= maxSegments) {
      // Show all segments
      return pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;

        return (
          <Fragment key={index}>
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage className="font-medium">
                  {segment}
                </BreadcrumbPage>
              ) : (
                <span className="text-muted-foreground">{segment}</span>
              )}
            </BreadcrumbItem>
            {!isLast && <BreadcrumbSeparator />}
          </Fragment>
        );
      });
    } else {
      const firstSegment = pathSegments[0];
      const lastSegment = pathSegments[pathSegments.length - 1];

      return (
        <>
          <BreadcrumbItem>
            <span className="text-muted-foreground">{firstSegment}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">
              {lastSegment}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </>
      );
    }
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>{renderBreadcrumbItems()}</BreadcrumbList>
    </Breadcrumb>
  );
};

export const FileExplorer = ({ files }: FileExplorerProps) => {
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(() => {
    const fileKeys = Object.keys(files);
    return fileKeys.length > 0 ? fileKeys[0] : null;
  });

  useEffect(() => {
    return () => {
      clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const treeData = useMemo(() => convertFilesToTree(files), [files]);
  const handleFileSelect = useCallback(
    (path: string) => {
      if (files[path]) {
        setActiveFile(path);
      }
    },
    [files],
  );

  const handleCopy = useCallback(async () => {
    if (activeFile) {
      try {
        await navigator.clipboard.writeText(files[activeFile]);
        setCopied(true);
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch {
        // Clipboard write failed
      }
    }
  }, [activeFile, files]);

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
              <FileBreadcrumb path={activeFile} />
              <Hint text="Copy to clipboard" side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-auto"
                  onClick={handleCopy}
                  disabled={copied}
                >
                  {copied ? <CopyCheckIcon /> : <CopyIcon />}
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
