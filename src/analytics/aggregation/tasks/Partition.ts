import * as moment from "moment";

export interface Partition {

    dateTimeInterval(): {from: moment.Moment, to: moment.Moment};
    getPartitionNumber(): number;
    increment(): Partition;
    decrement(): Partition;
}