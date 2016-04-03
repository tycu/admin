'use strict'

window.onload = function() {
    var content = document.getElementById('content')

    post('/list-events', null, function(res) {
        if (res) {
            res.events.forEach(function(event) {
                var headline = document.createElement('p')
                headline.textContent = (event.headline || '<no headline>')

                var div = document.createElement('div')
                div.appendChild(headline)

                if (event.draft) {
                    var span = document.createElement('span')
                    span.style.fontStyle = "italic"
                    span.textContent = "Draft: "
                    div.firstChild.insertBefore(span, div.firstChild.firstChild)
                }

                var edit = document.createElement('a')
                edit.href = '/event.html?iden=' + event.iden
                edit.style.fontWeight = 'bold'
                edit.textContent = 'Edit'

                div.firstChild.appendChild(space(2))
                div.firstChild.appendChild(edit)

                if (event.pinned) {
                    var pinned = document.createElement('span')
                    pinned.textContent = 'Pinned'
                    pinned.style.fontStyle = 'italic'

                    div.firstChild.appendChild(space(2))
                    div.firstChild.appendChild(pinned)
                } else if (!event.draft) {
                    var pin = document.createElement('a')
                    pin.href = '#'
                    pin.style.fontWeight = 'bold'
                    pin.textContent = 'Pin'
                    pin.onclick = function() {
                        var body = {
                            'event': event.iden
                        }

                        post('/set-pinned-event', body, function(res) {
                            if (res) {
                                location.reload()
                            }
                        })
                    }

                    div.firstChild.appendChild(space(2))
                    div.firstChild.appendChild(pin)
                }

                content.appendChild(div)
            })
        } else {
            content.innerHTML = 'Unable to load events'
        }
    })
}
