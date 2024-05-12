import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set } from 'firebase/database'
import { Server } from 'socket.io'
import { firebaseConfig } from './firebaseConfig.js'

const PORT = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
    },
    cleanupEmptyChildNamespaces: true,
})
const firebaseApp = initializeApp(firebaseConfig)
const database = getDatabase(firebaseApp)

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public')))

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

const lobby = io.of('/lobby')

let expectantId

lobby.on('connection', (socket) => {
    console.log('New WS connection in lobby', socket.handshake.auth.userId)
    console.log('expectantId', expectantId)
    socket.userId = socket.handshake.auth.userId

    let expectantSocket
    if (expectantId) {
        for (let sckt of lobby.sockets.values()) {
            if (sckt.userId === expectantId) {
                expectantSocket = sckt
                break
            }
        }
    }

    if (expectantId && expectantSocket) {
        console.log('Found expectant in lobby:', expectantId)
        const namespace = `/game__${expectantId}__${socket.userId}`
        console.log('namespace', namespace)
        const roles = ['producer', 'bandit'].sort(() => Math.random() - Math.random())
        socket.emit('partner-found', namespace, roles[0])
        expectantSocket.emit('partner-found', namespace, roles[1])
        socket.partner = expectantSocket
        expectantSocket.partner = socket
        expectantId = undefined
    } else {
        console.log('There are no expectants in the lobby. Adding', socket.userId)
        socket.emit('partner-not-found')
        expectantId = socket.userId
    }

    socket.on('ready', () => {
        console.log(socket.userId, 'ready')
        socket.ready = true
        socket.broadcast.emit('partner-ready')
    })

    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected from lobby`)
        if (expectantId) {
            console.log('There was an expectant at the moment')
            if (socket.userId === expectantId) {
                console.log('He was the user that disconnected. Clearing expectantId')
                expectantId = undefined
            } else {
                console.log('But he wasn\'t the user that disconnected')
            }
        } else if (!socket.ready || !socket.partner.ready) {
            console.log('There wasn\'t any expectants at the moment. Making ex-partner of disconnected user expectant', socket.partner.userId)
            expectantId = socket.partner.userId
            socket.partner.ready = false
            delete socket.partner.partner
            socket.partner.emit('partner-disconnected')
        }
    })
})

const game = io.of(/\/game__\w+__\w+/)

game.on('connection', (socket) => {
    socket.userId = socket.handshake.auth.userId
    socket.role = socket.handshake.auth.role
    console.log(socket.userId, socket.role, 'connected to game')

    socket.on('set_tax', (rate) => {
        console.log('Tax received, rate', rate)
        game.emit('set_tax', rate)
    })

    socket.on('start', () => {
        console.log('Started')
        socket.broadcast.emit('start')
    })

    socket.on('y', (y) => {
        socket.broadcast.emit('y', y)
    })

    socket.on('check_backup', async (callback) => {
        console.log('check_backup')
        try {
            const backup = await new Promise((resolve) => {
                socket.timeout(7000).broadcast.emit('check_backup', 'ads', (_err, response) => {
                    console.log('response[0]', response[0])
                    resolve(response[0])
                })
            })
            console.log('backup', backup)
            callback(backup)
        } catch (error) {
            console.log('error', error)
        }
    })

    socket.on('paused', () => {
        socket.broadcast.emit('paused')
    })

    socket.on('resumed', () => {
        socket.broadcast.emit('resumed')
    })

    socket.on('current_score', (scorePerSecond, currentRate) => {
        console.log('Score per second', scorePerSecond, 'Current rate', currentRate)
        socket.broadcast.emit('current_score', scorePerSecond, currentRate)
    })

    socket.on('results', (results) => {
        console.log('results', results)
        set(ref(database, socket.nsp.name), {
            ...results,
        })
    })

    socket.on('survey', (answers) => {
        console.log(socket.role, 'answers', answers)
        set(ref(database, `${socket.nsp.name}/${socket.role}_${socket.userId}`), { ...answers })
    })

    socket.on('disconnect', () => {
        console.log(`${socket.role} ${socket.userId} disconnected from game`)
        socket.broadcast.emit('partner_disconnected')
    })
})
