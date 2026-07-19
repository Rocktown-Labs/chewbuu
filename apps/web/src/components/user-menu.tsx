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

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  if (!session) {
    return null;
  }

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
          {session.user.image ? (
            <AvatarImage alt="" src={session.user.image} />
          ) : null}
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
