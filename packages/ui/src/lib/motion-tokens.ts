/**
 * EmploymentX Animation System — Centralized Motion Tokens
 *
 * Ownership boundaries:
 *   GSAP owns: cinematic hero, complex timelines, scroll narratives, stagger orchestrations
 *   Motion owns: component enter/exit, layout transitions, micro-interactions, hover/focus states
 *
 * Rules:
 *   1) No same-element same-property conflicts between GSAP and Motion
 *   2) All durations/easings sourced from these tokens
 *   3) Reduced-motion support everywhere — zero duration when prefers-reduced-motion
 */

export const motionTokens = {
  duration: {
    instant: 0.1,
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
    cinematic: 0.8,
    heroEntrance: 1.2,
    scrollNarrative: 1.5,
  },
  easing: {
    default: [0.25, 0.1, 0.25, 1.0] as const,
    easeIn: [0.42, 0, 1, 1] as const,
    easeOut: [0, 0, 0.58, 1] as const,
    easeInOut: [0.42, 0, 0.58, 1] as const,
    spring: [0.34, 1.56, 0.64, 1] as const,
    bounce: [0.68, -0.55, 0.265, 1.55] as const,
    smooth: [0.16, 1, 0.3, 1] as const,
  },
  delay: {
    none: 0,
    short: 0.05,
    medium: 0.1,
    long: 0.2,
    stagger: 0.03,
    heroStagger: 0.08,
  },
} as const;

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(reducedMotionQuery).matches;
}

export function getMotionDuration(key: keyof typeof motionTokens.duration): number {
  if (prefersReducedMotion()) return 0;
  return motionTokens.duration[key];
}

export function getMotionEasing(key: keyof typeof motionTokens.easing): readonly number[] {
  return motionTokens.easing[key];
}

export type AnimationOwner = 'gsap' | 'motion';

export interface AnimationPreset {
  owner: AnimationOwner;
  name: string;
  description: string;
}

export const gsapPresets = {
  heroEntrance: {
    owner: 'gsap' as const,
    name: 'heroEntrance',
    description: 'Cinematic hero section entrance with staggered children',
    duration: motionTokens.duration.heroEntrance,
    stagger: motionTokens.delay.heroStagger,
    ease: 'power3.out',
    from: { opacity: 0, y: 60 },
    to: { opacity: 1, y: 0 },
  },
  scrollReveal: {
    owner: 'gsap' as const,
    name: 'scrollReveal',
    description: 'Scroll-triggered reveal for content sections',
    duration: motionTokens.duration.cinematic,
    ease: 'power2.out',
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0 },
    scrollTrigger: { start: 'top 80%', end: 'top 20%' },
  },
  counterUp: {
    owner: 'gsap' as const,
    name: 'counterUp',
    description: 'Animated number counter for stats/metrics',
    duration: motionTokens.duration.scrollNarrative,
    ease: 'power1.out',
  },
  parallaxShift: {
    owner: 'gsap' as const,
    name: 'parallaxShift',
    description: 'Subtle parallax movement on scroll',
    ease: 'none',
  },
} as const;

export const motionPresets = {
  fadeIn: {
    owner: 'motion' as const,
    name: 'fadeIn',
    description: 'Component fade-in on mount',
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.easeOut },
  },
  fadeOut: {
    owner: 'motion' as const,
    name: 'fadeOut',
    description: 'Component fade-out on unmount',
    exit: { opacity: 0 },
    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.easeIn },
  },
  slideUp: {
    owner: 'motion' as const,
    name: 'slideUp',
    description: 'Slide up from below with fade',
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.spring },
  },
  slideDown: {
    owner: 'motion' as const,
    name: 'slideDown',
    description: 'Slide down with fade',
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.spring },
  },
  scaleIn: {
    owner: 'motion' as const,
    name: 'scaleIn',
    description: 'Scale up from 95% with fade',
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.easeOut },
  },
  layoutShift: {
    owner: 'motion' as const,
    name: 'layoutShift',
    description: 'Smooth layout animation for reordering',
    layout: true,
    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth },
  },
  hoverLift: {
    owner: 'motion' as const,
    name: 'hoverLift',
    description: 'Subtle lift on hover for interactive cards',
    whileHover: { y: -2, transition: { duration: motionTokens.duration.fast } },
    whileTap: { scale: 0.98, transition: { duration: motionTokens.duration.instant } },
  },
  pressScale: {
    owner: 'motion' as const,
    name: 'pressScale',
    description: 'Button press feedback',
    whileTap: { scale: 0.97, transition: { duration: motionTokens.duration.instant } },
  },
  popoverEnter: {
    owner: 'motion' as const,
    name: 'popoverEnter',
    description: 'Popover/dropdown enter animation',
    initial: { opacity: 0, scale: 0.95, y: -4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -4 },
    transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.easeOut },
  },
  toastSlide: {
    owner: 'motion' as const,
    name: 'toastSlide',
    description: 'Toast notification slide-in from right',
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.spring },
  },
} as const;

export function withReducedMotion<T extends Record<string, unknown>>(preset: T): T {
  if (prefersReducedMotion()) {
    return {
      ...preset,
      initial: undefined,
      animate: undefined,
      exit: undefined,
      transition: { duration: 0 },
      whileHover: undefined,
      whileTap: undefined,
    } as T;
  }
  return preset;
}
