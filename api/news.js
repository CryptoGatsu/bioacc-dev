import fetch from "node-fetch"

function scoreItem(text){

  const t = text.toLowerCase()
  let score = 0

  // ========================
  // 🧬 SCIENCE SIGNALS
  // ========================
  if(t.includes("cancer") || t.includes("oncology")) score += 3
  if(t.includes("crispr") || t.includes("gene")) score += 3
  if(t.includes("longevity") || t.includes("aging")) score += 2
  if(t.includes("protein") || t.includes("antibody")) score += 2

  // ========================
  // 💰 MARKET SIGNALS
  // ========================
  if(t.includes("funding") || t.includes("raises")) score += 4
  if(t.includes("acquisition") || t.includes("merger")) score += 4
  if(t.includes("partnership")) score += 3

  // ========================
  // 🏛 REGULATORY SIGNALS
  // ========================
  if(t.includes("fda") || t.includes("approval")) score += 5
  if(t.includes("phase 1") || t.includes("phase 2") || t.includes("phase 3")) score += 4
  if(t.includes("clinical trial")) score += 4

  return score
}

export default async function handler(req, res){

  try{

    // ========================
    // BIOXRIV
    // ========================
    const bioRes = await fetch(
      "https://api.biorxiv.org/details/biorxiv/2024-01-01/2026-12-31"
    )

    const bioData = await bioRes.json()

    const bioItems = bioData.collection.slice(0, 10).map(item => {

      const text = item.title + " " + (item.abstract || "")

      let score = scoreItem(text)

      // recency boost
      if(item.date?.includes("2026")) score += 2

      // depth boost
      if((item.abstract || "").length > 800) score += 2

      return {
        title: item.title,
        url: `https://www.biorxiv.org/content/${item.doi}`,
        source: "bioRxiv",
        score
      }
    })

    // ========================
    // PUBMED
    // ========================
    const searchRes = await fetch(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&sort=pub+date&retmax=10&term=biotech"
    )

    const searchText = await searchRes.text()

    const ids = [...searchText.matchAll(/<Id>(\d+)<\/Id>/g)]
      .map(m => m[1])

    let pubItems = []

    if(ids.length){

      const summaryRes = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
      )

      const summaryData = await summaryRes.json()

      pubItems = Object.values(summaryData.result)
        .filter(x => x.title)
        .map(item => {

          let score = scoreItem(item.title)

          if(item.pubdate?.includes("2026")) score += 2

          return {
            title: item.title,
            url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
            source: "PubMed",
            score
          }
        })
    }

    // ========================
    // MERGE + SORT
    // ========================
    const items = [...bioItems, ...pubItems]
      .sort((a,b) => b.score - a.score)
      .slice(0, 20)

    return res.json({
      items,
      lastUpdated: Date.now()
    })

  }catch(err){
    console.log("news api error:", err)
    return res.status(500).json({ error:"news failed" })
  }
}