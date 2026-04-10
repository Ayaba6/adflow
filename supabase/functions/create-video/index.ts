import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Gestion du CORS pour ton application mobile/web
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { images } = await req.json()
    const CLOUD_NAME = "dah4t6swx";

    if (!images || images.length === 0) {
      throw new Error("Aucune image reçue pour la génération");
    }

    // 1. Initialisation de la timeline
    // w_720,h_720 : Format carré parfait pour Facebook/WhatsApp
    // f_mp4 : Conversion en vidéo
    // fl_animated : INDISPENSABLE pour que Cloudinary crée un mouvement
    // loop : Pour que la vidéo boucle si besoin
    let transformations = `w_720,h_720,c_fill,f_mp4,fl_animated,fl_awebp`; 

    // 2. Construction du diaporama
    images.forEach((img, index) => {
      const cleanText = encodeURIComponent(img.text || " ");
      const cleanPrice = encodeURIComponent(img.price || " ");
      
      // Encodage Base64 de l'URL pour éviter les erreurs de caractères spéciaux
      const b64Url = btoa(img.url)
        .replace(/\//g, '_')
        .replace(/\+/g, '-')
        .replace(/=+$/, '');

      if (index === 0) {
        // Première image (Base de la vidéo)
        transformations += `/l_text:Arial_45_bold:${cleanText},g_south_west,x_50,y_120,co_white,du_3`;
        transformations += `/l_text:Arial_55_bold:${cleanPrice},g_south_west,x_50,y_50,co_yellow,du_3`;
      } else {
        // Images suivantes ajoutées à la suite (Splicing)
        // du_3 : Chaque image reste 3 secondes
        transformations += `/fl_layer_apply,l_fetch:${b64Url}/w_720,h_720,c_fill,du_3`;
        transformations += `/l_text:Arial_45_bold:${cleanText},g_south_west,x_50,y_120,co_white,du_3`;
        transformations += `/l_text:Arial_55_bold:${cleanPrice},g_south_west,x_50,y_50,co_yellow,du_3`;
      }
    });

    // 3. Assemblage de l'URL finale
    // On utilise /image/fetch/ car c'est la seule méthode qui a validé le MP4 sur ton compte
    const finalVideoUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(images[0].url)}`;

    return new Response(
      JSON.stringify({ 
        videoUrl: finalVideoUrl,
        message: "Vidéo publicitaire générée avec succès !" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    )
  }
})