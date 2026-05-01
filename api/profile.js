export default async function handler(req, res){

  try{

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

    console.log("URL:", SUPABASE_URL)
    console.log("KEY EXISTS:", !!SUPABASE_KEY)

    if(!SUPABASE_URL || !SUPABASE_KEY){
      return res.status(500).json({
        error: "Missing env vars",
        url: SUPABASE_URL,
        key: !!SUPABASE_KEY
      })
    }

    if(req.method === "POST"){

      const { wallet, username, bio } = req.body

      console.log("BODY:", req.body)

      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          wallet,
          username,
          bio,
          updated: new Date().toISOString()
        })
      })

      const text = await r.text()

      console.log("SUPABASE RESPONSE:", text)

      return res.status(r.status).json({
        status: r.status,
        response: text
      })
    }

    if(req.method === "GET"){
      return res.status(200).json({})
    }

  }catch(err){
    console.log("CRASH:", err)
    return res.status(500).json({ error: err.message })
  }

}