'use strict'

window.onload = function() {
    var content = document.getElementById('content')
    
    get(host() + '/v1/politicians' + location.search, function(res) {
        if (res) {
            res.politicians.forEach(function(politician) {
                var p = document.createElement('p')
                p.textContent = politician.name + ' '

                var edit = document.createElement('a')
                edit.href = '/tools/politician.html?iden=' + politician.iden
                edit.style.fontWeight = 'bold'
                edit.textContent = 'Edit'

                p.appendChild(edit)

                var div = document.createElement('div')
                div.appendChild(p)

                content.appendChild(div)
            })
        } else {
            content.innerHTML = 'Unable to load politicians'
        }
    })
}
