'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var politicians = document.getElementById('politicians')
    var headline = document.getElementById('headline')
    var summary = document.getElementById('summary')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var event = {}

    if (location.query['iden']) {
        document.title = 'Update Event ' + location.query['iden'] + ' - Tally'
        submit.textContent = 'Update'
        submit.disabled = true

        get(host() + '/v1/events/' + location.query['iden'], function(res) {
            if (res) {
                console.log(res)
                event = res
                politicians.value = event.politician && event.politician.iden
                headline.value = event.headline || ''
                summary.value = event.summary || ''
                submit.disabled = false
            } else {
                content.innerHTML = 'Unable to load event'
            }
        })
    }

    get(host() + '/v1/politicians', function(res) {
        if (res) {
            res.politicians.forEach(function(politician) {
                var option = document.createElement('option')
                option.text = politician.name
                option.value = politician.iden
                politicians.options.add(option)
                politicians.value = event.politician && event.politician.iden
            })
        } else {
            content.innerHTML = 'Unable to load politicians'
        }
    })

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        event.politician = politicians.value
        event.headline = headline.value || ''
        event.summary = summary.value

        var endpoint = '/v1/events'
        if (event.iden) {
            endpoint += '/' + event.iden
        }

        post(host() + endpoint, event, function(res) {
            submit.disabled = false

            if (res) {
                window.location.replace('/event.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }
}
