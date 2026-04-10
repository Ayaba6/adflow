import { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import Previewer from './components/Previewer';
import { LayoutDashboard, Send, Loader2, Music, Upload } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { TRANSITIONS_LIST } from './constants/transitions';

function App() {
  const [images, setImages] = useState([]); 
  const [audioUrl, setAudioUrl] = useState(null);
  const [presetAudios, setPresetAudios] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedTransitionId, setSelectedTransitionId] = useState('fade');

  // RÉCUPÉRATION DES AUDIOS DEPUIS SUPABASE STORAGE
  useEffect(() => {
    const fetchAudios = async () => {
      try {
        const { data, error } = await supabase.storage.from('audios').list();
        if (error) throw error;
        if (data) {
          const audiosWithUrls = data.map(file => {
            const { data: { publicUrl } } = supabase.storage
              .from('audios')
              .getPublicUrl(file.name);
            return {
              id: file.id,
              name: file.name.replace(/\.[^/.]+$/, "").replace(/-/g, " "),
              url: publicUrl
            };
          });
          setPresetAudios(audiosWithUrls);
        }
      } catch (err) {
        console.error("Erreur audios:", err.message);
      }
    };
    fetchAudios();
  }, []);

  const updateImageDetail = (index, field, value) => {
    const updated = [...images];
    updated[index][field] = value;
    setImages(updated);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Chargement audio...');
    const fileName = `${Date.now()}-${file.name}`;
    try {
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(`audio/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(`audio/${fileName}`);
      setAudioUrl(publicUrl);
      setStatus('Musique prête !');
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      alert("Erreur audio : " + error.message);
      setStatus('');
    }
  };

  /**
   * GÉNÉRATION VIA SUPABASE EDGE FUNCTIONS + CLOUDINARY
   */
  const generateVideo = async () => {
    if (images.length === 0) {
      alert("Ajoute au moins une image pour ta publicité.");
      return;
    }

    try {
      setLoading(true);
      setStatus('Montage vidéo Kodalink...');

      // Appel de ta fonction Edge 'create-video'
      const { data, error } = await supabase.functions.invoke('create-video', {
        body: { 
          images: images, 
          audioUrl: audioUrl || null,
          transition: selectedTransitionId
        }
      });

      if (error) throw error;

      if (data && data.videoUrl) {
        setStatus('Téléchargement...');
        
        // MÉTHODE ROBUSTE POUR SMARTPHONE (Force l'enregistrement du MP4)
        const response = await fetch(data.videoUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `adflow-video-${Date.now()}.mp4`);
        document.body.appendChild(link);
        link.click();
        
        // Nettoyage de la mémoire
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        
        setStatus('Publicité prête !');
      } else {
        alert("Le serveur n'a pas renvoyé d'URL de vidéo.");
      }

    } catch (error) {
      console.error("Erreur Serveur:", error);
      alert("Erreur lors de la génération. Vérifie ta connexion.");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                ADFLOW <span className="text-blue-600 text-sm px-2 py-0.5 bg-blue-50 rounded ml-1">Studio</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium italic">Propulsé par Kodalink Cloud</p>
            </div>
          </div>
          
          {/* BOUTON GÉNÉRER (Fixé en bas sur mobile, normal sur PC) */}
          <div className="fixed bottom-6 left-0 right-0 px-4 z-40 md:static md:px-0 md:z-auto">
            <button 
              onClick={generateVideo}
              disabled={loading || images.length === 0}
              className={`flex items-center justify-center gap-3 w-full md:w-[240px] py-4 md:py-3 rounded-2xl md:rounded-full font-bold transition-all shadow-2xl md:shadow-xl active:scale-95 ${
                loading || images.length === 0 
                ? 'bg-slate-400 cursor-not-allowed text-slate-200' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> 
                  <span>{status || 'Génération...'}</span>
                </>
              ) : (
                <>
                  <Send size={20} /> 
                  <span>Générer la vidéo MP4</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* COLONNE GAUCHE : ÉDITION DES ARTICLES */}
          <div className="space-y-8 pb-24 md:pb-0">
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold mb-5 text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full text-xs text-blue-600 font-bold">1</span>
                Articles & Tarifs
              </h2>
              <ImageUploader onImagesChange={setImages} />
              
              <div className="mt-8 space-y-3">
                {images.map((img, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <img src={img.url} crossOrigin="anonymous" className="w-14 h-14 object-cover rounded-xl shadow-sm bg-slate-200" alt="Produit" />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="Nom du produit" 
                        className="p-2 text-sm border-none rounded-lg bg-white shadow-inner focus:ring-1 focus:ring-blue-500"
                        value={img.text || ''}
                        onChange={(e) => updateImageDetail(index, 'text', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Prix (ex: 5000 FCFA)" 
                        className="p-2 text-sm border-none rounded-lg bg-white shadow-inner font-bold text-blue-600 focus:ring-1 focus:ring-blue-500"
                        value={img.price || ''}
                        onChange={(e) => updateImageDetail(index, 'price', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION AUDIO */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold mb-5 text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 rounded-full text-xs text-blue-600 font-bold">2</span>
                Ambiance sonore
              </h2>
              <div className="relative mb-4">
                <select
                  value={presetAudios.find(a => a.url === audioUrl)?.url || ""}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm appearance-none focus:outline-none focus:border-blue-500"
                >
                  <option value="">Aucune musique</option>
                  {presetAudios.map((audio) => (
                    <option key={audio.id} value={audio.url}>{audio.name.toUpperCase()}</option>
                  ))}
                </select>
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-200 transition-colors">
                <Upload size={18} /> Ou importer un MP3
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>
            </section>
          </div>

          {/* COLONNE DROITE : APERÇU (Sticky sur PC) */}
          <div className="lg:sticky lg:top-10 h-fit bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xs font-black mb-6 text-slate-400 uppercase tracking-widest">Aperçu en direct</h2>
            <div className="max-w-[320px] mx-auto">
                <Previewer images={images} audioUrl={audioUrl} transitionType={selectedTransitionId} />
            </div>
            <p className="mt-6 text-xs text-slate-400 italic">
              L'aperçu est une simulation. <br /> La vidéo finale sera générée en format MP4 HD.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;