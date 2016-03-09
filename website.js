'use strict'

var async = require("async")
var fs = require('fs')
var mkdirp = require('mkdirp')
var request = require('request')
var mustache = require('mustache')

var gcloud = require('gcloud')({
    'projectId': 'tally-us',
    'keyFilename': 'tally-admin-service-account.json'
})

var generate = function(callback) {
    var tasks = []
    tasks.push(function(callback) {
        getAppData('v1/events/recent.json', function(err, data) {
            callback(err, data)
        })
    })
    tasks.push(function(callback) {
        getAppData('v1/events/top.json', function(err, data) {
            callback(err, data)
        })
    })
    tasks.push(function(callback) {
        getAppData('v1/scoreboards/all-time.json', function(err, data) {
            callback(err, data)
        })
    })

    async.parallel(tasks, function(err, results) {
        if (err) {
            callback(err)
        } else {
            _generate(results, function(err) {
                callback(err)
            })
        }
    })
}

var _generate = function(data, callback) {
    var bucket = getBucket()
    
    var tasks = []
    tasks.push(function(callback) {
        var indexTemplate = fs.readFileSync('www/index.html', 'utf8')
        writeFile(bucket.file('index.html'), mustache.render(indexTemplate), function(err) {
            callback(err)
        })
    })
    tasks.push(function(callback) {
        var topEventsTemplate = fs.readFileSync('www/events/top.html', 'utf8')
        writeFile(bucket.file('events/top.html'), mustache.render(topEventsTemplate), function(err) {
            callback(err)
        })
    })
    tasks.push(function(callback) {
        var allTimeScoreboardTemplate = fs.readFileSync('www/scoreboards/all-time.html', 'utf8')
        writeFile(bucket.file('scoreboards/all-time.html'), mustache.render(allTimeScoreboardTemplate), function(err) {
            callback(err)
        })
    })
    tasks.push(function(callback) {
        writeFile(bucket.file('styles.css'), fs.readFileSync('www/styles.css', 'utf8'), function(err) {
            callback(err)
        })
    })

    async.parallel(tasks, function(err, results) {
        callback(err)
    })
}

var getAppData = function(name, callback) {
    if (process.env.NODE_ENV == 'production') {
        request('https://generated.tally.us/' + name, function(err, response, body) {
            if (err) {
                callback(err)
            } else {
                try {
                    callback(null, JSON.parse(body))
                } catch (e) {
                    callback(e)
                }
            }
        })
    } else {
        fs.readFile('generated/' + name, 'utf8', function(err, body) {
            if (err) {
                callback(err)
            } else {
                try {
                    callback(null, JSON.parse(body))
                } catch (e) {
                    callback(e)
                }
            }
        })
    }
}

var getBucket = function() {
    if (process.env.NODE_ENV == 'production') {
        return gcloud.storage().bucket('www.tally.us')
    } else {
        return {
            'file': function(path) {
                return {
                    'createWriteStream': function(ignored) {
                        var fullPath = 'generated/www/' + path
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
            'contentType': 'text/html',
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
