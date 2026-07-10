"use client";

import Image from "next/image";
import Link from "next/link";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserControl } from "@/components/user-control";

export const Navbar = () => {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <nav className="p-4 bg-transparent fixed top-0 left-0 right-0 z-50">
      <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/vireshot-logo.svg"
            alt="Vireshot"
            width={24}
            height={24}
          />
          <span className="font-semibold text-lg">Vireshot</span>
        </Link>
        {!isLoaded ? (
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        ) : !isSignedIn ? (
          <div className="flex gap-2">
            <SignUpButton>
              <Button variant="outline" size="sm">
                Sign up
              </Button>
            </SignUpButton>
            <SignInButton>
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </div>
        ) : (
          <UserControl showName />
        )}
      </div>
    </nav>
  );
};
