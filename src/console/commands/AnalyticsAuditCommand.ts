import {ICommand} from "../ICommand";
import {injectable} from "inversify";
import {ParsedArgs} from "minimist";
import * as moment from "moment";
import {AggregationType} from "../../analytics";
import {AnalyticsAuditor} from "../../analytics/AnalyticsAuditor";
import * as log4js from "log4js";

@injectable()
export class AnalyticsAuditCommand implements ICommand
{
    private logger: log4js.Logger;
    constructor(private auditor: AnalyticsAuditor) {
        this.logger = log4js.getLogger(this.getName());
        this.logger.level = 'debug';
    }
    getName(): string {
        return "analytics:audit";
    }

    run(args: ParsedArgs): void {
        let from: any = args.from;
        let to: any = args.to;
        let type: any = args.type;
        if(!from) {
            this.logger.info('\'--from\' is required');
            return;
        }
        if(!to) {
            this.logger.info('\'--to\' is required');
            return;
        }

        if(!type) {
            this.logger.info('\'--type\' is required');
            return;
        }

        let v: any = args.verbose;
        try {
            from = moment(from);
            to = moment(to);
            type = AggregationType[type.substring(0, 1).toUpperCase() + type.substring(1)];
            if(!type) {
                this.logger.info('Invalid \'--type\' is given, acceptable types: ' + Object.keys(AggregationType)
                    .filter((n) => typeof AggregationType[n] === 'number' && AggregationType[n] !== AggregationType.RealTime)
                    .toString()
                    .toLowerCase());
                return;
            }
            this.auditor.audit(from, to, type, false);
        } catch (e) {
            this.logger.error('perform error: ', e);
        }
    }

    getDescription(): string {
        return "analytics command to AUDIT analytics aggregation";
    }

    getInputParameters(): string[] {
        return ['from', 'to', 'type'];
    }

    getOptions(): string[] {
        return ['verbose'];
    }

    getAliases(): {[key: string]: string} {
        return {t: 'type', v: 'verbose'};
    }

}