import {AggregationType} from "../../Analytics";
import {Partition} from "./Partition";

export interface Task {
    getName(): string;
    getType(): AggregationType;
    getCurrentPartition(): Partition;
    getNextPartition(): Partition;
    getLastPartition(): Partition;

    /**
     * @return {Date}
     */
    getExecutionTime(): Date;
    getPartitionsAmount(): number;

    run(aggregateFunc: Function);
    runOnce(aggregateFunc: Function);
    incrementPartition(): void;

}