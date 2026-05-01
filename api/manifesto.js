export default async function handler(req,res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

  if(req.method === "GET"){
    const r = await fetch(`${SUPABASE_URL}/rest/v1/manifesto?select=*`,{
      headers:{
        apikey: KEY,
        Authorization:`Bearer ${KEY}`
      }
    })

    return res.json(await r.json())
  }

  if(req.method === "POST"){
    const { wallet, note } = req.body

    await fetch(`${SUPABASE_URL}/rest/v1/manifesto`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        apikey: KEY,
        Authorization:`Bearer ${KEY}`,
        Prefer:"resolution=merge-duplicates"
      },
      body: JSON.stringify({ wallet, note })
    })

    res.json({success:true})
  }
}