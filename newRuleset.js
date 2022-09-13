var rulesets = [
  {
    name: "5.5 hours",
    period: 330,
    work: [
      {
        name: "5.25 hours work time",
        maximumWorkTime: 5.25,
        breaches: [
          {
            severity: "nobreach",
            from: 316,
            to: 323,
          },
          {
            severity: "breach",
            from: 324,
            to: 330,
          },
        ],
      },
    ],
    rest: [],
  },
  {
    name: "8 hours",
    period: 480,
    work: [
      {
        name: "7.5 hours work time",
        maximumWorkTime: 7.5,
        breaches: [
          {
            severity: "nobreach",
            from: 451,
            to: 458,
          },
          {
            severity: "breach",
            from: 459,
            to: 465,
          },
          {
            severity: "minor",
            from: 466,
            to: 0,
          },
        ],
      },
    ],
    rest: [],
  },
  {
    name: "11 hours",
    period: 660,
    work: [
      {
        name: "10 hours work time",
        maximumWorkTime: 10,
        breaches: [
          {
            severity: "nobreach",
            from: 601,
            to: 608,
          },
          {
            severity: "breach",
            from: 609,
            to: 615,
          },
          {
            severity: "minor",
            from: 616,
            to: 645,
          },
          {
            severity: "substantial",
            from: 646,
            to: 0,
          },
        ],
      },
    ],
    rest: [],
  },
  {
    name: "24 hours",
    period: 1440,
    work: [
      {
        name: "7.5 hours work time",
        maximumWorkTime: 12,
        breaches: [
          {
            level: "nobreach",
            from: 721,
            to: 728,
          },
          {
            level: "breach",
            from: 729,
            to: 735,
          },
          {
            level: "minor",
            from: 736,
            to: 765,
          },
          {
            level: "substantial",
            from: 766,
            to: 795,
          },
          {
            level: "severe",
            from: 796,
            to: 810,
          },
          {
            level: "critical",
            from: 811,
            to: 0,
          },
        ],
      },
    ],
    rest: [
      {
        name: "7 continuous hours stationary rest time",
        minimumTime: false,
        continuousBreak: 7,
        nightBreaks: false,
        consecutiveNightBreaks: false,
        breaches: [
          {
            level: "critical",
            from: 0,
            to: 5.5,
          },
          {
            level: "severe",
            from: 5.5,
            to: 5.75,
          },
          {
            level: "substantial",
            from: 5.75,
            to: 6.25,
          },
          {
            level: "minor",
            from: 6.25,
            to: 7,
          },
        ],
      },
    ],
  },
  {
    name: "7 days",
    period: 10080,
    work: [],
    rest: [
      {
        name: "24 continuous hours stationary rest time",
        minimumTime: false,
        continuousBreak: 24,
        nightBreaks: false,
        consecutiveNightBreaks: false,
        breaches: [
          {
            level: "critical",
            from: 0,
            to: 22.5,
          },
          {
            level: "severe",
            from: 22.5,
            to: 22.75,
          },
          {
            level: "substantial",
            from: 22.75,
            to: 23.25,
          },
          {
            level: "minor",
            from: 23.25,
            to: 24,
          },
        ],
      },
    ],
  },
  {
    name: "14 days",
    period: 20160,
    work: [],
    rest: [
      {
        name: "2 night rest breaks",
        minimumTime: false,
        continuousBreak: false,
        nightBreaks: 2,
        consecutiveNightBreaks: false,
        breaches: [
          {
            level: "critical",
            from: 0,
            to: 5.5,
          },
          {
            level: "severe",
            from: 5.5,
            to: 5.75,
          },
          {
            level: "substantial",
            from: 5.75,
            to: 6.25,
          },
          {
            level: "minor",
            from: 6.25,
            to: 7,
          },
        ],
      },
      {
        name: "2 night rest breaks taken on consecutive days",
        minimumRestTime: false,
        continuous: false,
        nightBreaks: false,
        consecutiveNightBreaks: 2,
        breaches: [
          {
            level: "critical",
            from: 0,
            to: 5.5,
          },
          {
            level: "severe",
            from: 5.5,
            to: 5.75,
          },
          {
            level: "substantial",
            from: 5.75,
            to: 6.25,
          },
          {
            level: "minor",
            from: 6.25,
            to: 7,
          },
        ],
      },
    ],
  },
];
module.exports = {rulesets}