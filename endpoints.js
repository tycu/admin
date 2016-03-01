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

var entities = require('./entities')(redis)
var generator = require('./generator')(entities, gcloud)

var baseImageUrl = 'https://tally.imgix.net'

module.exports = function(app) {
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

        var fileName = generateIden() + extension

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

    app.post('/list-politicians', function(req, res) {
        entities.listPoliticians(function(err, politicians) {
            if (err) {
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
        politician.iden = generateIden()

        if (!isValidPolitician(politician)) {
            res.sendStatus(400)
            return
        }

        redis.hset(redisKeys.politicians, politician.iden, JSON.stringify(politician), function(err, reply) {
            if (err) {
                res.sendStatus(500)
            } else {
                res.json(politician)
            }
        })
    })

    app.post('/update-politician', function(req, res) {
        entities.getPolitician(req.body.iden, function(err, politician) {
            if (err) {
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
                        res.sendStatus(500)
                    } else {
                        res.json(req.body)
                        generator.start()
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
        event.iden = generateIden()

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
                res.sendStatus(500)
            } else {
                res.json(event)
                generator.start()
            }
        })
    })

    app.post('/update-event', function(req, res) {
        entities.getEvent(req.body.iden, function(err, event) {
            if (err) {
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

                var now = Date.now() / 1000
                req.body.modified = now

                redis.hset(redisKeys.events, req.body.iden, JSON.stringify(req.body), function(err, reply) {
                    if (err) {
                        res.sendStatus(500)
                    } else {
                        res.json(req.body)
                        generator.start()
                    }
                })
            } else {
                res.sendStatus(404)
            }
        })
    })
}

var generateIden = function() {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

var isValidIdentity = function(entity) {
    return entity.iden && entity.created && entity.modified
}

var isValidPolitician = function(politician) {
    if (!isValidIdentity(politician)) {
        return false
    }
    if (politician.thumbnailUrl && politician.thumbnailUrl.indexOf(baseImageUrl) != 0) {
        return false
    }
    return true
}

var isValidEvent = function(event) {
    if (!isValidIdentity(event)) {
        return false
    }
    return true
}
