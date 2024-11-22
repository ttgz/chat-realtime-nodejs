const express = require('express');
const http = require('http');
const mysql = require('mysql');
const session = require('express-session');
const { Server } = require('socket.io');
const app = express();
server = http.createServer(app)
const io = new Server(server);

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'demo_realtime'
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
    secret: 'login_key',
    resave: false,
    saveUninitialized: false
}));
connection.connect();
// connection.query('select * from users',(err,rows,fields)=>{
//     if(err) throw err
//     console.log(rows);
// });


app.use(express.static('public'));
app.set('view engine', 'ejs');


app.get('/', (req, res) => {
    if (req.session.user) {
        connection.query('select * from users where id = ?', [req.session.user.id], (err, rows) => {
            const user = { ...rows[0] }
            connection.query(`select rooms.id as roomId, users.id, users.name from rooms inner join users on (rooms.user_1 = users.id or rooms.user_2 = users.id) where (user_1 = ${user.id} or user_2 = ${user.id}) and users.id != ${user.id}`, (err, rows) => {
                users_inbox = [...rows];

                res.render('index', { user, users_inbox });
            })

        })
            ;
    } else {
        res.redirect('/login');
    }

})
app.get('/get-messages/:id', (req, res) => {
    connection.query('select * from chat_details where room = ?', [req.params.id], (err, result) => {
        res.send(result);
    });
})

io.on('connection', (socket) => {
    console.log('user conect'+ socket.id);
    socket.on('joinRoom',(data)=>{
        const roomId = data.roomId;
        socket.join(roomId);
        console.log('join');
    })
    socket.on('send-message', (data) => {
        connection.query('insert into chat_details(message,user_send,room) values (?,?,?)', [data.message, data.user_send, data.room], (err, result) => {
            io.to(data.room).emit('received-message',data);
        });
    });
});
// app.post('/send-message',(req,res)=>{
//     connection.query('insert into chat_details(message,user_send,room) values (?,?,?)',[req.body.message,req.body.user_send,req.body.room],(err,result)=>{
//         if(err) throw err
//         res.status(201);
//         res.send('OK');
//     })
// })
app.get('/login', (req, res) => {
    res.render('login');
})
app.post('/login', (req, res) => {
    let statusLogin = false;
    let user = {};
    connection.query('select * from users where username=? and password = ?', [req.body.username, req.body.password], (err, rows) => {
        if (err) throw err
        if (rows[0] !== undefined) {
            statusLogin = true;
            if (statusLogin) {
                req.session.user = {
                    id: rows[0].id,
                    username: rows[0].username
                }
                res.redirect('/');
            } else {
                res.redirect('/login');
            }
        }
    });

});
server.listen(3000, () => {
    console.log('http://127.0.0.1:3000');
})