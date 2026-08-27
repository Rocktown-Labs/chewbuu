import { useEffect, useState } from "react";

import { entitlementsApi } from "@/lib/dating-api";

export const useAdminStatus = (hasSession: boolean) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hasSession) {
      setIsAdmin(false);
      return;
    }

    let isMounted = true;

    const loadAdminStatus = async () => {
      try {
        const entitlements = await entitlementsApi.get();
        if (isMounted) {
          setIsAdmin(entitlements.isAdmin);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    };

    void loadAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [hasSession]);

  return {
    isAdmin: isAdmin === true,
    isPending: hasSession && isAdmin === null,
  };
};
