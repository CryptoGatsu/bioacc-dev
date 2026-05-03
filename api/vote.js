import nacl from "tweetnacl"
import bs58 from "bs58"
import { Connection, PublicKey } from "@solana/web3.js"

const TOKENS_PER_VOTE = 1_000_000

// 🔥 REPLACE THIS WITH YOUR TOKEN MINT
const TOKEN_MINT = "YOUR_TOKEN_MINT_HERE"

const connection = new Connection("https://api.mainnet-beta.solana.com")

async function getTokenBalance(wallet){
  try{
    const owner = new PublicKey(wallet)
    const mint = new PublicKey(TOKEN_MINT)

    const accounts = await connection.getParsedTokenAccountsByOwner(owner,{
      mint
    })

    if(accounts.value.length === 0){
      return 0
    }

    const balance =
      accounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0

    return balance
  }catch(err){
    console.error("token fetch error:", err)
    return 0
  }
}

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
    // 🔥 LIVE TOKEN BALANCE
    // ========================
    const userTokens = await getTokenBalance(wallet)

    const totalVotingPower = Math.floor(userTokens / TOKENS_PER_VOTE)

    console.log("TOKENS:", userTokens)
    console.log("VOTING POWER:", totalVotingPower)

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
    // DAILY LIMIT
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
    // PROJECT RULES
    // ========================
    const projectVotes = existingVotes.filter(v => v.project_id === projectId)

    if(projectVotes.length >= 2){
      return res.status(403).json({ error:"max 2 vote actions per project" })
    }

    const lastProjectVote = projectVotes
      .map(v => new Date(v.created_at).getTime())
      .sort((a,b)=>b-a)[0]

    if(lastProjectVote && (Date.now() - lastProjectVote < 86400000)){
      return res.status(403).json({ error:"already voted today" })
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
    // INCREMENT PROJECT
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