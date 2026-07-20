import { Avatar, AvatarFallback } from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import { Card, CardContent, CardHeader } from "@chewbuu/ui/components/card";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Image } from "@unpic/react";
import { Heart, MapPin, MessageSquare, Share2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

export interface FeedRecapItem {
  caption: string;
  createdAt: string;
  id: string;
  likesCount?: number;
  personName: string;
  photos: string[];
  placeAddress: string;
  placeName: string;
  userAvatar?: string;
  userName: string;
}

interface DateRecapFeedProps {
  initialItems?: FeedRecapItem[];
}

interface RecapFeedPage {
  items: FeedRecapItem[];
  nextCursor: number | null;
}

const defaultInitialItems: FeedRecapItem[] = [];

export function DateRecapFeed({
  initialItems = defaultInitialItems,
}: DateRecapFeedProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<RecapFeedPage>({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: async ({ pageParam }): Promise<RecapFeedPage> => {
        try {
          const res = await fetch(`/api/feed/recaps?cursor=${pageParam}`);
          if (!res.ok) throw new Error("Feed fetch failed");
          return (await res.json()) as RecapFeedPage;
        } catch {
          // Fallback to local initialItems for offline/mock support
          return {
            items: initialItems,
            nextCursor: null,
          };
        }
      },
      queryKey: ["dateRecapsFeed"],
    });

  const allItems: FeedRecapItem[] = data
    ? data.pages.flatMap((page) => page.items ?? [])
    : initialItems;

  const rowVirtualizer = useVirtualizer({
    count: allItems.length,
    estimateSize: () => 520,
    getScrollElement: () => parentRef.current,
    overscan: 3,
  });

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading && allItems.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-8">
        {[1, 2].map((i) => (
          <div
            className="h-96 w-full animate-pulse rounded-3xl bg-muted"
            key={i}
          />
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
        <Sparkles className="mb-3 size-10 text-primary" />
        <h3 className="font-bold text-foreground text-lg">No Recaps Yet</h3>
        <p className="mt-1 max-w-sm text-muted-foreground text-xs">
          Be the first to share a date recap from your recent spots and invite
          friends to follow your vibe!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="max-h-[800px] overflow-y-auto pr-1" ref={parentRef}>
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = allItems[virtualRow.index];
            if (!item) return null;
            const isLiked = likedIds.has(item.id);

            return (
              <div
                className="absolute top-0 left-0 w-full pb-6"
                key={virtualRow.key}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Card className="rounded-3xl border-border bg-card shadow-sm transition hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 p-5 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border border-border">
                        <AvatarFallback className="font-bold text-xs">
                          {item.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-foreground text-sm">
                          {item.userName}
                        </span>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <MapPin className="size-3 text-primary" />
                          <span className="truncate max-w-48 font-medium">
                            {item.placeName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      className="rounded-full font-semibold text-[10px]"
                      variant="secondary"
                    >
                      Date with {item.personName}
                    </Badge>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4 p-5 pt-0">
                    <p className="text-foreground text-sm leading-relaxed">
                      {item.caption}
                    </p>

                    {item.photos && item.photos.length > 0 && (
                      <div className="relative overflow-hidden rounded-2xl bg-muted aspect-video w-full">
                        <Image
                          alt={item.caption || "Date recap photo"}
                          cdn="vercel"
                          className="h-full w-full object-cover"
                          height={450}
                          layout="constrained"
                          priority={virtualRow.index === 0}
                          src={item.photos[0]}
                          width={600}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Button
                          className={`rounded-full gap-1.5 h-8 text-xs font-semibold ${
                            isLiked ? "text-rose-500 hover:text-rose-600" : ""
                          }`}
                          onClick={() => toggleLike(item.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Heart
                            className={`size-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                          />
                          <span>
                            {(item.likesCount ?? 0) + (isLiked ? 1 : 0)}
                          </span>
                        </Button>

                        <Button
                          className="rounded-full gap-1.5 h-8 text-xs font-semibold"
                          size="sm"
                          variant="ghost"
                        >
                          <MessageSquare className="size-4" />
                          <span>Comment</span>
                        </Button>
                      </div>

                      <Button
                        className="rounded-full h-8 text-xs font-semibold"
                        size="sm"
                        variant="ghost"
                      >
                        <Share2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {hasNextPage && (
        <Button
          className="mx-auto rounded-full px-6 font-semibold"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
          variant="outline"
        >
          {isFetchingNextPage ? "Loading more..." : "Load older recaps"}
        </Button>
      )}
    </div>
  );
}
