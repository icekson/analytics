import {AbstractTask} from "./AbstractTask";
import {AggregationType, Analytics} from "../../Analytics";
import {Partition} from "./Partition";
import * as moment from "moment";
import {MinutelyPartition} from "./MinutelyPartition";
import {AggregationJobParams} from "../../jobs/AggregationJobParams";
import * as kue from 'kue';

export class MinutelyTask extends AbstractTask {

    constructor(name: string, startTime: moment.Moment){
        super(name);
        this.currentPartition = (new MinutelyPartition(startTime)) as Partition;
    }

    getType(): AggregationType {
        return AggregationType.Minutely;
    }

    getPartitionsAmount(): number {
        return 60;
    }

    getExecutionTime(): Date {
        return this.getCurrentPartition().dateTimeInterval().to.clone().add(1, 'seconds').toDate();
    }


    scheduleNextPartition(): Partition {
        let nextPartition = this.getNextPartition();
        let queue = kue.createQueue();
        let delay;
        let now = moment();
        if(nextPartition.dateTimeInterval().to.diff(now, 'seconds') < 0){
            delay = 20 * 1000;
        }else{
            let delayTime = nextPartition.dateTimeInterval().from.clone();
            delay = Math.abs(delayTime.add(1, 'minutes').diff(now, 'milliseconds'));
        }
        const params: AggregationJobParams = {
            type: this.getType(),
            partition: nextPartition.getPartitionNumber(),
            date: nextPartition.dateTimeInterval().from.toISOString()
        };
        this.scheduleByDelay(delay, queue, params);
        return nextPartition;
    }

    scheduleByDelay(delay, queue, params) {
        queue.create(Analytics.AGGREGATION_MINUTELY_JOB, params)
            .priority('high')
            .delay(delay)
            .save();
    }


}