import {Partition} from "./Partition";
import {Task} from "./Task";

export interface ScheduledTask extends Task{
    scheduleNextPartition(): Partition;
    reSchedulePartition(): Partition;
}