export default async function handler(req, res){

  try{

    const { wallet, username, bio } = req.body

    if(!wallet){
      return res.status(400).json({ error: "missing wallet" })
    }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

    if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY){
      return res.status(500).json({ error: "missing env vars" })
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        wallet,
        username,
        bio,
        updated: new Date().toISOString()
      })
    })

    const text = await response.text()

    console.log("SUPABASE RAW RESPONSE:", text)

    if(!response.ok){
      return res.status(500).json({ error: text })
    }

    return res.status(200).json({ success: true })

  }catch(err){
    console.error("API ERROR:", err)
    return res.status(500).json({ error: "server crash" })
  }

}