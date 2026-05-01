export default async function handler(req, res){

  const SUPABASE_URL = process.env.SUPABASE_URL
  const KEY = process.env.SUPABASE_SERVICE_KEY

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

  if(req.method === "POST"){

    const body = req.body

    const r = await fetch(`${SUPABASE_URL}/rest/v1/projects`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        apikey: KEY,
        Authorization:`Bearer ${KEY}`
      },
      body: JSON.stringify(body)
    })

    return res.json(await r.json())
  }
}