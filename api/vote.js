export default async function handler(req, res){

  const { wallet, projectId, amount } = req.body

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  // insert vote
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
      amount
    })
  })

  // increment votes
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_votes`,{
    method:"POST",
    headers:{
      apikey: KEY,
      Authorization:`Bearer ${KEY}`
    },
    body: JSON.stringify({
      project_id: projectId,
      vote_amount: amount
    })
  })

  res.json({success:true})
}