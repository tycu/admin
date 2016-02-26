'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var name = document.getElementById('name')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var pac = {}

    if (location.query['iden']) {
        submit.textContent = 'Update'
        submit.disabled = true

        get(host() + '/v1/pacs/' + location.query['iden'], function(res) {
            if (res) {
                console.log(res)
                pac = res
                document.title = 'Update ' + pac.name + ' - Tally'
                name.value = pac.name || ''
                submit.disabled = false
            } else {
                content.innerHTML = 'Unable to load pac'
            }
        })
    }

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        pac.name = name.value

        var endpoint = '/v1/pacs'
        if (pac.iden) {
            endpoint += '/' + pac.iden
        }

        post(host() + endpoint, pac, function(res) {
            submit.disabled = false

            if (res) {
                window.location.replace('/tools/pac.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }
}
