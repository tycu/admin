'use strict'

var async = require("async")
var request = require('request')
var redisKeys = require('./redis-keys')

var gcloud = require('gcloud')({
    'projectId': 'tally-us',
    'keyFilename': 'tally-admin-service-account.json'
})

var baseImageUrl = 'https://tally.imgix.net'

module.exports = function(app, redis) {
    var entities = require('./entities')(redis)
    var appData = require('./app-data')

    app.post('/upload-image', function(req, res) {
        var fileTypeExtensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png'
        }

        var extension = fileTypeExtensions[req.query.fileType]
        if (!extension) {
            res.sendStatus(400)
            return
        }

        var fileName = entities.generateIden() + extension

        var bucket = gcloud.storage().bucket('static.tally.us');
        var file = bucket.file('images/' + fileName);

        req.pipe(file.createWriteStream({
            'metadata': {
                'contentType': req.query.fileType
            }
        })).on('error', function(e) {
            res.sendStatus(500)
        }).on('finish', function() {
            res.status(200).json({
                'imageUrl': baseImageUrl + '/images/' + fileName
            })
        })
    })

    app.post('/send-push-notification', function(req, res) {
        if (!req.body.message) {
            res.sendStatus(400)
            return
        }

        var notification = {
            'body': req.body.message,
            'sound': 'default',
            'badge': 1
        }

        var data = {
            'event': req.body.event
        }

        request.post({
            'url': 'https://gcm-http.googleapis.com/gcm/send',
            'headers': {
                'Content-Type': 'application/json',
                'Authorization':'key=AIzaSyAi9zkqOdTo0YrX9HI-SH3ZQ_Y4SIdtdGo'
            },
            'json': {
                'to': '/topics/broadcasts',
                'priority': 'high',
                'notification': notification,
                'data': data
            }
        }, function(err, _, body) {
            if (err) {
                res.sendStatus(500)
            } else {
                console.log('gcm success', body)
                res.json({})
            }
        })
    })

    app.post('/get-contribution-report', function(req, res) {
        if (!req.body.date) {
            res.sendStatus(400)
            return
        }

        var date = new Date(req.body.date * 1000)

        var dates = []
        for (var i = 0; i < 8; i++) {
            var day = date.getUTCDay()
            while (date.getUTCDay() == day) {
                date.setTime(date.getTime() - (60 * 60 * 1000))
            }
            date.setUTCHours(0, 0, 0, 0)
            if (i > 0) {
                dates.push(date / 1000)
            }
        }

        var tasks = []
        dates.forEach(function(date) {
            tasks.push(function(callback) {
                redis.lrange(redisKeys.contributionsOnDay(date), 0, -1, function(err, reply) {
                    callback(err, reply)
                })
            })
        })

        async.parallel(tasks, function(err, results) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                var tasks = []
                results.forEach(function(result) {
                    tasks.push(function(callback) {
                        if (result.length > 0) {
                            entities.getContributions(result, function(err, contributions) {
                                callback(err, contributions)
                            })
                        } else {
                            callback(null, [])
                        }
                    })
                })

                async.parallel(tasks, function(err, results) {
                    if (err) {
                        console.error(err)
                        res.sendStatus(500)
                    } else {
                        var report = {}
                        for (var i = 0; i < dates.length; i++) {
                            report[dates[i]] = results[i]
                        }
                        res.json(report)
                    }
                })
            }
        })
    })

    app.post('/set-pinned-event', function(req, res) {
        if (!req.body.event) {
            res.sendStatus(400)
            return
        }

        redis.set(redisKeys.pinnedEventIden, req.body.event, function(err, reply) {
            if (err) {
                res.sendStatus(500)
            } else {
                res.json({})
                appData.generate()
            }
        })
    })

    app.post('/list-politicians', function(req, res) {
        entities.listPoliticians(function(err, politicians) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                res.json({
                    'politicians': politicians
                })
            }
        })
    })

    app.post('/get-politician', function(req, res) {
        entities.getPolitician(req.body.iden, function(err, politician) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (politician) {
                res.json(politician)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.post('/create-politician', function(req, res) {
        if (req.body.iden) {
            res.send(400).json({
                'error': {
                    'message': 'Unexpected iden property found on entity.'
                }
            })
            return
        }

        var politician = req.body

        var now = Date.now() / 1000
        politician.created = now
        politician.modified = now
        politician.iden = entities.generateIden()

        if (!isValidPolitician(politician)) {
            res.sendStatus(400)
            return
        }

        redis.hset(redisKeys.politicians, politician.iden, JSON.stringify(politician), function(err, reply) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                res.json(politician)
            }
        })
    })

    app.post('/update-politician', function(req, res) {
        entities.getPolitician(req.body.iden, function(err, politician) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (politician) {
                if (politician.iden != req.body.iden) {
                    res.sendStatus(400)
                    return
                }
                if (!isValidPolitician(req.body)) {
                    res.sendStatus(400)
                    return
                }

                var now = Date.now() / 1000
                req.body.modified = now

                redis.hset(redisKeys.politicians, req.body.iden, JSON.stringify(req.body), function(err, reply) {
                    if (err) {
                        console.error(err)
                        res.sendStatus(500)
                    } else {
                        res.json(req.body)
                        appData.generate()
                    }
                })
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.post('/list-events', function(req, res) {
        entities.listEvents(function(err, events) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                res.json({
                    'events': events
                })
            }
        })
    })

    app.post('/get-event', function(req, res) {
        entities.getEvent(req.body.iden, function(err, event) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (event) {
                res.json(event)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.post('/create-event', function(req, res) {
        if (req.body.iden) {
            res.send(400).json({
                'error': {
                    'message': 'Unexpected iden property found on entity.'
                }
            })
            return
        }

        var event = req.body

        var now = Date.now() / 1000
        event.created = now
        event.modified = now
        event.iden = entities.generateIden()

        if (!isValidEvent(event)) {
            res.sendStatus(400)
            return
        }

        var tasks = []
        tasks.push(function(callback) {
            redis.hset(redisKeys.events, event.iden, JSON.stringify(event), function(err, reply) {
                callback(err, reply)
            })
        })
        tasks.push(function(callback) {
            redis.lpush(redisKeys.reverseChronologicalEvents, event.iden, function(err, reply) {
                callback(err, reply)
            })
        })

        async.series(tasks, function(err, results) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                res.json(event)
                appData.generate()
            }
        })
    })

    app.post('/update-event', function(req, res) {
        entities.getEvent(req.body.iden, function(err, event) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (event) {
                if (event.iden != req.body.iden) {
                    res.sendStatus(400)
                    return
                }
                if (!isValidEvent(req.body)) {
                    res.sendStatus(400)
                    return
                }

                var doUpdate = function() {
                    var now = Date.now() / 1000
                    req.body.modified = now

                    redis.hset(redisKeys.events, req.body.iden, JSON.stringify(req.body), function(err, reply) {
                        if (err) {
                            console.error(err)
                            res.sendStatus(500)
                        } else {
                            res.json(req.body)
                            appData.generate()
                        }
                    })
                }

                if (event.draft && !req.body.draft) { // Publishing this event
                    var tasks = []
                    tasks.push(function(callback) {
                        redis.lrem(redisKeys.reverseChronologicalEvents, 1, event.iden, function(err, reply) {
                            callback(err, reply)
                        })
                    })
                    tasks.push(function(callback) {
                        redis.lpush(redisKeys.reverseChronologicalEvents, event.iden, function(err, reply) {
                            callback(err, reply)
                        })
                    })

                    async.series(tasks, function(err, results) {
                        if (err) {
                            console.error(err)
                            res.sendStatus(500)
                        } else {
                            doUpdate()
                        }
                    })
                } else {
                    doUpdate()
                }
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.post('/list-pacs', function(req, res) {
        entities.listPacs(function(err, pacs) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                res.json({
                    'pacs': pacs
                })
            }
        })
    })

    app.post('/get-pac', function(req, res) {
        entities.getPac(req.body.iden, function(err, pac) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (pac) {
                res.json(pac)
            } else {
                res.sendStatus(404)
            }
        })
    })

    app.post('/create-pac', function(req, res) {
        if (req.body.iden) {
            res.send(400).json({
                'error': {
                    'message': 'Unexpected iden property found on entity.'
                }
            })
            return
        }

        var pac = req.body

        var now = Date.now() / 1000
        pac.created = now
        pac.modified = now
        pac.iden = entities.generateIden()

        if (!isValidPac(pac)) {
            res.sendStatus(400)
            return
        }

        redis.hset(redisKeys.pacs, pac.iden, JSON.stringify(pac), function(err, reply) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else {
                res.json(pac)
            }
        })
    })

    app.post('/update-pac', function(req, res) {
        entities.getPac(req.body.iden, function(err, pac) {
            if (err) {
                console.error(err)
                res.sendStatus(500)
            } else if (pac) {
                if (pac.iden != req.body.iden) {
                    res.sendStatus(400)
                    return
                }
                if (!isValidPac(req.body)) {
                    res.sendStatus(400)
                    return
                }

                var now = Date.now() / 1000
                req.body.modified = now

                redis.hset(redisKeys.pacs, req.body.iden, JSON.stringify(req.body), function(err, reply) {
                    if (err) {
                        console.error(err)
                        res.sendStatus(500)
                    } else {
                        res.json(req.body)
                        appData.generate()
                    }
                })
            } else {
                res.sendStatus(404)
            }
        })
    })
}

var isValidEntity = function(entity) {
    return entity.iden && entity.created && entity.modified
}

var isValidPolitician = function(politician) {
    if (!isValidEntity(politician)) {
        return false
    }
    if (politician.thumbnailUrl && politician.thumbnailUrl.indexOf(baseImageUrl) != 0) {
        return false
    }
    return true
}

var isValidEvent = function(event) {
    if (!isValidEntity(event)) {
        return false
    }
    return true
}

var isValidPac = function(pac) {
    if (!isValidEntity(pac)) {
        return false
    }
    return true
}
