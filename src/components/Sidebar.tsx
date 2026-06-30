import {
  ChevronsLeft,
  ChevronsRight,
  Clock,
  LogOut,
  Search,
  SquarePen,
  Trash2,
} from "lucide-react";
import { LogoMark } from "@the-safeguard/ui/brand";
import type { AuthUser } from "../lib/api";
import type { Conversation } from "../lib/store";
import { cn } from "../lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeId?: string;
  user: AuthUser | null;
  onNewChat: () => void;
  onOpenSearch: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
}

function groupByRecency(convos: Conversation[]) {
  const day = 86_400_000;
  const now = Date.now();
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Last 7 Days", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const c of convos) {
    const age = now - c.updatedAt;
    if (age < day) groups[0].items.push(c);
    else if (age < 7 * day) groups[1].items.push(c);
    else groups[2].items.push(c);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function Sidebar(props: SidebarProps) {
  const { collapsed } = props;

  if (collapsed) return <CollapsedRail {...props} />;

  const groups = groupByRecency(props.conversations);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--color-hair)] bg-[var(--color-canvas)]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2">
          <LogoMark size={24} color="var(--ink)" />
          <span className="text-[17px] font-semibold tracking-tight">SafeGuard</span>
        </div>
        <IconBtn label="Collapse sidebar" onClick={props.onToggle}>
          <ChevronsLeft size={18} />
        </IconBtn>
      </div>

      <nav className="px-2.5">
        <NavItem icon={<Search size={18} />} label="Search" onClick={props.onOpenSearch} />
        <NavItem icon={<SquarePen size={18} />} label="New Chat" onClick={props.onNewChat} />
      </nav>

      <div className="mt-3 flex items-center gap-1.5 px-4 pb-1 text-[13px] font-medium text-[var(--color-muted)]">
        <Clock size={13} /> History
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-[13px] text-[var(--color-faint)]">No conversations yet.</p>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-2">
            <p className="px-2 pb-1 pt-2 text-[12px] text-[var(--color-faint)]">{g.label}</p>
            {g.items.map((c) => (
              <button
                key={c.id}
                onClick={() => props.onSelect(c.id)}
                className={cn(
                  "group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[14px] transition hover:bg-[var(--color-surface)]",
                  c.id === props.activeId && "bg-[var(--color-surface)] font-medium",
                )}
              >
                <span className="truncate">{c.title}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(c.id);
                  }}
                  className="ml-2 hidden shrink-0 text-[var(--color-faint)] hover:text-red-600 group-hover:block"
                  aria-label="Delete conversation"
                >
                  <Trash2 size={14} />
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <ProfileFooter user={props.user} onLogout={props.onLogout} />
    </aside>
  );
}

function CollapsedRail(props: SidebarProps) {
  return (
    <aside className="flex h-full w-[64px] shrink-0 flex-col items-center border-r border-[var(--color-hair)] bg-[var(--color-canvas)] py-3.5">
      <LogoMark size={24} color="var(--ink)" className="mb-4" />
      <IconBtn label="Search" onClick={props.onOpenSearch}>
        <Search size={19} />
      </IconBtn>
      <IconBtn label="New Chat" onClick={props.onNewChat} active>
        <SquarePen size={19} />
      </IconBtn>
      <IconBtn label="History" onClick={props.onOpenSearch}>
        <Clock size={19} />
      </IconBtn>
      <div className="flex-1" />
      <IconBtn label="Expand sidebar" onClick={props.onToggle}>
        <ChevronsRight size={19} />
      </IconBtn>
      <button
        onClick={props.onLogout}
        className="mt-2 h-9 w-9 overflow-hidden rounded-full ring-1 ring-[var(--color-hair)]"
        title="Sign out"
      >
        <Avatar name={props.user?.name} />
      </button>
    </aside>
  );
}

function ProfileFooter({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-[var(--color-hair)] px-3 py-3">
      <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-[var(--color-hair)]">
        <Avatar name={user?.name} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{user?.name ?? "You"}</p>
        <p className="truncate text-[12px] text-[var(--color-muted)]">{user?.email}</p>
      </div>
      <IconBtn label="Sign out" onClick={onLogout}>
        <LogOut size={16} />
      </IconBtn>
    </div>
  );
}

function Avatar({ name }: { name?: string }) {
  const initial = (name ?? "U").trim().charAt(0).toUpperCase();
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-ink)] text-[13px] font-semibold text-white">
      {initial}
    </div>
  );
}

function NavItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] font-medium text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface)]"
    >
      {icon}
      {label}
    </button>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface)]",
        active && "bg-[var(--color-surface)]",
      )}
    >
      {children}
    </button>
  );
}
