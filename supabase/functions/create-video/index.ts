import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { images, audioUrl } = await req.json()
    const CLOUD_NAME = "dah4t6swx";

    if (!images || images.length === 0) throw new Error("Aucune image reçue");

    // 1. Image de base (la première)
    const firstImage = images[0].url;
    
    // 2. Préparation des transformations (Taille 720x720, format MP4)
    // On commence par la base de la vidéo
    let transformations = `w_720,h_720,c_fill,f_mp4`; 
    
    images.forEach((img, index) => {
      // On nettoie les textes pour l'URL
      const cleanText = encodeURIComponent(img.text || " ");
      const cleanPrice = encodeURIComponent(img.price || " ");

      if (index === 0) {
        // Texte sur la 1ère image
        transformations += `/l_text:Arial_40_bold:${cleanText},g_south_west,x_50,y_100,co_white`;
        transformations += `/l_text:Arial_50_bold:${cleanPrice},g_south_west,x_50,y_40,co_yellow`;
      } else {
        // Pour les images suivantes, on les ajoute en "splice" (durée 3s)
        // On encode l'URL en Base64 pour que Cloudinary ne s'y perde pas
        const b64Url = btoa(img.url).replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, '');
        transformations += `/fl_splice,l_fetch:${b64Url}/du_3`;
        transformations += `/l_text:Arial_40_bold:${cleanText},g_south_west,x_50,y_100,co_white`;
        transformations += `/l_text:Arial_50_bold:${cleanPrice},g_south_west,x_50,y_40,co_yellow`;
      }
    });

    // 3. Ajout de l'audio si présent
    if (audioUrl) {
      const b64Audio = btoa(audioUrl).replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, '');
      transformations += `/l_fetch:${b64Audio}/fl_layer_apply,so_0`;
    }

    // CONSTRUCTION DE L'URL FINALE
    // Note l'utilisation de /video/fetch/ car le résultat est un MP4
    const finalVideoUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/fetch/${transformations}/${encodeURIComponent(firstImage)}`;

    return new Response(
      JSON.stringify({ 
        videoUrl: finalVideoUrl,
        message: "Vidéo prête !" 
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