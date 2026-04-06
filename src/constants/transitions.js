export const TRANSITIONS_CONFIG = {
  'parallax-3d': {
    name: '3D Gallery',
    ffmpeg: 'xfade=transition=distance',
    // Variantes pour Framer Motion
    variants: {
      initial: { opacity: 0, rotateY: 45, z: -500, x: '100%', scale: 0.8 },
      animate: { opacity: 1, rotateY: 0, z: 0, x: 0, scale: 1 },
      exit: { opacity: 0, rotateY: -45, z: -500, x: '-100%', scale: 0.8 }
    }
  },
  'circlecrop': {
    name: 'Cercle (Iris)',
    ffmpeg: 'xfade=transition=circlecrop',
    variants: {
      initial: { clipPath: 'circle(0% at 50% 50%)', opacity: 0 },
      animate: { clipPath: 'circle(100% at 50% 50%)', opacity: 1 },
      exit: { clipPath: 'circle(0% at 50% 50%)', opacity: 0 }
    }
  },
  'wipeleft': {
    name: 'Balayage',
    ffmpeg: 'xfade=transition=wipeleft',
    variants: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '-100%' }
    }
  },
  'fade': {
    name: 'Fondu Enchaîné',
    ffmpeg: 'xfade=transition=fade',
    variants: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    }
  }
};

// Liste simplifiée pour les menus déroulants ou boutons
export const TRANSITIONS_LIST = Object.entries(TRANSITIONS_CONFIG).map(([id, config]) => ({
  id,
  name: config.name,
  ffmpeg: config.ffmpeg
}));