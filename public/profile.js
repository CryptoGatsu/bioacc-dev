// profile.js

let WALLET = null
let DATA = null

async function connectWalletGlobal(){
  const res = await window.solana.connect()
  WALLET = res.publicKey.toString()

  updateWalletUI()
  loadGlobalData()
}

function updateWalletUI(){
  const el = document.getElementById("walletDisplay")
  if(!el) return

  el.innerText =
    WALLET.slice(0,4)+"..."+WALLET.slice(-4)
}

async function loadGlobalData(){
  const res = await fetch("https://raw.githubusercontent.com/CryptoGatsu/bioacc/main/submissions.json?t="+Date.now())
  DATA = await res.json()
}

// PROFILE OPEN
function openProfile(){
  if(!WALLET || !DATA) return

  document.getElementById("profileModal").style.display="flex"

  document.getElementById("profileWallet").innerText =
    WALLET.slice(0,4)+"..."+WALLET.slice(-4)

  const userProjects = DATA.projects.filter(p => p.wallet === WALLET)

  document.getElementById("profileProjects").innerHTML =
    userProjects.map(p => `<div>${p.name}</div>`).join("")

  const votedId = DATA.voteIndex?.[WALLET]
  const votedProject = DATA.projects.find(p => p.id === votedId)

  document.getElementById("profileVote").innerText =
    votedProject ? votedProject.name : "none"

  let badges = []
  if(userProjects.length) badges.push("builder")
  if(votedId) badges.push("voter")

  const signed = DATA.manifesto?.find(s => s.wallet === WALLET)
  if(signed) badges.push("signer")

  document.getElementById("profileBadges").innerText =
    badges.join(" | ")
}

function closeProfile(){
  document.getElementById("profileModal").style.display="none"
}

// GLOBAL CLICK
document.addEventListener("click", e=>{
  if(e.target.id === "walletDisplay"){
    openProfile()
  }
})