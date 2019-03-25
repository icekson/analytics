import {ScheduledTask} from "./ScheduledTask";
import {Partition} from "./Partition";
import {AggregationType} from "../../Analytics";
import * as moment from "moment";
import * as kue from 'kue';
import {AggregationJobParams} from "../../jobs/AggregationJobParams";

export abstract class AbstractTask implements ScheduledTask {

    protected currentPartition: Partition;

    constructor(protected name: string) {
    }


    getName(): string {
        return this.name;
    }

    getNextPartition(): Partition {
        return this.getCurrentPartition().increment();
    }

    getCurrentPartition(): Partition {
        return this.currentPartition;
    }

    getLastPartition(): Partition {
        return this.getCurrentPartition().decrement();
    }

    run(aggregateFunc: Function) {
        let currentPartition = this.getCurrentPartition();
        let now = moment();
        try {
            if (currentPartition.dateTimeInterval().to.diff(now, 'seconds') < 0) {
                aggregateFunc.call(this);
                this.scheduleNextPartition();
            } else {
                this.reSchedulePartition();
            }
        } catch (e) {
            console.error('AbstractTask: Task run error, try to reschedule task: ', e);
            this.reSchedulePartition();
        }
    }

    runOnce(aggregateFunc: Function) {
        let currentPartition = this.getCurrentPartition();
        let now = moment();
        try {
            if (currentPartition.dateTimeInterval().to.diff(now, 'seconds') < 0) {
                aggregateFunc.call(this);
            }
        } catch (e) {
            console.error('AbstractTask: Task run error, try to reschedule task: ', e);
        }
    }


    scheduleNextPartition(): Partition {
        let nextPartition = this.getNextPartition();
        let queue = kue.createQueue();
        let delay;
        let now = moment();
        if (nextPartition.dateTimeInterval().to.diff(now, 'seconds') < 0) {
            delay = 60 * 1000;
        } else {
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


    reSchedulePartition(): Partition {
        let currentPartition = this.getCurrentPartition();
        let queue = kue.createQueue();
        let delay;
        let now = moment();
        let diff = currentPartition.increment().dateTimeInterval().from.diff(now, 'milliseconds');
        if (diff < 0) {
            delay = 60 * 1000;
        } else {
            delay = diff;
        }
        const params: AggregationJobParams = {
            type: this.getType(),
            partition: currentPartition.getPartitionNumber(),
            date: currentPartition.dateTimeInterval().from.toISOString()
        };
        this.scheduleByDelay(delay, queue, params);
        return currentPartition;
    }

    incrementPartition(): void {
        this.currentPartition = this.getNextPartition();
    }

    abstract getType(): AggregationType;

    abstract getPartitionsAmount(): number;

    abstract getExecutionTime(): Date;

    abstract scheduleByDelay(delay, queue, params);
}