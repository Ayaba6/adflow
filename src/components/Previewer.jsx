import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSITIONS_CONFIG } from '../constants/transitions'; // On importe ta nouvelle page de transitions

export default function Previewer({ images = [], audioUrl, transitionType = 'fade' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Récupération de la config de transition (fallback sur fade si non trouvé)
  const currentTransition = TRANSITIONS_CONFIG[transitionType] || TRANSITIONS_CONFIG.fade;

  // 1. Sécurité : Réinitialiser l'index si on supprime des images
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  // 2. Gestion du diaporama (synchronisé sur 3s)
  useEffect(() => {
    let interval;
    if (isPlaying && images.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, images.length]);

  // 3. Synchronisation Muet
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // 4. Reset si l'audio change
  useEffect(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!isPlaying) {
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.warn("Audio block:", err));
      }
      setIsPlaying(true);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const currentImage = images[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6">
      {/* CADRE VIDÉO AVEC PERSPECTIVE POUR LA 3D */}
      <div 
        className="relative w-full aspect-square max-w-[400px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-white flex items-center justify-center"
        style={{ perspective: '1200px' }} // Nécessaire pour les transitions 3D
      >
        
        <AnimatePresence mode="wait">
          {images.length > 0 && currentImage?.url ? (
            <motion.div
              key={currentIndex}
              variants={currentTransition.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              <img 
                src={currentImage.url} 
                alt="Aperçu" 
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay Texte et Prix */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-transparent to-transparent">
                <motion.h3 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white text-xl font-bold uppercase tracking-tight"
                >
                  {currentImage?.text || "Produit sans nom"}
                </motion.h3>
                {currentImage?.price && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-2"
                  >
                    <span className="bg-yellow-400 text-black font-black px-3 py-1 rounded-md text-lg shadow-lg inline-block">
                      {currentImage.price}
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-500 p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 animate-pulse" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400">En attente d'images...</p>
            </div>
          )}
        </AnimatePresence>

        {/* Bouton Muet */}
        {audioUrl && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} 
            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md z-20 hover:bg-black/70 transition-colors"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </div>

      {/* BOUTON DE CONTRÔLE */}
      <div className="flex flex-col items-center gap-2">
        <button 
          onClick={togglePlay}
          disabled={images.length === 0}
          className={`flex items-center gap-3 px-10 py-4 rounded-full font-black text-lg transition-all shadow-xl active:scale-95 ${
            isPlaying ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
          } disabled:opacity-30 disabled:grayscale`}
        >
          {isPlaying ? <><Pause size={24} fill="currentColor" /> PAUSE</> : <><Play size={24} fill="currentColor" /> TESTER L'APERÇU</>}
        </button>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {images.length} article{images.length > 1 ? 's' : ''} synchronisé{images.length > 1 ? 's' : ''}
        </p>
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" loop muted={isMuted} />
      )}
    </div>
  );
}