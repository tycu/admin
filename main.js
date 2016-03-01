var workers = process.env.WEB_CONCURRENCY || 1
var port = process.env.PORT || 5001

var adminKey = 'btxc21dRkHj9aauM9a4lXOxiuNoENtve'

var start = function() {
    var express = require('express')
    var app = express()

    // Redirect to HTTPS in production
    if (process.env.NODE_ENV == 'production') {
        app.use(function(req, res, next) {
            if (req.headers['x-forwarded-proto'] !== 'https') {
                res.redirect(301, 'https://' + req.get('Host') + req.url)
            } else {
                next()
            }
        })
    }

    app.use(require('body-parser').json())

    // Remove all falsey keys from any POST bodies (empty strings, nulls, etc)
    app.use(function(req, res, next) {
        if (req.body) {
            // Remove empty strings and null keys
            Object.keys(req.body).forEach(function(key) {
                if (!req.body[key]) {
                    delete req.body[key]
                }
            })
        }
        next()
    })

    app.use(express.static('public'))

    // Require an admin key for all requests
    app.use(function(req, res, next) {
        if (req.headers.authorization) {
            var parts = req.headers.authorization.split(' ')
            if (parts.length == 2 && parts[0] == 'Bearer') {
                var token = parts[1]
                if (token == adminKey) {
                    next()
                    return
                }
            }
        }

        res.sendStatus(401)
    })

    require('./endpoints')(app)

    app.listen(port, function() {
        console.log('tally-admin listening on port ' + port)
    })
}

require('throng')(start, {
    'workers': workers,
    'lifetime': Infinity
})
