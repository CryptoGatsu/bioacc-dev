import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET PROJECTS
    // ========================
    if(req.method === "GET"){

      const r = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*`, {
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      })

      const data = await r.json()
      return res.json(data)
    }

    // ========================
    // SUBMIT PROJECT (SECURE)
    // ========================
    if(req.method === "POST"){

      const {
        id,
        name,
        github,
        social,
        website,
        description,
        logo,
        wallet,
        signature,
        message
      } = req.body

      // 🔥 VALIDATION
      if(!wallet || !signature || !message){
        return res.status(400).json({ error:"missing fields" })
      }

      if(!name || !github || !social){
        return res.status(400).json({ error:"missing required project fields" })
      }

      // 🔥 VERIFY SIGNATURE
      const isValid = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        new Uint8Array(signature),
        bs58.decode(wallet)
      )

      if(!isValid){
        return res.status(401).json({ error:"invalid signature" })
      }

      // 🔥 REPLAY PROTECTION
      const parts = message.split(":")
      const timestamp = parseInt(parts[2])

      if(Date.now() - timestamp > 60000){
        return res.status(401).json({ error:"signature expired" })
      }

      // 🔥 ENSURE MESSAGE MATCHES ACTION
      if(!message.startsWith(`submit:${wallet}`)){
        return res.status(401).json({ error:"invalid message format" })
      }

      // ========================
      // SAVE TO SUPABASE
      // ========================
      const r = await fetch(`${SUPABASE_URL}/rest/v1/projects`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        },
        body: JSON.stringify({
          id,
          name,
          github,
          social,
          website,
          description,
          logo,
          votes: 0,
          wallet,
          created_at: new Date().toISOString()
        })
      })

      const data = await r.json()

      return res.json(data)
    }

    return res.status(405).json({ error:"method not allowed" })

  }catch(err){
    console.log("projects api error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}