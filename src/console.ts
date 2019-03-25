import 'reflect-metadata';
import * as path from 'path';
import * as log4js from 'log4js';
import {Container} from 'inversify';
import config from './config/config';
import {container} from './inversify.config';
import * as kue from 'kue';
import * as clear from 'clear';
import * as chalk from 'chalk';
import * as figlet from 'figlet';
import {Console} from './console/Console';
import {AnalyticsAggregateCommand, AnalyticsCommand} from './console/commands/AnalyticsAggregateCommand';
import {ICommand} from './console/ICommand';
import {AnalyticsAuditCommand} from './console/commands/AnalyticsAuditCommand';
import {AnalyticsAuditor} from './analytics/AnalyticsAuditor';
import {AnalyticsEventsDAO} from './dao/AnalyticsEventsDAO';

export class AppConsole {
    private container: Container = container;
    private logger: log4js.Logger;
    private queue: any;
    private cmd: Console;

    constructor() {
        log4js.configure({
            appenders: {
                console: {type: 'console'},
                file: {type: 'file', filename: path.join(__dirname, '/../console.log')}
            },
            categories: {
                app: {appenders: ['file', 'console'], level: 'debug'},
                default: {appenders: ['console', 'file'], level: 'debug'}
            }
        });
        this.logger = log4js.getLogger('Console');
        this.logger.level = config.get('logging.level');
        this.config();
    }

    private config(): void {
        this.cmd = this.container.get<Console>(Console);
        let auditCmd: ICommand = new AnalyticsAuditCommand(new AnalyticsAuditor(this.container.get<AnalyticsEventsDAO>(AnalyticsEventsDAO)));
        this.cmd.register(auditCmd);
    }

    public run(args: Array<any>): void{
        clear();
        console.log(
            chalk.green(
                figlet.textSync('Configurator CLI', { horizontalLayout: 'full' })
            )
        );
        this.cmd.run(args);
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
const cmd = new AppConsole();
cmd.run(process.argv.slice(2));
