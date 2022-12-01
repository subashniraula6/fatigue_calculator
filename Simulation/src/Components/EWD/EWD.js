import React from "react";
import {GiSteeringWheel, GiCoffeeCup, GiNotebook} from 'react-icons/gi'
import {IoTime} from 'react-icons/io5'
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import './EWD.css';

const EWD = ({ewd}) => {
  return (
    <div className="ewd-wrapper">
    <h4 className="mt-4">EWD  <GiNotebook /></h4>
      <VerticalTimeline 
      animate
      lineColor="#424242"
      layout="1-column-left"
      >
        {ewd.map((event) => {
          let {eventType, startTime} = event;
          startTime = startTime.format('YYYY-MM-DD HH:mm')
          let backgroundColor = eventType==='work' ? 'rgba(179, 48, 102, 0.973)': 'rgb(33, 150, 243)';
          return (
            <VerticalTimelineElement
              key={startTime}
              className="vertical-timeline-element--work"
              contentStyle={{ background: backgroundColor, color: "#fff" }}
              contentArrowStyle={{
                borderRight: `8px solid  ${backgroundColor}`,
              }}
              iconStyle={{ background: backgroundColor, color: "#fff" }}
              style={{padding: '1px', margin: '1px'}}
              icon={eventType==='work' ? <GiSteeringWheel/> : <GiCoffeeCup/>}
              >
              <IoTime style={{fontWeight: '600px', fontSize: '20px', marginBottom: '3px'}}/> <strong className="h6">{startTime}</strong>
            </VerticalTimelineElement>
          );
        })}
      </VerticalTimeline>
    </div>
  );
};

export default EWD;
