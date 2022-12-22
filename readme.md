## Installation

breach_calculator requires [Node.js](https://nodejs.org/) to run.

Install the dependencies 

```sh
cd breach_calculator
npm install
```

### For testing
Steps
1. Choose dataset path in importing module of index.js file. 
*Note: You can change dataset file path to run test on different datasets.*
2. After dataset file is selected Run:
```sh
node index.js
```
3. Observe the output

### Algorithm
1. Feed input event, previous checklist, ewd events
2. Calulcate time between previous event and new event and update to checklist item
3. Calculate breaches from time calculated in step 2.
4. Add new checklist items if new event is 'work'
5. Change last event info of checklist item
6. Return updated checklist and calculated breaches from step 3.
7. Repeat step 1 to 6 for next event


### Project Architecture
![Project Architecture](/images/project_architecture.png "Project Architecture")
