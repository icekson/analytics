import {Partition} from "./tasks/Partition";

export interface IDataAggregator {

    fetchHourlyStats(partition: Partition): Promise<any>;

    fetchDailyStats(partition: Partition): Promise<any>;

    fetchMonthlyStats(partition: Partition): Promise<any>;

    fetchMinutelyStats(partition: Partition): Promise<any>;

    aggregateHourlyStats(partition: Partition): Promise<any>;

    aggregateDailyStats(partition: Partition): Promise<any>;

    aggregateMonthlyStats(partition: Partition): Promise<any>;

    aggregateMinutelyStats(partition: Partition): Promise<any>;
}