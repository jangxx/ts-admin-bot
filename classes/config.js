var fs = require('fs');

var default_config = {
    serverquery : {
        address: "localhost",
        port: 10011
    },
    languages: {
        default: "en",
        files: ["lang_en.json"]
    },
    settings: {
        update_interval: 1000
    },
    sqlite: {
        file: "ts_admin_bot.sqlite"
    }
}

module.exports = (new function() {
    var config = default_config;

    function mergeObjects(obj, extension) {
        var ret = obj;
        for(var key in extension) {
            if(obj[key] == undefined || typeof obj[key] == 'string') {
                obj[key] = extension[key];
            } else {
                obj[key] = mergeObjects(obj[key], extension[key]);
            }
        }
        return ret;
    }

    this.loadFile = function(file) {
        var file_content = fs.readFileSync(file);
        var parsed_file;
        try {
            parsed_file = JSON.parse(file_content)
        } catch(e) {
            parsed_file = {};
        }
        config = mergeObjects(config, parsed_file);
    }

    this.getKey = function() {
        var ret = config;
        if(arguments.length > 0) {
            for(var i in arguments) {
                if(ret[arguments[i]] != undefined) {
                    ret = ret[arguments[i]];
                } else {
                    return null;
                }
            }
            return ret;
        } else {
            return null;
        }
    }
});
