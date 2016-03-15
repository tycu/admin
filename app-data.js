'use strict'

var async = require("async")
var fs = require('fs')
var mkdirp = require('mkdirp')
var redisKeys = require('./redis-keys')

var redis
if (process.env.REDISCLOUD_URL) {
    redis = require("redis").createClient(process.env.REDISCLOUD_URL, { 'no_ready_check': true })
} else {
    redis = require("redis").createClient()
}

var entities = require('./entities')(redis)

var gcloud = require('gcloud')({
    'projectId': 'tally-us',
    'keyFilename': 'tally-admin-service-account.json'
})

var generating = false, pending = false
var generate = function(callback) {
    if (!generating) {
        generating= true
        pending = false
        _generate(function(err) {
            if (callback) {
                callback(err)
            } else {
                if (err) {
                    console.error('updating app data failed')
                    console.error(err)
                } else {
                    console.log('app data updated')
                }
            }

            generating = false

            if (generating) {
                generate()
            }
        })
    } else {
        pending = true
    }
}

var _generate = function(callback) {
    var tasks = []
    tasks.push(function(callback) {
        entities.listPoliticians(function(err, politicians) {
            if (err) {
                callback(err)
            } else {
                var tasks = []
                politicians.forEach(function(politician) {
                    tasks.push(function(callback) {
                        redis.hgetall(redisKeys.politicianContributionTotals(politician.iden), function(err, reply) {
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

        var maxEventContributionsTotal = 0

        events.forEach(function(event) {
            if (event.politician) {
                var politician = politicianMap[event.politician]
                event.politician = {
                    'iden': politician.iden,
                    'name': politician.name,
                    'jobTitle': politician.jobTitle,
                    'thumbnailUrl': politician.thumbnailUrl,
                    'twitterUsername': politician.twitterUsername,
                    'barWeight': politician.barWeight
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

            var amount = Math.floor(Math.random() * 1500) // Fake
            var support = Math.random() // Fake
            var oppose = 1 - support // Fake

            event.supportTotal = Math.floor(amount * support) // Fake
            event.opposeTotal = Math.floor(amount * oppose) // Fake

            if (politician) { // Fake
                politician.supportTotal += event.supportTotal // Fake
                politician.opposeTotal += event.opposeTotal // Fake
            }

            maxEventContributionsTotal = Math.max(event.supportTotal + event.opposeTotal, maxEventContributionsTotal)
        })

        events.forEach(function(event) {
            event.barWeight = (event.supportTotal + event.opposeTotal) / maxEventContributionsTotal
        })

        var maxPoliticianContributionTotal = 0
        politicians.forEach(function(politician) {
            maxPoliticianContributionTotal = Math.max(politician.supportTotal + politician.opposeTotal, maxPoliticianContributionTotal)
        })
        politicians.forEach(function(politician) {
            politician.barWeight = (politician.supportTotal + politician.opposeTotal) / maxPoliticianContributionTotal
        })

        var bucket = getBucket()

        var tasks = []
        tasks.push(function(callback) {
            writeFile(bucket.file('drafts/events/recent.json'), JSON.stringify({
                'events': events
            }), function(err) {
                callback(err)
            })
        })
        tasks.push(function(callback) {
            writeFile(bucket.file('v1/events/recent.json'), JSON.stringify({
                'events': events.filter(function(event) {
                    return !event.draft
                })
            }), function(err) {
                callback(err)
            })
        })
        tasks.push(function(callback) {
            var sorted = events.filter(function(event) {
                return !event.draft
            }).sort(function(a, b) {
                var contributionsDiff = (b.supportTotal + b.opposeTotal) - (a.supportTotal + a.opposeTotal)
                if (contributionsDiff == 0) {
                    return b.created - a.created
                } else {
                    return contributionsDiff
                }
            })

            writeFile(bucket.file('v1/events/top.json'), JSON.stringify({
                'events': sorted
            }), function(err) {
                callback(err)
            })
        })
        tasks.push(function(callback) {
            var sorted = politicians.filter(function(politician) {
                return politician.supportTotal + politician.opposeTotal > 0
            }).sort(function(a, b) {
                return (b.supportTotal + b.opposeTotal) - (a.supportTotal + a.opposeTotal)
            })

            var publicData = []
            sorted.forEach(function(politician) {
                publicData.push({
                    'iden': politician.iden,
                    'name': politician.name,
                    'jobTitle': politician.jobTitle,
                    'thumbnailUrl': politician.thumbnailUrl,
                    'twitterUsername': politician.twitterUsername,
                    'supportTotal': politician.supportTotal,
                    'opposeTotal': politician.opposeTotal,
                    'barWeight': politician.barWeight
                })
            })

            writeFile(bucket.file('v1/scoreboards/all-time.json'), JSON.stringify({
                'politicians': publicData
            }), function(err) {
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

var getBucket = function() {
    if (process.env.NODE_ENV == 'production') {
        return gcloud.storage().bucket('generated.tally.us')
    } else {
        return {
            'file': function(path) {
                return {
                    'createWriteStream': function(ignored) {
                        var fullPath = 'generated/' + path
                        mkdirp.sync(fullPath.split('/').slice(0, -1).join('/'))
                        return fs.createWriteStream(fullPath)
                    }
                }
            }
        }
    }
}

var writeFile = function(file, string, callback) {
    var stream = new require('stream').Readable()
    stream._read = function(){}
    stream.push(string)
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

module.exports = {
    'generate': generate
}
