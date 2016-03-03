'use strict'

var async = require("async")

module.exports = function(entities, gcloud) {
    var generator = {}
    generator.start = function() {
        if (!generator.started) {
            generator.started = true
            generator.pending = false
            generate(function(success) {
                if (!success) {
                    console.error('updating static app data failed')
                } else {
                    console.log('static app data updated')
                }

                generator.started = false

                if (generator.pending) {
                    generator.start()
                }
            })
        } else {
            generator.pending = true
        }
    }

    var generate = function(callback) {
        var tasks = []
        tasks.push(function(callback) {
            entities.listPoliticians(function(err, politicians) {
                callback(err, politicians)
            })
        })
        tasks.push(function(callback) {
            entities.listEvents(function(err, events) {
                callback(err, events)
            })
        })
        tasks.push(function(callback) {
            entities.listPacs(function(err, pacs) {
                callback(err, pacs)
            })
        })

        async.parallel(tasks, function(err, results) {
            if (err) {
                callback(false)
                return
            }

            var politicians = {}
            results[0].forEach(function(politician) {
                politicians[politician.iden] = politician
            })

            var events = results[1]

            var pacs = {}
            results[2].forEach(function(pac) {
                pacs[pac.iden] = pac
            })

            events.forEach(function(event) {
                if (event.politician) {
                    event.politician = politicians[event.politician]
                }
                
                if (event.supportPacs) {
                    var supportPacs = []
                    event.supportPacs.forEach(function(pacIden) {
                        var pac = pacs[pacIden]
                        if (pac) {
                            supportPacs.push(pac)
                        }
                    })
                    event.supportPacs = supportPacs
                }

                if (event.opposePacs) {
                    var opposePacs = []
                    event.opposePacs.forEach(function(pacIden) {
                        var pac = pacs[pacIden]
                        if (pac) {
                            opposePacs.push(pac)
                        }
                    })
                    event.opposePacs = opposePacs
                }
            })

            var bucket = gcloud.storage().bucket('generated.tally.us');
            var file = bucket.file('v1/events/recent.json');

            var stream = new require('stream').Readable()
            stream._read = function(){};
            stream.push(JSON.stringify({
                'events': events
            }))
            stream.push(null)

            stream.pipe(file.createWriteStream({
                'gzip': true,
                'metadata': {
                    'contentType': 'application/json',
                    'cacheControl': 'no-cache'
                }
            })).on('error', function(e) {
                callback(false)
            }).on('finish', function() {
                callback(true)
            })
        })
    }

    return generator
}
