import nacl from "tweetnacl"
import bs58 from "bs58"

const TOKENS_PER_VOTE = 1_000_000

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

    console.log("VOTE BODY:", req.body)

    // ========================
    // VALIDATION
    // ========================
    if(!wallet || !projectId || !signature || !message){
      return res.status(400).json({ error:"missing fields" })
    }

    const voteAmount = parseInt(amount) || 1

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
    // FETCH USER TOKENS
    // ========================
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?wallet=eq.${wallet}&select=tokens`,
      {
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      }
    )

    const profileData = await profileRes.json()
    const userTokens = profileData?.[0]?.tokens || 0

    // 🔥 CONVERT TOKENS → VOTES
    const totalVotingPower = Math.floor(userTokens / TOKENS_PER_VOTE)

    if(totalVotingPower <= 0){
      return res.status(403).json({ error:"no voting power" })
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
    // 🔥 DAILY VOTING LIMIT (GLOBAL)
    // ========================
    const now = Date.now()

    const votesToday = existingVotes.filter(v => {
      return (now - new Date(v.created_at).getTime()) < 86400000
    })

    const votesUsedToday = votesToday.reduce((sum,v)=>sum + v.amount, 0)

    const remainingVotes = totalVotingPower - votesUsedToday

    if(voteAmount > remainingVotes){
      return res.status(403).json({
        error:"not enough voting power",
        remainingVotes
      })
    }

    // ========================
    // PROJECT-SPECIFIC RULES
    // ========================
    const projectVotes = existingVotes.filter(v => v.project_id === projectId)

    // 🔥 max 2 vote actions per project (not total amount)
    if(projectVotes.length >= 2){
      return res.status(403).json({ error:"max 2 vote actions per project" })
    }

    // 🔥 1 vote action per 24h per project
    const lastProjectVote = projectVotes
      .map(v => new Date(v.created_at).getTime())
      .sort((a,b)=>b-a)[0]

    if(lastProjectVote && (Date.now() - lastProjectVote < 86400000)){
      return res.status(403).json({ error:"already voted on this project today" })
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
      console.error("INSERT FAILED:", insertText)
      return res.status(500).json({
        error: "vote insert failed",
        details: insertText
      })
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
      return res.status(500).json({
        error: "increment failed",
        details: rpcText
      })
    }

    return res.json({
      success:true,
      remainingVotes: remainingVotes - voteAmount
    })

  } catch (err) {
    console.error("vote api error:", err)
    return res.status(500).json({ error:"server error" })
  }
}