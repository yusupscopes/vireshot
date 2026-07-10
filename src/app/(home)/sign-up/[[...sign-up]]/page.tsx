"use client";

import { SignUp } from "@clerk/nextjs";

import { useClerkAuthAppearance } from "@/hooks/use-clerk-auth-appearance";

export default function Page() {
  const appearance = useClerkAuthAppearance();

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full">
      <section className="space-y-6 pt-[16vh] 2xl:pt-48">
        <div className="flex flex-col items-center">
          <SignUp appearance={appearance} />
        </div>
      </section>
    </div>
  );
}
