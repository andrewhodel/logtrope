var async = require('async');
var app = require('http').createServer(handler);
var io = require('socket.io').listen(app);
var fs = require('fs');
var url = require('url');
var config = require('./config');
var path = require("path");
var mongodb = require('mongodb');
var static = require('node-static');
var syslog = require("./node-listen-udp-syslog/lib/node-listen-udp-syslog");
var db = new mongodb.Db(config.mongo.dbname, new mongodb.Server(config.mongo.host, config.mongo.port, {
    'auto_reconnect': true
}), {
    journal: true
});

io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging

var fileServer = new static.Server('./');

// db open START
db.open(function (err, db) {
    if (db) {
        app.listen(config.webport);

    // start server
    syslog.start('0.0.0.0', config.syslogport, function (msg) {

        // remove non alphanumeric from msg.host
        msg.host = msg.host.replace(/\W/g, '');

        // insert message to hopefully capped collection
        db.collection('messages', function (err, collection) {
            collection.insert(msg, function (err, docs) {
            });
        });

        delete msg._id;

        io.sockets.emit('update', msg);

        // update host
        db.collection('hosts', function (err, collection) {
            collection.update({host:msg.host}, msg, {upsert:true}, function (err, docs) {
            });
        });
    });

    // indexes

    db.ensureIndex('hosts', 'host', {
        'unique': true
    }, function (err, name) {
        if (err) {
            console.log(err)
        }
    });

    db.ensureIndex('messages', 'unixts', {
        'unique': false
    }, function (err, name) {
        if (err) {
            console.log(err)
        }
    });

    db.ensureIndex('messages', 'facility_id', {
        'unique': false
    }, function (err, name) {
        if (err) {
            console.log(err)
        }
    });

    db.ensureIndex('messages', 'severity_id', {
        'unique': false
    }, function (err, name) {
        if (err) {
            console.log(err)
        }
    });

    db.ensureIndex('messages', 'host', {
        'unique': false
    }, function (err, name) {
        if (err) {
            console.log(err)
        }
    });

    } else {
        console.log('db error: '+err);
    }
});

function handler(req, res) {
    var urlp = url.parse(req.url, true);

    if (urlp.pathname == '/message' && req.method == 'GET') {
        // holder for rest update
    } else {
        console.log('file request: ' + urlp.path);

        // give dashboard
        fileServer.serve(req, res, function (err, result) {
            if (err) console.log('fileServer error: ',err);
        });

    }

}

io.sockets.on('connection', function (socket) {

    // new authed connection, send loginValid to client
    socket.emit('loginValid', {});

    // get all from s
    db.collection('hosts', function (err, collection) {
        collection.find({}).sort({'host':1}).toArray(function (err, docs) {
            socket.emit('hosts', docs);
        });
    });

    socket.on('showLog', function (data) {

        db.collection('messages', function (err, collection) {
            collection.find({host:data.host}).sort({'_id':-1}).toArray(function (err, docs) {
                socket.emit('messages', docs);
            });
        });

    });

    socket.on('deleteOne', function (data) {
        // delete a host
        console.log('removing '+data.host);

        db.collection('messages', function (err, collection) {
            collection.remove({host:data.host}, function (err, result) {
                if (err) console.log('remove error: ',err);
            });
        });

        db.collection('hosts', function (err, collection) {
            collection.remove({host:data.host}, function (err, result) {
                if (err) console.log('remove error: ',err);
            });
        });
    });

});

io.set('authorization', function (handshakeData, accept) {

    console.log('dashboard login ' + handshakeData.query.key);
    if (handshakeData.query.key == config.key) {
        accept(null, true);
    } else {
        accept('incorrect key', false);
    }

});
