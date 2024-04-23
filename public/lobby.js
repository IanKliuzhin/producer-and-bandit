const searchParams = new URLSearchParams(window.location.search)
const id = searchParams.get('id')
// eslint-disable-next-line no-undef
const lobbySocket = io('/lobby', { autoConnect: false })
lobbySocket.auth = { userId:id }
lobbySocket.connect()

let role

const connectionElement = document.querySelector('.connection')
const statusElement = connectionElement.querySelector('.status')
const partnerElement = connectionElement.querySelector('.partner')
const roleElement = connectionElement.querySelector('.role')
const showInstructionsBtn = connectionElement.querySelector('.show_instructions')

const instructionsElement = document.querySelector('.instructions')
const roleExplanationElement = instructionsElement.querySelector('.role_instructions')
const readyBtn = instructionsElement.querySelector('.ready')
const partnerStatusElement = document.querySelector('.partner_status')

lobbySocket.on('partner-found', (namespace, assignedRole) => {
    console.log('A partner was found. Namespace:', namespace, ', role:', assignedRole)
    sessionStorage.setItem('namespace', namespace)
    sessionStorage.setItem('role', assignedRole)
    role = assignedRole
    connectionElement.classList.add('connected')
    partnerElement.textContent = 'A partner was found.'
    roleElement.textContent = `Your role is ${role}`
})

lobbySocket.on('partner-not-found', () => {
    console.log('A partner was not found')
    statusElement.textContent = 'Waiting for someone to connect...'
})

const showInstructions = () => {
    showInstructionsBtn.removeEventListener('click', showInstructions)
    showInstructionsBtn.remove()

    roleExplanationElement.innerHTML = role
    instructionsElement.classList.add('visible')

    let isReady = false
    let isPartnerReady = false

    readyBtn.onclick = () => {
        lobbySocket.emit('ready')
        isReady = true
        if (isPartnerReady) {
            window.location.assign(`./game.html${window.location.search}`)
        } else {
            readyBtn.remove()
            partnerStatusElement.innerHTML = 'Wating for partner to get ready...'
        }
    }

    lobbySocket.on('partner-ready', () => {
        console.log('partner-ready')
        isPartnerReady = true
        if (isReady) {
            window.location.assign(`./game.html${window.location.search}`)
        }
    })
}

showInstructionsBtn.addEventListener('click', showInstructions)