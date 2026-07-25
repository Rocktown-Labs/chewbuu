import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@chewbuu/ui/components/avatar";
import { Badge } from "@chewbuu/ui/components/badge";
import { Button } from "@chewbuu/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@chewbuu/ui/components/dialog";
import { cn } from "@chewbuu/ui/lib/utils";
import {
  CalendarHeart,
  Heart,
  MapPin,
  Share2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useState } from "react";

export interface ReelData {
  id: string;
  creatorName: string;
  creatorAvatar?: string;
  spotName: string;
  spotAddress?: string;
  category?: "eat" | "drink" | "play";
  videoUrl: string;
  caption?: string;
  likesCount?: number;
  rating?: number;
}

interface ReelPlayerProps {
  reel: ReelData | null;
  isOpen: boolean;
  onClose: () => void;
  onPlanDateAtSpot?: (spotName: string, spotAddress?: string) => void;
}

export function ReelPlayer({
  reel,
  isOpen,
  onClose,
  onPlanDateAtSpot,
}: ReelPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel?.likesCount ?? 24);

  if (!reel) return null;

  const toggleLike = () => {
    setIsLiked((prev) => !prev);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-0 bg-black p-0 sm:rounded-3xl overflow-hidden shadow-2xl h-[85vh] max-h-[720px] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Recap Reel · {reel.spotName}</DialogTitle>
        </DialogHeader>

        <div className="relative size-full flex-1 overflow-hidden bg-black">
          {/* Video element */}
          <video
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="size-full object-cover"
            src={reel.videoUrl}
          >
            <track kind="captions" srcLang="en" label="English" />
          </video>

          {/* Gradient Overlay for controls & text legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />

          {/* Top Bar Header */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
            <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md border border-white/10">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span className="font-bold text-xs text-white truncate max-w-44">
                {reel.spotName}
              </span>
              {reel.category ? (
                <Badge className="rounded-full bg-primary/90 text-[8px] font-bold text-primary-foreground uppercase px-1.5">
                  {reel.category}
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 transition hover:bg-black/70"
                onClick={() => setIsMuted(!isMuted)}
                type="button"
              >
                {isMuted ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>
              <button
                aria-label="Close reel"
                className="flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 transition hover:bg-black/70"
                onClick={onClose}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
            {/* Like Button */}
            <button
              className="flex flex-col items-center gap-1 text-white group"
              onClick={toggleLike}
              type="button"
            >
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/15 transition group-hover:scale-110",
                  isLiked && "bg-rose-500/20 text-rose-500 border-rose-500/50"
                )}
              >
                <Heart
                  className={cn(
                    "size-5 transition",
                    isLiked ? "fill-rose-500 text-rose-500" : "text-white"
                  )}
                />
              </div>
              <span className="text-[10px] font-bold shadow-xs">
                {likesCount}
              </span>
            </button>

            {/* Share Button */}
            <button
              className="flex flex-col items-center gap-1 text-white group"
              onClick={() => {
                if (navigator.share) {
                  void navigator.share({
                    title: `Check out ${reel.spotName} on Chewbuu`,
                    url: window.location.href,
                  });
                }
              }}
              type="button"
            >
              <div className="flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/15 transition group-hover:scale-110">
                <Share2 className="size-5 text-white" />
              </div>
              <span className="text-[10px] font-bold shadow-xs">Share</span>
            </button>
          </div>

          {/* Bottom Information & CTA Overlay */}
          <div className="absolute bottom-3 left-3 right-16 flex flex-col gap-3 z-20">
            {/* Creator Info */}
            <div className="flex items-center gap-2.5">
              <Avatar className="size-9 border border-white/20">
                {reel.creatorAvatar ? (
                  <AvatarImage
                    alt={reel.creatorName}
                    src={reel.creatorAvatar}
                  />
                ) : (
                  <AvatarFallback className="bg-primary font-bold text-xs uppercase text-primary-foreground">
                    {reel.creatorName.slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <p className="font-extrabold text-sm text-white drop-shadow-sm truncate">
                  {reel.creatorName}
                </p>
                <p className="text-[11px] text-white/80 truncate">
                  {reel.spotAddress || "Nashville, TN"}
                </p>
              </div>
            </div>

            {/* Caption */}
            {reel.caption ? (
              <p className="line-clamp-2 text-xs text-white/95 leading-relaxed drop-shadow-sm">
                {reel.caption}
              </p>
            ) : null}

            {/* Plan Date Here CTA */}
            <Button
              className="w-full rounded-full bg-primary font-extrabold text-xs text-primary-foreground shadow-lg hover:bg-primary/90 h-10 mt-1"
              onClick={() => {
                onClose();
                onPlanDateAtSpot?.(reel.spotName, reel.spotAddress);
              }}
              type="button"
            >
              <CalendarHeart className="mr-1.5 size-4" />
              Plan Date at {reel.spotName}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
