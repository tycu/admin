'use strict'

var imgixConfig = '?dpr=2&h=100&w=100&fit=crop&crop=faces&mask=ellipse'

window.onload = function() {
    var content = document.getElementById('content')
    var name = document.getElementById('name')
    var jobTitle = document.getElementById('jobTitle')
    var twitterUsername = document.getElementById('twitterUsername')
    var thumbnails = document.getElementById('thumbnails')
    var progress = document.getElementById('progress')
    var fileInput = document.getElementById('fileInput')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var politician = {}

    if (location.query['iden']) {
        content.style.display = 'none'
        submit.textContent = 'Update'
        submit.disabled = true

        post('/get-politician', { 'iden': location.query['iden'] }, function(res) {
            if (res) {
                console.log(res)
                politician = res
                document.title = 'Update ' + politician.name + ' - Tally'

                if (politician.thumbnails) {
                    politician.thumbnails.forEach(function(thumbnailUrl) {
                        addThumbnail(thumbnailUrl)
                    })
                }

                if (politician.thumbnailUrl) {
                    addThumbnail(politician.thumbnailUrl)
                    delete politician.thumbnailUrl
                }

                name.value = politician.name || ''
                jobTitle.value = politician.jobTitle || ''
                twitterUsername.value = politician.twitterUsername || ''
                submit.disabled = false
                content.style.display = 'block'
            } else {
                content.innerHTML = 'Unable to load politician'
            }
        })
    }

    document.getElementById('addThumbnail').onclick = function() {
        addThumbnail()
    }

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        var imageUrls = []
        for (var i = 0; i < thumbnails.childNodes.length; i++) {
            var node = thumbnails.childNodes[i]
            if (node.nodeType == Node.ELEMENT_NODE) {
                if (node.imageUrl) {
                    imageUrls.push(node.imageUrl)
                }
            }
        }

        if (imageUrls.length > 0) {
            politician.thumbnails = imageUrls
        } else {
            delete politician.thumbnails
        }

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

var addThumbnail = function(imageUrl) {
    thumbnails.insertBefore(createThumbnail(imageUrl), thumbnails.lastElementChild)
}

var createThumbnail = function(imageUrl) {
    var thumbnail = document.createElement('img')
    thumbnail.style.height = '100%'
    thumbnail.style.width = '100%'

    var progress = document.createElement('div')
    progress.style.position = 'absolute'
    progress.style.top = 0
    progress.style.bottom = 0
    progress.style.left = 0
    progress.style.right = 0
    progress.style.textAlign = 'center'
    progress.style.display = 'none'

    var fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/jpeg, image/png'
    fileInput.style.display = 'none'

    var remove = document.createElement('div')
    remove.style.position = 'absolute'
    remove.style.top = 0
    remove.style.right = 0
    remove.style.cursor = 'pointer'
    remove.style.fontFamily = 'monospace'
    remove.style.padding = '0px 4px'
    remove.textContent = 'X'

    var div = document.createElement('div')
    div.style.position = 'relative'
    div.style.width = '100px'
    div.style.height = '100%'
    div.style.float = 'left'
    div.style.margin = '0px 10px'

    remove.onclick = function() {
        div.parentNode.removeChild(div)
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
            div.imageUrl = response.imageUrl
            thumbnail.src = response.imageUrl + imgixConfig
        }
        xhr.onerror = function() {
            progress.style.display = 'none'
        }
        xhr.send(file)
    }

    div.appendChild(thumbnail)
    div.appendChild(progress)
    div.appendChild(fileInput)
    div.appendChild(remove)

    if (imageUrl) {
        thumbnail.src = imageUrl + imgixConfig
        div.imageUrl = imageUrl
    }

    return div
}
