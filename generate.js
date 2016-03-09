'use strict'

var async = require("async")
var appData = require('./app-data')
var website = require('./website')

var tasks = []
// tasks.push(function(callback) {
//     appData.generate(function(err) {
//         if (err) {
//             console.error('updating app data failed')
//             console.error(err)
//         } else {
//             console.log('app data updated')
//         }
//         callback()
//     })
// })
tasks.push(function(callback) {
    website.generate(function(err) {
        if (err) {
            console.error('updating website failed')
            console.error(err)
        } else {
            console.log('website updated')
        }
        callback()
    })
})

async.series(tasks, function(err, results) {
    process.exit()
})
