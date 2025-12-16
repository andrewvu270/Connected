"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";

import { Button } from "../components/ui/button";
import MascotCanvas from "../src/components/MascotCanvas";

gsap.registerPlugin(ScrollTrigger);

export default function Page() {
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Enhanced Hero animations
      if (heroRef.current) {
        const heroElements = heroRef.current.children;
        
        // Animate content section
        gsap.from(heroElements[0]?.children || [], {
          opacity: 0,
          y: 40,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          delay: 0.2
        });

        // Animate mascot section with special effect
        gsap.from(heroElements[1], {
          opacity: 0,
          scale: 0.8,
          duration: 1.2,
          ease: "back.out(1.7)",
          delay: 0.6
        });

        // Enhanced floating elements animation (decorative elements only)
        gsap.from(".hero-float", {
          opacity: 0,
          scale: 0,
          rotation: 180,
          duration: 1,
          stagger: 0.2,
          ease: "back.out(2)",
          delay: 1.2
        });

        // Chat bubbles animation (no floating, just appear)
        gsap.from(".chat-bubble", {
          opacity: 0,
          scale: 0,
          duration: 1,
          stagger: 0.3,
          ease: "back.out(2)",
          delay: 1.5
        });

        // Continuous floating animation for decorative elements only (with rotation)
        gsap.to(".hero-float", {
          y: -10,
          x: 5,
          rotation: 360,
          duration: 6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          stagger: 0.5
        });

        // Animate the gradient text
        gsap.from(".gradient-text", {
          backgroundPosition: "200% center",
          duration: 2,
          ease: "power2.out",
          delay: 0.8
        });
      }

      // Enhanced Stats animations with scroll trigger
      if (statsRef.current) {
        const statItems = Array.from(statsRef.current.children);
        
        // Ensure items are visible first
        gsap.set(statItems, { opacity: 1 });
        
        gsap.from(statItems, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: statsRef.current,
            start: "top 90%",
            end: "bottom 10%",
            toggleActions: "play none none none"
          }
        });

        // Simple number animation on scroll
        statItems.forEach((item, index) => {
          ScrollTrigger.create({
            trigger: item,
            start: "top 90%",
            onEnter: () => {
              const numberElement = item.querySelector('.text-4xl');
              if (numberElement) {
                gsap.fromTo(numberElement, 
                  { scale: 0.8, opacity: 0 },
                  { 
                    scale: 1, 
                    opacity: 1,
                    duration: 0.5,
                    ease: "back.out(1.7)",
                    delay: index * 0.1
                  }
                );
              }
            }
          });
        });
      }

      // Features cards animation with scroll trigger
      if (featuresRef.current) {
        gsap.from(featuresRef.current.children, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        });
      }

      // CTA section animation with scroll trigger
      if (ctaRef.current) {
        gsap.from(ctaRef.current.children, {
          opacity: 0,
          y: 40,
          duration: 1,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ctaRef.current,
            start: "top 85%",
            end: "bottom 15%",
            toggleActions: "play none none reverse"
          }
        });

        // Add a subtle scale animation to the CTA button
        const ctaButton = ctaRef.current.querySelector('a');
        if (ctaButton) {
          gsap.set(ctaButton, { scale: 1 });
          
          ScrollTrigger.create({
            trigger: ctaRef.current,
            start: "top 85%",
            onEnter: () => {
              gsap.to(ctaButton, {
                scale: 1.05,
                duration: 0.3,
                ease: "back.out(1.7)",
                yoyo: true,
                repeat: 1
              });
            }
          });
        }
      }

      // Enhanced floating background elements
      gsap.to(".floating-bg", {
        y: -30,
        x: 15,
        rotation: 360,
        duration: 8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.8
      });

      // Additional scale animation for background elements
      gsap.to(".floating-bg", {
        scale: 1.2,
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 1.2
      });

      // Enhanced Mascot Animations - Head Nodding
      
      // Head nodding animation - X-axis rotation for up/down nod
      gsap.to("model-viewer", {
        rotationX: -8,
        duration: 1.5,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1,
        repeatDelay: 2
      });

      // Subtle side-to-side head movement
      gsap.to("model-viewer", {
        rotationY: 5,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1
      });

      // Gentle breathing/scale effect
      gsap.to("model-viewer", {
        scale: 1.02,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.5
      });

      // Occasional blink-like pause in nodding
      gsap.timeline({ repeat: -1, repeatDelay: 8 })
        .to("model-viewer", {
          rotationX: -12,
          duration: 0.3,
          ease: "power2.out"
        })
        .to("model-viewer", {
          rotationX: 0,
          duration: 0.4,
          ease: "power2.inOut"
        })
        .to("model-viewer", {
          rotationX: -6,
          duration: 0.3,
          ease: "power2.out"
        });

      // Interactive hover animations - more dramatic
      const mascotContainer = document.querySelector('.mascot-container');
      if (mascotContainer) {
        mascotContainer.addEventListener('mouseenter', () => {
          gsap.to("model-viewer", {
            rotationY: 25,
            rotationZ: 8,
            scale: 1.15,
            duration: 0.6,
            ease: "back.out(1.7)"
          });
          
          // Add a little bounce to the container
          gsap.to(".mascot-container", {
            y: -30,
            duration: 0.4,
            ease: "back.out(2)"
          });
        });

        mascotContainer.addEventListener('mouseleave', () => {
          gsap.to("model-viewer", {
            rotationY: 0,
            rotationZ: 0,
            scale: 1,
            duration: 1,
            ease: "elastic.out(1, 0.5)"
          });
          
          // Return container to normal floating
          gsap.to(".mascot-container", {
            y: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.3)"
          });
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Global Background Elements */}
      <div className="fixed inset-0 opacity-15 pointer-events-none">
        {/* Professional floating circles using design system colors */}
        <div className="floating-bg absolute top-20 left-10 w-80 h-80 bg-primary-subtle rounded-full mix-blend-multiply filter blur-2xl animate-pulse"></div>
        <div className="floating-bg absolute top-40 right-10 w-80 h-80 bg-primary-muted rounded-full mix-blend-multiply filter blur-2xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="floating-bg absolute bottom-20 left-1/2 w-80 h-80 bg-accent-subtle rounded-full mix-blend-multiply filter blur-2xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="floating-bg absolute top-1/2 left-20 w-60 h-60 bg-success-subtle rounded-full mix-blend-multiply filter blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="floating-bg absolute bottom-40 right-20 w-64 h-64 bg-warning-subtle rounded-full mix-blend-multiply filter blur-2xl animate-pulse" style={{animationDelay: '3s'}}></div>
        
        {/* Additional smaller circles for subtle coverage */}
        <div className="floating-bg absolute top-60 left-1/3 w-48 h-48 bg-border-subtle rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '5s'}}></div>
        <div className="floating-bg absolute bottom-60 right-1/3 w-52 h-52 bg-muted-light rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '6s'}}></div>
        <div className="floating-bg absolute top-1/3 right-1/4 w-40 h-40 bg-primary-subtle rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '7s'}}></div>
        <div className="floating-bg absolute bottom-1/3 left-1/4 w-44 h-44 bg-accent-subtle rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '8s'}}></div>
      </div>

      {/* Custom Landing Page Navigation */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-8 py-4 sm:py-5">
          <Link href="/" className="text-xl font-bold tracking-tight text-text hover:text-primary transition-colors">
            Connected
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base">
              Sign in
            </Link>
            <Link href="/login">
              <Button className="bg-black text-white hover:bg-gray-800 px-4 sm:px-6 py-2 text-sm sm:text-base">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 sm:pt-24 pb-16 sm:pb-32 relative">
        {/* Subtle Hero Background Glow */}
        <div className="absolute inset-0 -top-20 -bottom-20">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-primary/3 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div ref={heroRef} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative">
          {/* Left: Content */}
          <div className="text-center lg:text-left space-y-8 sm:space-y-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary-subtle/60 backdrop-blur-sm border border-border text-sm font-medium text-text shadow-sm">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Meet Sage the Croco Connect Coach
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-text mb-4 tracking-tight leading-[0.9]">
                From <span className="text-muted-light">awkward</span>
                <br />
                to <span className="gradient-text font-semibold text-muted animate-pulse">awesome</span>
              </h1>
              
              {/* Decorative line */}
              <div className="w-24 h-1 bg-primary rounded-full mx-auto lg:mx-0"></div>
            </div>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-text-secondary mb-12 sm:mb-16 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Stop dreading conversations. Our AI-powered platform turns you into a confident communicator through{" "}
              <span className="text-blue-600 font-semibold">micro-lessons</span>,{" "}
              <span className="text-green-600 font-semibold">real practice</span>, and{" "}
              <span className="text-orange-600 font-semibold">smart insights</span>.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start">
              <Link href="/login">
                <Button size="lg" className="group bg-black hover:bg-gray-800 text-white px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold shadow-2xl hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  Start your transformation
                  <ArrowRight className="ml-3 h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              
              {/* Secondary CTA */}
              <Link href="/feed" className="text-muted hover:text-text transition-colors font-medium text-lg group">
                Explore stories
                <span className="ml-2 transition-transform group-hover:translate-x-1 inline-block">→</span>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center lg:justify-start gap-6 pt-8 text-sm text-muted">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-surface"></div>
                  <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-surface"></div>
                  <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-surface"></div>
                </div>
                <span className="font-medium">1000+ learners</span>
              </div>
              <div className="w-1 h-1 bg-muted rounded-full"></div>
              <span>Trusted by people everywhere</span>
            </div>
          </div>

          {/* Right: Mascot - Enhanced */}
          <div className="flex justify-center lg:justify-end mt-12 lg:mt-0 relative">
            {/* Subtle Mascot Glow Effect */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent rounded-full blur-xl scale-105"></div>
            
            <div className="mascot-container w-full max-w-lg sm:max-w-xl lg:max-w-2xl relative">
              {/* Chat Bubbles around Sage */}
              <div className="chat-bubble absolute -top-4 left-8 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-border-subtle" style={{animationDelay: '0s'}}>
                <div className="flex items-center gap-2">
                  <img src="/images/3dicons-chat-bubble-dynamic-color.png" alt="Chat" className="w-4 h-4" />
                  <span className="text-xs font-medium text-text">Hi there!</span>
                </div>
              </div>
              
              <div className="chat-bubble absolute top-16 -right-4 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-border-subtle" style={{animationDelay: '2s'}}>
                <div className="flex items-center gap-2">
                  <img src="/images/3dicons-chat-bubble-dynamic-color.png" alt="Chat" className="w-4 h-4" />
                  <span className="text-xs font-medium text-text">Let's practice!</span>
                </div>
              </div>
              
              <div className="chat-bubble absolute bottom-20 -left-6 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-border-subtle" style={{animationDelay: '4s'}}>
                <div className="flex items-center gap-2">
                  <img src="/images/3dicons-chat-bubble-dynamic-color.png" alt="Chat" className="w-4 h-4" />
                  <span className="text-xs font-medium text-text">You got this!</span>
                </div>
              </div>

              {/* Dynamic Floating Elements around Mascot */}
              <div className="hero-float absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-r from-primary to-primary-hover rounded-2xl opacity-25 shadow-lg" style={{animationDelay: '1s'}}></div>
              <div className="hero-float absolute -top-8 right-8 w-8 h-8 bg-gradient-to-r from-accent to-accent rounded-full opacity-30 shadow-md" style={{animationDelay: '3s'}}></div>
              <div className="hero-float absolute bottom-8 -right-8 w-10 h-10 bg-gradient-to-r from-success to-success rounded-xl opacity-28 shadow-lg" style={{animationDelay: '5s'}}></div>
              <div className="hero-float absolute top-1/2 -left-8 w-6 h-6 bg-gradient-to-r from-warning to-warning rounded-lg opacity-25 shadow-sm" style={{animationDelay: '6s'}}></div>
              <div className="hero-float absolute bottom-1/3 right-4 w-9 h-9 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl opacity-22 shadow-md" style={{animationDelay: '7s'}}></div>
              
              <div className="h-80 sm:h-[28rem] lg:h-[32rem] w-full relative">
                <MascotCanvas height={500} className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats - Enhanced SaaS Style */}
      <div className="border-t border-border-subtle py-20 sm:py-32 relative bg-gradient-to-b from-surface to-surface-elevated">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative">
          {/* Section Header */}
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-4xl font-light text-text mb-4">Trusted by people everywhere</h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">Join thousands of people who've transformed their communication confidence</p>
          </div>

          <div ref={statsRef} className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 opacity-100">
            {/* Stat 1 */}
            <div className="group relative">
              <div className="bg-surface border border-border-subtle rounded-2xl p-8 sm:p-10 text-center hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative mb-6">
                  <div className="text-4xl sm:text-5xl font-bold text-primary mb-2 transition-all duration-300 group-hover:scale-110">5-10mins</div>
                  <div className="absolute inset-0 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">Per lesson</h3>
                <p className="text-sm text-muted leading-relaxed">Bite-sized learning that fits your schedule</p>
                <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary-hover rounded-full mx-auto mt-6 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="group relative">
              <div className="bg-surface border border-border-subtle rounded-2xl p-8 sm:p-10 text-center hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative mb-6">
                  <div className="text-4xl sm:text-5xl font-bold text-success mb-2 transition-all duration-300 group-hover:scale-110">1000+</div>
                  <div className="absolute inset-0 bg-gradient-radial from-success/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">Curated stories</h3>
                <p className="text-sm text-muted leading-relaxed">High-quality content for every conversation</p>
                <div className="w-16 h-1 bg-gradient-to-r from-success to-success rounded-full mx-auto mt-6 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="group relative">
              <div className="bg-surface border border-border-subtle rounded-2xl p-8 sm:p-10 text-center hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative mb-6">
                  <div className="text-4xl sm:text-5xl font-bold text-accent mb-2 transition-all duration-300 group-hover:scale-110">∞</div>
                  <div className="absolute inset-0 bg-gradient-radial from-accent/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">Practice drills</h3>
                <p className="text-sm text-muted leading-relaxed">Unlimited scenarios to master any situation</p>
                <div className="w-16 h-1 bg-gradient-to-r from-accent to-accent rounded-full mx-auto mt-6 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
            </div>
          </div>

          {/* Additional Trust Indicators */}
          <div className="mt-16 sm:mt-20 text-center">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 lg:gap-12">
              <div className="flex items-center gap-2 text-sm font-medium text-text bg-surface-elevated px-4 py-2 rounded-full border border-border-subtle">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                Featured in TechCrunch
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-text bg-surface-elevated px-4 py-2 rounded-full border border-border-subtle">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                4.9/5 rating
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-text bg-surface-elevated px-4 py-2 rounded-full border border-border-subtle">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                SOC 2 compliant
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works - Premium Design */}
      <div className="py-16 sm:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative">
          <div className="text-center mb-12 sm:mb-24">
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-6 sm:mb-8 tracking-tight">
              How it works
            </h2>
            <p className="text-lg sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Three simple steps to conversation mastery with Sage the Croco Connect Coach
            </p>
          </div>

          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-16">
            {/* Step 1 - Learn */}
            <div className="group relative">
              <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                {/* Floating Number */}
                <div className="absolute -top-6 left-4 sm:left-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform duration-300">
                  <img src="/images/3dicons-folder-fav-dynamic-color.png" alt="Learn" className="w-10 h-10 sm:w-16 sm:h-16" />
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4 sm:mb-6">Learn</h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                  Bite-sized lessons that actually stick. Master conversation frameworks used by confident communicators.
                </p>
                
                {/* Feature List */}
                <ul className="space-y-2 sm:space-y-3 text-gray-600 text-sm sm:text-base">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>5-10 minute micro-lessons</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>Real-world frameworks</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span>Interactive content</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 2 - Practice */}
            <div className="group relative">
              <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                {/* Floating Number */}
                <div className="absolute -top-6 left-4 sm:left-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-green-100 to-green-200 rounded-3xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform duration-300">
                  <img src="/images/3dicons-chat-bubble-dynamic-color.png" alt="Practice" className="w-10 h-10 sm:w-16 sm:h-16" />
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4 sm:mb-6">Practice</h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                  Role-play real scenarios with Croco the Sage. Get instant, personalized feedback that actually helps.
                </p>
                
                {/* Feature List */}
                <ul className="space-y-2 sm:space-y-3 text-gray-600 text-sm sm:text-base">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>AI-powered roleplay</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Instant feedback</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span>Safe practice environment</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 - Apply */}
            <div className="group relative md:col-span-2 lg:col-span-1">
              <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100">
                {/* Floating Number */}
                <div className="absolute -top-6 left-4 sm:left-8">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                </div>
                
                {/* Icon */}
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-orange-100 to-orange-200 rounded-3xl flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform duration-300">
                  <img src="/images/3dicons-rocket-dynamic-color.png" alt="Apply" className="w-10 h-10 sm:w-16 sm:h-16" />
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4 sm:mb-6">Apply</h3>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                  Never run out of things to say. Get curated conversation starters and trending topics daily.
                </p>
                
                {/* Feature List */}
                <ul className="space-y-2 sm:space-y-3 text-gray-600 text-sm sm:text-base">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                    <span>Daily conversation starters</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                    <span>Trending topics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                    <span>Smart insights</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 sm:py-24 relative bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-text mb-4">What our users say</h2>
            <p className="text-lg text-muted max-w-2xl mx-auto">Real stories from people who transformed their communication skills</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-warning rounded-sm"></div>
                ))}
              </div>
              <p className="text-text-secondary mb-6 leading-relaxed">
                "I used to avoid speaking up in class. Now I confidently participate in discussions and even lead study groups!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                <div>
                  <div className="font-medium text-text">Alex Chen</div>
                  <div className="text-sm text-muted">College Student</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-warning rounded-sm"></div>
                ))}
              </div>
              <p className="text-text-secondary mb-6 leading-relaxed">
                "As a parent, I wanted to communicate better with my teenagers. These lessons helped me connect with them in ways I never thought possible."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
                <div>
                  <div className="font-medium text-text">Sarah Johnson</div>
                  <div className="text-sm text-muted">Parent & Teacher</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-surface-elevated border border-border-subtle rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-warning rounded-sm"></div>
                ))}
              </div>
              <p className="text-text-secondary mb-6 leading-relaxed">
                "I was always the quiet one at social gatherings. Now I can start conversations naturally and make genuine connections."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                <div>
                  <div className="font-medium text-text">Michael Rodriguez</div>
                  <div className="text-sm text-muted">Freelance Designer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-16 sm:py-32 relative">
        <div ref={ctaRef} className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-gray-900 mb-6 sm:mb-8">
            Ready to transform your conversations?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto">
            Join thousands of people who went from conversation-avoiders to confident communicators.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-black text-white hover:bg-gray-800 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-xl hover:shadow-2xl transition-all duration-300">
              Start learning with Croco
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}