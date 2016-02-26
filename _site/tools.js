'use strict'

var space = function() {
    var span = document.createElement('span')
    span.textContent = ' '
    return span
}

var host = function() {
    if (localStorage.server == 'production') {
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

    var dev = document.createElement('span')
    dev.style.display = 'inline-block'
    dev.style.marginLeft = '28px'

    var prod = document.createElement('span')
    prod.style.display = 'inline-block'
    prod.style.marginLeft = '14px'

    var devRadio = document.createElement('input')
    devRadio.id = 'dev'
    devRadio.type = 'radio'
    devRadio.name = 'server'

    var prodRadio = document.createElement('input')
    prodRadio.id = 'prod'
    prodRadio.type = 'radio'
    prodRadio.name = 'server'

    var devLabel = document.createElement('label')
    devLabel.htmlFor = devRadio.id
    devLabel.textContent = ' development'
    
    var prodLabel = document.createElement('label')
    prodLabel.htmlFor = prodRadio.id
    prodLabel.textContent = ' production'

    dev.appendChild(devRadio)
    dev.appendChild(devLabel)

    prod.appendChild(prodRadio)
    prod.appendChild(prodLabel)

    var header = document.createElement('div')
    header.id = 'header'
    header.appendChild(title)
    header.appendChild(dev)
    header.appendChild(prod)

    var adminKey = document.createElement('input')
    adminKey.type = 'text'
    adminKey.placeholder = 'Admin Key'
    adminKey.style.display = 'inline-block'
    adminKey.style.width = '300px'
    adminKey.style.margin = '0 0 0 28px'

    header.appendChild(adminKey)

    document.body.insertBefore(header, document.body.firstChild)

    if (localStorage.server == 'production') {
        prodRadio.checked = true
    } else {
        devRadio.checked = true
    }

    devRadio.onchange = function() {
        if (devRadio.checked) {
            localStorage.server = 'development'
        }
        location.reload()
    }

    prodRadio.onchange = function() {
        if (prodRadio.checked) {
            localStorage.server = 'production'
        }
        location.reload()
    }

    adminKey.value = localStorage.adminKey || ''

    adminKey.onkeypress = function(e) {
        if (e.keyCode == 13) {
            localStorage.adminKey = adminKey.value
            location.reload()
        }
    }
})
