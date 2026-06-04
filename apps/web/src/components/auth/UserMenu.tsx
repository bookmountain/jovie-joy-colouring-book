"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserDto } from "@/lib/api";
import { fetchCurrentUser, signOut } from "@/lib/auth";
import { useSite } from "@/state/site-store";

export function UserMenu() {
  const { dispatch } = useSite();
  const [user, setUser] = useState<UserDto | null | undefined>(undefined);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatarUrl]);

  if (user === undefined) return null;

  if (user === null) {
    return (
      <button
        className="text-sm font-semibold underline"
        onClick={() => dispatch({ type: "modal/open", modal: "login" })}
        type="button"
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.avatarUrl && !avatarFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={user.name ?? user.email}
          className="h-8 w-8 rounded-full border border-cocoa-line"
          onError={() => setAvatarFailed(true)}
          src={user.avatarUrl}
        />
      ) : null}
      <span className="text-sm">Hi, {user.name?.split(" ")[0] ?? "friend"}</span>
      {user.isAdmin ? (
        <Link className="text-sm font-semibold underline" href="/admin">
          Admin
        </Link>
      ) : null}
      <button
        className="text-sm underline"
        onClick={() => signOut("/")}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
