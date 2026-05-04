"use client";

/**
 * Shared context that lives in the root layout (always mounted).
 * Explore uses setPendingItem() after a successful insert.
 * My Day reads pendingItem via useEffect and injects it into its agenda.
 * Because the layout never unmounts during tab navigation, this is
 * reliable regardless of Next.js router-cache behaviour.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

export type PendingAgendaItem = {
  dayIndex: number;   // 0-based index into DAYS[]
  id: string;
  title: string;
  emoji: string;
  time: string;
  notes: string;
  done: boolean;
  reservation: boolean;
};

type ExploreContextValue = {
  pendingItem: PendingAgendaItem | null;
  setPendingItem: (item: PendingAgendaItem | null) => void;
};

const ExploreContext = createContext<ExploreContextValue>({
  pendingItem: null,
  setPendingItem: () => {},
});

export function ExploreProvider({ children }: { children: ReactNode }) {
  const [pendingItem, setPendingItem] = useState<PendingAgendaItem | null>(null);
  return (
    <ExploreContext.Provider value={{ pendingItem, setPendingItem }}>
      {children}
    </ExploreContext.Provider>
  );
}

export function useExploreContext() {
  return useContext(ExploreContext);
}
