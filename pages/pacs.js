'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    
    post('/list-pacs', null, function(res) {
        if (res) {
            res.pacs.forEach(function(pac) {
                var p = document.createElement('p')
                p.textContent = pac.name

                var edit = document.createElement('a')
                edit.href = '/pac.html?iden=' + pac.iden
                edit.style.fontWeight = 'bold'
                edit.textContent = 'Edit'

                p.appendChild(space(2))
                p.appendChild(edit)

                var div = document.createElement('div')
                div.appendChild(p)

                content.appendChild(div)
            })
        } else {
            content.innerHTML = 'Unable to load pacs'
        }
    })
}
