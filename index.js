const io = require('socket.io')();
const r = require('rethinkdb');

function createDrawing( { connection, name }){
    return r.table('drawings')
    .insert({
        name,
        timestamp: new Date(),
    })
    .run(connection)
    .then(() => console.log('created a new drawing with name ', name));
}

function subscribeToDrawings({ client, connection}){
    console.log("  subscribeToDrawings " )
    r.table('drawings')
    .changes({ include_initial: true })
    .run(connection)
    .then((cursor) => {
        console.log("client id emit drawing with value", client.id )
        cursor.each( (err, drawingRow) => {
            console.log("client id ", client.id, " emit value ", drawingRow);
            client.emit('drawing', drawingRow.new_val)
        });
    })
}


r.connect({
    host: 'localhost',
    port: 28015,
    db: 'awesome_whiteboard',
}).then((connection) => {
    
    io.on('connection', (client) => {        
        
        console.log("connection client id ", client.id);

        client.on('createDrawing', ({name}) => {
            // console.log("createDrawing connection ", connection);
            console.log("createDrawing name ", name);
            createDrawing( { connection, name });
        });
        
        client.on('subscribeToDrawings', () => subscribeToDrawings({
            client,
            connection,
        }));

        client.on('disconnect', () => {
            console.log("disconnection client id", client.id);
        })

    });
    
}) 


const port = 8000;
io.listen(8000);
console.log('listening on port', port);