'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var name = document.getElementById('name')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var politician = {}

    if (location.query['iden']) {
        submit.textContent = 'Update'
        submit.disabled = true

        get(host() + '/v1/politicians/' + location.query['iden'], function(res) {
            if (res) {
                console.log(res)
                politician = res
                document.title = 'Update ' + politician.name + ' - Tally'
                name.value = politician.name || ''
                submit.disabled = false
            } else {
                content.innerHTML = 'Unable to load politician'
            }
        })
    }

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        politician.name = name.value

        var endpoint = '/v1/politicians'
        if (politician.iden) {
            endpoint += '/' + politician.iden
        }

        post(host() + endpoint, politician, function(res) {
            submit.disabled = false

            if (res) {
                window.location.replace('/politician.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }
}
