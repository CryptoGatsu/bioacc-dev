export default async function handler(req, res){

  try{

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

    if(!SUPABASE_URL || !SUPABASE_KEY){
      return res.status(500).json({ error: "Missing Supabase env vars" })
    }

    // ========================
    // GET PROFILE
    // ========================
    if(req.method === "GET"){

      const { wallet } = req.query

      if(!wallet){
        return res.status(400).json({ error: "Missing wallet" })
      }

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?wallet=eq.${wallet}`,
        {
          headers:{
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        }
      )

      const data = await r.json()
      return res.status(200).json(data[0] || {})
    }

    // ========================
    // SAVE PROFILE
    // ========================
    if(req.method === "POST"){

      const { wallet, username, bio } = req.body

      if(!wallet){
        return res.status(400).json({ error: "Missing wallet" })
      }

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

      if(!r.ok){
        console.log("SUPABASE ERROR:", text)
        return res.status(500).json({ error: text })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: "Method not allowed" })

  }catch(err){
    console.log("API crash:", err)
    return res.status(500).json({ error: "Server crash" })
  }

}