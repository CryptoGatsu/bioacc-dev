export default async function handler(req, res){

  try{

    const r = await fetch("https://api.biorxiv.org/details/biorxiv/2026-01-01/2026-12-31")
    const data = await r.json()

    if(!data.collection){
      return res.status(500).json({ error:"no biotech data" })
    }

    const items = data.collection.slice(0, 10).map(p => ({
      title: p.title,
      source: "bioRxiv",
      url: `https://www.biorxiv.org/content/${p.doi}v1`,
      tag: "RESEARCH"
    }))

    return res.json({
      lastUpdated: Date.now(),
      items
    })

  }catch(err){
    console.log("biotech feed error:", err)
    return res.status(500).json({ error:"feed failed" })
  }
}