import {AbstractTask} from "./AbstractTask";
import {AggregationType, Analytics} from "../../Analytics";
import {HourlyPartition} from "./HourlyPartition";
import {Partition} from "./Partition";
import * as moment from "moment";

export class HourlyTask extends AbstractTask {

    constructor(name: string, startTime: moment.Moment){
        super(name);
        this.currentPartition = (new HourlyPartition(startTime)) as Partition;
    }

    getType(): AggregationType {
        return AggregationType.Hourly;
    }

    getPartitionsAmount(): number {
        return 24;
    }

    getExecutionTime(): Date {
        return this.getNextPartition().dateTimeInterval().to.clone().add(1, 'minutes').toDate();
    }

    scheduleByDelay(delay, queue, params) {
        queue.create(Analytics.AGGREGATION_HOURLY_JOB, params)
            .priority('high')
            .delay(delay)
            .save();
    }

}