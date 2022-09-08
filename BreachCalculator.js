const BreachCalculator = (events, ruleset, checklist = []) =>  {
    const _handleEvent = (event) => {
        //handle event
        let updatedChecklist = _updateCurrentChecklist(event, checklist);
        const breaches = _calculateBreach(updatedChecklist);
        updatedChecklist = _cleanCurrentChecklist(updatedChecklist);
        let newChecklist = _addNewChecklist(event);
        return {checklist: [...updatedChecklist, ...newChecklist], breaches};
    }

    const _updateCurrentChecklist = (_event, checklist) => {
        return checklist.map((checklistItem) => {
            return {...checklistItem};
        })
    }

    const _calculateBreach = (checklist) => {
        console.log(checklist, ruleset);
    }

    const _addNewChecklist = (event) => {
        console.log(breachChecklist, event);
    }

    if(Array.isArray(events)) {
        let breachList = [];
        events.forEach((event) => {
            const {breaches} = _handleEvent(event);
            breachList.push(breaches);
        })
        return {checklist: breachChecklist, breaches: breachList};
    } else {
        return _handleEvent(events);
    }
}
export default BreachCalculator;