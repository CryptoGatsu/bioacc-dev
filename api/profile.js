// /api/profile.js
export default async function handler(req, res) {
  const { wallet } = req.query

  if (!wallet) return res.status(400).json({ error: "missing wallet" })

  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles?wallet=eq.${wallet}`, {
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`
    }
  })

  const data = await r.json()
  res.status(200).json(data[0] || {})
}