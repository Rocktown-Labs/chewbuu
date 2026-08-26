import { Badge } from "@chewbuu/ui/components/badge";
import { Input } from "@chewbuu/ui/components/input";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type WatchSearchKind = "person" | "show";

export interface WatchSearchResult {
  id: number;
  imageUrl?: string;
  kind: WatchSearchKind;
  name: string;
  sourceUrl: string;
  subtitle?: string;
}

interface WatchAutocompleteProps {
  kind: WatchSearchKind;
  label: string;
  onAdd: (result: WatchSearchResult) => void;
  onRemove: (name: string) => void;
  selected: string[];
}

const TVMAZE_API_URL = "https://api.tvmaze.com";
const MINIMUM_QUERY_LENGTH = 2;
const MAX_RESULTS = 6;
const searchCache = new Map<string, WatchSearchResult[]>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown) =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const getNumber = (value: unknown) =>
  typeof value === "number" ? value : undefined;

const getImageUrl = (value: unknown) => {
  if (!isRecord(value)) return;
  return getString(value.medium) ?? getString(value.original);
};

const getShowResults = (value: unknown): WatchSearchResult[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.show)) return [];
    const { show } = item;
    const id = getNumber(show.id);
    const name = getString(show.name);
    const sourceUrl = getString(show.url);
    if (id === undefined || !name || !sourceUrl) return [];

    const genres = Array.isArray(show.genres)
      ? show.genres.filter(
          (genre): genre is string => typeof genre === "string"
        )
      : [];
    const premiered = getString(show.premiered);

    return [
      {
        id,
        imageUrl: getImageUrl(show.image),
        kind: "show" as const,
        name,
        sourceUrl,
        subtitle: [premiered?.slice(0, 4), genres.slice(0, 2).join(", ")]
          .filter(Boolean)
          .join(" · "),
      },
    ];
  });
};

const getPeopleResults = (value: unknown): WatchSearchResult[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.person)) return [];
    const { person } = item;
    const id = getNumber(person.id);
    const name = getString(person.name);
    const sourceUrl = getString(person.url);
    if (id === undefined || !name || !sourceUrl) return [];

    const country = isRecord(person.country)
      ? getString(person.country.name)
      : undefined;

    return [
      {
        id,
        imageUrl: getImageUrl(person.image),
        kind: "person" as const,
        name,
        sourceUrl,
        subtitle: country ?? "Actor or creator",
      },
    ];
  });
};

export function WatchAutocomplete({
  kind,
  label,
  onAdd,
  onRemove,
  selected,
}: WatchAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WatchSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [debouncedQuery] = useDebouncedValue(query.trim(), { wait: 300 });

  useEffect(() => {
    if (debouncedQuery.length < MINIMUM_QUERY_LENGTH) {
      setResults([]);
      setSearchError(null);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${kind}:${debouncedQuery.toLowerCase()}`;
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
      setResults(cachedResults);
      setSearchError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const searchPath = kind === "show" ? "search/shows" : "search/people";

    const search = async () => {
      setIsLoading(true);
      setSearchError(null);
      try {
        const response = await fetch(
          `${TVMAZE_API_URL}/${searchPath}?q=${encodeURIComponent(debouncedQuery)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "TV search is busy. Try again in a moment."
              : "TV search is unavailable right now."
          );
        }
        const data: unknown = await response.json();
        const nextResults = (
          kind === "show" ? getShowResults(data) : getPeopleResults(data)
        ).slice(0, MAX_RESULTS);
        searchCache.set(cacheKey, nextResults);
        setResults(nextResults);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResults([]);
        setSearchError(
          error instanceof Error ? error.message : "TV search failed."
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void search();
    return () => controller.abort();
  }, [debouncedQuery, kind]);

  const addManualValue = () => {
    const value = query.trim();
    if (!value || selected.includes(value)) return;
    onAdd({
      id: 0,
      kind,
      name: value,
      sourceUrl: "https://www.tvmaze.com/api",
      subtitle: "Added manually",
    });
    setQuery("");
    setResults([]);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="ml-1 text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Input
          aria-label={label}
          className="h-10 rounded-full px-4 text-xs"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addManualValue();
            }
          }}
          placeholder={
            kind === "show"
              ? "Search a show, series, or add a topic..."
              : "Search an actor or add a person..."
          }
          value={query}
        />
        {isLoading ? (
          <span className="absolute top-3 right-4 text-[10px] text-muted-foreground">
            Searching…
          </span>
        ) : null}
      </div>

      {searchError ? (
        <p className="text-xs text-muted-foreground">{searchError}</p>
      ) : null}

      {results.length > 0 ? (
        <div
          aria-label={`${label} suggestions`}
          className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-2xl border bg-background p-2"
          role="listbox"
        >
          {results.map((result) => {
            const isSelected = selected.includes(result.name);
            return (
              <button
                aria-selected={isSelected}
                className="flex items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSelected}
                key={`${result.kind}-${result.id}-${result.name}`}
                onClick={() => {
                  onAdd(result);
                  setQuery("");
                  setResults([]);
                }}
                role="option"
                type="button"
              >
                {result.imageUrl ? (
                  <img
                    alt=""
                    className="size-10 rounded-lg object-cover"
                    loading="lazy"
                    src={result.imageUrl}
                  />
                ) : (
                  <span className="grid size-10 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">
                    {result.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {result.name}
                  </span>
                  {result.subtitle ? (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {result.subtitle}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {query.trim() && !isLoading ? (
        <button
          className="w-fit text-left text-xs font-semibold text-primary underline-offset-4 hover:underline"
          onClick={addManualValue}
          type="button"
        >
          Add “{query.trim()}” manually
        </button>
      ) : null}

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]"
              key={value}
              variant="secondary"
            >
              {value}
              <button
                aria-label={`Remove ${value}`}
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => onRemove(value)}
                type="button"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <p className="text-[10px] text-muted-foreground">
        Search results are powered by{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.tvmaze.com/api"
          rel="noopener noreferrer"
          target="_blank"
        >
          TVmaze
        </a>
        . Add broad preferences such as wrestling, movies, or WWE manually when
        they are not a specific show.
      </p>
    </div>
  );
}
