import fetch from "node-fetch"

function scoreItem(text = ""){
  const t = text.toLowerCase()
  let score = 0

  if(t.includes("cancer") || t.includes("oncology")) score += 3
  if(t.includes("crispr") || t.includes("gene")) score += 3
  if(t.includes("longevity") || t.includes("aging")) score += 2
  if(t.includes("fda") || t.includes("approval")) score += 5
  if(t.includes("phase")) score += 4
  if(t.includes("funding") || t.includes("raises")) score += 4

  return score
}

export default async function handler(req, res){

  try{

    let bioItems = []
    let pubItems = []

    // ========================
    // BIOXRIV (SAFE)
    // ========================
    try{
      const bioRes = await fetch(
        "https://api.biorxiv.org/details/biorxiv/2024-01-01/2026-12-31"
      )

      const text = await bioRes.text()

      let bioData
      try{
        bioData = JSON.parse(text)
      }catch{
        console.log("bio parse fail:", text)
        bioData = { collection: [] }
      }

      bioItems = (bioData.collection || []).slice(0,10).map(item => {
        const fullText = item.title + " " + (item.abstract || "")

        return {
          title: item.title || "untitled",
          url: `https://www.biorxiv.org/content/${item.doi}`,
          source: "bioRxiv",
          score: scoreItem(fullText)
        }
      })

    }catch(err){
      console.log("bio fetch failed:", err)
    }

    // ========================
    // PUBMED (SAFE)
    // ========================
    try{
      const searchRes = await fetch(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&sort=pub+date&retmax=10&term=biotech"
      )

      const searchText = await searchRes.text()

      const ids = [...searchText.matchAll(/<Id>(\d+)<\/Id>/g)]
        .map(m => m[1])

      if(ids.length){

        const summaryRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`
        )

        const sumText = await summaryRes.text()

        let summaryData
        try{
          summaryData = JSON.parse(sumText)
        }catch{
          console.log("pubmed parse fail:", sumText)
          summaryData = { result: {} }
        }

        pubItems = Object.values(summaryData.result || {})
          .filter(x => x?.title)
          .map(item => ({
            title: item.title,
            url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
            source: "PubMed",
            score: scoreItem(item.title)
          }))
      }

    }catch(err){
      console.log("pubmed fetch failed:", err)
    }

    // ========================
    // MERGE
    // ========================
    const items = [...bioItems, ...pubItems]
      .sort((a,b)=>b.score - a.score)
      .slice(0,20)

    return res.json({
      items,
      lastUpdated: Date.now()
    })

  }catch(err){
    console.log("news fatal error:", err)
    return res.status(500).json({
      error:"news failed",
      details: err.message
    })
  }
}