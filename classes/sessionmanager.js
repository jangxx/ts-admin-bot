var sqlite3 = require('sqlite3');
var fs = require('fs');
var async = require('async');

module.exports = (new function() {
    var self = this;
    var C = null, DB = null;
    var sessions = {};

    this.init = function() {
        C = global.Config;
        DB = new sqlite3.Database(C.getKey("sqlite", "file"));
        database_init(DB);
    }

    this.getSession = function(client_dbid, callback) {
        if(sessions[client_dbid] == undefined) {
            initSession(client_dbid, function(session) {
                callback(session);
            });
        } else {
            return callback(sessions[client_dbid])
        }
    }

    this.destroySession = function(client_dbid) {
        if(sessions[client_dbid] != undefined) delete sessions[client_dbid];
    }

    function initSession(client_dbid, callback) {
        if(sessions[client_dbid] != undefined) return self.getSession(client_dbid, callback);
        DB.serialize(function() {
            DB.all("SELECT key,value FROM sessions WHERE cldbid = ?", client_dbid, function(err, rows) {
                if(err != null) {
                    console.log("DB error occured:", err);
                    sessions[client_dbid] = new Session(client_dbid, DB, {});
                    callback(sessions[client_dbid]);
                } else {
                    //console.log("rows:", rows);
                    var data = {};
                    for(var r in rows) {
                        data[rows[r].key] = rows[r].value;
                    }
                    sessions[client_dbid] = new Session(client_dbid, DB, data);
                    callback(sessions[client_dbid]);
                }
            });
        });
    }
});

function Session(client_dbid, db, _data) {
    var data = _data;

    this.getClientDBID = function() {
        return client_dbid;
    }

    this.get = function(key) {
        if(data[key] == undefined) {
            return null;
        } else {
            return data[key];
        }
    }

    this.store = function(key, new_data) {
        data[key] = new_data;
    }

    this.storePerm = function(key, new_data) {
        this.store(key, new_data);
        db.serialize(function() {
            db.run("INSERT OR REPLACE INTO sessions (id, cldbid, key, value) VALUES ((SELECT id FROM sessions WHERE cldbid=? AND key=?), ?,?,?)", [client_dbid, key, client_dbid, key, new_data], function(err) {
                if(err != null) {
                    console.log("DB error occured:", err);
                }
            });
        });
    }

    this.isDefined = function(key) {
        return Object.keys(data).indexOf(key) != -1;
    }
}

function database_init(db) {
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, cldbid INTEGER, [key]  VARCHAR (64), value  VARCHAR (256))", [], function(err) {
            if(err != null) {
                console.log("DB error occured:", err);
            }
        });
    });
}
