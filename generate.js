'use strict'

var generator = require('./generator')()
generator.generateAppData()
generator.generateWebsite(function(err) {
    if (err) {
        console.error('generating website failed')
        console.error(err)
    } else {
        console.log('website generated')
    }
    process.exit()
})
