'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var image = document.getElementById('image')
    var politicians = document.getElementById('politicians')
    var headline = document.getElementById('headline')
    var summary = document.getElementById('summary')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var event = {}

    var imgixConfig = '?dpr=' + devicePixelRatio + '&h=' + image.clientHeight + '&w=' + image.clientWidth + '&fit=crop&crop=entropy'

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
                image.src = event.imageUrl && event.imageUrl + imgixConfig || ''
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

    image.onclick = function() {
        fileInput.click()
    }

    fileInput.onchange = function(e) {
        if (!e.target.files) {
            return
        }

        var file = e.target.files[0]
        if (!file) {
            return
        }

        progress.style.display = 'block'
        image.src = ''

        var url = host() + '/internal/upload-image?fileType=' + encodeURIComponent(file.type)
        var xhr = new XMLHttpRequest()
        xhr.open("POST", url, true)
        xhr.setRequestHeader('Accept', 'application/json')
        xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.adminKey)
        xhr.upload.onprogress = function(e) {
            var percent = Math.floor((e.loaded / e.total) * 100)
            progress.textContent = percent + '%'
        }
        xhr.onload = function(e) {
            progress.style.display = 'none'

            var response = JSON.parse(e.target.responseText)
            event.imageUrl = response.imageUrl
            image.src = event.imageUrl + imgixConfig
        }
        xhr.onerror = function() {
            progress.style.display = 'none'
        }
        xhr.send(file)
    }

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
