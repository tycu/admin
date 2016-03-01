var workers = process.env.WEB_CONCURRENCY || 1
var port = process.env.PORT || 5001

var start = function() {
    var express = require('express')
    var app = express()

    // Require HTTPS in production
    if (process.env.NODE_ENV == 'production') {
        app.use(function(req, res, next) {
            if (req.headers['x-forwarded-proto'] !== 'https') {
                res.redirect(301, 'https://' + req.get('Host') + req.url)
            } else {
                next()
            }
        })
    }
    
    app.use(express.static('public'))

    app.listen(port, function() {
        console.log('tally-admin listening on port ' + port)
    })
}

require('throng')(start, {
    'workers': workers,
    'lifetime': Infinity
})
