'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var top = document.getElementById('top')
    var image = document.getElementById('image')
    var imageAttribution = document.getElementById('imageAttribution')
    var politicians = document.getElementById('politicians')
    var headline = document.getElementById('headline')
    var summary = document.getElementById('summary')
    var addSupport = document.getElementById('addSupport')
    var supportOptions = document.getElementById('supportOptions')
    var addOppose = document.getElementById('addOppose')
    var opposeOptions = document.getElementById('opposeOptions')
    var supportTweet = document.getElementById('supportTweet')
    var opposeTweet = document.getElementById('opposeTweet')
    var submit = document.getElementById('submit')
    var publish = document.getElementById('publish')
    var error = document.getElementById('error')

    var event = {}
    var pacs

    var imgixConfig = '?dpr=2&h=' + image.clientHeight + '&w=' + image.clientWidth + '&fit=crop'

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

                                if (event.draft) {
                                    top.textContent = 'Draft'
                                    publish.style.display = 'block'
                                }

                                politicians.value = event.politician
                                headline.value = event.headline || ''
                                summary.value = event.summary || ''
                                image.src = event.imageUrl && event.imageUrl + imgixConfig || ''
                                imageAttribution.value = event.imageAttribution || ''
                                supportTweet.value = event.supportTweet || ''
                                opposeTweet.value = event.opposeTweet || ''

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

        var remove = document.createElement('button')
        remove.textContent = 'Remove'
        remove.onclick = function() {
            p.parentNode.removeChild(p)
        }

        p.appendChild(pacSelect)
        p.appendChild(remove)
        return p
    }

    addSupport.onclick = function() {
        supportOptions.appendChild(createPacSelect())
    }

    addOppose.onclick = function() {
        opposeOptions.appendChild(createPacSelect())
    }

    submit.onclick = function() {
        submit.disabled = true
        error.textContent = ''

        updateEvent()

        var endpoint
        if (event.iden) {
            endpoint = '/update-event'
        } else {
            endpoint = '/create-event'
            event.draft = true
        }

        post(endpoint, event, function(res) {
            submit.disabled = false

            if (res) {
                location.replace('/event.html?iden=' + res.iden)
            } else {
                error.textContent = 'Save failed'
            }
        })
    }

    publish.onclick = function() {
        delete event.draft
        submit.click()
    }

    var updateEvent = function() {
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

        event.imageAttribution = imageAttribution.value
        event.politician = politicians.value
        event.headline = headline.value || ''
        event.summary = summary.value || ''
        event.supportTweet = supportTweet.value || ''
        event.opposeTweet = opposeTweet.value || ''

        if (support.length > 0) {
            event.supportPacs = support
        }
        if (oppose.length > 0) {
            event.opposePacs = oppose
        }
    }
}
