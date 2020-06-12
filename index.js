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

function subscribeToDrawings({ client, connection, drawingId}){
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


function handleLinePublish({ connection , line }){
    console.log('saving line to the db');
    r.table('lines')
    .insert(Object.assign(line, {timestamp: new Date()}))
    .run(connection);
}

function subscribeToDrawingLines({client, connection, drawingId, from}){
    
    let query = r.row('drawingId').eq(drawingId);

    if(from){
        query = query.and(
            r.row('timestamp').ge(new Date(from))
        );
    }
    
    return r.table('lines')
    .filter(query)
    .changes({includeInitial: true})
    .run(connection)
    .then((cursor) => {
        cursor.each((err, lineRow) => 
            client.emit(`drawingLine:${drawingId}`, lineRow.new_val));
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
        });

        client.on('publishLine', (line) => handleLinePublish({
            line,
            connection,
        }));

        client.on('subscribeToDrawingLines', ({ drawingId, from}) => {
            subscribeToDrawingLines({
                client,
                connection,
                drawingId,
                from,
            });
        });

    });

});


const port = parseInt(process.argv[2],10) || 8000;
io.listen(port);
console.log('listening on port', port);