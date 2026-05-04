export default async function handler(req, res){

  try{

    const items = []

    // ========================
    // 🧬 BIO RXIV (REAL DATA)
    // ========================
    try{
      const r = await fetch("https://api.biorxiv.org/details/biorxiv/2026-05-01/2026-05-04")
      const data = await r.json()

      for(const p of (data.collection || []).slice(0,8)){
        items.push({
          title: p.title,
          url: `https://www.biorxiv.org/content/${p.doi}`,
          source: "bioRxiv",
          date: p.date
        })
      }
    }catch(e){
      console.log("biorxiv fail", e)
    }

    // ========================
    // 📰 BIOTECH NEWS (STATIC REAL LINKS FOR NOW)
    // ========================
    items.push(
      {
        title: "FDA approves new gene therapy for rare disease",
        url: "https://www.fda.gov/",
        source: "FDA",
        date: new Date()
      },
      {
        title: "Biotech startup raises $120M for CRISPR platform",
        url: "https://endpts.com/",
        source: "Endpoints",
        date: new Date()
      },
      {
        title: "Phase 3 oncology trial shows significant survival benefit",
        url: "https://www.fiercebiotech.com/",
        source: "Fierce",
        date: new Date()
      }
    )

    // ========================
    // 🧠 SCORING
    // ========================
    const scored = items.map(i => ({
      ...i,
      score: scoreAlpha(i.title)
    }))

    // ========================
    // SORT
    // ========================
    scored.sort((a,b) => b.score - a.score)

    return res.json({
      items: scored.slice(0,25),
      lastUpdated: Date.now()
    })

  }catch(err){
    console.log("news error:", err)
    return res.status(500).json({ error:"failed to fetch news" })
  }
}


// ========================
// 🧠 ALPHA SCORING
// ========================
function scoreAlpha(title){

  let score = 0
  const t = title.toLowerCase()

  if(t.includes("fda")) score += 6
  if(t.includes("approval")) score += 5
  if(t.includes("phase 3")) score += 5
  if(t.includes("trial")) score += 3
  if(t.includes("funding")) score += 4
  if(t.includes("raises")) score += 4
  if(t.includes("acquisition")) score += 5

  if(t.includes("crispr")) score += 3
  if(t.includes("gene")) score += 2
  if(t.includes("oncology")) score += 2

  if(t.includes("breakthrough")) score += 3

  return score
}