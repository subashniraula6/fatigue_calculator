var ruleSets = [
  {
    rulesetName:
      "Standard Hours - SOLO Driver - Heavy Vehicle - updated version 1.0a",
    rules: [
      {
        period: 330,
        maximumWork: 315,
        break: [
          {
            restBreak: {
              minimumTime: 15,
              continuousBreak: 15,
              numberOfContinuousBreak: 0,
              stationary: false,
              sleeperBerthWhileMoving: false,
              descriptionContainsAtLeast: false,
            },
            nightBreaks: 0,
            consecutiveNightBreaks: 0,
            breachList: {
              criticalBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              severeBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              substantialBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              minorBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
            },
          },
        ],
        maximumWorkBreach: {
          noBreach: {
            from: 315,
            to: 323,
          },
          breach: {
            from: 324,
            to: 330,
          },
          minorBreach: {
            from: 0,
            to: 0,
          },
          substantialBreach: {
            from: 0,
            to: 0,
          },
          severeBreach: {
            from: 0,
            to: 0,
          },
          criticalBreach: {
            from: 0,
            to: 0,
          },
        },
      },
      {
        period: 480,
        maximumWork: 450,
        break: [
          {
            restBreak: {
              minimumTime: 30,
              continuousBreak: 15,
              numberOfContinuousBreak: 0,
              stationary: false,
              sleeperBerthWhileMoving: false,
              descriptionContainsAtLeast: false,
            },
            nightBreaks: 0,
            consecutiveNightBreaks: 0,
            breachList: {
              criticalBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              severeBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              substantialBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              minorBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
            },
          },
        ],
        maximumWorkBreach: {
          noBreach: {
            from: 450,
            to: 458,
          },
          breach: {
            from: 459,
            to: 465,
          },
          minorBreach: {
            from: 466,
            to: 0,
          },
          substantialBreach: {
            from: 0,
            to: 0,
          },
          severeBreach: {
            from: 0,
            to: 0,
          },
          criticalBreach: {
            from: 0,
            to: 0,
          },
        },
      },
      {
        period: 660,
        maximumWork: 600,
        break: [
          {
            restBreak: {
              minimumTime: 60,
              continuousBreak: 15,
              numberOfContinuousBreak: 0,
              stationary: false,
              sleeperBerthWhileMoving: false,
              descriptionContainsAtLeast: true,
            },
            nightBreaks: 0,
            consecutiveNightBreaks: 0,
            breachList: {
              criticalBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              severeBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              substantialBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
              minorBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 0,
                    to: 0,
                  },
                },
              ],
            },
          },
        ],
        maximumWorkBreach: {
          noBreach: {
            from: 600,
            to: 608,
          },
          breach: {
            from: 609,
            to: 615,
          },
          minorBreach: {
            from: 615,
            to: 645,
          },
          substantialBreach: {
            from: 646,
            to: 0,
          },
          severeBreach: {
            from: 0,
            to: 0,
          },
          criticalBreach: {
            from: 0,
            to: 0,
          },
        },
      },
      {
        period: 1440,
        maximumWork: 720,
        break: [
          {
            restBreak: {
              minimumTime: 420,
              continuousBreak: 420,
              numberOfContinuousBreak: 0,
              stationary: false,
              sleeperBerthWhileMoving: false,
              descriptionContainsAtLeast: false,
            },
            nightBreaks: 0,
            consecutiveNightBreaks: 0,
            breachList: {
              criticalBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 330,
                    to: 0,
                  },
                },
              ],
              severeBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 345,
                    to: 330,
                  },
                },
              ],
              substantialBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 375,
                    to: 345,
                  },
                },
              ],
              minorBreach: [
                {
                  continuousStationaryBreakBreach: {
                    from: 405,
                    to: 375,
                  },
                },
              ],
            },
          },
        ],
        maximumWorkBreach: {
          noBreach: {
            from: 720,
            to: 728,
          },
          breach: {
            from: 729,
            to: 735,
          },
          minorBreach: {
            from: 736,
            to: 765,
          },
          substantialBreach: {
            from: 766,
            to: 795,
          },
          severeBreach: {
            from: 796,
            to: 810,
          },
          criticalBreach: {
            from: 810,
            to: 0,
          },
        },
      },
    ],
  },
];
module.exports = { ruleSets };
