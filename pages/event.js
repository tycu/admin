'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    var top = document.getElementById('top')
    var image = document.getElementById('image')
    var imageAttribution = document.getElementById('imageAttribution')
    var politicians = document.getElementById('politicians')
    var politicianTwitter = document.getElementById('politicianTwitter')
    var headline = document.getElementById('headline')
    var summary = document.getElementById('summary')
    var addSupport = document.getElementById('addSupport')
    var supportOptions = document.getElementById('supportOptions')
    var addOppose = document.getElementById('addOppose')
    var opposeOptions = document.getElementById('opposeOptions')
    var submit = document.getElementById('submit')
    var publish = document.getElementById('publish')
    var error = document.getElementById('error')

    var event = {}
    var pacs

    var imgixConfig = '?w=828&h=440&fit=crop'

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

            var politicianMap = {}

            res.politicians.forEach(function(politician) {
                politicianMap[politician.iden] = politician

                var option = document.createElement('option')
                option.text = politician.name
                option.value = politician.iden
                politicians.options.add(option)
            })

            politicians.onchange = function(e) {
                var politician = politicianMap[politicians.value]
                if (politician) {
                    politicianTwitter.textContent = '@' + politician.twitterUsername
                } else {
                    politicianTwitter.textContent = ''
                }
            }

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

                                if (event.supportPacs) {
                                    event.supportPacs.forEach(function(pacIden) {
                                        var select = createPacSelect()
                                        select.firstChild.value = pacIden
                                        select.firstChild.onchange()
                                        select.children[5].value = (event.tweets && event.tweets[pacIden]) || ''
                                        supportOptions.appendChild(select)
                                    })
                                }

                                if (event.opposePacs) {
                                    event.opposePacs.forEach(function(pacIden) {
                                        var select = createPacSelect()
                                        select.firstChild.value = pacIden
                                        select.firstChild.onchange()
                                        select.children[5].value = (event.tweets && event.tweets[pacIden]) || ''
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

        var pacMap = {}

        pacs.forEach(function(pac) {
            pacMap[pac.iden] = pac

            var option = document.createElement('option')
            option.text = pac.name
            option.value = pac.iden
            pacSelect.options.add(option)
        })

        var remove = document.createElement('button')
        remove.textContent = 'Remove'
        remove.onclick = function() {
            p.parentNode.removeChild(p)
        }

        var span = document.createElement('span')

        pacSelect.onchange = function(e) {
            var pac = pacMap[pacSelect.value]
            if (pac && pac.twitterUsername) {
                span.textContent = '@' + pac.twitterUsername
            } else {
                span.textContent = ''
            }
        }

        p.appendChild(pacSelect)
        p.appendChild(space())
        p.appendChild(span)
        p.appendChild(space())
        p.appendChild(remove)
        
        var tweet = document.createElement('textarea')
        tweet.style.width = '370px'
        p.appendChild(tweet)
        p.appendChild(document.createElement('br'))

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

        var tweets = {}

        supportOptions.childNodes.forEach(function(node) {
            if (node.firstChild.value) {
                support.push(node.firstChild.value)
                if (node.childNodes[5].value) {
                    tweets[node.firstChild.value] = node.childNodes[2].value
                }
            }
        })

        opposeOptions.childNodes.forEach(function(node) {
            if (node.firstChild.value) {
                oppose.push(node.firstChild.value)
                if (node.childNodes[5].value) {
                    tweets[node.firstChild.value] = node.childNodes[2].value
                }
            }
        })

        event.imageAttribution = imageAttribution.value
        event.politician = politicians.value
        event.headline = headline.value
        event.summary = summary.value
        event.tweets = tweets

        if (support.length > 0) {
            event.supportPacs = support
        }
        if (oppose.length > 0) {
            event.opposePacs = oppose
        }
    }
}
