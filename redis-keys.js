'use strict'

module.exports = {
    'events': 'events',
    'politicians': 'politicians',
    'pacs': 'pacs',
    'reverseChronologicalEvents': 'reverse_chronological_events',
    'users': 'users',
    'accessTokenToUserIden': 'access_token_to_user_iden',
    'userIdenToAccessToken': 'user_iden_to_access_token',
    'facebookUserIdToUserIden': 'facebook_user_id_to_user_iden',
    'userIdenToStripeCustomerId': 'user_iden_to_stripe_customer_id',
    'donations': 'donations',
    'donationsSum': 'donations_sum',
    'eventIdenToUserDonationIden': function(userIden) {
        return 'user_' + userIden + '_event_iden_to_donation_iden'
    },
    'userReverseChronologicalDonations': function(userIden) {
        return 'user_' + userIden + '_reverse_chronological_donations'
    },
    'eventDonationTotals': function(eventIden) {
        return 'event_' + eventIden + '_donation_totals'
    },
    'politicianDonationTotals': function(politicianIden) {
        return 'politician_' + politicianIden + '_donation_totals'
    },
    'userDonationsSum': function(userIden) {
        return 'user_' + userIden + '_donation_sum'
    }
}
