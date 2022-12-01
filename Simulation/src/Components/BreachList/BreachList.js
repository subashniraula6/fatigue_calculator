import React from "react";
import { Container } from "react-bootstrap";
import { FaRegCalendarTimes } from "react-icons/fa";
import ListGroup from "react-bootstrap/ListGroup";
import {Table} from 'react-bootstrap'

const BreachList = ({breaches}) => {
  return (
    <div className="my-4">
      <h4 className="my-4">
        Breaches <FaRegCalendarTimes />
      </h4>
       <Table responsive className="border">
      <thead>
        <tr>
          <th>Period Start</th>
          <th>Period Type</th>
          <th>Breach Type</th>
          <th>Level</th>
          <th>Breach Instant</th>
        </tr>
      </thead>
      <tbody>
       {
        breaches.map(item => {
          let background;
          if(item.level.toLowerCase() === 'minor'){
            background = 'bg-warning';
          } else if (item.level.toLowerCase() === 'substantial'){
            background = 'bg-info';
          } else if(item.level.toLowerCase() === 'severe'){
            background = 'bg-primary';
          } else if(item.level.toLowerCase() === 'critical'){
            background = 'bg-danger';
          }
          return <tr key={item.breachInstant + item.breachType + item.level} className={background}>
            { Object.values(item).map(value => <td key={value}>{value}</td>) }
          </tr>
        })
       }
      </tbody>
    </Table>
    </div>
  );
};

export default BreachList;
