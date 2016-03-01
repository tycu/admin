var workers = process.env.WEB_CONCURRENCY || 1
var port = process.env.PORT || 5001

var start = function() {
    var express = require('express')
    var app = express()
    
    app.use(express.static('public'))

    app.listen(port, function() {
        console.log('tally-admin listening on port ' + port)
    })
}

require('throng')(start, {
    'workers': workers,
    'lifetime': Infinity
})
