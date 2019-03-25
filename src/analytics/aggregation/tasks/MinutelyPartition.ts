import {Partition} from "./Partition";
import * as moment from "moment";

export class MinutelyPartition implements Partition {

    private interval: {from: moment.Moment, to: moment.Moment};
    private partitionNumber = 0;

    constructor(startTime: moment.Moment) {
        let start = moment(startTime.format('YYYY-MM-DD HH:mm:00'), 'YYYY-MM-DD HH:mm:ss');
        let end = start.clone();
        end.add(1, 'minutes').subtract(1, 'seconds');
        this.interval = {
            from: start,
            to: end
        };
        this.partitionNumber = Number.parseInt(start.format('m'));

    }

    dateTimeInterval(): { from: moment.Moment; to: moment.Moment } {
        return {
            from: this.interval.from,
            to: this.interval.to
        };
    }

    getPartitionNumber(): number {
        return this.partitionNumber;
    }

    increment(): Partition {
        return new MinutelyPartition(this.interval.from.clone().add(1, 'minutes'));
    }

    decrement(): Partition {
        let end = this.interval.from;
        let start = end.clone();
        start.subtract(1, 'minutes');
        return new MinutelyPartition(start);
    }
}