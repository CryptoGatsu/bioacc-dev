export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  const HELIUS_RPC = "https://rpc.helius.xyz/?api-key=abe30281-08a6-4f68-921b-4da93db84835"
  const TOKEN_MINT = "CLP3exiqE8drZSzwhPas257cTh1evzq6nr7i1Xwvpump"

  try{

    const { wallet } = req.query

    if(!wallet){
      return res.status(400).json({ error:"no wallet" })
    }

    console.log("PROFILE STATS START:", wallet)

    // ========================
    // TOKEN BALANCE (SAFE)
    // ========================
    async function getTokenBalance(wallet){

      try{
        const r = await fetch(HELIUS_RPC,{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({
            jsonrpc:"2.0",
            id:1,
            method:"getTokenAccountsByOwner",
            params:[
              wallet,
              { mint: TOKEN_MINT },
              { encoding:"jsonParsed" }
            ]
          })
        })

        const data = await r.json()

        if(data?.result?.value?.length > 0){
          return data.result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0
        }

        return 0

      }catch(err){
        console.log("HELIUS ERROR:", err)
        return 0
      }
    }

    // ========================
    // FETCH VOTES
    // ========================
    const voteRes = await fetch(
      `${SUPABASE_URL}/rest/v1/votes?wallet=eq.${wallet}&select=*`,
      {
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      }
    )

    const voteText = await voteRes.text()
    console.log("VOTES RAW:", voteText)

    let votes = []
    try{
      votes = JSON.parse(voteText)
    }catch(err){
      console.log("VOTES PARSE ERROR:", voteText)
      return res.status(500).json({ error:"votes parse failed" })
    }

    // ========================
    // FETCH MANIFESTO
    // ========================
    const manRes = await fetch(
      `${SUPABASE_URL}/rest/v1/manifesto?wallet=eq.${wallet}&select=*`,
      {
        headers:{
          apikey: KEY,
          Authorization:`Bearer ${KEY}`
        }
      }
    )

    const manText = await manRes.text()

    let manifesto = []
    try{
      manifesto = JSON.parse(manText)
    }catch{
      console.log("MANIFESTO PARSE ERROR:", manText)
    }

    // ========================
// COMPUTE (FIXED + RESET)
// ========================
let totalVotes = votes.reduce((sum, v) => sum + (v.amount || 0), 0)

let projectsVoted = [...new Set(votes.map(v => v.project_id))]

let lastVoteTime = votes.length > 0
  ? Math.max(...votes.map(v => new Date(v.created_at).getTime()))
  : null

// ========================
// 🔁 24H RESET LOGIC
// ========================
const DAY = 24 * 60 * 60 * 1000

if (lastVoteTime && (Date.now() - lastVoteTime > DAY)) {
  console.log("RESETTING VOTES FOR:", wallet)

  totalVotes = 0
  projectsVoted = []
  lastVoteTime = Date.now()

  // 🔥 HARD RESET (recommended so UI + DB match)
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/votes?wallet=eq.${wallet}`,
      {
        method: "DELETE",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`
        }
      }
    )
    console.log("votes cleared from DB")
  } catch (err) {
    console.log("failed to clear votes", err)
  }
}

// ========================
// 💰 TOKEN + LIMITS
// ========================
const userTokens = await getTokenBalance(wallet)
const maxVotes = Math.floor(userTokens / 1_000_000)

console.log("TOKENS:", userTokens, "MAX VOTES:", maxVotes)

// ========================
// 🚀 RESPONSE
// ========================
return res.status(200).json({
  totalVotes,
  projectsVoted,
  hasSigned: manifesto.length > 0,
  maxVotes,
  lastVoteTime
})

} catch (err) {
  console.log("PROFILE STATS FATAL:", err)

  return res.status(500).json({
    error: "server crash",
    details: err.message
  })
}
}