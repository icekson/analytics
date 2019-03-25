import {inject, injectable} from 'inversify';
import * as log4js from 'log4js';

import config from 'config';
import {AnalyticsData} from '../util/AnalyticsStructures';
import {AggregationType, Analytics} from '../analytics/Analytics';
import {ChartJSDataAdapter} from '../analytics/aggregation/adapter/ChartJSDataAdapter';
import {AnalyticsEventsDAO} from '../dao/AnalyticsEventsDAO';
import {IDataCollector} from '../analytics/aggregation/IDataCollector';
import * as moment from 'moment';
import {IPerformable} from '../analytics/jobs/IPerformable';
import {AnalyticsHourlyJob} from '../analytics/jobs/AnalyticsHourlyJob';
import {AnalyticsMinutelyJob} from '../analytics/jobs/AnalyticsMinutelyJob';
import {AnalyticsDailyJob} from '../analytics/jobs/AnalyticsDailyJob';
import {AnalyticsMonthlyJob} from '../analytics/jobs/AnalyticsMonthlyJob';
import {AggregationJobParams} from '../analytics/jobs/AggregationJobParams';
import {RealTimeTracker} from '../analytics/RealTimeTracker';
import {IRealTimeDataCollector} from '../analytics/aggregation/IRealTimeDataCollector';

@injectable()
export class AnalyticsService {
    private logger: log4js.Logger;

    constructor(@inject(AnalyticsEventsDAO) private analyticsDAO: AnalyticsEventsDAO, @inject(RealTimeTracker) private realTimeTracker: RealTimeTracker) {
        this.logger = log4js.getLogger('AnalyticsService');
        this.logger.level = config.get('logging.level');
    }

    async getAggregatedStats(filters: any, aggregationType: AggregationType): Promise<AnalyticsData> {
        try{
            if(aggregationType === AggregationType.RealTime){
                return Analytics.getRealTimeStats(this.realTimeTracker as IRealTimeDataCollector, new ChartJSDataAdapter());
            }else {
                return Analytics.collectData({
                    from: moment(filters.from, 'YYYY-MM-DD HH:mm:ss'),
                    to: moment(filters.to, 'YYYY-MM-DD HH:mm:ss')
                }, aggregationType, this.analyticsDAO as IDataCollector, new ChartJSDataAdapter());
            }
        }catch (e){
            this.logger.error('getAggregatedStats: error, ', e);
            throw e;
        }

    }

    async aggregateStatsForInterval(date: string, aggregationType: AggregationType) {
        try{
            let job: null | IPerformable = null;
            switch (aggregationType){
                case AggregationType.Minutely:
                    job = new AnalyticsMinutelyJob(this.analyticsDAO);
                    break;
                case AggregationType.Hourly:
                    job = new AnalyticsHourlyJob(this.analyticsDAO);
                    break;
                case AggregationType.Daily:
                    job = new AnalyticsDailyJob(this.analyticsDAO);
                    break;
                case AggregationType.Monthly:
                    job = new AnalyticsMonthlyJob(this.analyticsDAO);
                    break;
            }
            if(job !== null){
                job.perform({
                    type: aggregationType,
                    date: date
                } as AggregationJobParams);
            }
        }catch (e){
            this.logger.error('aggregateStatsForInterval: ', e);
        }
    }

}