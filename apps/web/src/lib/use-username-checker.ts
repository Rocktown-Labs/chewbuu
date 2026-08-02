import { useDebouncedValue } from "@tanstack/react-pacer";
import { useEffect, useState } from "react";

import { BloomFilter } from "./bloom-filter";

const clientBloomFilter = new BloomFilter(2048, 4);

const TAKEN_USERNAMES = [
  "admin",
  "chewbuu",
  "alex",
  "maya",
  "jordan",
  "riley",
  "sarah",
  "taylor",
  "morgan",
  "sam",
  "chris",
  "david",
];

for (const name of TAKEN_USERNAMES) {
  clientBloomFilter.add(name);
}

export function useUsernameChecker(rawUsername: string) {
  const [status, setStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  const [debouncedUsername] = useDebouncedValue(
    rawUsername.trim().toLowerCase(),
    { wait: 250 }
  );

  useEffect(() => {
    const username = debouncedUsername.trim().toLowerCase();

    if (!username) {
      setStatus("idle");
      return;
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setStatus("invalid");
      return;
    }

    const mightBeTaken = clientBloomFilter.mightContain(username);

    if (!mightBeTaken) {
      setStatus("available");
      return;
    }

    setStatus("checking");

    const timer = setTimeout(() => {
      if (TAKEN_USERNAMES.includes(username)) {
        setStatus("taken");
      } else {
        setStatus("available");
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [debouncedUsername]);

  return { debouncedUsername, status };
}
