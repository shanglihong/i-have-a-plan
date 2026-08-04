import { BreadcrumbNav, GlobalSearchBar, NotificationDropdown } from "../../../features"
import { UserAvatar } from "../../../shared/ui"
import { cn } from "../../../shared/utils/cn"

interface HeaderTopbarProps {
  className?: string
}

export function HeaderTopbar({ className }: HeaderTopbarProps) {
  return (
    <header
      className={cn(
        "h-13 flex items-center justify-between px-5 border-b border-white/10 bg-[#0c111d]/90 backdrop-blur-md shrink-0 relative z-30",
        className
      )}
    >
      {/* Breadcrumb Navigation Feature Component */}
      <BreadcrumbNav />

      <div className="flex items-center gap-3">
        {/* Global Search Bar Feature Component */}
        <GlobalSearchBar />

        {/* Notifications Dropdown Feature Component */}
        <NotificationDropdown />

        {/* Reusable User Avatar */}
        <UserAvatar />
      </div>
    </header>
  )
}
