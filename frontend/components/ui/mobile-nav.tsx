import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, LogOut } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"

interface MobileNavProps {
  links: Array<{
    href: string
    label: string
  }>
  actions?: React.ReactNode
}

const MobileNav: React.FC<MobileNavProps> = ({ links, actions }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const pathname = usePathname()

  const handleLogout = () => {
    // Clear any auth tokens/data
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative z-50 p-2"
      >
        {isOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-text/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="fixed top-0 right-0 h-full w-72 sm:w-80 bg-surface border-l border-border shadow-2xl z-40 animate-slide-in-right">
            <div className="p-4 sm:p-6 lg:p-8 pt-16 sm:pt-20">
              <nav className="space-y-2 sm:space-y-3">
                {links.map((link) => {
                  const active = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "block rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-all duration-200",
                        active 
                          ? "bg-primary-subtle text-primary border border-primary-muted/30" 
                          : "text-muted hover:text-text hover:bg-surface-elevated"
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
              
              {/* Profile Section */}
              <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-border-subtle">
                <div className="mb-4">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <User className="h-5 w-5 text-muted" />
                    <div>
                      <p className="text-sm font-medium text-text">Profile</p>
                      <p className="text-xs text-muted">Account settings</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-text hover:bg-surface-elevated transition-colors rounded-xl"
                >
                  <LogOut className="h-4 w-4 text-muted" />
                  <span>Log out</span>
                </button>
                
                {actions && (
                  <div className="mt-4 pt-4 border-t border-border-subtle">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export { MobileNav }