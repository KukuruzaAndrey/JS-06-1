const okButtonEl = document.querySelector('#ok');
const nameInputEl = document.querySelector('#name');
const nickInputEl = document.querySelector('#nick');
const usersListEl = document.querySelector('#users-list');
const sendButtonEl = document.querySelector('#send');
const userInputEl = document.querySelector('#user-input');
const messagesListEl = document.querySelector('#messages-list');
const typingUsersEl = document.querySelector('#typing');

const socket = io();

let userName;
let userNick;
let msgCounter = 0;
okButtonEl.onclick = () => {
    if (nameInputEl.value === '') {
        nameInputEl.style.borderColor = 'red';
        return;
    }
    if (nickInputEl.value === '') {
        nickInputEl.style.borderColor = 'red';
        return;
    }
    socket.emit('check nick', nickInputEl.value, (availability) => {
        if (availability) {
            document.querySelector('.popup').style.display = 'none';
            userInputEl.removeAttribute('disabled');
            sendButtonEl.removeAttribute('disabled');
            userName = nameInputEl.value;
            userNick = nickInputEl.value;
            const d = new Date();
            const user = {name: userName, nick: userNick, date: `${d.getHours()}:${d.getMinutes()}`};
            socket.emit('new user', user);
        } else {
            nickInputEl.value = '';
            nickInputEl.setAttribute('placeholder', 'This nick already exist');
        }
    });
};

const sendMessage = () => {
    if (userInputEl.value === '') {
        return;
    }
    const d = new Date();
    const msg = {
        name: userName,
        nick: userNick,
        date: `${d.getHours()}:${d.getMinutes()}`,
        payload: userInputEl.value
    };
    socket.emit('msg', msg);
    userInputEl.value = '';
};
sendButtonEl.onclick = sendMessage;

const addMsg = ({name, nick, date, payload}) => {
    msgCounter++;
    const msgEl = document.createElement('li');
    msgEl.classList.add('msg');
    const msgHeaderEl = document.createElement('div');
    msgHeaderEl.classList.add('msg-header');
    const nameEl = document.createElement('p');
    nameEl.classList.add('name');
    nameEl.innerText = name;
    const nickEl = document.createElement('p');
    nickEl.classList.add('nick');
    if (nick === userNick) {
        msgEl.classList.add('self');
    }
    nickEl.innerText = nick;
    const dataEl = document.createElement('p');
    dataEl.classList.add('data');
    dataEl.innerText = date;
    msgHeaderEl.appendChild(nameEl);
    msgHeaderEl.appendChild(nickEl);
    msgHeaderEl.appendChild(dataEl);
    const payloadEl = document.createElement('p');
    const regExp = new RegExp(`@${userNick}`);
    if (regExp.test(payload)) {
        msgEl.classList.add('msg-to-user');
    }
    payloadEl.classList.add('payload');
    payloadEl.innerText = payload;
    msgEl.appendChild(msgHeaderEl);
    msgEl.appendChild(payloadEl);
    messagesListEl.appendChild(msgEl);
    msgEl.scrollIntoView();
};

const addUser = ({name, nick, date, status, id}) => {
    const userEl = document.createElement('li');
    if (nick === userNick) {
        userEl.classList.add('self');
    }
    userEl.classList.add('user');
    userEl.id = `user-id-${id}`;
    const userStatusEl = document.createElement('div');
    userStatusEl.classList.add('status');
    userStatusEl.classList.add(status);
    const nameEl = document.createElement('p');
    nameEl.innerText = `${name} (@${nick})`;
    userEl.appendChild(userStatusEl);
    userEl.appendChild(nameEl);
    usersListEl.appendChild(userEl);
};

socket.on('users list', (users) => {
    users.forEach(user => addUser(user));
});
socket.on('new user', (user) => {
    addUser(user);
    const notifEl = document.createElement('li');
    notifEl.innerHTML = `<b>${user.name} (@${user.nick})</b> has join`;
    messagesListEl.appendChild(notifEl);
});
socket.on('history messages', (messages) => {
    messages.forEach(msg => addMsg(msg));
});
socket.on('msg', (msg) => {
    if (msgCounter > 100) {
        messagesListEl.removeChild(messagesListEl.children[0]);
        msgCounter = 100;
    }
    addMsg(msg);
});
socket.on('update status', ({name, nick, date, status, id}) => {
    const userStatus = document.querySelector(`#user-id-${id} .status`);
    userStatus.setAttribute('class', `status ${status}`);
    if (status === 'offline') {
        const notifEl = document.createElement('li');
        notifEl.innerHTML = `<b>${name} (@${nick})</b> has left`;
        messagesListEl.appendChild(notifEl);
    }
});
userInputEl.onkeydown = (e) => {
    if (e.keyCode === 13) {
        sendMessage();
    } else {
        socket.emit('user typing', {});
    }
};

const typingList = {};
const renderTyping = (list) => {
    if (Object.values(list).length === 0) {
        typingUsersEl.innerText = '';
        return;
    }
    const usersNamesTyping = Object.values(list).map(user => user.name);
    typingUsersEl.innerText = usersNamesTyping.length === 1 ?
        `${usersNamesTyping[0]} is typing...` :
        `${usersNamesTyping.join(', ')} are typing`;
};
socket.on('update typing', ({name, nick}) => {
    if (nick === userNick) return;
    if (typingList[nick] === undefined) {
        typingList[nick] = {name};
    } else {
        clearTimeout(typingList[nick].timerId);
    }
    typingList[nick].timerId = setTimeout(() => {
        delete typingList[nick];
        renderTyping(typingList);
    }, 1500);
    renderTyping(typingList);
});
