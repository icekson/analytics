import {Partition} from "./Partition";
import * as moment from "moment";

export class DailyPartition implements Partition {

    private interval: {from: moment.Moment, to: moment.Moment};
    private partitionNumber = 0;

    constructor(startTime: moment.Moment) {
        let start = moment(startTime.format('YYYY-MM-DD'), 'YYYY-MM-DD');
        let end = moment(startTime.format('YYYY-MM-DD'), 'YYYY-MM-DD');
        end.add(1, 'days').subtract(1, 'seconds');
        this.interval = {
            from: start,
            to: end
        };
        this.partitionNumber = Number.parseInt(start.format('D'));

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
        return new DailyPartition(this.interval.to.clone().add(1, 'seconds'));
    }

    decrement(): Partition {
        let end = this.interval.from;
        let start = end.clone().subtract(1, 'days');
        return new DailyPartition(start);
    }
}