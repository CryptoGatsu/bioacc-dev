import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET (FETCH ALL VOTES)
    // ========================
    if(req.method === "GET"){
      const r = await fetch(`${SUPABASE_URL}/rest/v1/votes?select=*`,{
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      })

      const data = await r.json()
      return res.json(data)
    }

    // ========================
    // POST (CAST VOTE)
    // ========================
    if(req.method !== "POST"){
      return res.status(405).json({ error:"method not allowed" })
    }

    const {
      wallet,
      projectId,
      amount,
      signature,
      message
    } = req.body

    // VALIDATION
    if(!wallet || !projectId || !signature || !message){
      return res.status(400).json({ error:"missing fields" })
    }

    const voteAmount = parseInt(amount) || 1

    if(voteAmount < 1){
      return res.status(400).json({ error:"invalid vote amount" })
    }

    // VERIFY SIGNATURE
    const isValid = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      new Uint8Array(signature),
      bs58.decode(wallet)
    )

    if(!isValid){
      return res.status(401).json({ error:"invalid signature" })
    }

    // VERIFY MESSAGE
    if(!message.startsWith(`vote:${wallet}:${projectId}`)){
      return res.status(401).json({ error:"invalid message format" })
    }

    // REPLAY PROTECTION
    const parts = message.split(":")
    const timestamp = parseInt(parts[3])

    if(Date.now() - timestamp > 60000){
      return res.status(401).json({ error:"signature expired" })
    }

    // COOLDOWN (24h)
    const voteCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/votes?wallet=eq.${wallet}&select=*`,
      {
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      }
    )

    const existingVotes = await voteCheck.json()

    if(existingVotes.length > 0){
      const lastVote = Math.max(
        ...existingVotes.map(v => new Date(v.created_at).getTime())
)

      if(Date.now() - lastVote < 86400000){
        return res.status(403).json({ error:"already voted today" })
      }
    }

    // SAVE VOTE
    await fetch(`${SUPABASE_URL}/rest/v1/votes`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        apikey: KEY,
        Authorization:`Bearer ${KEY}`,
        Prefer:"resolution=merge-duplicates"
      },
      body: JSON.stringify({
        wallet,
        project_id: projectId,
        amount: voteAmount,
        created_at: new Date().toISOString()
      })
    })

    // INCREMENT PROJECT VOTES
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_votes`,{
      method:"POST",
      headers:{
        apikey: KEY,
        Authorization:`Bearer ${KEY}`
      },
      body: JSON.stringify({
        project_id: projectId,
        vote_amount: voteAmount
      })
    })

    return res.json({ success:true })

  }catch(err){
    console.log("vote api error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}