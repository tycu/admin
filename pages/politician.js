'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var name = document.getElementById('name')
    var jobTitle = document.getElementById('jobTitle')
    var twitterUsername = document.getElementById('twitterUsername')
    var thumbnail = document.getElementById('thumbnail')
    var progress = document.getElementById('progress')
    var fileInput = document.getElementById('fileInput')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var politician = {}

    var size = thumbnail.clientWidth
    var imgixConfig = '?dpr=' + devicePixelRatio + '&h=' + size + '&w=' + size + '&fit=crop&crop=faces&mask=ellipse'

    if (location.query['iden']) {
        content.style.display = 'none'
        submit.textContent = 'Update'
        submit.disabled = true

        post('/get-politician', { 'iden': location.query['iden'] }, function(res) {
            if (res) {
                console.log(res)
                politician = res
                document.title = 'Update ' + politician.name + ' - Tally'
                name.value = politician.name || ''
                jobTitle.value = politician.jobTitle || ''
                twitterUsername.value = politician.twitterUsername || ''
                thumbnail.src = politician.thumbnailUrl && politician.thumbnailUrl + imgixConfig || ''
                submit.disabled = false
                content.style.display = 'block'
            } else {
                content.innerHTML = 'Unable to load politician'
            }
        })
    }

    thumbnail.onclick = function() {
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
        thumbnail.src = ''

        var url = '/upload-image?fileType=' + encodeURIComponent(file.type)
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
            politician.thumbnailUrl = response.imageUrl
            thumbnail.src = politician.thumbnailUrl + imgixConfig
        }
        xhr.onerror = function() {
            progress.style.display = 'none'
        }
        xhr.send(file)
    }

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        politician.name = name.value
        politician.jobTitle = jobTitle.value
        politician.twitterUsername = twitterUsername.value

        var endpoint = politician.iden ? '/update-politician' : '/create-politician'
        post(endpoint, politician, function(res) {
            submit.disabled = false

            if (res) {
                location.replace('/politician.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }
}
