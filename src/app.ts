import * as fs from 'fs';
import * as path from 'path';
import * as log4js from 'log4js';
import * as express from 'express';
import * as socketIo from 'socket.io';

import {Container} from 'inversify';
import {createServer, Server} from 'http';
import SocketIOStatic = require('socket.io');
import {createServer as createHTTPSServer, Server as HTTPSServer} from 'https';
import config from 'config';
import {container} from './inversify.config';
import {IDataAggregator} from './analytics/aggregation';
import {Analytics, DBTracker, SocketIOHandler} from './analytics';
import {AnalyticsEventsDAO} from './dao/AnalyticsEventsDAO';
import {RealTimeTracker} from './analytics/RealTimeTracker';
import * as kue from 'kue';

export class AppServer {
    public static readonly PORT: number = 8080;
    private app: express.Application;
    private server: Server | HTTPSServer;
    private io: SocketIOStatic.Server[];
    private port: string | number = 0;
    private container: Container = container;
    private logger: log4js.Logger;
    private certsPath = path.join(__dirname, 'config/certs', 'server');
    private queue: any;

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
        this.logger = log4js.getLogger('AppServer');
        this.logger.level = config.get('logging.level');
        this.app = express();
        this.config();
        this.io = [];
        this.initAnalytics();
        this.listen();

    }

    private config(): void {
        this.port = process.env.PORT || AppServer.PORT;
        const app = this.getApp();
        app.use(log4js.connectLogger(this.logger, {
            level: config.get('logging.level'),
            format: ':status :method :url',
            nolog: '\\.gif|\\.jpg|\\.png$'
        }));

        // catch 404 and forward to error handler
        app.use(function (req, res, next) {
            const err: any = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        if (app.get('env') === 'dev') {
            app.use(function (err: any, req: any, res: any) {
                res.status(err.status || 500)
                    .json({
                        message: err.message,
                        error: err
                    });
            });
        }

        // production error handler
        // no stacktraces leaked to user
        app.use(function (err: any, req: any, res: any) {
            res.status(err.status || 500)
                .json({
                    message: err.message,
                    error: {}
                });
        });

        if (config.get('ssl')) {
            const options = {
                key: fs.readFileSync(path.join(this.certsPath, 'my-server.key.pem'))
                , cert: fs.readFileSync(path.join(this.certsPath, 'my-server.crt.pem'))
                , requestCert: false
                , rejectUnauthorized: true
            };
            this.server = createHTTPSServer(options, this.app);
        } else {
            this.server = createServer(this.app);
        }
    }

    private async initAnalytics() {
        const io = socketIo(this.server, {path: '/analytics'});
        this.io.push(io);
        
        const analyticsDAO = this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO);
        const analytics = new Analytics({
            redis: config.get('redis'),
            aggregator: analyticsDAO as IDataAggregator,
            audit: config.get('analytics').audit
        });
        const ioHandler = new SocketIOHandler(io);
        analytics.registerHandler(ioHandler);
        const tracker = new DBTracker(analyticsDAO);
        analytics.registerTracker(tracker);

        const realTimeTracker = container.get<RealTimeTracker>(RealTimeTracker);
        analytics.registerTracker(realTimeTracker);
        //
        //
        // // TODO: remove it later
        // const io2 = socketIo(this.server);
        // this.io.push(io2);
        // const ioHandler2 = new SocketIOHandler(io2);
        // analytics.registerHandler(ioHandler2);

        analytics.handle();

    }

    private listen(): void {
        this.server.listen(this.port, () => {
            this.logger.info('Running server on port %s, with environment %s', this.port, process.env.NODE_ENV ? process.env.NODE_ENV : 'default');
        });
        process.on('SIGTERM', () => {
            this.logger.warn('server is terminated by SIGTERM call');
            this.io.forEach((io) => {
                io.close(() => {
                    process.exit(0);
                });
            });
        });
        process.on('SIGINT', () => {
            this.logger.warn('server is terminated by SIGINT call');
            this.io.forEach((io) => {
                io.close(() => {
                    process.exit(0);
                });
            });
        });
    }

    public getApp(): express.Application {
        return this.app;
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
}
