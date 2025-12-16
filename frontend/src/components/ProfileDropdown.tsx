"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "./ui/Button";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    // Clear any auth tokens/data
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Profile</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border-subtle rounded-xl shadow-xl z-50 py-2">
          {/* Future: Add subscription/payment options here */}
          <div className="px-3 py-2 border-b border-border-subtle">
            <p className="text-sm font-medium text-text">Account</p>
            <p className="text-xs text-muted">Manage your profile</p>
          </div>
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
          >
            <LogOut className="h-4 w-4 text-muted" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}