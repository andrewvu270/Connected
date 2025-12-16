import * as React from "react"
import Link from "next/link"
import { cn } from "../../lib/utils"

interface FooterProps {
  className?: string
}

const Footer: React.FC<FooterProps> = ({ className }) => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "/changelog" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
    ],
    support: [
      { label: "Help Center", href: "/help" },
      { label: "Contact", href: "/contact" },
      { label: "Status", href: "/status" },
    ],
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  }

  return (
    <footer className={cn("border-t border-border-subtle bg-surface", className)}>
      <div className="mx-auto max-w-7xl px-8 py-4xl">
        <div className="grid gap-2xl lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="text-xl font-bold tracking-tight text-text">
              Connected
            </Link>
            <p className="mt-lg text-body text-muted max-w-md leading-relaxed">
              Building conversational confidence through micro-learning, deliberate practice, and curated content.
            </p>
          </div>

          {/* Links */}
          <div className="grid gap-2xl sm:grid-cols-2 lg:grid-cols-3 lg:col-span-3">
            <div>
              <h3 className="text-body-sm font-semibold text-text uppercase tracking-wider mb-lg">
                Product
              </h3>
              <ul className="space-y-sm">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-muted hover:text-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-body-sm font-semibold text-text uppercase tracking-wider mb-lg">
                Company
              </h3>
              <ul className="space-y-sm">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-muted hover:text-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-body-sm font-semibold text-text uppercase tracking-wider mb-lg">
                Support
              </h3>
              <ul className="space-y-sm">
                {footerLinks.support.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-muted hover:text-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-4xl pt-2xl border-t border-border-subtle flex flex-col sm:flex-row justify-between items-center gap-lg">
          <p className="text-body-sm text-muted">
            © {currentYear} Connected. All rights reserved.
          </p>
          <div className="flex gap-xl">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-body-sm text-muted hover:text-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export { Footer }