"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AppNotification, NotificationType } from "@/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-audit";

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<AppNotification, "id" | "read" | "created_at">) => void;
  dismiss: (id: string) => void;
}

const Ctx = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markRead: () => {},
  markAllRead: () => {},
  addNotification: () => {},
  dismiss: () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((payload: Omit<AppNotification, "id" | "read" | "created_at">) => {
    const n: AppNotification = {
      ...payload,
      id: `n${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [n, ...prev]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ notifications, unreadCount, markRead, markAllRead, addNotification, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}

export const useNotifications = () => useContext(Ctx);
