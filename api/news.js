export default async function handler(req, res){

  try{

    // ========================
    // FETCH MULTIPLE SOURCES
    // ========================

    const [pubmed, biorxiv, endpoints] = await Promise.all([
      fetchPubMed(),
      fetchBioRxiv(),
      fetchEndpoints()
    ])

    // ========================
    // MERGE + NORMALIZE
    // ========================

    let items = [
      ...pubmed,
      ...biorxiv,
      ...endpoints
    ]

    // ========================
    // FILTER RECENT (LAST 48H)
    // ========================

    const now = Date.now()
    items = items.filter(i => {
      return now - new Date(i.date).getTime() < 1000 * 60 * 60 * 48
    })

    // ========================
    // SCORE (ALPHA DETECTION)
    // ========================

    items = items.map(i => ({
      ...i,
      score: scoreAlpha(i.title)
    }))

    // ========================
    // SORT BY SCORE + RECENCY
    // ========================

    items.sort((a,b) => {
      return b.score - a.score || new Date(b.date) - new Date(a.date)
    })

    return res.json({
      items: items.slice(0, 25),
      lastUpdated: Date.now()
    })

  }catch(err){
    console.log("news error:", err)
    return res.status(500).json({ error:"failed to fetch news" })
  }
}


// ========================
// 🔬 PUBMED
// ========================
async function fetchPubMed(){

  const r = await fetch(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&sort=date&retmax=5&term=biotech"
  )

  const text = await r.text()

  // simple fallback mock until XML parsing added
  return [{
    title: "Recent PubMed biotech research",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    source: "PubMed",
    date: new Date()
  }]
}


// ========================
// 🧪 BIORXIV
// ========================
async function fetchBioRxiv(){

  const r = await fetch("https://api.biorxiv.org/details/biorxiv/2026-05-01/2026-05-04")
  const data = await r.json()

  return (data.collection || []).slice(0,5).map(p => ({
    title: p.title,
    url: `https://www.biorxiv.org/content/${p.doi}`,
    source: "bioRxiv",
    date: p.date
  }))
}


// ========================
// 🧬 BREAKING NEWS (Endpoints)
// ========================
async function fetchEndpoints(){

  try{
    const r = await fetch("https://endpts.com/feed/")
    const text = await r.text()

    // quick parse fallback
    return [{
      title: "Endpoints biotech headline",
      url: "https://endpts.com",
      source: "Endpoints",
      date: new Date()
    }]

  }catch{
    return []
  }
}


// ========================
// 🧠 ALPHA SCORING ENGINE
// ========================
function scoreAlpha(title){

  let score = 0
  const t = title.toLowerCase()

  // 🚨 BREAKING VALUE SIGNALS
  if(t.includes("fda")) score += 5
  if(t.includes("approval")) score += 5
  if(t.includes("phase 3")) score += 4
  if(t.includes("trial results")) score += 4
  if(t.includes("acquisition")) score += 4
  if(t.includes("funding")) score += 3

  // 🧬 SCIENCE SIGNALS
  if(t.includes("crispr")) score += 3
  if(t.includes("gene therapy")) score += 3
  if(t.includes("oncology")) score += 2

  // 🔥 HYPE / MOMENTUM
  if(t.includes("breakthrough")) score += 2
  if(t.includes("first")) score += 2

  return score
}