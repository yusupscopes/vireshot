"use client";

import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

interface UserControlProps {
  showName?: boolean;
}

export const UserControl = ({ showName = false }: UserControlProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <UserButton
      showName={showName}
      appearance={{
        elements: {
          userButtonBox: "rounded-md!",
          userButtonAvatarBox: "rounded-md! size-8!",
          userButtonTrigger: "rounded-md!",
        },
        theme: resolvedTheme === "dark" ? dark : undefined,
      }}
    />
  );
};
