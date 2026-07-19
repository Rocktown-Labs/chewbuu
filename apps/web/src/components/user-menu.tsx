import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Button } from "@chewbuu/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@chewbuu/ui/components/dropdown-menu";
import { Skeleton } from "@chewbuu/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { datingApi, type DatingProfilePayload } from "@/lib/dating-api";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<DatingProfilePayload | null>(null);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await datingApi.getProfile();
        if (isMounted) {
          setProfile(response.profile);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session]);

  if (isPending) {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  if (!session) {
    return null;
  }

  const profilePhoto =
    profile?.media.find((item) => item.kind === "profile_photo")?.url ??
    session.user.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Account menu"
            className="size-9 rounded-full p-0"
            variant="outline"
          />
        }
      >
        <Avatar className="size-8">
          {profilePhoto ? <AvatarImage alt="" src={profilePhoto} /> : null}
          <AvatarFallback className="text-[10px] font-bold uppercase">
            {session.user.name?.slice(0, 2) ?? "ME"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
