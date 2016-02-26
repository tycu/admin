'use strict'

window.onload = function() {
    var content = document.getElementById('content')

    get(host() + '/v1/pacs', function(res) {
        if (res) {
            res.pacs.forEach(function(pac) {
                var edit = document.createElement('a')
                edit.href = '/tools/pac.html?iden=' + pac.iden
                edit.style.fontWeight = 'bold'
                edit.textContent = 'Edit'

                var span = document.createElement('span')
                span.textContent = pac.name

                var p = document.createElement('p')
                p.appendChild(span)
                p.appendChild(space())
                p.appendChild(edit)

                content.appendChild(p)
            })
        } else {
            content.innerHTML = 'Unable to load pacs'
        }
    })
}
