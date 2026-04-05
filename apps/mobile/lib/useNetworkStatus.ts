import { useEffect, useRef, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { flushQueue } from "./offlineQueue";
import { supabase } from "./supabase";
import { useToast } from "./ToastContext";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline = useRef(false);
  const { show } = useToast();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);

      if (!online) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        flushQueue(supabase, (count) => {
          show(`Connexion rétablie · ${count} action${count > 1 ? "s" : ""} synchronisée${count > 1 ? "s" : ""}`);
        });
      }
    });

    return unsubscribe;
  }, [show]);

  return { isOnline };
}
