<?php

$json = file_get_contents('ruleSet.json');
$original_ruleset = json_decode($json, 1);

$translated_ruleset = [];
$translated_ruleset['ruleSetName'] = $original_ruleset['rulesetName'];
$translated_ruleset['rules'] = array_map(function ($rule) {
    return [
        'name'   => convert($rule['period'], 'hours') <= 24 ?
            convert($rule['period'], 'hours') . ' hours' :
            convert($rule['period'], 'days') . ' days',
        'period' => convert($rule['period'], 'minutes'),
        'work'   => [
            [
                'name' => convert($rule['maximumWorkBreach']['noBreach'], 'hours') - 8 / 60 > 0 ?
                    convert($rule['maximumWorkBreach']['noBreach'], 'hours') - 8 / 60 . ' hours work time' :
                    convert($rule['maximumWorkBreach']['minorBreach']['from'], 'hours') - 15 / 60 . ' hours work time',

                'maximumWorkTime' => convert($rule['maximumWork'], 'hours'),

                'breaches' => array_values(array_filter(
                    array_map(function ($breach, $level) use ($rule) {
                        $from = array_key_exists('from', $breach) ?
                            convert($breach['from'], 'minutes') : (convert($breach, 'minutes') > 0 ? convert($rule['maximumWork'], 'minutes') : 0);

                        $to = array_key_exists('to', $breach) ?
                            convert($breach['to'], 'minutes') :
                            convert($breach, 'minutes');

                        return [
                            'level' => $level === 'noBreach' ? $level : str_replace("Breach", "", $level),
                            'from' => $from + 1,
                            'to' => $to
                        ];
                    }, $rule['maximumWorkBreach'], array_keys($rule['maximumWorkBreach'])),
                    function ($breach) {
                        return $breach['from'] > 1;
                    }
                ))
            ]
        ],
        'rest' => createRestBreachList($rule)
    ];
}, $original_ruleset['rules']);

function createRestBreachList($rule)
{
    $breachList = [];
    foreach ($rule["break"] as $break) {
        $breaches = [];

        $breaches['minimumTime'] = convert($break['restBreak']['minimumTime'], 'minutes') > 0 ?
            convert($break['restBreak']['minimumTime'], 'minutes') :
            false;
        $breaches['continuousBreak'] = convert($break['restBreak']['continuousBreak'], 'minutes');

        if ($breaches['minimumTime'] === false) {
            if ($breaches['continuousBreak'] === 0) {
                $breaches['numberOfContinuousBreaks'] = 0;
            } else {
                $breaches['numberOfContinuousBreaks'] = 1;
            }
        } else {
            $breaches['numberOfContinuousBreaks'] = $breaches['minimumTime'] / $breaches['continuousBreak'];
        }
        $breaches['descriptionContainsAtLeast'] = $break['restBreak']['descriptionContainsAtLeast'];
        $breaches['nightBreaks'] = $break['nightBreaks'] > 0 ? $break['nightBreaks'] : false;
        $breaches['consecutiveNightBreaks'] = $break['consecutiveNightBreaks'] > 0 ? $break['consecutiveNightBreaks'] : false;

        // naming
        $name = "";
        if ($breaches['nightBreaks'] > 0) {
            $name = $breaches['nightBreaks'] . ' night rest breaks';
        } else if ($breaches['consecutiveNightBreaks'] > 0) {
            $name = $breaches['consecutiveNightBreaks'] . ' consecutive night rest breaks';
        } else if ($breaches['continuousBreak'] > 0) {
            $name = $breaches['continuousBreak'] < 60 ? $breaches['continuousBreak'] . ' minutes continuous rest time in ' . $breaches['numberOfContinuousBreaks'] . ' blocks' :
                $breaches['continuousBreak'] / 60 . ' hours continuous rest time in ' . $breaches['numberOfContinuousBreaks'] . ' blocks';
        }
        $breaches = ['name' => $name] + $breaches;

        $breaches['breaches'] = [];

        $continuousBreaches = [];
        foreach ($break["breachList"] as $level => $restBreaches) {
            foreach ($restBreaches[0] as $type => $duration) {
                if ($type === 'continuousStationaryBreakBreach') {
                    $continuousBreach = [
                        'level' => str_replace("Breach", "", $level),
                        'from'  => convert($duration['to'], 'hours'),
                        'to'    => convert($duration['from'], 'hours')
                    ];
                    if ($continuousBreach['to'] > 0) {
                        array_push($continuousBreaches, $continuousBreach);
                    }
                }
            }
        }
        $breaches['breaches'] = array_merge($breaches['breaches'], $continuousBreaches);
        array_push($breachList, $breaches);
    }
    return $breachList;
}

function convert($duration, $convertedUnit)
{
    switch ($convertedUnit) {
        case 'minutes':
            return $duration['days'] * 24 * 60 + $duration['hours'] * 60 + $duration['minutes'];
            break;

        case 'hours':
            return $duration['days'] * 24 + $duration['hours'] + $duration['minutes'] / 60;
            break;

        case 'days':
            return $duration['days'] + $duration['hours'] / 24 + $duration['minutes'] / (24 * 60);
            break;

        default:
            break;
    }
}

print_r(json_encode($translated_ruleset));
echo "\n";
