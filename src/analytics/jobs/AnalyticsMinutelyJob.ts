import {IPerformable} from "./IPerformable";
import * as log4js from 'log4js';
import config from 'config';
import {AggregationType} from "../Analytics";
import {Task} from "../aggregation/tasks/Task";
import * as moment from "moment";
import {MinutelyTask} from "../aggregation/tasks/MinutelyTask";
import {AggregationJobParams} from "./AggregationJobParams";
import {IDataAggregator} from "../aggregation/IDataAggregator";

export class AnalyticsMinutelyJob implements IPerformable {
    private logger: log4js.Logger;

    constructor(private aggregator: IDataAggregator) {
        this.logger = log4js.getLogger('AnalyticsMinutelyJob');
        this.logger.level = config.get('logging.level');
    }

    perform(params: any|AggregationJobParams): Promise<any> {
        return new Promise((resolve) => {
            try{
                let task: Task;
                let date = moment((params as AggregationJobParams).date);
                if((params as AggregationJobParams).type === AggregationType.Minutely){
                    task = new MinutelyTask('analytics_minutely_stats', date);
                    task.run(async () => {
                        this.logger.info(task.getName() + ' task is running..., partition number: '+ task.getCurrentPartition().getPartitionNumber() +' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'));
                        let data = await this.aggregator.fetchMinutelyStats(task.getCurrentPartition());
                        if(data && data.length > 0){
                            this.logger.warn('perform: Minutely data has already been collected for partition'+ task.getCurrentPartition().getPartitionNumber() +' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss') )
                            return;
                        }
                        await this.aggregator.aggregateMinutelyStats(task.getCurrentPartition());
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