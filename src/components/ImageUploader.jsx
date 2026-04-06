import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ImagePlus, Loader2, X } from 'lucide-react';

export default function ImageUploader({ onImagesChange }) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState([]);

  const uploadImages = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const files = Array.from(event.target.files);
      const newImagesObjects = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `articles/${fileName}`;

        // 1. Upload vers Supabase
        let { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2. Récupérer l'URL publique
        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        
        // 3. Créer l'objet complet
        newImagesObjects.push({
          url: data.publicUrl,
          text: 'Nouvel article',
          price: ''
        });
      }

      const updatedList = [...previews, ...newImagesObjects];
      setPreviews(updatedList);
      onImagesChange(updatedList); 
      
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'upload : " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const filtered = previews.filter((_, i) => i !== index);
    setPreviews(filtered);
    onImagesChange(filtered);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {previews.map((img, index) => (
          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border bg-white shadow-sm">
            <img 
              src={img.url} 
              alt="Article" 
              crossOrigin="anonymous" // <--- INDISPENSABLE pour FFmpeg
              className="w-full h-full object-cover" 
            />
            
            <button 
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X size={14} />
            </button>
            
            {img.price && (
              <div className="absolute bottom-1 left-1 right-1 bg-white/80 backdrop-blur-sm text-[10px] font-bold text-blue-600 px-1 rounded truncate text-center">
                {img.price}
              </div>
            )}
          </div>
        ))}

        <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <span className="text-[10px] text-slate-400 font-bold uppercase">Upload...</span>
            </div>
          ) : (
            <>
              <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
                <ImagePlus className="text-slate-400 group-hover:text-blue-500" size={24} />
              </div>
              <span className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">Ajouter</span>
            </>
          )}
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={uploadImages} 
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}