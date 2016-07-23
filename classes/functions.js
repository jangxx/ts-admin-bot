var L = global.LanguageManager;
var pjson = require('../package.json');
var sendmail = require('sendmail')({silent: true});

var funcs = {
    "help": {
        args: [],
        desc: "help_desc",
        func: func_help
    },
    "lang": {
        args: ["code"],
        desc: "lang_desc",
        func: func_lang
    },
    "info": {
        args: [],
        desc: "info_desc",
        func: func_info
    },
    "pokeme": {
        args: ["minutes", "msg"],
        desc: "pokeme_desc",
        func: func_pokeme
    },
    "adminmessage": {
        args: ["msg"],
        desc: "adminmessage_desc",
        func: func_adminmessage
    }
}

module.exports.parseInput = function(session, cl, msg) {
    var L = global.LanguageManager;
    var out = begin_output(cl);

    if(msg.charAt(0) != "!") {
        out.send(L.getKey(session.get("lang"), "invalid_command"));
    } else {
        var cmd = parse_command(msg);
        if(cmd.command != null) {
            funcs[cmd.command].func(session, out, cmd.args);
        } else {
            out.send(L.getKey(session.get("lang"), "invalid_command"));
        }
    }

    out.finalize(session.get("clid"));
}

function parse_command(str) {
    var args = parseArgs(str);
    var args_parsed = {};
    var command = args.shift(); //command is always the first "arg"
    command = command.substr(1); //remove leading '!'

    if(funcs[command] != undefined) {
        var c_a = 0;
        for(var a in funcs[command].args) {
            if(args.length > c_a) {
                args_parsed[funcs[command].args[a]] = args[c_a];
            } else {
                args_parsed[funcs[command].args[a]] = null;
            }
            c_a++;
        }
    } else {
        command = null;
    }

    return {
        command: command,
        args: args_parsed
    };
}

function parseArgs(str) {
	var args = [];
	var currentArg = "";
	var state = 0; //0 = no active arg | 1 = active nonqouted arg | 2 = active quoted arg
	for(i = 0; i < str.length; i++) {
		switch (state) {
			case 0:
				if(str[i] == '"') {
					currentArg = "";
					state = 2;
				} else if(str[i] != " ") {
					currentArg += str[i];
					state = 1;
				} else {
					currentArg = "";
				}
				break;
			case 1:
				if(str[i] != " ") {
					currentArg += str[i];
				} else {
					args.push(currentArg);
					currentArg = "";
					state = 0;
				}
				break;
			case 2:
				if(str[i] != '"') {
					currentArg += str[i];
				} else {
					args.push(currentArg);
					currentArg = "";
					state = 0;
				}
				break;
		}
	}
	if(currentArg != "") args.push(currentArg);
	return args;
}

function begin_output(cl) {
    return new (function(cl) {
        var buffer = "";

        this.send = function() {
            var buf = "";
            for(var i in arguments) {
                buf += arguments[i] + " ";
            }
            buf = buf.trim();
            buf += "\n";
            buffer += buf;
        }

        this.finalize = function(target) {
            if(buffer == "") return;

            cl.send("sendtextmessage", {
                targetmode: 1,
                target: target,
                msg: buffer
            })
        }
    })(cl);
}

function func_help(sesh, out, args) {
    var L = global.LanguageManager;

    out.send(L.getKey(sesh.get("lang"), "help_commandlist"));
    for(var f in funcs) {
        var args = "";
        for(var a in funcs[f].args) {
            args += "[" + funcs[f].args[a] + "] ";
        }
        args = args.trim();

        out.send("!" + f + "\t" + args + "\t" + L.getKey(sesh.get("lang"), funcs[f].desc));
    }
}

function func_lang(sesh, out, args) {
    var L = global.LanguageManager;

    if(args.code == undefined) {
        out.send(L.getKey(sesh.get("lang"), "lang_list"));
        var langs = L.listLanguages();
        langs.forEach(function(e) {
            out.send(e.code + ": " + e.name);
        });
    } else {
        if(L.getLanguage(args.code) != null) {
            sesh.storePerm("lang", args.code);
            out.send(L.getKey(sesh.get("lang"), "lang_changed"));
        } else {
            out.send(L.getKey(sesh.get("lang"), "lang_invalid"));
        }
    }
}

function func_info(sesh, out, args) {
    out.send("Version: " + pjson.version);
    out.send("GitHub: " + pjson.repository.url);
}

function func_pokeme(sesh, out, args) {
    var L = global.LanguageManager;

    var time = (args.minutes != null) ? Number(args.minutes) : 0;
    time = (time != NaN || time < 0) ? time : 0;
    time *= 60000; //convert minutes to milliseconds

    var msg = (args.msg != null) ? args.msg : "";

    if(time != 0) {
        out.send(L.getKey(sesh.get("lang"), "pokeme_message", {minutes: time/60000}))
    }

    global.EventQueue.add(
        (new Date()).getTime() + time,
        sesh,
        function(session) {
            var cl = this.ts_cl;

            cl.send('clientpoke', {
                clid: session.get("clid"),
                msg: msg
            }, function(err, response) {

            });
        });
}

function func_adminmessage(sesh, out, args) {
    var L = global.LanguageManager;

    if(args.msg == null) {
        out.send(L.getKey(sesh.get("lang"), "required_param", {param: "msg"}));
        return;
    } else {
        sendmail({
            from: "adminmessage@jangxx.com",
            to: "gamezocker95@gmail.com",
            subject: "Admin message",
            content: args.msg
        }, function(err, reply) {
            if(err) {
                console.log(err);
            }
        });

        out.send(L.getKey(sesh.get("lang"), "adminmessage_sent"));
    }
}
