import {AbstractTask} from "./AbstractTask";
import {AggregationType, Analytics} from "../../Analytics";
import {Partition} from "./Partition";
import * as moment from "moment";
import {MonthlyPartition} from "./MonthlyPartition";

export class MonthlyTask extends AbstractTask {

    constructor(name: string, startTime: moment.Moment){
        super(name);
        this.currentPartition = (new MonthlyPartition(startTime)) as Partition;
    }

    getType(): AggregationType {
        return AggregationType.Monthly;
    }

    getPartitionsAmount(): number {
        return 12;
    }

    getExecutionTime(): Date {
        return this.getNextPartition().dateTimeInterval().to.clone().add(1, 'minutes').toDate();
    }

    scheduleByDelay(delay, queue, params) {
        queue.create(Analytics.AGGREGATION_MONTHLY_JOB, params)
            .priority('high')
            .delay(delay)
            .save();
    }
}