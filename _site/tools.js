'use strict'

var space = function() {
    var span = document.createElement('span')
    span.textContent = ' '
    return span
}

var host = function() {
    if (location.host == 'production') {
        return 'https://api.tally.us'
    } else {
        return 'http://localhost:5000'
    }
}

document.addEventListener('DOMContentLoaded', function(event) {
    var title = document.createElement('a')
    title.href = '/'
    title.id = 'title'
    title.textContent = 'Tally'

    var header = document.createElement('div')
    header.id = 'header'
    header.appendChild(title)

    var adminKey = document.createElement('input')
    adminKey.type = 'text'
    adminKey.placeholder = 'Admin Key'
    adminKey.style.display = 'inline-block'
    adminKey.style.width = '300px'
    adminKey.style.margin = '0 0 0 28px'

    header.appendChild(adminKey)

    document.body.insertBefore(header, document.body.firstChild)

    adminKey.value = localStorage.adminKey || ''

    adminKey.onkeypress = function(e) {
        if (e.keyCode == 13) {
            localStorage.adminKey = adminKey.value
            location.reload()
        }
    }

    if (!localStorage.adminKey) {
        window.onload = null
        document.body.firstChild.nextElementSibling.innerHTML = 'Admin key required'
    }
})
