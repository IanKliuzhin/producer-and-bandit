const searchParams = new URLSearchParams(window.location.search)
const id = searchParams.get('id')
// eslint-disable-next-line no-undef
const lobbySocket = io('/lobby', { autoConnect: false })
lobbySocket.auth = { userId:id }
lobbySocket.connect()

const connectionElement = document.querySelector('.connection')
const statusElement = connectionElement.querySelector('.status')
const partnerElement = connectionElement.querySelector('.partner')
const roleElement = connectionElement.querySelector('.role')

lobbySocket.on('partner-found', (namespace, role) => {
    console.log('A partner was found. Namespace:', namespace, ', role:', role)
    sessionStorage.setItem('namespace', namespace)
    sessionStorage.setItem('role', role)
    connectionElement.classList.add('connected')
    partnerElement.textContent = 'A partner was found.'
    roleElement.textContent = `Your role is ${role}`
    lobbySocket.disconnect()
})

lobbySocket.on('partner-not-found', () => {
    console.log('A partner was not found')
    statusElement.textContent = 'Waiting for someone to connect...'
})
