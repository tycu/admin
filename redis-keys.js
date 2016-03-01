module.exports = {
    'events': 'events',
    'politicians': 'politicians',
    'pacs': 'pacs',
    'reverseChronologicalEvents': 'reverse_chronological_events',
    'politicianReverseChronologicalEvents': function(iden) {
        return 'politician_reverse_chronological_events_' + iden
    }
}
