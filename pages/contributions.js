'use strict'

window.onload = function() {
    var content = document.getElementById('content')

    if (location.query['date']) {
        post('/get-contribution-report', {
            'date': location.query['date']
        }, function(res) {
            if (res) {
                console.log(res)

                var p = document.createElement('p')
                p.textContent = 'Contribution Report for ' + moment.utc(location.query['date'] * 1000).format('dddd, MMMM Do YYYY') + ':'
                p.style.fontWeight = 'bold'
                content.appendChild(p)

                var pacs = {}

                var pacContributions = {}
                Object.keys(res).forEach(function(date) {
                    var contributions = res[date]
                    contributions.forEach(function(contribution) {
                        if (!pacContributions[contribution.pac.iden]) {
                            pacs[contribution.pac.iden] = contribution.pac
                            pacContributions[contribution.pac.iden] = []
                        }
                        pacContributions[contribution.pac.iden].push(contribution)
                    })
                })

                var pacTotals = {}
                Object.keys(pacContributions).forEach(function(pacIden) {
                    var total = 0

                    var contributions = pacContributions[pacIden]
                    contributions.forEach(function(contribution) {
                        total += contribution.amount
                    })

                    pacTotals[pacIden] = total
                })

                Object.keys(pacs).forEach(function(pacIden) {
                    var pac = pacs[pacIden]

                    var p = document.createElement('p')
                    p.textContent = pac.name + ' - $' + pacTotals[pac.iden]

                    content.appendChild(p)
                })
            } else {
                content.innerHTML = 'Unable to load report'
            }
        })
    } else {
        var date = new Date()
        while (date.getTime() > 1458259200000) {
            date.setUTCHours(0, 0, 0, 0)

            var day = date.getUTCDay()
            if (day == 5) {
                var a = document.createElement('a')
                a.textContent = moment.utc(date).format('dddd, MMMM Do YYYY')
                a.href= '/contributions.html?date=' + date.getTime() / 1000
                var p = document.createElement('p')
                p.appendChild(a)
                content.appendChild(p)
            }

            while (date.getUTCDay() == day) {
                date.setTime(date.getTime() - (60 * 60 * 1000))
            }
        }
    }
}
