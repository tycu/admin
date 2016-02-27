'use strict'

var onResponse = function(status, body, callback) {
    if (status == 200) {
        try {
            callback(JSON.parse(body))
        } catch (e) {
            console.log(e)
            callback()
        }
    } else {
        callback()
    }
}

var get = function(url, callback) {
    console.log('GET ' + url)

    var xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.adminKey)

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            onResponse(xhr.status, xhr.responseText, callback)
        }
    }

    xhr.send()
}

var del = function(url, callback) {
    console.log('DELETE ' + url)

    var xhr = new XMLHttpRequest()
    xhr.open('DELETE', url, true)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.adminKey)

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            onResponse(xhr.status, xhr.responseText, callback)
        }
    }

    xhr.send()
}

var post = function(url, body, callback) {
    console.log('POST ' + url, body)

    var xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.adminKey)

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            onResponse(xhr.status, xhr.responseText, callback)
        }
    }

    xhr.send(JSON.stringify(body))
}

location.query = {}
var pairs = window.location.search.substr(1).split('&')
for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=', 2)
    if (pair.length == 1) {
        location.query[pair[0]] = ''
    } else {
        location.query[pair[0]] = decodeURIComponent(pair[1].replace(/\+/g, ' '))
    }
}
