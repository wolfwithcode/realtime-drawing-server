const io = require('socket.io')();
const r = require('rethinkdb');

r.connect({
    host: 'localhost',
    port: 28015,
    db: 'awesome_whiteboard',
}).then((connection) => {
    io.on('connection', (client) => {
        client.on('subscribeToTimer', (interval) => {
            console.log('client is subscribing to timer with interval ', interval);
            r.table('timers')
            .changes()
            .run(connection)
            .then((cursor) => {
                cursor.each( (err, timeRow) => {
                    client.emit('timer', new Date());
                })
            })
            // setInterval(() => {
            //     client.emit('timer', new Date());
            // }, interval);
        });
    });
    
}) 


const port = 8000;
io.listen(8000);
console.log('listening on port', port);