export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  try{

    const { wallet } = req.query

    if(!wallet){
      return res.status(400).json({ error:"no wallet" })
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

    let votes = []
    try{
      votes = JSON.parse(voteText)
    }catch{
      console.error("votes parse error:", voteText)
      return res.status(500).json({ error:"votes failed" })
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
      console.error("manifesto parse error:", manText)
    }

    // ========================
    // COMPUTE
    // ========================
    const totalVotes = votes.reduce((sum,v)=>sum + (v.amount || 0),0)

    const projectsVoted = [...new Set(votes.map(v => v.project_id))]

    return res.json({
      totalVotes,
      projectsVoted,
      hasSigned: manifesto.length > 0
    })

  }catch(err){
    console.log("profile stats error:", err)
    return res.status(500).json({ error:"server crash" })
  }
}