import {Partition} from "./Partition";
import * as moment from "moment";

export class HourlyPartition implements Partition {

    private interval: {from: moment.Moment, to: moment.Moment};
    private partitionNumber = 0;

    constructor(startTime: moment.Moment) {
        let start = moment(startTime.format('YYYY-MM-DD HH:00:00'), 'YYYY-MM-DD HH:mm:ss');
        let end = start.clone();
        end.add(59, 'minutes').add(59, 'seconds');
        this.interval = {
            from: start,
            to: end
        };
        this.partitionNumber = Number.parseInt(start.format('H'));

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
        return new HourlyPartition(this.interval.to.clone().add(1, 'seconds'));
    }

    decrement(): Partition {
        let end = this.interval.from;
        let start = end.clone().subtract(1, 'hours');
        return new HourlyPartition(start);
    }
}