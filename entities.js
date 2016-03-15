'use strict'

var async = require("async")
var redisKeys = require('./redis-keys')

module.exports = function(redis) {
    var entities = {}

    entities.generateIden = function() {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    }

    entities.getPolitician = function(iden, callback) {
        entities.getPoliticians([iden], function(err, politicians) {
            if (err) {
                callback(err)
            } else if (politicians.length > 0) {
                callback(null, politicians[0])
            } else {
                callback()
            }
        })
    }

    entities.getPoliticians = function(idens, callback) {
        redis.hmget(redisKeys.politicians, idens, function(err, reply) {
            if (err) {
                callback(err)
            } else if (reply) {
                var pacs = []
                reply.forEach(function(json) {
                    pacs.push(JSON.parse(reply))
                })
                callback(null, pacs)
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
        entities.getPacs([iden], function(err, pacs) {
            if (err) {
                callback(err)
            } else if (pacs.length > 0) {
                callback(null, pacs[0])
            } else {
                callback()
            }
        })
    }

    entities.getPacs = function(idens, callback) {
        redis.hmget(redisKeys.pacs, idens, function(err, reply) {
            if (err) {
                callback(err)
            } else if (reply) {
                var pacs = []
                reply.forEach(function(json) {
                    pacs.push(JSON.parse(reply))
                })
                callback(null, pacs)
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
                if (reply.length == 0) {
                    callback()
                    return
                }

                var contributions = []
                reply.forEach(function(json) {
                    var contribution = JSON.parse(json)
                    contributions.push(contribution)
                })

                // After getting all the contributions we need to look up the events and pacs

                var eventIdens = [], pacIdens = []
                contributions.forEach(function(contribution) {
                    eventIdens.push(contribution.event)
                    pacIdens.push(contribution.pac)
                })

                var tasks = []
                tasks.push(function(callback) {
                    entities.getEvents(eventIdens, function(err, events) {
                        if (err) {
                            callback(err)
                        } else {
                            var eventsMap = mapifyEntities(events)

                            var politicianIdens = []
                            events.forEach(function(event) {
                                politicianIdens.push(event.politician)
                            })

                            entities.getPoliticians(politicianIdens, function(err, politicians) {
                                var politiciansMap = mapifyEntities(politicians)

                                events.forEach(function(event) {
                                    event.politician = politiciansMap[event.politician]
                                })

                                contributions.forEach(function(contribution) {
                                    contribution.event = eventsMap[contribution.event]
                                })

                                callback()
                            })
                        }
                    })
                })
                tasks.push(function(callback) {
                    entities.getPacs(pacIdens, function(err, pacs) {
                        if (err) {
                            callback(err)
                        } else {
                            var pacsMap = mapifyEntities(pacs)

                            contributions.forEach(function(contribution) {
                                contribution.pac = pacsMap[contribution.pac]
                            })

                            callback()
                        }
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
                if (reply.length > 0) {
                    entities.getContributions(reply, function(err, contributions) {
                        callback(err, contributions)
                    })
                } else {
                    callback(null, [])
                }
            }
        })
    }

    return entities
}

var sortByName = function(entities) {
    return entities.sort(function(a, b) {
        if (a.name > b.name) {
            return 1
        } else if (a.name < b.name) {
            return -1
        } else {
            return 0
        }
    })
}

var mapifyEntities = function(entities) {
    var map = {}
    entities.forEach(function(entity) {
        map[entity.iden] = entity
    })
    return map
}
