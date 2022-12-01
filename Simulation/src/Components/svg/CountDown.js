import React from "react";
import './countdown.style.css'
import {RiZzzFill} from 'react-icons/ri'

const CountDown = ({remaining, duration, isWorking, timer = "down"}) => {
  function parseTime(seconds){
    var date = new Date(null);
    date.setSeconds(seconds);
    var hhmmssFormat = date.toISOString().substr(11, 8);
    return hhmmssFormat;
  };
  function generateProgressArr(remaining, duration){
    return timer === 'down' ? [parseInt(remaining/duration*283), 283] : [parseInt((duration - remaining)/duration*283), 283] 
  }
  return (
    <div className="wrapper">
        <div className="base-timer">
          <svg
            className="base-timer__svg"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g className="base-timer__circle">
              <circle
                className="base-timer__path-elapsed"
                cx="50"
                cy="50"
                r="45"
              ></circle>
              <path
                id="base-timer-path-remaining"
                strokeDasharray={generateProgressArr(remaining, duration)}
                className="base-timer__path-remaining arc"
                d="
                  M 50, 50
                  m -45, 0
                  a 45,45 0 1,0 90,0
                  a 45,45 0 1,0 -90,0
                  "
              ></path>
            </g>
          </svg>
          <span id="base-timer-label" className="base-timer__label">
            {parseTime(remaining)}
            <br/>
          </span>
          <span id="base-timer-label2" className="base-timer__label2">
            {isWorking ? "Working" : "Resting"}
          </span>
        </div>
    </div>
  );
};

export default CountDown;
