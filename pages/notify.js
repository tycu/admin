'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var events = document.getElementById('events')
    var message = document.getElementById('message')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    post('/list-events', null, function(res) {
        if (res) {
            var initial = document.createElement('option')
            initial.text = ''
            initial.value = ''
            events.options.add(initial)

            res.events.forEach(function(event) {
                var option = document.createElement('option')
                option.text = event.headline
                option.value = event.iden
                events.options.add(option)
            })
        } else {
            content.innerHTML = 'Unable to load events'
        }
    })

    submit.onclick = function() {
        var notification = {
            'message': message.value,
            'event': events.value
        }

        submit.disabled = true
        error.textContent = ''

        post('/send-push-notification', notification, function(res) {
            if (res) {
                error.textContent = 'Sent successfully'
            } else {
                submit.disabled = false
                error.textContent = 'Send failed'
            }
        })
    }
}
