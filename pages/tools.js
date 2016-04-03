'use strict'

NodeList.prototype.forEach = Array.prototype.forEach

var space = function(count) {
    if (!count) {
        count = 1
    }

    var span = document.createElement('span')
    span.textContent = ''
    span.style.whiteSpace = 'pre'
    for (var i = 0; i < count; i++) {
        span.textContent += ' '
    }

    return span
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
