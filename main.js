//PACKAGES FROM NPM
var TeamSpeakClient = require("node-teamspeak");
var async = require('async');

//MODULES
var Funcs = require('./classes/functions.js');

//SINGLETONS
global.SessionManager = require('./classes/sessionmanager.js');
global.Config = require('./classes/config.js');
global.LanguageManager = require('./classes/languagemanager.js');
global.EventQueue = require('./classes/eventqueue.js');

//INITIALIZATION
global.Config.loadFile("config.json");
global.SessionManager.init();
global.LanguageManager.init();

//GLOBAL VARIABLES
var C = global.Config;
var L = global.LanguageManager;
var S = global.SessionManager;
var cl = new TeamSpeakClient(
    C.getKey("serverquery", "address"),
    C.getKey("serverquery", "port")
);

var my_clientid;
var clid_dbid_map = {};

//MAIN PROGRAM
async.series([
    function(callback) {
        cl.send('login', {
            client_login_name: C.getKey("serverquery", "name"),
            client_login_password: C.getKey("serverquery", "password")
        }, function(err, response) {
            callback(err);
        });
    },
    function(callback) {
        cl.send('use', {
            sid: 1
        }, function(err, response) {
            callback(err);
        });
    },
    function(callback) {
        cl.send('clientupdate', {
            client_nickname: 'Admin Bot'
        }, function(err, response) {
            callback(err);
		});
    },
    function(callback) {
        cl.send('whoami', {}, function(err, response) {
            my_clientid = response.client_id;
            callback(err);
		});
    },
    function(callback) {
        cl.send('servernotifyregister', {
            'event': 'textprivate'
        }, function(err, response) {
            callback(err);
        });
    },
    function(callback) {
        cl.send('servernotifyregister', {
            'event': 'server'
        }, function(err, response) {
            callback(err);
        });
    },
    function(callback) {
        cl.send('clientlist', function(err, resp) {
            if(!isArray(resp)) resp = [resp]; //fix api inconsistencies

            resp.forEach(function(e) {
                init_user(e);
            });
            callback(err);
        });
    }
], function(err) {
    if(err == null) {
        //console.log(C.getKey("languages", "files"));
        global.EventQueue.modifyScopeData("ts_cl", cl);

        setInterval(update, C.getKey("settings", "update_interval"));
    } else {
        console.log("An error occured", err);
    }
});

cl.on('textmessage', function(evt) {
    if(evt.invokerid == my_clientid) return;
    console.log(evt.msg);

    S.getSession(clid_dbid_map[evt.invokerid], function(session) {
        Funcs.parseInput(session, cl, evt.msg);
    });
});

cl.on('cliententerview', function(evt) {
    init_user(evt);
});

cl.on('clientleftview', function(evt) {
	var cldbid = clid_dbid_map[evt.clid];
    S.destroySession(cldbid);
});

function update() {
    var time = (new Date()).getTime();

    cl.send('clientlist', function(err, resp) {
        if(!isArray(resp)) resp = [resp]; //fix api inconsistencies

        /*clid_dbid_map = {}
        resp.forEach(function(e) {
            clid_dbid_map[e.clid] = e.client_database_id;
        });*/
    });
    global.EventQueue.update(time)
}

function init_user(evt) {
    clid_dbid_map[evt.clid] = evt.client_database_id;

    S.getSession(evt.client_database_id, function(session) {
        //setup default session settings
        if(!session.isDefined("lang")) session.storePerm("lang", C.getKey("languages", "default"));
        session.store("clid", evt.clid);

        //greet new people on the server
        cl.send('sendtextmessage', {
            targetmode: 1,
            target: evt.clid,
            msg: L.getKey(C.getKey("languages", "default"), "greeting")
        });
    });
}

function isArray(check) {
    return Object.prototype.toString.call(check) === '[object Array]';
}
