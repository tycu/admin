'use strict'

window.onload = function() {
    var content = document.getElementById('content')

    get(host() + '/v1/events' + location.search, function(res) {
        if (res) {
            res.events.forEach(function(event) {
                var edit = document.createElement('a')
                edit.href = '/event.html?iden=' + event.iden
                edit.style.fontWeight = 'bold'
                edit.textContent = 'Edit'

                var remove = document.createElement('a')
                remove.href = ''
                remove.style.fontWeight = 'bold'
                remove.textContent = 'Delete'
                remove.onclick = function() {
                    var confirmed = confirm('Delete this event?')
                    if (confirmed) {
                        del(host() + '/v1/events/' + event.iden, function(res) {
                            if (res) {
                                location.reload()
                            }
                        })
                    }
                }

                var div = document.createElement('div')
                div.innerHTML = markdown.toHTML(event.headline || '<no headline>')
                div.firstChild.appendChild(space())
                div.firstChild.appendChild(edit)
                div.firstChild.appendChild(space())
                div.firstChild.appendChild(remove)

                content.appendChild(div)
            })
        } else {
            content.innerHTML = 'Unable to load events'
        }
    })
}
