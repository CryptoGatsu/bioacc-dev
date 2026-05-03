import nacl from "tweetnacl"
import bs58 from "bs58"

export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    // ========================
    // GET ALL VOTES
    // ========================
    if(req.method === "GET"){
      const r = await fetch(`${SUPABASE_URL}/rest/v1/votes?select=*`,{
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      })

      return res.json(await r.json())
    }

    // ========================
    // POST (CAST VOTE)
    // ========================
    console.log("VOTE BODY:", req.body)
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

    // ========================
    // VALIDATION
    // ========================
    if(!wallet || !projectId || !signature || !message){
      return res.status(400).json({ error:"missing fields" })
    }

    const voteAmount = Math.min(parseInt(amount) || 1, 2)

    if(voteAmount < 1){
      return res.status(400).json({ error:"invalid vote amount" })
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

    if(!message.startsWith(`vote:${wallet}:${projectId}`)){
      return res.status(401).json({ error:"invalid message format" })
    }

    const parts = message.split(":")
    const timestamp = parseInt(parts[3])

    if(Date.now() - timestamp > 60000){
      return res.status(401).json({ error:"signature expired" })
    }

    // ========================
    // FETCH USER VOTES
    // ========================
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

    // ========================
    // 🔥 24H GLOBAL COOLDOWN
    // ========================
    if(existingVotes.length > 0){
      const lastVote = Math.max(
        ...existingVotes.map(v => new Date(v.created_at).getTime())
      )

      if(Date.now() - lastVote < 86400000){
        return res.status(403).json({ error:"already voted today" })
      }
    }

    // ========================
    // 🔥 MAX 2 VOTES PER PROJECT
    // ========================
    const userProjectVotes = existingVotes
      .filter(v => v.project_id === projectId)
      .reduce((sum,v)=>sum + v.amount, 0)

    if(userProjectVotes >= 2){
      return res.status(403).json({ error:"max votes reached for this project" })
    }

    if(userProjectVotes + voteAmount > 2){
      return res.status(403).json({ error:"vote limit exceeded" })
    }

// ========================
// SAVE VOTE
// ========================
const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/votes`,{
  method:"POST",
  headers:{
    "Content-Type":"application/json",
    apikey: KEY,
    Authorization:`Bearer ${KEY}`,
    Prefer:"return=representation"
  },
  body: JSON.stringify({
    wallet,
    project_id: projectId,
    amount: voteAmount,
    created_at: new Date().toISOString()
  })
})

const insertText = await insertRes.text()

if(!insertRes.ok){
  console.error("INSERT FAILED STATUS:", insertRes.status)
    console.error("INSERT FAILED BODY:", insertText)
}


// ========================
// INCREMENT PROJECT VOTES
// ========================
const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_votes`,{
  method:"POST",
  headers:{
    "Content-Type":"application/json",
    apikey: KEY,
    Authorization:`Bearer ${KEY}`
  },
  body: JSON.stringify({
    project_id: projectId,
    vote_amount: voteAmount
  })
})

const rpcText = await rpcRes.text()

if(!rpcRes.ok){
  console.error("RPC FAILED:", rpcText)
  return res.status(500).json({ error:"increment failed" })
}

return res.json({ success:true })

  }catch(err){
    console.log("vote api error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}