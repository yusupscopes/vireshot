import Image from "next/image";
import { useState, useEffect } from "react";

const SHIMMER_MESSAGES = [
  "Thinking...",
  "Loading...",
  "Generating...",
  "Analyzing your request...",
  "Building your website...",
  "Crafting components...",
  "Optimizing layout...",
  "Adding final touches...",
  "Almost ready...",
];

const ShimmerMessages = () => {
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % SHIMMER_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-base text-muted-foreground animate-pulse">
        {SHIMMER_MESSAGES[currentMessage]}
      </span>
    </div>
  );
};

export const MessageLoading = () => {
  return (
    <div className="flex flex-col group px-2 pb-4">
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image
          src="/vireshot-logo.svg"
          alt="Vireshot"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Vireshot</span>
      </div>
      <div className="pl-8 flex flex-col gap-y-4">
        <ShimmerMessages />
      </div>
    </div>
  );
};
