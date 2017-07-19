const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use('/', express.static(`${__dirname}/public`));

const messages = [];
const users = [];
const statusTimers = {};

io.on('connection', (socket) => {
    socket.on('check nick', (userNick, fn) => {
        fn(users.every(({nick}) => userNick !== nick));
    });
    socket.emit('users list', users);
    socket.emit('history messages', messages);
    socket.on('new user', (user) => {
        user.status = 'newbie';
        user.id = socket.id;
        users.push(user);
        statusTimers[socket.id] = setTimeout(() => {
            users.find(({id}) => id === socket.id).status = 'online';
            io.emit('update status', {id: socket.id, status: 'online'});
        }, 60000);
        io.emit('new user', user);
    });
    socket.on('msg', (msg) => {
        messages.push(msg);
        if (messages.length > 100) {
            messages.shift();
        }
        io.emit('msg', msg);
    });
    socket.on('disconnect', () => {
        const user = users.find(({id}) => id === socket.id);
        if (user === undefined) return;
        user.status = 'offline';
        io.emit('update status', {id: socket.id, status: 'offline'});
        clearTimeout(statusTimers[socket.id]);
    });
    socket.on('user typing', () => {
        const user = users.find(({id}) => id === socket.id);
        if (user === undefined) return;
        io.emit('update typing', {name: user.name, nick: user.nick});
    });
});
http.listen(3000, () => {
    console.log('listening on *:3000');
});
