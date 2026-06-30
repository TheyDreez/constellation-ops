import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { NotificationsProvider } from "@/lib/notifications-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        <Sidebar />
        <main
          className="transition-[margin-left] duration-300 ease-out"
          style={{
            marginLeft: "var(--sidebar-width)",
            paddingTop: "var(--header-height)",
          }}
        >
          {children}
        </main>
        <ChatWidget />
      </div>
    </NotificationsProvider>
  );
}
