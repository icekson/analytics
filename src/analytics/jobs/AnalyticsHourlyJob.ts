import {IPerformable} from "./IPerformable";
import * as log4js from 'log4js';
import config from 'config';
import {AggregationType} from "../Analytics";
import {Task} from "../aggregation/tasks/Task";
import {HourlyTask} from "../aggregation/tasks/HourlyTask";
import {AggregationJobParams} from "./AggregationJobParams";
import * as moment from "moment";
import {IDataAggregator} from "../aggregation/IDataAggregator";

export class AnalyticsHourlyJob implements IPerformable {
    private logger: log4js.Logger;

    constructor(private aggregator: IDataAggregator) {
        this.logger = log4js.getLogger('AnalyticsHourlyJob');
        this.logger.level = config.get('logging.level');
    }

    perform(params: any|AggregationJobParams): Promise<any> {
        return new Promise((resolve) => {
            try{
                let task: Task;
                let date = moment((params as AggregationJobParams).date);
                if((params as AggregationJobParams).type === AggregationType.Hourly){
                    task = new HourlyTask('analytics_hourly_stats', date);
                    task.run(async () => {
                        this.logger.info(task.getName() + ' task is running..., partition number: '+ task.getCurrentPartition().getPartitionNumber() +' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'));
                        let data = await this.aggregator.fetchHourlyStats(task.getCurrentPartition());
                        if(data && data.length > 0){
                            this.logger.warn('perform: Hourly data has already been collected for partition'+ task.getCurrentPartition().getPartitionNumber() +' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss') )
                            return;
                        }
                        await this.aggregator.aggregateHourlyStats(task.getCurrentPartition());
                    });
                    resolve();
                }
            }catch (e) {
                this.logger.error('perform error: ', e);
                resolve(e);
            }
        });
    }

}