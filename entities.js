'use strict'

var async = require("async")
var redisKeys = require('./redis-keys')

module.exports = function(redis) {
    var entities = {}

    entities.getPolitician = function(iden, callback) {
        redis.hget(redisKeys.politicians, iden, function(err, reply) {
            if (err) {
                callback(err)
            } else if (reply) {
                callback(null, JSON.parse(reply))
            } else {
                callback()
            }
        })
    }

    entities.listPoliticians = function(callback) {
        redis.hgetall(redisKeys.politicians, function(err, reply) {
            if (err) {
                callabck(err)
            } else {
                var politicians = []
                if (reply) {
                    Object.keys(reply).forEach(function(iden) {
                        politicians.push(JSON.parse(reply[iden]))
                    })
                }

                callback(null, sortByName(politicians))
            }
        })
    }

    entities.getPac = function(iden, callback) {
        redis.hget(redisKeys.pacs, iden, function(err, reply) {
            if (err) {
                callback(err)
            } else if (reply) {
                callback(null, JSON.parse(reply))
            } else {
                callback()
            }
        })
    }

    entities.listPacs = function(callback) {
        redis.hgetall(redisKeys.pacs, function(err, reply) {
            if (err) {
                callabck(err)
            } else {
                var pacs = []
                if (reply) {
                    Object.keys(reply).forEach(function(iden) {
                        pacs.push(JSON.parse(reply[iden]))
                    })
                }

                callback(null, sortByName(pacs))
            }
        })
    }

    entities.getEvent = function(iden, callback) {
        entities.getEvents([iden], function(err, events) {
            if (err) {
                callback(err)
            } else if (events.length > 0) {
                callback(null, events[0])
            } else {
                callback()
            }
        })
    }

    entities.getEvents = function(idens, callback) {
        redis.hmget(redisKeys.events, idens, function(err, reply) {
            if (err) {
                callback(err)
            } else {
                var tasks = []
                reply.forEach(function(json) {
                    tasks.push(function(callback) {
                        var event = JSON.parse(json)

                        redis.hgetall(redisKeys.eventContributionTotals(event.iden), function(err, reply) {
                            if (err) {
                                callback(err)
                            } else {
                                event.supportTotal = reply && reply.support && parseInt(reply.support) || 0
                                event.opposeTotal = reply && reply.oppose && parseInt(reply.oppose) || 0
                                callback(null, event)
                            }
                        })
                    })
                })

                async.parallel(tasks, function(err, results) {
                    if (err) {
                        callback(err)
                    } else {
                        callback(null, results)
                    }
                })
            }
        })
    }

    entities.listEvents = function(callback) {
        redis.lrange(redisKeys.reverseChronologicalEvents, 0, -1, function(err, reply) {
            if (err) {
                callback(err)
            } else {
                entities.getEvents(reply, function(err, events) {
                    if (err) {
                        callback(err)
                    } else {
                        callback(null, events)
                    }
                })
            }
        })
    }

    entities.getContribution = function(iden, callback) {
        entities.getContributions([iden], function(err, contributions) {
            if (err) {
                callback(err)
            } else if (contributions.length > 0) {
                callback(null, contributions[0])
            } else {
                callback()
            }
        })
    }

    entities.getContributions = function(idens, callback) {
        redis.hmget(redisKeys.contributions, idens, function(err, reply) {
            if (err) {
                callback(err)
            } else {
                var contributions = []

                var tasks = []
                reply.forEach(function(json) {
                    var contribution = JSON.parse(json)
                    contributions.push(contribution)

                    tasks.push(function(callback) {
                        entities.getEvent(contribution.event, function(err, event) {
                            if (err) {
                                callback(err)
                            } else {
                                delete event.supportPacs
                                delete event.opposePacs

                                contribution.event = event

                                entities.getPolitician(event.politician, function(err, politician) {
                                    event.politician = politician
                                    callback(err)
                                })
                            }
                        })
                    })
                    tasks.push(function(callback) {
                        entities.getPac(contribution.pac, function(err, pac) {
                            contribution.pac = pac
                            callback(err)
                        })
                    })
                })
                
                async.parallel(tasks, function(err, results) {
                    if (err) {
                        callback(err)
                    } else {
                        callback(null, contributions)
                    }
                })
            }
        })
    }

    entities.listUserContributions = function(iden, callback) {
        redis.lrange(redisKeys.userReverseChronologicalContributions(iden), 0, -1, function(err, reply) {
            if (err) {
                callback(err)
            } else {
                entities.getContributions(reply, function(err, contributions) {
                    callback(err, contributions)
                })
            }
        })
    }

    return entities
}

var sortByName = function(items) {
    return items.sort(function(a, b) {
        if (a.name > b.name) {
            return 1
        } else if (a.name < b.name) {
            return -1
        } else {
            return 0
        }
    })
}
