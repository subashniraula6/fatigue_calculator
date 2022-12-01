import "./App.css";
import CountDown from "./Components/svg/CountDown";
import moment from "moment";
import { useEffect, useState } from "react";
import Upload from "./Components/uploader/Upload";
import EWD from "./Components/EWD/EWD";
import BreachList from "./Components/BreachList/BreachList";
import {BreachCalculator, estimateNightRestBreachInstants} from "breach_calculator";
import { Row, Col, Container } from "react-bootstrap";
import { notify } from './Components/utils';
import { parse } from './Components/utils'

function App() {
  let [isWorking, setIsWorking] = useState(false);
  let [fileContent, setFileContent] = useState(null);

  let [ewd, setEwd] = useState([]);
  let [checklist, setChecklist] = useState([]);
  let [breaches, setBreaches] = useState([]);

  let [targetRestMinutes, setTargetRestMinutes] = useState(0);
  let [nightBreachInstants, setNightBreachInstants] = useState([]);
  let [breachInstants, setBreachInstants] = useState([]);
  let [nextBreachTime, setNextBreachTime] = useState(null);
  let [totalDuration, setTotalDuration] = useState(0);
  let [remainingSeconds, setRemainingSeconds] = useState(0);
  useEffect(() => {
    let interval1;
    let interval2;
    let interval3;
    interval3 = setInterval(() => {
      if(isWorking === false && fileContent){
        let nightBreachInstantss = estimateNightRestBreachInstants(checklist, fileContent["rules"]);
        console.log("nightBreachInstants", nightBreachInstantss.map(instant => ({from: instant.from.format("YYYY-MM-DD HH:mm"), to: instant.to.format("YYYY-MM-DD HH:mm")})))
          setNightBreachInstants(nightBreachInstantss);
          nightBreachInstantss.forEach(instant => {
            if(moment().isBetween(instant.from.clone().subtract(15, "minutes"), instant.from, null, [])){
              notify('warning', `You are about encounter night rest breach. Please take rest before ${parse(instant.from).format('YYYY-MM-DD HH:mm')}`, 5000);
            }
          });
        }
      }, 1000);

      if(isWorking){
        clearInterval(interval2);
        let interval1 = setInterval(() => {
        let previousBreachInstants = breachInstants.filter(instant => parse(instant.from).isBefore(moment()));
        let previousUncheckedInstants = previousBreachInstants.filter(instant => instant.checked === false);
        if(previousUncheckedInstants.length > 0){
          previousUncheckedInstants.forEach(instant => {
            if(instant.level.toLowerCase() === 'nobreach'){
              notify('warning', `You are about encounter new breach ${instant.type} for period ${parse(instant.periodStart).format('YYYY-MM-DD HH:mm')}. before Please take rest`, 5000);
              setBreaches(currentBreaches => {
                let newBreach = {
                  periodStart: parse(instant.periodStart).format('YYYY-MM-DD HH:mm'),
                  periodType: instant.periodType,
                  breachType: instant.type,
                  level: instant.level,
                  breachInstant: parse(instant.from).format('YYYY-MM-DD HH:mm')
                }
                return [...currentBreaches, newBreach];
              });
            } else {
              notify('error', `Breach: ${instant.type} Period ${instant.periodStart}`, 5000);
              setBreaches(currentBreaches => {
                let newBreach = {
                  periodStart: parse(instant.periodStart).format('YYYY-MM-DD HH:mm'),
                  periodType: instant.periodType,
                  breachType: instant.type,
                  level: instant.level,
                  breachInstant: parse(instant.from).format('YYYY-MM-DD HH:mm')
                }
                return [...currentBreaches, newBreach];
              });
            }
            instant.checked = true;
          });
        };

        if(breachInstants.length > 0){
          let upcomingBreachInstants = breachInstants.filter(instant => parse(instant.from).isAfter(moment())); 
          let start = previousBreachInstants.length ? previousBreachInstants[previousBreachInstants.length - 1]['to'] : ewd[ewd.length - 1].startTime;
          let end = upcomingBreachInstants[0]['from'];
          let totalDuration = parse(end).clone().diff(parse(start), 'seconds');
          setTotalDuration(totalDuration);
          let remainingSeconds = parse(end).clone().diff(moment(), 'seconds');
          setRemainingSeconds(remainingSeconds);
        }
      }, 1000);
      
      return () => {
        clearInterval(interval1);
      };
    } else {
      clearInterval(interval1);
      let interval2 = setInterval(() => {
        if(targetRestMinutes){
          setTotalDuration(targetRestMinutes * 60);
          let targetRestTime = moment.parseZone(ewd[ewd.length -1]['startTime']).add(targetRestMinutes, "minutes");
          let remainingTargetRest = targetRestTime.clone().diff(moment(), "seconds");
          setRemainingSeconds(remainingTargetRest);
        }
      }, 1000);

      return () => {
        clearInterval(interval2)
      }
    }
  }, [breachInstants, isWorking]);

  function switchJobState(e) {
    if (!fileContent) {
      alert("Please upload Ruleset to use");
      return;
    }
    if (isWorking) {
      startRest();
    } else {
      startWork();
    }
  }

  function startRest() {
    let now = new moment();
    let event = createEvent(isWorking, now.clone());

    // Find target rest
    let result = BreachCalculator(event, fileContent["rules"], checklist, ewd);
    if (result) {
      console.log("result", result)
      // set work state
      setIsWorking(false);
      
      setTargetRestMinutes(result.targetRestMinutes);
      console.log("targetRestMinutes", result.targetRestMinutes);
      
      setEwd(result.ewd);
      setChecklist(result.checklist);
    }
  }

  function startWork() {
    let now = new moment();
    let event = createEvent(isWorking, now.clone());

    // Feed this event to Engine
    let result = BreachCalculator(event, fileContent["rules"], checklist, ewd);
    if (result) {
      setIsWorking(true);
      console.log("result", result)
      
      setEwd(result.ewd);
      setChecklist(result.checklist);
      let instants = result["breachInstants"];
      
      // set breach instants checked flag to false
      instants = instants.map(instant => {
        // Check if old breach instants contains current breach instant i.e. same periodType, periodStart and type
        let breachInstant = breachInstants.find(breachInstant => {
          return breachInstant.periodStart === instant.periodStart && 
          breachInstant.periodType === instant.periodType &&
          breachInstant.type === instant.type 
        });
        if(breachInstant){
          return {...instant, checked: breachInstant.checked}
        }
        return {...instant, checked: false}
      });
      setBreachInstants(instants);
    }
  }

  function convertChecklistToBreaches(breachChecklist){
    let breaches = [];
    breachChecklist.forEach(checklistItem => {
      let checklistBreaches = checklistItem.breach.breaches;
      if(checklistBreaches.length > 0){
        checklistBreaches.forEach(breach => {
          breaches.push({
              periodStart: checklistItem.periodStart.format('YYYY-MM-DD HH:mm'),
              periodType: checklistItem['periodType'],
              breachType: breach['type'],
              level: breach['level'],
              breachInstant: breach['breachInstant'],
          })
        })
      }
    });
    return breaches;
  }

  function createEvent(isWorking, time) {
    return {
      eventType: isWorking ? "rest" : "work",
      startTime: time.clone(),
    };
  }

  function stopShift(e){
    let {breaches} = BreachCalculator(ewd, fileContent["rules"]);
    let breachList = convertChecklistToBreaches(breaches);
    setBreaches(breachList);
  }

  return (
    <Container>
      <Row>
        <Col lg={4}>
          <div className="wrapper">
            <Upload fileContent={fileContent} setFileContent={setFileContent} />
            <CountDown remaining={remainingSeconds} duration={totalDuration} isWorking={isWorking} timer={isWorking ? 'down': 'up'}/>
            {nextBreachTime && (
              <>
                <strong>Next breach time</strong>
                {nextBreachTime.type} for period {nextBreachTime.periodType}{" "}
                hours
              </>
            )}
            <div className="buttons">
              <button
                className={`${isWorking ? "btn-blue" : "btn-purple"}`}
                onClick={switchJobState}
              >
                {isWorking ? "Rest" : "Work"}
              </button>
              <button
                className="btn-red"
                onClick={stopShift}
              >
                Stop Shift
              </button>
            </div>
          </div>
        </Col>
        <Col lg={3}>
          <EWD ewd={ewd} />
        </Col>
        <Col lg={5}>
          <BreachList breaches={breaches} />
        </Col>
      </Row>
    </Container>
  );
}

export default App;
