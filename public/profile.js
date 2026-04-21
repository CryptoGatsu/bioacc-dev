let profileInitialized = false

function initProfileSafe(){
if(profileInitialized) return
if(typeof wallet === "undefined") return
if(typeof backendData === "undefined") return

profileInitialized = true

const walletEl = document.getElementById("walletStatus")
if(!walletEl) return

walletEl.onclick = () => {
document.getElementById("profileModal").style.display = "flex"

document.getElementById("profileWallet").innerText =
wallet.slice(0,4)+"..."+wallet.slice(-4)

renderProfile()
}
}

function renderProfile(){

if(!backendData || !wallet) return

const userProjects = backendData.projects.filter(p => p.wallet === wallet)

document.getElementById("profileProjects").innerHTML =
userProjects.map(p => `<div>${p.name}</div>`).join("")

const votedId = backendData.voteIndex?.[wallet]
const votedProject = backendData.projects.find(p => p.id === votedId)

document.getElementById("profileVote").innerText =
votedProject ? votedProject.name : "none"

let badges = []
if(userProjects.length) badges.push("builder")
if(votedId) badges.push("voter")

const signed = backendData.manifesto?.find(s => s.wallet === wallet)
if(signed) badges.push("signer")

document.getElementById("profileBadges").innerText =
badges.join(" | ")
}

function closeProfile(){
document.getElementById("profileModal").style.display = "none"
}

// wait for your app to load
setInterval(initProfileSafe, 500)