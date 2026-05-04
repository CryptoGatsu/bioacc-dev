export default async function handler(req, res){

  try{

    // ========================
    // FETCH bioRxiv (recent)
    // ========================
    const bioRes = await fetch(
      "https://api.biorxiv.org/details/biorxiv/2026-01-01/2026-12-31"
    )
    const bioData = await bioRes.json()

    const bioItems = (bioData.collection || []).slice(0, 8).map(p => ({
      title: p.title,
      source: "bioRxiv",
      url: `https://www.biorxiv.org/content/${p.doi}v1`,
      tag: "PREPRINT",
      score: scoreSignal(p.title)
    }))

    // ========================
    // FETCH PubMed (recent)
    // ========================
    const pubRes = await fetch(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&sort=date&retmode=json&retmax=8&term=biotech"
    )
    const pubData = await pubRes.json()

    const ids = pubData.esearchresult.idlist.join(",")

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids}`
    )
    const summaryData = await summaryRes.json()

    const pubItems = Object.values(summaryData.result)
      .filter(x => x.title)
      .slice(0, 8)
      .map(p => ({
        title: p.title,
        source: "PubMed",
        url: `https://pubmed.ncbi.nlm.nih.gov/${p.uid}/`,
        tag: "PAPER",
        score: scoreSignal(p.title)
      }))

    // ========================
    // MERGE + SORT BY SCORE
    // ========================
    const items = [...bioItems, ...pubItems]
      .sort((a,b) => b.score - a.score)
      .slice(0, 12)

    return res.json({
      lastUpdated: Date.now(),
      items
    })

  }catch(err){
    console.log("news error:", err)
    return res.status(500).json({ error:"feed failed" })
  }
}


// ========================
// SIGNAL SCORING ENGINE
// ========================
function scoreSignal(title){

  let score = 1
  const t = title.toLowerCase()

  // 🔥 HIGH VALUE KEYWORDS
  if(t.includes("crispr")) score += 5
  if(t.includes("cancer")) score += 4
  if(t.includes("ai")) score += 3
  if(t.includes("drug")) score += 3
  if(t.includes("therapy")) score += 3
  if(t.includes("longevity")) score += 5
  if(t.includes("aging")) score += 4

  // 🔥 BREAKTHROUGH WORDS
  if(t.includes("breakthrough")) score += 5
  if(t.includes("novel")) score += 2
  if(t.includes("first")) score += 3

  return score
}