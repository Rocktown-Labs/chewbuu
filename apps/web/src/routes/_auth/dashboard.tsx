import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button, buttonVariants } from "@chewbuu/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@chewbuu/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@chewbuu/ui/components/empty";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@chewbuu/ui/components/tabs";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  ClipboardList,
  ShieldCheck,
  UserPlus,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { datingApi } from '@/lib/dating-api';
import type { DatingProfilePayload, DatingSummary } from '@/lib/dating-api';

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const [summary, setSummary] = useState<DatingSummary | null>(null);
  const [profile, setProfile] = useState<DatingProfilePayload | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [nextSummary, nextProfile] = await Promise.all([
          datingApi.getSummary(),
          datingApi.getProfile(),
        ]);
        setSummary(nextSummary);
        setProfile(nextProfile.profile);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not load dashboard."
        );
      }
    };

    void load();
  }, []);

  const displayName = session.data?.user.name ?? "there";
  const tier =
    summary?.membershipTier ?? session.data?.user.membershipTier ?? "social";
  const canDate = summary?.readiness.canDate ?? false;
  const media = profile?.media ?? [];
  const friends = profile?.friendInvites ?? [];
  const contacts = profile?.trustedContacts ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Badge className="w-fit" variant="secondary">
            Chewbuu {tier}
          </Badge>
          <h1 className="text-2xl font-semibold">Welcome {displayName}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage the profile, media, invites, safety contacts, and date
            requests that power your matches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={buttonVariants({
              variant: canDate ? "default" : "outline",
            })}
            to={canDate ? "/date/new" : "/onboarding"}
          >
            <CalendarCheck data-icon="inline-start" />
            {canDate ? "Plan a date" : "Finish onboarding"}
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            to="/onboarding"
          >
            <ClipboardList data-icon="inline-start" />
            Edit profile
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          description="Intro video, profile photo, and onboarding complete."
          title="Dating readiness"
          value={canDate ? "Ready" : "Blocked"}
        />
        <MetricCard
          description="Social gets two booked dates per day."
          title="Booked today"
          value={`${summary?.requests.length ?? 0}`}
        />
        <MetricCard
          description="Reviews must be cleared before more dates."
          title="Pending reviews"
          value={`${summary?.readiness.pendingReviews ?? 0}`}
        />
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Date requests</CardTitle>
              <CardDescription>
                Track the wizard requests that feed match results and chat
                rooms.
              </CardDescription>
              <CardAction>
                <Link className={buttonVariants({ size: "sm" })} to="/date/new">
                  New
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent>
              {summary && summary.requests.length > 0 ? (
                <div className="grid gap-3">
                  {summary.requests.map((request) => (
                    <Card key={request.id} size="sm">
                      <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-1">
                          <p className="font-medium">
                            {request.what.join(", ")} in {request.searchArea}
                          </p>
                          <p className="text-muted-foreground">
                            {new Date(request.scheduledAt).toLocaleString()} ·
                            party of {request.partySize}
                          </p>
                        </div>
                        <Badge>{request.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No date requests yet</EmptyTitle>
                    <EmptyDescription>
                      Plan one date, select three spots, and Chewbuu will return
                      matches.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Link className={buttonVariants()} to="/date/new">
                      Start wizard
                    </Link>
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile signals</CardTitle>
              <CardDescription>
                These fields become matching and embedding inputs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoBlock label="Area" value={profile?.area} />
              <InfoBlock
                label="Interested in"
                value={profile?.interestedIn?.join(", ")}
              />
              <InfoBlock
                label="Interests"
                value={profile?.interests?.join(", ")}
              />
              <InfoBlock
                label="Favorite things"
                value={profile?.favoriteThings?.join(", ")}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Video and photos</CardTitle>
              <CardDescription>
                Intro video and profile photo are required before dating.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                {media.map((item) => (
                  <Badge
                    key={`${item.kind}-${item.url}`}
                    variant={
                      item.kind === "intro_video" ? "default" : "secondary"
                    }
                  >
                    {item.kind.replace("_", " ")}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Video />
                <p className="text-sm text-muted-foreground">
                  Requests exchange intro videos automatically. Three additional
                  video replies unlock text chat.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="people">
          <Card>
            <CardHeader>
              <CardTitle>Friends and safety</CardTitle>
              <CardDescription>
                Invite friends for group dating and designate trusted contacts
                as the safety layer grows.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <PeoplePanel
                contacts={friends.map(
                  (friend) => friend.email ?? friend.phone ?? "Invite"
                )}
                icon={<UserPlus />}
                title="Friend invites"
              />
              <PeoplePanel
                contacts={contacts.map((contact) => contact.name)}
                icon={<ShieldCheck />}
                title="Safety contacts"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function MetricCard({
  description,
  title,
  value,
}: {
  description: string;
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{value || "Not set"}</p>
    </div>
  );
}

function PeoplePanel({
  contacts,
  icon,
  title,
}: {
  contacts: string[];
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length > 0 ? (
          <AvatarGroup>
            {contacts.map((contact) => (
              <Avatar key={contact}>
                <AvatarImage alt="" src="" />
                <AvatarFallback>
                  {contact.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
        ) : (
          <p className="text-muted-foreground">None yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
