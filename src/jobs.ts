import * as path from 'path';
import * as log4js from 'log4js';
import {Container} from 'inversify';
import config from 'config';
import {container} from './inversify.config';
import * as kue from 'kue';
import {Worker} from './analytics/jobs/Worker';
import {Analytics, AnalyticsDailyJob, AnalyticsHourlyJob, AnalyticsMinutelyJob, IPerformable} from './analytics';
import {AnalyticsMonthlyJob} from './analytics/jobs/AnalyticsMonthlyJob';
import {AnalyticsEventsDAO} from './dao/AnalyticsEventsDAO';
import {AnalyticsAuditJob} from './jobs/AnalyticsAuditJob';
import {AnalyticsAuditor} from './analytics/AnalyticsAuditor';

export class JobsService {
    static readonly PORT = 3000;
    static readonly DEFAULT_TYPE = 'analytics';
    private queue: any;
    private port: string | number = 0;
    private container: Container = container;
    private logger: log4js.Logger;
    private type: string = 'analytics';

    constructor() {
        log4js.configure({
            appenders: {
                console: {type: 'console'},
                file: {type: 'file', filename: path.join(__dirname, '/../', config.get('logging').filePath)}
            },
            categories: {
                app: {appenders: ['file', 'console'], level: 'debug'},
                default: {appenders: ['console', 'file'], level: 'debug'}
            }
        });
        this.logger = log4js.getLogger('JobsService');
        this.logger.level = config.get('logging.level');

        this.config();
        this.listen();

    }

    private config(): void {
        this.port = process.env.PORT || JobsService.PORT;
        this.type = process.env.TYPE || JobsService.DEFAULT_TYPE;
        const queue = this.getQueue();
        const worker = new Worker();

        let monthlyJob: IPerformable = new AnalyticsMonthlyJob(this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO));
        queue.process(Analytics.AGGREGATION_MONTHLY_JOB, (data, done) => worker.process(monthlyJob, data, done));

        let dailyJob: IPerformable = new AnalyticsDailyJob(this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO));
        queue.process(Analytics.AGGREGATION_DAILY_JOB, (data, done) => worker.process(dailyJob, data, done));

        let hourlyJob: IPerformable = new AnalyticsHourlyJob(this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO));
        queue.process(Analytics.AGGREGATION_HOURLY_JOB, (data, done) => worker.process(hourlyJob, data, done));

        let minuteJob: IPerformable = new AnalyticsMinutelyJob(this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO));
        queue.process(Analytics.AGGREGATION_MINUTELY_JOB, (data, done) => worker.process(minuteJob, data, done));

        let auditJob: IPerformable = new AnalyticsAuditJob(new AnalyticsAuditor(this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO)));
        queue.process(AnalyticsAuditJob.NAME, (data, done) => worker.process(auditJob, data, done));
        
    }

    private portInUse(port, callback) {
        const server = net.createServer(function (socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });

        server.listen(port, '127.0.0.1');
        server.on('error', function (e) {
            callback(true);
        });
        server.on('listening', function (e) {
            server.close();
            callback(false);
        });
    };

    private listen(): void {

        this.portInUse(this.port, (res) => {
            if (!res) {
                kue.app.set('title', 'Queue');
                kue.app.listen(this.port);
                this.logger.info('Running jobs server on port %s, with environment %s', this.port, process.env.NODE_ENV ? process.env.NODE_ENV : 'default');
            } else {
                this.logger.warn('Queues dashboard already is running');
            }
        });

        process.on('SIGTERM', () => {
            this.logger.warn('server is terminated by SIGTERM call');
            this.getQueue().shutdown(5000, (err) => {
                console.log('Kue shutdown: ', err || '');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            this.logger.warn('server is terminated by SIGINT call');
        });
        this.queue.on('error', (err) => {
            this.logger.error('Kue queue error', err);
        });
    }

    public getQueue(): any {
        if(!this.queue){
            this.queue = kue.createQueue({
                prefix: 'jobs',
                redis: config.get('redis')
            });
        }
        return this.queue;
    }

    public getApp(){
        return kue.app;
    }
}
