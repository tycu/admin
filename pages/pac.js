'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var name = document.getElementById('name')
    var description = document.getElementById('description')
    var color = document.getElementById('color')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var pac = {}

    if (location.query['iden']) {
        content.style.display = 'none'
        submit.textContent = 'Update'
        submit.disabled = true

        post('/get-pac', { 'iden': location.query['iden'] }, function(res) {
            if (res) {
                console.log(res)
                pac = res
                document.title = 'Update ' + pac.name + ' - Tally'
                name.value = pac.name || ''
                description.value = pac.description || ''
                color.value = pac.color
                submit.disabled = false
                content.style.display = 'block'
            } else {
                content.innerHTML = 'Unable to load pac'
            }
        })
    }

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        pac.name = name.value
        pac.description = description.value
        pac.color = color.value

        var endpoint = pac.iden ? '/update-pac' : '/create-pac'
        post(endpoint, pac, function(res) {
            submit.disabled = false

            if (res) {
                location.replace('/pac.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }
}
