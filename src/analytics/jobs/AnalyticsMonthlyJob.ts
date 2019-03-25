import {IPerformable} from "./IPerformable";
import * as log4js from 'log4js';
import config from 'config';
import {AggregationType} from "../Analytics";
import {Task} from "../aggregation/tasks/Task";
import * as moment from "moment";
import {AggregationJobParams} from "./AggregationJobParams";
import {IDataAggregator} from "../aggregation/IDataAggregator";
import {MonthlyTask} from "../aggregation/tasks/MonthlyTask";

export class AnalyticsMonthlyJob implements IPerformable {
    private logger: log4js.Logger;

    constructor(private aggregator: IDataAggregator) {
        this.logger = log4js.getLogger('AnalyticsMonthlyJob');
        this.logger.level = config.get('logging.level');
    }

    perform(params: any|AggregationJobParams): Promise<any> {
        return new Promise((resolve) => {
            try{
                let task: Task;
                let date = moment((params as AggregationJobParams).date);
                if((params as AggregationJobParams).type === AggregationType.Monthly){
                    task = new MonthlyTask('analytics_monthly_stats', date);
                    task.run(async () => {
                        this.logger.info(task.getName() + ' task is running..., partition number: '+ task.getCurrentPartition().getPartitionNumber() +' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'));
                        let data = await this.aggregator.fetchMonthlyStats(task.getCurrentPartition());
                        if(data && data.length > 0){
                            this.logger.warn('perform: Monthly data has already been collected for partition'+ task.getCurrentPartition().getPartitionNumber() +' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss') )
                            return;
                        }
                        await this.aggregator.aggregateMonthlyStats(task.getCurrentPartition());
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