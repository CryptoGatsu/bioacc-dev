export default async function handler(req, res){

  try{

    function scoreItem(text = ""){
      const t = text.toLowerCase()
      let score = 0

      // SCIENCE
      if(t.includes("cancer")) score += 3
      if(t.includes("crispr") || t.includes("gene")) score += 3
      if(t.includes("longevity") || t.includes("aging")) score += 2

      // MARKET
      if(t.includes("funding") || t.includes("raises")) score += 4
      if(t.includes("acquisition")) score += 4

      // REGULATORY
      if(t.includes("fda") || t.includes("approval")) score += 5
      if(t.includes("phase")) score += 4

      return score
    }

    function extractTopics(text=""){
      const t = text.toLowerCase()
      const topics = []

      if(t.includes("crispr")) topics.push("CRISPR")
      if(t.includes("cancer")) topics.push("CANCER")
      if(t.includes("car-t")) topics.push("CAR-T")
      if(t.includes("longevity")) topics.push("LONGEVITY")
      if(t.includes("gene")) topics.push("GENE")

      return topics
    }

    let items = []

    // ========================
    // BIOXRIV (RECENT ONLY)
    // ========================
    try{
      const r = await fetch("https://api.biorxiv.org/details/biorxiv/2025-01-01/2026-12-31")
      const data = await r.json()

      items.push(...(data.collection || []).slice(0,10).map(x => {
        const text = x.title + " " + (x.abstract || "")

        return {
          title: x.title,
          url: `https://www.biorxiv.org/content/${x.doi}`,
          source: "bioRxiv",
          score: scoreItem(text),
          topics: extractTopics(text),
          date: x.date
        }
      }))
    }catch(e){
      console.log("bio fail", e)
    }

    // ========================
    // PUBMED (RECENT)
    // ========================
    try{
      const s = await fetch("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&sort=pub+date&retmax=10&term=biotech")
      const text = await s.text()

      const ids = [...text.matchAll(/<Id>(\d+)<\/Id>/g)].map(m => m[1])

      if(ids.length){
        const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`)
        const data = await sum.json()

        const pubs = Object.values(data.result || {}).filter(x=>x?.title)

        items.push(...pubs.map(x=>{
          return {
            title: x.title,
            url: `https://pubmed.ncbi.nlm.nih.gov/${x.uid}/`,
            source: "PubMed",
            score: scoreItem(x.title),
            topics: extractTopics(x.title),
            date: x.pubdate
          }
        }))
      }
    }catch(e){
      console.log("pub fail", e)
    }

    // ========================
    // 🔥 TREND DETECTION
    // ========================
    const topicCount = {}

    for(const item of items){
      for(const t of item.topics){
        topicCount[t] = (topicCount[t] || 0) + 1
      }
    }

    for(const item of items){
      let trendBoost = 0

      for(const t of item.topics){
        if(topicCount[t] >= 2){
          trendBoost += 2
        }
      }

      item.score += trendBoost
      item.trending = trendBoost > 0
    }

    // ========================
    // SORT
    // ========================
    items = items
      .sort((a,b)=>b.score - a.score)
      .slice(0,20)

    return res.json({
      items,
      lastUpdated: Date.now()
    })

  }catch(err){
    console.log("fatal", err)
    return res.status(500).json({ error:"news failed" })
  }
}