import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { NotificationsProvider } from "@/lib/notifications-context";
import { StarField } from "@/components/ui/StarField";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="min-h-screen relative" style={{ background: "var(--background)" }}>
        <StarField className="opacity-25 fixed" count={90} seed={99} />
        <Sidebar />
        <main
          className="relative transition-[margin-left] duration-300 ease-out"
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
