module.exports = (new function() {
    var queue = {};
    var id_to_timestamp = {};
    var lastUpdate = 0;
    var currentId = 0;
    var scopeData = {};

    this.modifyScopeData = function(key, value) {
        if(value == undefined) {
            delete scopeData[key];
        } else {
            scopeData[key] = value;
        }
    }

    this.add = function(timestamp, session, func) {
        if(timestamp < new Date().getTime()) return null;

        var id = currentId++;
        id_to_timestamp[id] = timestamp;

        if(queue[timestamp] == undefined) queue[timestamp] = [];
        queue[timestamp].push({
            session: session,
            func: func,
            id: id
        });
        return id;
    }

    this.remove = function(id) {
        if(id_to_timestamp == undefined) return false;

        var timestamp = id_to_timestamp[id];
        for(var i in queue[timestamp]) {
            if(queue[timestamp][i].id == id) {
                delete queue[timestamp][i];
                return true;
            }
        }
        return false;
    }

    this.update = function(timestamp) {
        var upNext = Object.keys(queue).filter(function(value) {
            return (value <= timestamp) && (value > lastUpdate);
        });
        upNext.sort(function(a,b) {
            return a-b;
        });
        for(var events in upNext) {
            queue[upNext[events]].forEach(function(e) {
                e.func.call(scopeData, e.session);
                delete id_to_timestamp[e.id];
            });
            delete queue[upNext[events]];
        }

        lastUpdate = timestamp;
    }
});
