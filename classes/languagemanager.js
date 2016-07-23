var fs = require('fs');
var format = require("string-template");

module.exports = (new function() {
    var C = null;
    var languages = {};

    this.init = function() {
        C = global.Config;
        //load all language files
        var files = C.getKey("languages", "files");
        for(var f in files) {
            try {
                var f_content = fs.readFileSync(files[f]);
                var lang = JSON.parse(f_content);
                languages[lang["code"]] = new Language(lang);
            } catch(e) {
                console.log("Error while loading language file " + files[f]);
            }
        }
    }

    this.listLanguages = function() {
        var ret = [];
        for(var i in languages) {
            ret.push({
                code: i,
                name: languages[i].getName()
            });
        }
        return ret;
    }

    this.getLanguage = function(code) {
        if(languages[code] != undefined) {
            return languages[code];
        } else {
            return null;
        }
    }

    this.getKey = function(code, key, templatedata) {
        if(languages[code] != undefined) {
            return languages[code].getKey(key, templatedata);
        } else {
            console.log("Unknown code:", code);
            return "!!UNKNOWN_CODE!!";
        }
    }
});

function Language(data) {
    var name = data["name"];
    var strings = data["strings"];

    this.getName = function() {
        return name;
    }

    this.getKey = function(key, templatedata) {
        if(strings[key] == undefined) {
            return "!!UNKNOWN_KEY!!";
        } else {
            if(templatedata == undefined) {
                return strings[key];
            } else {
                return format(strings[key], templatedata);
            }
        }
    }
}
