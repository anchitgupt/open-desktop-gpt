export const duration = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.35,
};

export const ease = {
  out: [0.25, 0.1, 0.25, 1] as const,
};

export const spring = {
  snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.normal, ease: ease.out },
};

export const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.03 } },
  },
  item: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
  },
};

export const hover = {
  lift: { y: -2, transition: { duration: duration.fast } },
  nudge: { x: 2, transition: { duration: duration.fast } },
  press: { scale: 0.97 },
};
