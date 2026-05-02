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

      const text = await r.text()

      try{
        return res.json(JSON.parse(text))
      }catch{
        console.error("bad supabase response:", text)
        return res.status(500).json({ error:"invalid response" })
      }
    }

    // ========================
    // POST PROJECT
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

      // ========================
      // BASIC VALIDATION
      // ========================
      if(!wallet || !signature || !message){
        return res.status(400).json({ error:"missing fields" })
      }

      if(!name || !github || !social){
        return res.status(400).json({ error:"missing required fields" })
      }

      // ========================
      // VERIFY SIGNATURE
      // ========================
      const isValid = nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        new Uint8Array(signature),
        bs58.decode(wallet)
      )

      if(!isValid){
        return res.status(401).json({ error:"invalid signature" })
      }

      if(!message.startsWith(`submit:${wallet}`)){
        return res.status(401).json({ error:"invalid message format" })
      }

      const parts = message.split(":")
      const timestamp = parseInt(parts[2])

      if(Date.now() - timestamp > 60000){
        return res.status(401).json({ error:"signature expired" })
      }

      // ========================
      // 🔥 RATE LIMIT (1 PROJECT / 24h)
      // ========================
      const existing = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?wallet=eq.${wallet}&select=created_at`,
        {
          headers:{
            apikey: KEY,
            Authorization:`Bearer ${KEY}`
          }
        }
      )

      const userProjects = await existing.json()

      if(userProjects.length > 0){
        const lastSubmit = Math.max(
          ...userProjects.map(p => new Date(p.created_at).getTime())
        )

        if(Date.now() - lastSubmit < 86400000){
          return res.status(403).json({ error:"1 project per 24h" })
        }
      }

      // ========================
      // 🔥 DUPLICATE CHECK
      // ========================
      const dupCheck = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?or=(github.eq.${encodeURIComponent(github)},social.eq.${encodeURIComponent(social)})&select=id`,
        {
          headers:{
            apikey: KEY,
            Authorization:`Bearer ${KEY}`
          }
        }
      )

      const duplicates = await dupCheck.json()

      if(duplicates.length > 0){
        return res.status(403).json({ error:"duplicate project" })
      }

      // ========================
      // SAVE PROJECT
      // ========================
      const insert = await fetch(`${SUPABASE_URL}/rest/v1/projects`,{
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

      const text = await insert.text()

      try{
        return res.json(JSON.parse(text))
      }catch{
        console.error("insert error:", text)
        return res.status(500).json({ error:"insert failed" })
      }
    }

    return res.status(405).json({ error:"method not allowed" })

  }catch(err){
    console.log("projects api error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}