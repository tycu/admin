'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var image = document.getElementById('image')
    var politicians = document.getElementById('politicians')
    var headline = document.getElementById('headline')
    var summary = document.getElementById('summary')
    var addSupport = document.getElementById('addSupport')
    var supportOptions = document.getElementById('supportOptions')
    var addOppose = document.getElementById('addOppose')
    var opposeOptions = document.getElementById('opposeOptions')
    var submit = document.getElementById('submit')
    var error = document.getElementById('error')

    var event = {}
    var pacs

    var imgixConfig = '?dpr=' + devicePixelRatio + '&h=' + image.clientHeight + '&w=' + image.clientWidth + '&fit=crop'

    if (location.query['iden']) {
        document.title = 'Update Event ' + location.query['iden'] + ' - Tally'
        content.style.display = 'block'
        submit.textContent = 'Update'
        submit.disabled = true
    }

    post('/list-politicians', null, function(res) {
        if (res) {
            var initial = document.createElement('option')
            initial.text = ''
            initial.value = ''
            politicians.options.add(initial)

            res.politicians.forEach(function(politician) {
                var option = document.createElement('option')
                option.text = politician.name
                option.value = politician.iden
                politicians.options.add(option)
            })

            post('/list-pacs', null, function(res) {
                if (res) {
                    pacs = res.pacs

                    if (location.query['iden']) {
                        post('/get-event', { 'iden': location.query['iden'] }, function(res) {
                            if (res) {
                                console.log(res)
                                event = res
                                politicians.value = event.politician
                                headline.value = event.headline || ''
                                summary.value = event.summary || ''
                                image.src = event.imageUrl && event.imageUrl + imgixConfig || ''

                                if (event.supportPacs) {
                                    event.supportPacs.forEach(function(pacIden) {
                                        var select = createPacSelect()
                                        select.firstChild.value = pacIden
                                        supportOptions.appendChild(select)
                                    })
                                }

                                if (event.opposePacs) {
                                    event.opposePacs.forEach(function(pacIden) {
                                        var select = createPacSelect()
                                        select.firstChild.value = pacIden
                                        opposeOptions.appendChild(select)
                                    })
                                }

                                submit.disabled = false
                                content.style.display = 'block'
                            } else {
                                content.innerHTML = 'Unable to load event'
                            }
                        })
                    }
                } else {
                    content.innerHTML = 'Unable to load pacs'
                }
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
            event.imageUrl = response.imageUrl
            image.src = event.imageUrl + imgixConfig
        }
        xhr.onerror = function() {
            progress.style.display = 'none'
        }
        xhr.send(file)
    }

    var createPacSelect = function() {
        var p = document.createElement('p')
        var pacSelect = document.createElement('select')

        var initial = document.createElement('option')
        initial.text = ''
        initial.value = ''
        pacSelect.options.add(initial)

        pacs.forEach(function(pacs) {
            var option = document.createElement('option')
            option.text = pacs.name
            option.value = pacs.iden
            pacSelect.options.add(option)
        })
        p.appendChild(pacSelect)
        return p
    }

    addSupport.onclick = function() {
        supportOptions.appendChild(createPacSelect())
    }

    addOppose.onclick = function() {
        opposeOptions.appendChild(createPacSelect())
    }

    submit.onclick = function() {
        var support = []
        var oppose = []

        supportOptions.childNodes.forEach(function(node) {
            if (node.firstChild.value) {
                support.push(node.firstChild.value)
            }
        })

        opposeOptions.childNodes.forEach(function(node) {
            if (node.firstChild.value) {
                oppose.push(node.firstChild.value)
            }
        })

        submit.disabled = true
        error.textContent = ''

        event.politician = politicians.value
        event.headline = headline.value || ''
        event.summary = summary.value
        event.supportPacs = support
        event.opposePacs = oppose

        var endpoint = event.iden ? '/update-event' : '/create-event'
        post(endpoint, event, function(res) {
            submit.disabled = false

            if (res) {
                location.replace('/event.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }
}