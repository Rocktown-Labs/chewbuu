import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { cn } from "@chewbuu/ui/lib/utils";
import { Plus } from "lucide-react";

export interface StoryItem {
  id: string;
  creatorName: string;
  creatorAvatar?: string;
  spotName: string;
  hasUnread?: boolean;
  isAddStory?: boolean;
  videoUrl?: string;
  caption?: string;
}

interface StoriesBarProps {
  stories: StoryItem[];
  onSelectStory?: (story: StoryItem) => void;
  onAddStory?: () => void;
  className?: string;
}

export function StoriesBar({
  stories,
  onSelectStory,
  onAddStory,
  className,
}: StoriesBarProps) {
  return (
    <div className={cn("w-full overflow-hidden py-1", className)}>
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x px-1">
        {/* Add Story Button */}
        <button
          className="group flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer focus:outline-none"
          onClick={onAddStory}
          type="button"
        >
          <div className="relative flex size-15 items-center justify-center rounded-full border-2 border-dashed border-primary/50 bg-primary/10 p-0.5 transition group-hover:border-primary group-hover:bg-primary/20">
            <Avatar className="size-full">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                <Plus className="size-6" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
              <Plus className="size-3 stroke-[3]" />
            </div>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
            Your Recap
          </span>
        </button>

        {/* Story Circles */}
        {stories.map((story) => (
          <button
            className="group flex flex-col items-center gap-1.5 shrink-0 snap-start cursor-pointer focus:outline-none"
            key={story.id}
            onClick={() => onSelectStory?.(story)}
            type="button"
          >
            <div
              className={cn(
                "relative flex size-15 items-center justify-center rounded-full p-0.5 transition group-hover:scale-105",
                story.hasUnread
                  ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-primary p-[2px] shadow-sm"
                  : "border-2 border-border bg-card"
              )}
            >
              <Avatar className="size-full border border-background">
                {story.creatorAvatar ? (
                  <AvatarImage
                    alt={story.creatorName}
                    src={story.creatorAvatar}
                  />
                ) : (
                  <AvatarFallback className="bg-muted font-bold text-xs uppercase">
                    {story.creatorName.slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>

              {story.spotName ? (
                <Badge className="absolute -bottom-1 max-w-14 truncate border-0 bg-black/80 px-1 py-0 font-bold text-[8px] text-white shadow-2xs">
                  {story.spotName}
                </Badge>
              ) : null}
            </div>

            <span className="max-w-16 truncate text-[11px] font-medium text-foreground/90 group-hover:text-primary">
              {story.creatorName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
