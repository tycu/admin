'use strict'

window.onload = function() {
    var content = document.getElementById('content')

    post('/list-events', null, function(res) {
        if (res) {
            res.events.forEach(function(event) {
                var edit = document.createElement('a')
                edit.href = '/event.html?iden=' + event.iden
                edit.style.fontWeight = 'bold'
                edit.textContent = 'Edit'

                var div = document.createElement('div')
                div.innerHTML = markdown.toHTML(event.headline || '<no headline>')
                div.firstChild.appendChild(space())
                div.firstChild.appendChild(edit)

                if (event.draft) {
                    var span = document.createElement('span')
                    span.style.fontStyle = "italic"
                    span.textContent = "Draft: "
                    div.firstChild.insertBefore(span, div.firstChild.firstChild)
                }

                content.appendChild(div)
            })
        } else {
            content.innerHTML = 'Unable to load events'
        }
    })
}
