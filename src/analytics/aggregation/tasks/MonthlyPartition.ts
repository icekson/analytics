import {Partition} from "./Partition";
import * as moment from "moment";

export class MonthlyPartition implements Partition {

    private interval: {from: moment.Moment, to: moment.Moment};
    private partitionNumber = 0;

    constructor(startTime: moment.Moment) {
        let start = moment(startTime.format('YYYY-MM-01 00:00:00'), 'YYYY-MM-DD HH:mm:ss');
        let end = moment(start.format('YYYY-MM-' + startTime.daysInMonth() + ' 23:59:59'), 'YYYY-MM-DD HH:mm:ss');
        this.interval = {
            from: start,
            to: end
        };
        console.log(this.interval);
        this.partitionNumber = Number.parseInt(start.format('M'));

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
        return new MonthlyPartition(this.interval.from.clone().add(1, 'months'));
    }

    decrement(): Partition {
        let end = this.interval.from;
        let start = end.clone().subtract(1, 'months');
        return new MonthlyPartition(start);
    }
}