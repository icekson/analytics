import {AbstractTask} from "./AbstractTask";
import {AggregationType, Analytics} from "../../Analytics";
import {DailyPartition} from "./DailyPartition";
import {Partition} from "./Partition";
import * as moment from "moment";

export class DailyTask extends AbstractTask {

    constructor(name: string, startTime: moment.Moment){
        super(name);
        this.currentPartition = (new DailyPartition(startTime)) as Partition;
    }

    getType(): AggregationType {
        return AggregationType.Daily;
    }

    getPartitionsAmount(): number {
        return this.getNextPartition().dateTimeInterval().from.daysInMonth();
    }

    getExecutionTime(): Date {
        return this.getNextPartition().dateTimeInterval().to.clone().add(1, 'minutes').toDate();
    }

    scheduleByDelay(delay, queue, params) {
        queue.create(Analytics.AGGREGATION_DAILY_JOB, params)
            .priority('high')
            .delay(delay)
            .save();
    }
}