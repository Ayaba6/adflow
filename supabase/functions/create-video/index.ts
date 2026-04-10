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

    if (!images || images.length === 0) {
      throw new Error("Aucune image reçue");
    }

    // 1. On encode proprement l'image de base
    const firstImageUrl = images[0].url;
    
    // 2. Préparation des transformations
    // On force le format MP4 et on définit la taille
    let transformations = `w_720,h_720,c_fill,f_mp4`; 
    
    images.forEach((img, index) => {
      // Nettoyage des textes pour éviter les erreurs d'URL
      const cleanText = encodeURIComponent(img.text || " ");
      const cleanPrice = encodeURIComponent(img.price || " ");

      if (index === 0) {
        // Incrustation texte sur la première image
        transformations += `/l_text:Arial_40_bold:${cleanText},g_south_west,x_50,y_100,co_white`;
        transformations += `/l_text:Arial_50_bold:${cleanPrice},g_south_west,x_50,y_40,co_yellow`;
      } else {
        // Pour les images suivantes, on utilise le format Base64 pour l'URL (plus robuste)
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

    // URL FINALE : Note l'ajout de encodeURIComponent sur l'URL de l'image de base à la fin
    const finalVideoUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/fetch/${transformations}/${encodeURIComponent(firstImageUrl)}`;

    return new Response(
      JSON.stringify({ 
        videoUrl: finalVideoUrl,
        message: "URL générée" 
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