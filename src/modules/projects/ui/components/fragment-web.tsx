import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Fragment } from "@/generated/prisma/client";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  data: Fragment;
}

export const FragmentWeb = ({ data }: Props) => {
  const [fragmentKey, setFragmentKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const onCopy = () => {
    if (!data.sandboxUrl) return;
    navigator.clipboard.writeText(data.sandboxUrl).catch(() => {});
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const onOpenInNewTab = () => {
    if (!data.sandboxUrl) return;
    window.open(data.sandboxUrl, "_blank");
  };

  return (
    <div className="flex flex-col w-full h-full ">
      <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
        <Hint text="Refresh" side="bottom" align="start">
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCcwIcon />
          </Button>
        </Hint>

        <Hint text="Copy URL to clipboard" side="bottom" align="start">
          <Button
            disabled={!data.sandboxUrl || copied}
            className="flex-1 justify-start text-start font-normal"
            size="sm"
            variant="outline"
            onClick={onCopy}
          >
            <span className="truncate">{data.sandboxUrl}</span>
          </Button>
        </Hint>
        <Hint text="Open in new tab" side="bottom" align="start">
          <Button
            size="sm"
            variant="outline"
            disabled={!data.sandboxUrl}
            onClick={onOpenInNewTab}
          >
            <ExternalLinkIcon />
          </Button>
        </Hint>
      </div>
      {data.sandboxUrl && (
        <iframe
          key={fragmentKey}
          className="h-full w-full"
          sandbox="allow-forms allow-scripts allow-same-origin"
          loading="lazy"
          src={data.sandboxUrl}
        />
      )}
    </div>
  );
};
