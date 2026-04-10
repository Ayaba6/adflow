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
    // Diagnostic sécurité
    if (!window.crossOriginIsolated) {
      alert("ERREUR SÉCURITÉ : Vérifie HTTPS et vercel.json");
      return;
    }

    if (images.length === 0) {
      alert("Veuillez ajouter au moins une image.");
      return;
    }

    try {
      setLoading(true);
      
      if (!ffmpeg.loaded) {
        setStatus('Moteur...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
      }

      // NETTOYAGE MÉMOIRE AVANT TRAITEMENT
      setStatus('Vidage RAM...');
      try {
        const files = await ffmpeg.listDir('.');
        for (const f of files) { if (!f.isDir) await ffmpeg.deleteFile(f.name); }
      } catch (e) {}

      setStatus('Fichiers...');
      for (let i = 0; i < images.length; i++) {
        await ffmpeg.writeFile(`img${i}.jpg`, await fetchFile(images[i].url, { mode: 'cors' }));
      }

      if (audioUrl) {
        setStatus('Audio...');
        await ffmpeg.writeFile('audio.mp3', await fetchFile(audioUrl, { mode: 'cors' }));
      }

      setStatus('Montage...');
      let filterComplex = "";
      const inputArgs = [];
      
      for (let i = 0; i < images.length; i++) {
        inputArgs.push('-loop', '1', '-t', '3', '-i', `img${i}.jpg`);
        // RÉSOLUTION RÉDUITE À 720 POUR MOBILE
        filterComplex += `[${i}:v]scale=720:720:force_original_aspect_ratio=decrease,pad=720:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
      }

      const concatPart = images.map((_, i) => `[v${i}]`).join('');
      filterComplex += `${concatPart}concat=n=${images.length}:v=1:a=0[outv]`;

      setStatus('Rendu...');
      const ffmpegCommand = [
        ...inputArgs,
        ...(audioUrl ? ['-i', 'audio.mp3'] : []),
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        ...(audioUrl ? ['-map', `${images.length}:a`, '-shortest'] : []),
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast', // Mode le plus léger
        '-crf', '28',           // Compression plus forte pour économiser la RAM
        '-r', '25',
        'output.mp4'
      ];

      await ffmpeg.exec(ffmpegCommand);

      setStatus('Export...');
      const data = await ffmpeg.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `adflow-${Date.now()}.mp4`;
      a.click();

      setStatus('Terminé !');
    } catch (error) {
      console.error(error);
      alert("RAM saturée. Essaie avec seulement 2 images pour tester.");
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
          
          <div className="fixed bottom-6 left-0 right-0 px-4 z-50 md:static md:px-0 md:z-auto">
            <button 
              onClick={generateVideo}
              disabled={loading || images.length === 0}
              className={`flex items-center justify-center gap-3 w-full md:w-[220px] py-4 md:py-3 rounded-2xl md:rounded-full font-bold transition-all shadow-2xl md:shadow-xl active:scale-95 ${
                loading || images.length === 0 
                ? 'bg-slate-400 cursor-not-allowed text-slate-200' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> 
                  <span>{status || 'Traitement...'}</span>
                </>
              ) : (
                <>
                  <Send size={20} /> 
                  <span>Générer le MP4</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
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
                      selectedTransitionId === tr.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 bg-slate-50 text-slate-500'
                    }`}
                  >
                    {tr.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold mb-5 text-slate-700 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs text-slate-500">3</span>
                Ambiance sonore
              </h2>
              <div className="relative mb-6">
                <select
                  value={presetAudios.find(a => a.url === audioUrl)?.url || ""}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full p-3 pl-10 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm"
                >
                  <option value="">-- Choisir une musique --</option>
                  {presetAudios.map((audio) => (
                    <option key={audio.id} value={audio.url}>{audio.name.toUpperCase()}</option>
                  ))}
                </select>
                <Music className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold cursor-pointer">
                <Upload size={18} /> Importer MP3
                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
              </label>
            </section>
          </div>

          <div className="lg:sticky lg:top-10 h-fit bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-black mb-6 text-center text-slate-400 uppercase tracking-widest">Aperçu en direct</h2>
            <Previewer images={images} audioUrl={audioUrl} transitionType={selectedTransitionId} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;