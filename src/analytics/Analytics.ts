import {IAnalyticsHandler} from './handlers/IAnalyticsHandler';
import {IAnalyticsTracker} from './IAnalyticsTracker';
import {LogEvent} from './LogEvent';
import * as log4js from 'log4js';
import config from 'config';
import * as kue from 'kue';
import * as moment from 'moment';
import axios from 'axios';
import {IDataAdapter} from './aggregation/adapter/IDataAdapter';
import {DefaultDataAdapter} from './aggregation/adapter/DefaultDataAdapter';
import {IDataCollector, IDataStructure} from './aggregation';
import {IRealTimeDataCollector} from './aggregation/IRealTimeDataCollector';
import {AnalyticsAuditJob} from './jobs/AnalyticsAuditJob';


export enum AggregationType {
    RealTime,
    Hourly,
    Daily,
    Weekly,
    Monthly,
    Minutely
}


export enum TimeInterval {
    RealTime,
    Hour,
    Day,
    Week,
    Month,
    Year
}

export class Analytics {
    static readonly AGGREGATION_HOURLY_JOB = 'analytics_hourly_job';
    static readonly AGGREGATION_DAILY_JOB = 'analytics_daily_job';
    static readonly AGGREGATION_MINUTELY_JOB = 'analytics_minutely_job';
    static readonly AGGREGATION_MONTHLY_JOB = 'analytics_monthly_job';
    private handlers: Set<IAnalyticsHandler>;
    private trackers: Set<IAnalyticsTracker>;
    private options: any;
    private queue: kue.Queue;
    private logger: log4js.Logger;
    private auditHandler: any;
    private auditedHours: Set<any> = new Set();

    constructor(options?: any) {
        this.logger = log4js.getLogger('Analytics');
        this.logger.level = config.get('logging.level');
        this.handlers = new Set();
        this.trackers = new Set();
        this.options = options;

        this.queue = kue.createQueue({
            prefix: 'jobs',
            redis: this.options.redis
        });
        // const worker = new Worker();

        // let monthlyJob: IPerformable = new AnalyticsMonthlyJob(this.aggregator);
        // this.queue.process(Analytics.AGGREGATION_MONTHLY_JOB, (data, done) => worker.process(monthlyJob, data, done));
        //
        // let dailyJob: IPerformable = new AnalyticsDailyJob(this.aggregator);
        // this.queue.process(Analytics.AGGREGATION_DAILY_JOB, (data, done) => worker.process(dailyJob, data, done));
        //
        // let hourlyJob: IPerformable = new AnalyticsHourlyJob(this.aggregator);
        // this.queue.process(Analytics.AGGREGATION_HOURLY_JOB, (data, done) => worker.process(hourlyJob, data, done));
        //
        // let minuteJob: IPerformable = new AnalyticsMinutelyJob(this.aggregator);
        // this.queue.process(Analytics.AGGREGATION_MINUTELY_JOB, (data, done) => worker.process(minuteJob, data, done));

        this.checkAndRunNewJobs();
        this.auditHandler = setInterval(() => {
            this.runAudit();
        }, 60*1000) // run each minute

    }

    public registerHandler(handler: IAnalyticsHandler) {
        this.handlers.add(handler);
        return this;
    }

    public registerTracker(tracker: IAnalyticsTracker) {
        this.trackers.add(tracker);
        return this;
    }

    handle() {
        this.handlers.forEach((h: IAnalyticsHandler) => h.handle(this));
    }

    async trackEvent(eventData: LogEvent) {
        this.trackers.forEach((t: IAnalyticsTracker) => t.trackEvent(eventData))
    }

    public static async collectData(filters: { from: moment.Moment, to: moment.Moment }, aggregation: AggregationType, collector: IDataCollector, dataAdapter?: IDataAdapter): Promise<any> {
        if (!dataAdapter) {
            dataAdapter = new DefaultDataAdapter();
        }
        let data: IDataStructure | null = null;

        switch (aggregation) {
            case AggregationType.Hourly:
                data = await collector.collectHourlyStats(filters.from, filters.to);
                break;
            case AggregationType.Weekly:
            case AggregationType.Daily:
                data = await collector.collectDailyStats(filters.from, filters.to);
                break;
            case AggregationType.Monthly:
                data = await collector.collectMonthlyStats(filters.from, filters.to);
                break;
            case AggregationType.Minutely:
                data = await collector.collectMinutelyStats(filters.from, filters.to);
                break;
        }

        return dataAdapter.convert(data);
    }

    public static async getRealTimeStats(collector: IRealTimeDataCollector, dataAdapter?: IDataAdapter): Promise<any> {
        if (!dataAdapter) {
            dataAdapter = new DefaultDataAdapter();
        }
        let data = collector.collectRealTimeStats();
        return dataAdapter.convert(data);
    }

    private checkAndRunNewJobs() {

        setTimeout(() => {
            axios({
                method: 'get',
                url: 'http://localhost:3000/jobs/' + Analytics.AGGREGATION_MONTHLY_JOB + '/delayed/0..100',
                responseType: 'json'
            }).then((response) => {
                if (response.status === 200) {
                    if (response.data && response.data.length !== undefined) {
                        let minStarted = response.data.find((t) => t.type === Analytics.AGGREGATION_MONTHLY_JOB && t.data.type === AggregationType.Monthly);
                        if (!minStarted) {

                            // run monthly task
                            this.queue.create(Analytics.AGGREGATION_MONTHLY_JOB, {
                                type: AggregationType.Monthly,
                                partition: moment().utc().get('months'),
                                date: moment().toISOString()
                            }).save();
                        }
                    }
                } else {
                    this.logger.error('checkAndRunNewJobs: Cannot lod jobs stats ');
                }
            }).catch((e) => {
                this.logger.error('checkAndRunNewJobs error ', e);
            });


            axios({
                method: 'get',
                url: 'http://localhost:3000/jobs/' + Analytics.AGGREGATION_MINUTELY_JOB + '/delayed/0..100',
                responseType: 'json'
            }).then((response) => {
                if (response.status === 200) {
                    if (response.data && response.data.length !== undefined) {
                        let minStarted = response.data.find((t) => t.type === Analytics.AGGREGATION_MINUTELY_JOB && t.data.type === AggregationType.Minutely);
                        if (!minStarted) {

                            // run minutely task
                            this.queue.create(Analytics.AGGREGATION_MINUTELY_JOB, {
                                type: AggregationType.Minutely,
                                partition: moment().utc().get('minutes'),
                                date: moment().toISOString()
                            }).save();
                        }
                    }
                } else {
                    this.logger.error('checkAndRunNewJobs: Cannot lod jobs stats ');
                }
            }).catch((e) => {
                this.logger.error('checkAndRunNewJobs error ', e);
            });

            axios({
                method: 'get',
                url: 'http://localhost:3000/jobs/' + Analytics.AGGREGATION_HOURLY_JOB + '/delayed/0..100',
                responseType: 'json'
            }).then((response) => {
                if (response.status === 200) {
                    if (response.data && response.data.length !== undefined) {
                        let hourlyStarted = response.data.find((t) => t.type === Analytics.AGGREGATION_HOURLY_JOB && t.data.type === AggregationType.Hourly);
                        if (!hourlyStarted) {

                            // run hourly task
                            this.queue.create(Analytics.AGGREGATION_HOURLY_JOB, {
                                type: AggregationType.Hourly,
                                partition: moment().utc().get('hours'),
                                date: moment().toISOString()
                            }).save();
                        }
                    }
                } else {
                    this.logger.error('checkAndRunNewJobs: Cannot lod jobs stats ');
                }
            }).catch((e) => {
                this.logger.error('checkAndRunNewJobs error ', e);
            });


            axios({
                method: 'get',
                url: 'http://localhost:3000/jobs/' + Analytics.AGGREGATION_DAILY_JOB + '/delayed/0..100',
                responseType: 'json'
            }).then((response) => {
                if (response.status === 200) {
                    if (response.data && response.data.length !== undefined) {
                        let dailyStarted = response.data.find((t) => t.type === Analytics.AGGREGATION_DAILY_JOB && t.data.type === AggregationType.Daily);
                        if (!dailyStarted) {
                            // run daily task
                            this.queue.create(Analytics.AGGREGATION_DAILY_JOB, {
                                type: AggregationType.Daily,
                                partition: moment().get('days'),
                                date: moment().toISOString()
                            }).save();
                        }
                    }
                } else {
                    this.logger.error('checkAndRunNewJobs: Cannot lod jobs stats ');
                }
            }).catch((e) => {
                this.logger.error('checkAndRunNewJobs error ', e);
            });
        }, 5000);

    }

    private runAudit() {
        const runTime = this.options.audit.time;
        const now: moment.Moment = moment();
        if(now.format('HH:mm') === runTime && !this.isAudited(now)) {
            const from: moment.Moment = moment(now.clone().subtract(1, 'days').format('YYYY-MM-DD 00:00:00'), 'YYYY-MM-DD hh:mm:ss');
            const to: moment.Moment = moment(now.clone().subtract(1, 'days').format('YYYY-MM-DD 23:59:59'), 'YYYY-MM-DD hh:mm:ss');
            const types = [AggregationType.Hourly, AggregationType.Minutely, AggregationType.Daily];
            this.auditedHours.add(from.format('YYYY-DD-MM'));
            types.forEach((type) => {
                this.logger.info('Enqueue analytics audit task for ' + AggregationType[type] + ' type, on interval ' + from.format('YYYY-MM-DD HH:mm:ss') + ' - ' + to.format('YYYY-MM-DD HH:mm:ss'));
                this.queue.create(AnalyticsAuditJob.NAME, {
                    from: from.format('YYYY-MM-DDTHH:mm:ss'),
                    to: to.format('YYYY-MM-DDTHH:mm:ss'),
                    type: type
                })
                    .priority('high')
                    .delay(0)
                    .save();
            });
        }
    }

    private isAudited(date: moment.Moment): boolean {
        return this.auditedHours.has(date.clone().subtract(1, 'days').format('YYYY-MM-DD'));
    }

}