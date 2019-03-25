import {IDataAuditor} from './aggregation/IDataAuditor';
import {AggregationType} from './Analytics';
import * as moment from 'moment';
import {IDataAggregator} from './aggregation';
import {DailyTask, HourlyTask, Partition, Task} from './aggregation/tasks';
import * as log4js from 'log4js';
import config from 'config';
import {MinutelyTask} from './aggregation/tasks/MinutelyTask';
import {MonthlyTask} from './aggregation/tasks/MonthlyTask';

export class AnalyticsAuditor implements IDataAuditor {
    private logger: log4js.Logger;
    private readonly runInterval = 2000;

    constructor(private aggregator: IDataAggregator) {
        this.logger = log4js.getLogger('AnalyticsAuditor');
        this.logger.level = config.get('logging.level');
    }

    async audit(from: moment.Moment, to: moment.Moment, type: AggregationType, keepHandle: boolean = true): Promise<void> {
        let current = from.clone().add(1, 'seconds');
        let task: Task | null = null;
        let unit: any | null = null;
        let fetchFunc: (partition: Partition) => Promise<any>;
        let aggregateFunc: (partition: Partition) => Promise<any>;
        this.logger.info('audit started for type ' + AggregationType[type] + ', for period: ' + from.format('YYYY-MM-DD HH:mm:ss') + ' - ' + to.format('YYYY-MM-DD HH:mm:ss'));
        switch (type) {
            case AggregationType.Minutely:
                task = new MinutelyTask('analytics_minutely_stats', current);
                fetchFunc = this.aggregator.fetchMinutelyStats;
                aggregateFunc = this.aggregator.aggregateMinutelyStats;
                unit = 'minutes';
                break;
            case AggregationType.Hourly:
                task = new HourlyTask('analytics_hourly_stats', current);
                fetchFunc = this.aggregator.fetchHourlyStats;
                aggregateFunc = this.aggregator.aggregateHourlyStats;
                unit = 'hours';
                break;
            case AggregationType.Daily:
                task = new DailyTask('analytics_daily_stats', current);
                fetchFunc = this.aggregator.fetchDailyStats;
                aggregateFunc = this.aggregator.aggregateDailyStats;
                unit = 'days';
                break;
            case AggregationType.Monthly:
                task = new MonthlyTask('analytics_monthly_stats', current);
                fetchFunc = this.aggregator.fetchMonthlyStats;
                aggregateFunc = this.aggregator.aggregateMonthlyStats;
                unit = 'months';
                break;
        }
        if (task === null || unit === null) {
            this.logger.warn('audit: Unsupported type of aggregation: ' + type);
            return;
        }


        const _exec = (task) => {
            return new Promise((resolve, reject) => {
                try {
                    task.runOnce(async () => {
                        if (task !== null) {
                            this.logger.info(task.getName() + ' task is running..., partition number: ' + task.getCurrentPartition().getPartitionNumber() + ' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'));
                            let data = await fetchFunc.call(this.aggregator, task.getCurrentPartition());
                            if (data && data.length > 0) {
                                this.logger.warn('audit: ' + AggregationType[type] + ' data has already been collected for partition' + task.getCurrentPartition().getPartitionNumber() + ' for period - from: %s; to: %s', task.getCurrentPartition().dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), task.getCurrentPartition().dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'))
                                resolve();
                                return;
                            }
                            this.logger.debug('run aggregation function...');
                            await aggregateFunc.call(this.aggregator, task.getCurrentPartition());
                            this.logger.debug('aggregation is completed...');
                            resolve();
                        }
                    });

                } catch (e) {
                    this.logger.error('audit error: ', e);
                    reject(e);
                }
            });
        };
        if(keepHandle) {
            let handler = setInterval(() => {
                if (task !== null) {
                    if (handler && task.getExecutionTime().getTime() >= Number.parseInt(to.format('x'))) {
                        clearInterval(handler)
                    }
                    _exec.call(this, task);
                    task.incrementPartition();
                }
            }, this.runInterval);
        }else {
            _exec.call(this, task).then(() => process.exit(0));
        }
    }
}