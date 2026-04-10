import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { images, audioUrl } = await req.json()
    
    // 1. TA CONFIGURATION CLOUDINARY
    const CLOUD_NAME = "dah4t6swx"; // <-- REMPLACE PAR TON CLOUD NAME

    // 2. CONSTRUCTION DE LA SÉQUENCE D'IMAGES
    // Cloudinary permet de créer une vidéo en concaténant des images via l'URL
    // On prend la première image comme base
    const firstImage = images[0].url;
    
    // On prépare les transformations pour les images suivantes (slideshow)
    // On ajoute du texte (nom et prix) sur chaque image
    let transformations = `w_720,h_720,c_fill,f_mp4`; 
    
    images.forEach((img, index) => {
      if (index === 0) {
        // Texte pour la première image
        transformations += `/l_text:Arial_40_bold:${encodeURIComponent(img.text)},g_south_west,x_50,y_100,co_white`;
        transformations += `/l_text:Arial_50_bold:${encodeURIComponent(img.price)},g_south_west,x_50,y_40,co_yellow`;
      } else {
        // Ajout des images suivantes comme des "layers" avec une durée de 3s
        const encodedUrl = btoa(img.url).replace(/\//g, '_').replace(/\+/g, '-');
        transformations += `/fl_splice,l_fetch:${encodedUrl}/du_3`;
        transformations += `/l_text:Arial_40_bold:${encodeURIComponent(img.text)},g_south_west,x_50,y_100,co_white`;
        transformations += `/l_text:Arial_50_bold:${encodeURIComponent(img.price)},g_south_west,x_50,y_40,co_yellow`;
      }
    });

    // 3. AJOUT DE L'AUDIO
    if (audioUrl) {
      const encodedAudio = btoa(audioUrl).replace(/\//g, '_').replace(/\+/g, '-');
      transformations += `/l_fetch:${encodedAudio}/fl_layer_apply,so_0`;
    }

    // URL FINALE DE LA VIDÉO
    const finalVideoUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${firstImage}`;

    return new Response(
      JSON.stringify({ 
        videoUrl: finalVideoUrl,
        message: "Vidéo générée avec succès sur le cloud !" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    )
  }
})