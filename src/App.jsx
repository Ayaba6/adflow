import { useState, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import Previewer from './components/Previewer';
import { LayoutDashboard, Send, Loader2, Sparkles, Music, Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { TRANSITIONS_LIST } from './constants/transitions';

// Imports FFmpeg
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

function App() {
  const [images, setImages] = useState([]); 
  const [audioUrl, setAudioUrl] = useState(null);
  const [presetAudios, setPresetAudios] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedTransitionId, setSelectedTransitionId] = useState('fade');

  // RÉCUPÉRATION DES AUDIOS DU BUCKET
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
        console.error("Erreur de récupération des audios:", err.message);
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

    setStatus('Chargement de l\'audio...');
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

  const generateVideo = async () => {
    if (images.length === 0) {
      alert("Veuillez ajouter au moins une image.");
      return;
    }

    try {
      setLoading(true);
      
      if (!ffmpeg.loaded) {
        setStatus('Initialisation...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      setStatus('Préparation...');
      try { await ffmpeg.deleteFile('output.mp4'); } catch (e) {}

      for (let i = 0; i < images.length; i++) {
        await ffmpeg.writeFile(`img${i}.jpg`, await fetchFile(images[i].url));
      }

      if (audioUrl) {
        setStatus('Audio...');
        await ffmpeg.writeFile('audio.mp3', await fetchFile(audioUrl, { mode: 'cors' }));
      }

      setStatus('Assemblage...');
      let filterComplex = "";
      const inputArgs = [];
      
      for (let i = 0; i < images.length; i++) {
        inputArgs.push('-loop', '1', '-t', '3', '-i', `img${i}.jpg`);
        filterComplex += `[${i}:v]scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
      }

      const concatPart = images.map((_, i) => `[v${i}]`).join('');
      filterComplex += `${concatPart}concat=n=${images.length}:v=1:a=0[outv]`;

      setStatus('Encodage...');
      const ffmpegCommand = [
        ...inputArgs,
        ...(audioUrl ? ['-i', 'audio.mp3'] : []),
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        ...(audioUrl ? ['-map', `${images.length}:a`, '-shortest'] : []),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-r', '25',
        'output.mp4'
      ];

      await ffmpeg.exec(ffmpegCommand);

      setStatus('Finalisation...');
      const data = await ffmpeg.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `adflow-${Date.now()}.mp4`;
      a.click();

      setStatus('Succès !');
    } catch (error) {
      console.error(error);
      alert("Erreur technique FFmpeg.");
    } finally {
      setLoading(false);
      setStatus('');
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
              <p className="text-xs text-slate-500 font-medium italic">Générateur de publicités Pro</p>
            </div>
          </div>
          
          <button 
            onClick={generateVideo}
            disabled={loading || images.length === 0}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 min-w-[220px]"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={20} /> {status || 'Traitement...'}</>
            ) : (
              <><Send size={20} /> Générer le MP4</>
            )}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            
            {/* ETAPE 1: ARTICLES */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold mb-5 text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs text-slate-500">1</span>
                Articles & Tarifs
              </h2>
              <ImageUploader onImagesChange={setImages} />
              <div className="mt-8 space-y-3">
                {images.map((img, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <img src={img.url} crossOrigin="anonymous" className="w-14 h-14 object-cover rounded-xl shadow-sm bg-slate-200" alt="Mini" />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="Nom de l'article" 
                        className="p-2 text-sm border-none rounded-lg bg-white shadow-inner focus:ring-1 focus:ring-blue-500"
                        value={img.text}
                        onChange={(e) => updateImageDetail(index, 'text', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Prix (ex: 15.000 F)" 
                        className="p-2 text-sm border-none rounded-lg bg-white shadow-inner font-bold text-blue-600 focus:ring-1 focus:ring-blue-500"
                        value={img.price}
                        onChange={(e) => updateImageDetail(index, 'price', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ETAPE 2: TRANSITION */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold mb-5 text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs text-slate-500">2</span>
                Effet de transition
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITIONS_LIST.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => setSelectedTransitionId(tr.id)}
                    className={`p-3 rounded-xl text-xs font-bold transition-all border-2 ${
                      selectedTransitionId === tr.id 
                      ? 'border-blue-600 bg-blue-50 text-blue-700' 
                      : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {selectedTransitionId === tr.id && <Sparkles size={12} />}
                      {tr.name}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* ETAPE 3: AUDIO (Liste déroulante) */}
            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs text-slate-500">3</span>
                  Ambiance sonore
                </h2>
                {audioUrl && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">
                    <CheckCircle2 size={10} /> Musique active
                  </span>
                )}
              </div>
              
              <div className="relative mb-6">
                <select
                  value={presetAudios.find(a => a.url === audioUrl)?.url || ""}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-600 appearance-none focus:border-blue-500 focus:ring-0 transition-all cursor-pointer"
                >
                  <option value="">-- Choisir une musique du catalogue --</option>
                  {presetAudios.map((audio) => (
                    <option key={audio.id} value={audio.url}>
                      {audio.name.toUpperCase()}
                    </option>
                  ))}
                </select>
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="relative flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-slate-100"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ou importer</span>
                <div className="flex-1 h-px bg-slate-100"></div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-800 transition-colors">
                  <Upload size={18} />
                  Fichier MP3 perso
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleAudioUpload} 
                    className="hidden" 
                  />
                </label>
                {audioUrl && (
                  <button 
                    onClick={() => setAudioUrl(null)}
                    className="p-3 text-xs font-bold text-red-400 hover:text-red-600 uppercase transition-colors"
                  >
                    Désactiver
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* APERÇU VIDÉO */}
          <div className="lg:sticky lg:top-10 h-fit bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black mb-6 text-center text-slate-400 uppercase tracking-widest">Aperçu en direct</h2>
            <Previewer 
              images={images} 
              audioUrl={audioUrl} 
              transitionType={selectedTransitionId} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;