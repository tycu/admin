'use strict'

module.exports = {
    // Hashes, iden -> json blob
    'events': 'events',
    'politicians': 'politicians',
    'pacs': 'pacs',
    'users': 'users',
    'contributions': 'contributions',

    // Authentication stuff
    'accessTokenToUserIden': 'access_token_to_user_iden',
    'userIdenToAccessToken': 'user_iden_to_access_token',
    'facebookUserIdToUserIden': 'facebook_user_id_to_user_iden',

    // Payments
    'userIdenToStripeCustomerId': 'user_iden_to_stripe_customer_id',

    // Lists
    'reverseChronologicalEvents': 'reverse_chronological_events',
    'userReverseChronologicalContributions': function(userIden) {
        return 'user_' + userIden + '_reverse_chronological_contributions'
    },
    'contributionsToday': function() {
        var date = new Date()
        date.setUTCHours(0, 0, 0, 0) // UTC Midnight
        return date.getTime() / 1000 + '_contributions'
    },
    'contributionsOnDay': function(utcTimestamp) {
        return utcTimestamp + '_contributions'
    },
    
    // Hashes with 2 fields, support & oppose
    'eventContributionTotals': function(eventIden) {
        return 'event_' + eventIden + '_contribution_totals'
    },
    'politicianContributionTotals': function(politicianIden) {
        return 'politician_' + politicianIden + '_contribution_totals'
    },

    // Sum of all contributions
    'contributionsSum': 'contributions_sum',
    'userContributionsSum': function(userIden) {
        return 'user_' + userIden + '_contribution_sum'
    }
}
