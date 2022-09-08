var rulesets = [{
    name: '5.5 hours',
    period: 330,
    work: [{
        name: '5.25 hours work time',
        maximumWorkTime: 5.5,
        breaches: [{
            severity: 'nobreach',
            from: 0,
            to: 315
        },{
            severity: 'breach',
            from: 316,
            to: 323
        },{
            severity: 'minor',
            from: 324,
            to: 330
        }]
    }],
    rest: []
},{
    name: '24 hours',
    period: 1440,
    work: [{
        name: '7.5 hours work time',
        maximumWorkTime: 7.5,
        breaches: [{
            level: 'nobreach',
            from: 0,
            to: 720
        },{
            level: 'breach',
            from: 721,
            to: 728
        },{
            level: 'minor',
            from: 728,
            to: 765
        },{
            level: 'substantial',
            from: 766,
            to: 795 
        },{
            level: 'severe',
            from: 796,
            to: 810
        },{
            level: 'critical',
            from: 811,
            to: 1440
        }]
    }],
    rest: [{
        name: '7 continuous hours stationary rest time',
        minimumTime: false,
        continuousBreak: 7,
        nightBreaks: false,
        consecutiveNightBreaks: false,
        breaches: [{
            level: 'critical',
            from: 0,
            to: 5.5
        },{
            level: 'severe',
            from: 5.5,
            to: 5.75
        },{
            level: 'substantial',
            from: 5.75,
            to: 6.5
        },{
            level: 'minor',
            from: 6.5,
            to: 7
        }]
    }]
},{
    name: '14 days',
    period: 840,
    rest: [{
        name: '2 night rest breaks',
        minimumTime: false,
        continuousBreak: false,
        nightBreaks: 2,
        consecutiveNightBreaks: false,
        breaches:[{

        },{

        }]
    },{
        name: '2 night rest breaks taken on consecutive days',
        minimumRestTime: false,
        continous: false,
        nightBreaks: false,
        consecutiveNightBreaks: 2,
        breaches:[{
            
        },{

        }]
    }]
}]