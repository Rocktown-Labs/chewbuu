import { Link } from "@tanstack/react-router";
import { Images, Video } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  dateMediaApi,
  datingApi,
  recapsApi,
  type DateMedia,
  type DateRecap,
  type DatingSummary,
} from "@/lib/dating-api";

const RECAP_STATUSES = new Set(["completed", "review_due"]);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function RecapsPage() {
  const [summary, setSummary] = useState<DatingSummary>();
  const [recaps, setRecaps] = useState<DateRecap[]>([]);
  const [media, setMedia] = useState<DateMedia[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedRecapId, setSelectedRecapId] = useState("");
  const [caption, setCaption] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextSummary, nextRecaps] = await Promise.all([
        datingApi.getSummary(),
        recapsApi.get(),
      ]);
      setSummary(nextSummary);
      setRecaps(nextRecaps.recaps);
      setError(undefined);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load recaps."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eligibleDates = useMemo(
    () =>
      (summary?.requests ?? []).filter((request) =>
        RECAP_STATUSES.has(request.status)
      ),
    [summary]
  );
  const selectedDate = eligibleDates.find(
    (request) => request.id === selectedRequestId
  );
  const selectedRecap = recaps.find((recap) => recap.id === selectedRecapId);

  useEffect(() => {
    if (!selectedRequestId) {
      setMedia([]);
      return;
    }
    let current = true;
    const loadMedia = async () => {
      setIsLoadingMedia(true);
      try {
        const result = await dateMediaApi.get(selectedRequestId);
        if (current) setMedia(result.media);
      } catch {
        if (current) setMedia([]);
      } finally {
        if (current) setIsLoadingMedia(false);
      }
    };
    void loadMedia();
    return () => {
      current = false;
    };
  }, [selectedRequestId]);

  const publish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDate || media.length === 0) return;
    setIsPublishing(true);
    try {
      const result = await recapsApi.publish({
        caption: caption.trim() || undefined,
        dateRequestId: selectedDate.id,
        mediaIds: media.map((item) => item.id),
      });
      setRecaps((current) => [result.recap, ...current]);
      setCaption("");
      setMedia([]);
      setSelectedRequestId("");
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Could not publish recap."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Date memories
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Recaps</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Keep the places, photos, and stories from dates that actually
            happened.
          </p>
        </div>
        <Link
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          to="/me/dates"
        >
          View dates
        </Link>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button
            className="ml-3 font-semibold underline"
            onClick={() => void load()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Publish a recap</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a completed date, review its captured media, and publish an
          image-only or video recap.
        </p>
        {eligibleDates.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Complete a date and its review before publishing a recap.
          </p>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={publish}>
            <div className="grid gap-2 sm:grid-cols-2">
              {eligibleDates.map((request) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${
                    request.id === selectedRequestId
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  type="button"
                >
                  <span className="block text-sm font-semibold">
                    {formatDate(request.scheduledAt)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {request.places[0]?.name ?? request.searchArea} ·{" "}
                    {request.status}
                  </span>
                </button>
              ))}
            </div>
            {selectedDate ? (
              <>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="What made this date memorable?"
                  value={caption}
                />
                <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                  {isLoadingMedia
                    ? "Loading captured media…"
                    : `${media.length} captured media item${media.length === 1 ? "" : "s"} selected.`}
                </div>
                <button
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    isPublishing || isLoadingMedia || media.length === 0
                  }
                  type="submit"
                >
                  {isPublishing ? "Publishing…" : "Publish recap"}
                </button>
              </>
            ) : null}
          </form>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Your memories
          </p>
          <h2 className="mt-1 text-xl font-bold">Date folders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each recap keeps the photos and videos from one date together.
            Select a folder to open the full gallery.
          </p>
        </div>
        {isLoading ? (
          <div className="rounded-3xl border border-border p-5 text-sm text-muted-foreground">
            Loading recaps…
          </div>
        ) : recaps.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No published recaps yet.
          </div>
        ) : (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {recaps.map((recap) => {
              const request = summary?.requests.find(
                (candidate) => candidate.id === recap.dateRequestId
              );
              const preview =
                recap.media?.find((item) => !item.kind.includes("video")) ??
                recap.media?.[0];
              const previewUrl = preview?.kind.includes("video")
                ? recap.thumbnailUrl
                : (preview?.url ?? recap.thumbnailUrl);
              const selected = recap.id === selectedRecapId;
              return (
                <button
                  aria-pressed={selected}
                  className={`w-64 shrink-0 snap-start overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 sm:w-72 ${
                    selected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                  key={recap.id}
                  onClick={() => setSelectedRecapId(recap.id)}
                  type="button"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                    {previewUrl ? (
                      <img
                        alt=""
                        className="size-full object-cover"
                        src={previewUrl}
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-primary">
                        <Images className="size-8" />
                      </div>
                    )}
                    {preview?.kind.includes("video") ? (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-1 text-[10px] font-semibold">
                        <Video className="size-3" /> Video
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                      {request ? formatDate(request.scheduledAt) : "Date recap"}
                    </p>
                    <h3 className="mt-2 truncate font-semibold">
                      {request?.places[0]?.name ??
                        request?.searchArea ??
                        "A Chewbuu date"}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recap.media?.length ?? 0} memories
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedRecap ? (
          <RecapGallery
            recap={selectedRecap}
            request={summary?.requests.find(
              (candidate) => candidate.id === selectedRecap.dateRequestId
            )}
          />
        ) : null}
      </section>
    </main>
  );
}

function RecapGallery({
  recap,
  request,
}: {
  recap: DateRecap;
  request?: DatingSummary["requests"][number];
}) {
  const memories = recap.media ?? [];

  return (
    <section className="rounded-3xl border border-border bg-card/60 p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            {request ? formatDate(request.scheduledAt) : "Date recap"}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {request?.places[0]?.name ??
              request?.searchArea ??
              "A Chewbuu date"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {memories.length} captured{" "}
          {memories.length === 1 ? "memory" : "memories"}
        </p>
      </div>
      {recap.caption ? (
        <p className="py-4 text-sm text-muted-foreground">{recap.caption}</p>
      ) : null}
      {memories.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No captured media is attached to this recap.
        </p>
      ) : (
        <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) =>
            memory.kind.includes("video") ? (
              <video
                className="aspect-square w-full rounded-2xl bg-black object-cover"
                controls
                key={memory.id}
                src={memory.url}
              >
                <track kind="captions" label="English" srcLang="en" />
              </video>
            ) : (
              <img
                alt=""
                className="aspect-square w-full rounded-2xl object-cover"
                key={memory.id}
                src={memory.url}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}
