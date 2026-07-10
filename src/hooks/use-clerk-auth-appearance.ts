import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export const useClerkAuthAppearance = () => {
  const { resolvedTheme } = useTheme();

  return {
    theme: resolvedTheme === "dark" ? dark : undefined,
    elements: {
      cardBox: "border! shadow-none! rounded-lg!",
    },
  };
};
