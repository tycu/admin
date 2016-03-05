'use strict'

var async = require("async")
var redisKeys = require('./redis-keys')

var redis
if (process.env.REDISCLOUD_URL) {
    redis = require("redis").createClient(process.env.REDISCLOUD_URL, { 'no_ready_check': true })
} else {
    redis = require("redis").createClient()
}

var gcloud = require('gcloud')({
    'projectId': 'tally-us',
    'keyFilename': 'tally-admin-service-account.json'
})

module.exports = function() {
    var entities = require('./entities')(redis)

    var generator = {}
    generator.generateAppData = function() {
        if (!generator.generatingAppData) {
            generator.generatingAppData = true
            generator.pendingGenerateAppData = false
            _generateAppData(function(err) {
                if (err) {
                    console.error('generating static app data failed')
                    console.error(err)
                } else {
                    console.log('static app data generated')
                }

                generator.generatingAppData = false

                if (generator.pendingGenerateAppData) {
                    generator.generateAppData()
                }
            })
        } else {
            generator.pendingGenerateAppData = true
        }
    }

    var _generateAppData = function(callback) {
        var tasks = []
        tasks.push(function(callback) {
            entities.listPoliticians(function(err, politicians) {
                if (err) {
                    callback(err)
                } else {
                    var tasks = []
                    politicians.forEach(function(politician) {
                        tasks.push(function(callback) {
                            redis.hgetall(redisKeys.politicianDonationTotals(politician.iden), function(err, reply) {
                                if (err) {
                                    callback(err)
                                } else {
                                    politician.supportTotal = reply && reply.support && parseInt(reply.support) || 0
                                    politician.opposeTotal = reply && reply.oppose && parseInt(reply.oppose) || 0
                                    callback()
                                }
                            })
                        })
                    })

                    async.parallel(tasks, function(err, results) {
                        callback(err, politicians)
                    })
                }
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

            var politicians = results[0]
            var events = results[1]

            var politicianMap = {}
            politicians.forEach(function(politician) {
                politicianMap[politician.iden] = politician
            })

            var pacs = {}
            results[2].forEach(function(pac) {
                pacs[pac.iden] = pac
            })

            events.forEach(function(event) {
                if (event.politician) {
                    var politician = politicianMap[event.politician]
                    event.politician = {
                        'iden': politician.iden,
                        'name': politician.name,
                        'jobTitle': politician.jobTitle,
                        'thumbnailUrl': politician.thumbnailUrl
                    }
                }

                if (event.supportPacs) {
                    var supportPacs = []
                    event.supportPacs.forEach(function(pacIden) {
                        var pac = pacs[pacIden]
                        if (pac) {
                            supportPacs.push({
                                'iden': pac.iden,
                                'name': pac.name,
                                'description': pac.description,
                                'color': pac.color
                            })
                        }
                    })
                    event.supportPacs = supportPacs
                }

                if (event.opposePacs) {
                    var opposePacs = []
                    event.opposePacs.forEach(function(pacIden) {
                        var pac = pacs[pacIden]
                        if (pac) {
                            opposePacs.push({
                                'iden': pac.iden,
                                'name': pac.name,
                                'description': pac.description,
                                'color': pac.color
                            })
                        }
                    })
                    event.opposePacs = opposePacs
                }
            })

            var bucket = gcloud.storage().bucket('generated.tally.us');

            var tasks = []
            tasks.push(function(callback) {
                writeFile(bucket.file('v1/events/recent.json'), {
                    'events': events
                }, function(err) {
                    callback(err)
                })
            })
            tasks.push(function(callback) {
                var sorted = events.slice().sort(function(a, b) {
                    var donationsDiff = (b.supportTotal + b.opposeTotal) - (a.supportTotal + a.opposeTotal)
                    if (donationsDiff == 0) {
                        return b.created - a.created
                    } else {
                        return donationsDiff
                    }
                })

                writeFile(bucket.file('v1/events/top.json'), {
                    'events': sorted
                }, function(err) {
                    callback(err)
                })
            })
            tasks.push(function(callback) {
                var sorted = politicians.slice().sort(function(a, b) {
                    return (b.supportTotal + b.opposeTotal) - (a.supportTotal + a.opposeTotal)
                })

                var publicData = []
                sorted.forEach(function(politician) {
                    publicData.push({
                        'iden': politician.iden,
                        'name': politician.name,
                        'jobTitle': politician.jobTitle,
                        'thumbnailUrl': politician.thumbnailUrl,
                        'supportTotal': politician.supportTotal,
                        'opposeTotal': politician.opposeTotal
                    })
                })

                writeFile(bucket.file('v1/scoreboards/all-time.json'), {
                    'politicians': publicData
                }, function(err) {
                    callback(err)
                })
            })

            async.parallel(tasks, function(err, results) {
                if (err) {
                    callback(err)
                } else {
                    callback()
                }
            })
        })
    }

    generator.generateWebsite = function(callback) {
        setTimeout(function() {
            callback()
        }, 10000)
    }

    return generator
}

var writeFile = function(file, json, callback) {
    var stream = new require('stream').Readable()
    stream._read = function(){};
    stream.push(JSON.stringify(json))
    stream.push(null)

    stream.pipe(file.createWriteStream({
        'gzip': true,
        'metadata': {
            'contentType': 'application/json',
            'cacheControl': 'no-cache'
        }
    })).on('error', function(err) {
        callback(err)
    }).on('finish', function() {
        callback()
    })
}
