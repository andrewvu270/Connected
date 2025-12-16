"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Background } from "../components/ui/background";
import { Section } from "../components/ui/section";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function NotFound() {
  return (
    <Background variant="gradient">
      <Section spacing="xl" className="min-h-screen flex items-center justify-center">
        <Card variant="elevated" className="max-w-2xl mx-auto text-center shadow-2xl">
          <CardContent className="p-4xl">
            <div className="mb-2xl">
              <h1 className="text-display-1 font-bold text-text mb-lg">404</h1>
              <h2 className="text-headline text-text-secondary mb-lg">Page not found</h2>
              <p className="text-body-lg text-muted leading-relaxed max-w-md mx-auto">
                Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-lg justify-center">
              <Link href="/">
                <Button variant="primary" size="lg" className="group shadow-lg hover:shadow-xl">
                  <Home className="mr-2 h-5 w-5" />
                  Go Home
                </Button>
              </Link>
              <Button 
                variant="secondary" 
                size="lg" 
                onClick={() => window.history.back()}
                className="group"
              >
                <ArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
                Go Back
              </Button>
            </div>

            <div className="mt-2xl pt-2xl border-t border-border-subtle">
              <p className="text-body-sm text-muted">
                Need help? <Link href="/contact" className="text-primary hover:text-primary-hover font-medium">Contact our support team</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>
    </Background>
  );
}