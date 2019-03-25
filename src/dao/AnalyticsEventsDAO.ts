import * as log4js from 'log4js';
import {QueryTypes} from 'sequelize';
import {inject, injectable} from 'inversify';

import config from 'config';
import {LogEvent} from '../analytics';
import {OrmService} from '../services/OrmService';
import {IDataAggregator} from '../analytics/aggregation';
import {Partition} from '../analytics/aggregation/tasks';
import {IDataCollector, IDataStructure} from '../analytics/aggregation';
import * as moment from 'moment';

const named = require('yesql').mysql;

@injectable()
export class AnalyticsEventsDAO implements IDataAggregator, IDataCollector {
    private logger: log4js.Logger;

    constructor(@inject(OrmService) private ormService: OrmService) {
        this.logger = log4js.getLogger('AnalyticsEventsDAO');
        this.logger.level = config.get('logging.level');
    }

    public async logEvent(eventData: LogEvent): Promise<Acl | null> {
        try {
            // await this.ormService.orm.authenticate();
            let sql = 'insert into `analytics_log` (';
            let names: string[] = [];
            let values: any[] = [];
            Object.keys(eventData).forEach((name) => {
                let val = eventData[name];
                names.push('`' + name + '`');
                if (val) {
                    values.push(`'${val}'`);
                } else {
                    values.push('null');
                }
            });

            sql += names.join(',') + ') values (';
            sql += values.join(',') + ')';

            this.ormService.orm.query(sql);
        } catch (e) {
            this.logger.error('logEvent error: ', e);
        }
        return null;
    }


    async fetchHourlyStats(partition: Partition): Promise<any> {
        let res = null;
        try {
            let sql = 'select * from analytics_hourly_stats\n' +
                'where `date` = :date && `partition` = :partition ';
            res = await this.ormService.orm.query(sql, {
                replacements: {
                    date: partition.dateTimeInterval().from.format('YYYY-MM-DD'),
                    partition: partition.getPartitionNumber()
                }, type: QueryTypes.SELECT
            });
        } catch (e) {
            this.logger.error('fetchHourlyStats error: ', e);
        }
        return res;

    }

    async fetchDailyStats(partition: Partition): Promise<any> {
        let res = null;
        try {
            let sql = 'select * from analytics_daily_stats\n' +
                'where `date` = :date';
            res = await this.ormService.orm.query(sql, {
                replacements: {date: partition.dateTimeInterval().from.format('YYYY-MM-DD')},
                type: QueryTypes.SELECT
            });
        } catch (e) {
            this.logger.error('fetchDailyStats error: ', e);
        }
        return res;
    }

    async fetchMinutelyStats(partition: Partition): Promise<any> {
        let res = null;
        try {
            let sql = 'select * from analytics_minutely_stats\n' +
                'where `date` = :date && `partition` = :partition ';
            res = await this.ormService.orm.query(sql, {
                replacements: {
                    date: partition.dateTimeInterval().from.format('YYYY-MM-DD HH:00:00'),
                    partition: partition.getPartitionNumber()
                }, type: QueryTypes.SELECT
            });
        } catch (e) {
            this.logger.error('fetchMinutelyStats error: ', e);
        }
        return res;
    }

    async fetchMonthlyStats(partition: Partition): Promise<any> {
        let res = null;
        try {
            let sql = 'select * from analytics_monthly_stats\n' +
                'where `year` = :year && `month` = :month ';
            res = await this.ormService.orm.query(sql, {
                replacements: {
                    year: Number.parseInt(partition.dateTimeInterval().from.format('YYYY')),
                    month: partition.getPartitionNumber()
                }, type: QueryTypes.SELECT
            });
        } catch (e) {
            this.logger.error('fetchMonthlyStats error: ', e);
        }
        return res;
    }

    async aggregateHourlyStats(partition: Partition): Promise<any> {
        try {
            let sql = `INSERT INTO \`analytics_hourly_stats\`
            SELECT 
              id,
              \`date\`,
              \`partition\`,
              collectedAt,
              SUM(visitors) AS visitors,
              SUM(sessions) AS sessions,
              SUM(configurations) AS configurations,
              SUM(avgSessionDuration) AS avgSessionDuration,
              SUM(avgConfigurationsPerSession) AS avgConfigurationsPerSession,
              SUM(avgConfigurationsPerVisitor) AS avgConfigurationsPerVisitor,
              SUM(avgSessionsPerVisitor) AS avgSessionsPerVisitor,
              SUM(savedConfigurations) AS savedConfigurations 
            FROM
              (
                (SELECT 
                  NULL AS id,
                  \`date\`,
                  \`partition\`,
                  collectedAt,
                  COUNT(DISTINCT visitorId) AS visitors,
                  COUNT(*) AS sessions,
                  SUM(configurations) AS configurations,
                  AVG(sessionDuration) / COUNT(*) AS avgSessionDuration,
                  SUM(configurations) / COUNT(*) AS avgConfigurationsPerSession,
                  SUM(configurations) / COUNT(DISTINCT visitorId) AS avgConfigurationsPerVisitor,
                  COUNT(*) / COUNT(DISTINCT visitorId) AS avgSessionsPerVisitor,
                  SUM(savedConfigurations) AS savedConfigurations 
                FROM
                  (SELECT 
                    DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,
                    HOUR(FROM_UNIXTIME(\`time\`)) AS \`partition\`,
                    visitorId,
                    sessionId,
                    MAX(
                      IF(
                        \`type\` = 'session_duration',
                        \`data\`,
                        0
                      )
                    ) AS sessionDuration,
                    SUM(IF(\`type\` = 'pick_variant', 1, 0)) AS configurations,
                    AVG(
                      IF(
                        \`type\` = 'pick_variant_duration',
                        \`data\`,
                        0
                      )
                    ) AS configurationDuration,
                    SUM(
                      IF(\`type\` = 'save_configuration', 1, 0)
                    ) AS savedConfigurations,
                    NOW() AS collectedAt 
                  FROM
                    analytics_log 
                  WHERE \`time\` BETWEEN UNIX_TIMESTAMP(?) 
                    AND UNIX_TIMESTAMP(?) 
                  GROUP BY visitorId,
                    sessionId,
                    HOUR(FROM_UNIXTIME(\`time\`))) AS tmp_hourly_stats_intermediate 
                GROUP BY \`date\`,
                  \`partition\`) 
                UNION
                (SELECT 
                  NULL AS id,
                  DATE(?) AS \`date\`,
                  HOUR(?) AS \`partition\`,
                  NOW() AS collectedAt,
                  0 AS visitors,
                  0 AS sessions,
                  0 AS configurations,
                  0 AS avgSessionDuration,
                  0 AS avgConfigurationsPerSession,
                  0 AS avgConfigurationsPerVisitor,
                  0 AS avgSessionsPerVisitor,
                  0 AS savedConfigurations)
              ) AS aaa            
            
            `;
            await (await this.ormService.getConnection()).execute(sql, [partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')]);

            // aggregate common stats
            sql = named(`INSERT INTO  analytics_common_hourly_stats (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	
                    HOUR(FROM_UNIXTIME(\`time\`)) AS \`partition\`, 
                    'browser' AS metricName,
                    browser AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY browser, HOUR(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	
                    HOUR(FROM_UNIXTIME(\`time\`)) AS \`partition\`, 
                    'device' AS metricName,
                    device AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY device, HOUR(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    HOUR(FROM_UNIXTIME(\`time\`)) AS \`partition\`,
                    'country' AS metricName,
                    country AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY country, HOUR(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	
                    HOUR(FROM_UNIXTIME(\`time\`)) AS \`partition\`, 
                    'os' AS metricName,
                    os AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY os, HOUR(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    HOUR(FROM_UNIXTIME(\`time\`)) AS \`partition\`,
                    'variant' AS metricName,
                    SUBSTRING_INDEX(\`event\`, ':', -1) AS metricValue,
                    CONCAT(SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 2), ':', -1), ':',  SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 3), ':', -1)) AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`type\` = 'pick_variant' && \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY \`event\`, HOUR(FROM_UNIXTIME(\`time\`)))
                    `)({
                from: partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'),
                to: partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')
            });
            await (await this.ormService.getConnection()).query(sql);

        } catch (e) {
            this.logger.error('aggregateHourlyStats error: ', e);
        }
    }

    async aggregateDailyStats(partition: Partition): Promise<any> {
        try {

            let sql = `INSERT INTO \`analytics_daily_stats\` SELECT 
              id,
              \`date\`,
              collectedAt,
              SUM(visitors) AS visitors,
              SUM(sessions) AS sessions,
              SUM(configurations) AS configurations,
              SUM(avgSessionDuration) AS avgSessionDuration,
              SUM(avgConfigurationsPerSession) AS avgConfigurationsPerSession,
              SUM(avgConfigurationsPerVisitor) AS avgConfigurationsPerVisitor,
              SUM(avgSessionsPerVisitor) AS avgSessionsPerVisitor,
              SUM(savedConfigurations) AS savedConfigurations 
            FROM
              (
                (SELECT 
                  NULL AS id,
                  \`date\`,
                  collectedAt,
                  COUNT(DISTINCT visitorId) AS visitors,
                  COUNT(*) AS sessions,
                  SUM(configurations) AS configurations,
                  AVG(sessionDuration) / COUNT(*) AS avgSessionDuration,
                  SUM(configurations) / COUNT(*) AS avgConfigurationsPerSession,
                  SUM(configurations) / COUNT(DISTINCT visitorId) AS avgConfigurationsPerVisitor,
                  COUNT(*) / COUNT(DISTINCT visitorId) AS avgSessionsPerVisitor,
                  SUM(savedConfigurations) AS savedConfigurations 
                FROM
                  (SELECT 
                    DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,
                    visitorId,
                    sessionId,
                    MAX(
                      IF(
                        \`type\` = 'session_duration',
                        \`data\`,
                        0
                      )
                    ) AS sessionDuration,
                    SUM(IF(\`type\` = 'pick_variant', 1, 0)) AS configurations,
                    AVG(
                      IF(
                        \`type\` = 'pick_variant_duration',
                        \`data\`,
                        0
                      )
                    ) AS configurationDuration,
                    SUM(
                      IF(\`type\` = 'save_configuration', 1, 0)
                    ) AS savedConfigurations,
                    NOW() AS collectedAt 
                  FROM
                    analytics_log 
                  WHERE \`time\` BETWEEN UNIX_TIMESTAMP(?) 
                    AND UNIX_TIMESTAMP(?) 
                  GROUP BY visitorId,
                    sessionId,
                    DATE(FROM_UNIXTIME(\`time\`))) AS tmp_daily_stats_intermediate 
                GROUP BY \`date\`) 
                UNION
                (SELECT 
                  NULL AS id,
                  DATE(?) AS \`date\`,
                  NOW() AS collectedAt,
                  0 AS visitors,
                  0 AS sessions,
                  0 AS configurations,
                  0 AS avgSessionDuration,
                  0 AS avgConfigurationsPerSession,
                  0 AS avgConfigurationsPerVisitor,
                  0 AS avgSessionsPerVisitor,
                  0 AS savedConfigurations)
              ) AS aaa `;
            await (await this.ormService.getConnection()).execute(sql, [partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')]);


            // aggregate common stats
            sql = named(`INSERT INTO  analytics_common_daily_stats (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    'browser' AS metricName,
                    browser AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY browser, DATE(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    'device' AS metricName,
                    device AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY device, DATE(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    'country' AS metricName,
                    country AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY country, DATE(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    'os' AS metricName,
                    os AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY os, DATE(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,	 
                    'variant' AS metricName,
                    SUBSTRING_INDEX(\`event\`, ':', -1) AS metricValue,
                    CONCAT(SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 2), ':', -1), ':',  SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 3), ':', -1)) AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`type\` = 'pick_variant' && \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY \`event\`, DATE(FROM_UNIXTIME(\`time\`)))
                    `)({
                from: partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'),
                to: partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')
            });
            await (await this.ormService.getConnection()).query(sql);

        } catch (e) {
            this.logger.error('aggregateDailyStats error: ', e);
        }
    }

    async aggregateMinutelyStats(partition: Partition): Promise<any> {
        try {
            let sql = `INSERT INTO \`analytics_minutely_stats\` SELECT 
              id,
              \`date\`,
              \`partition\`,
              collectedAt,
              SUM(visitors) AS visitors,
              SUM(sessions) AS sessions,
              SUM(configurations) AS configurations,
              SUM(avgSessionDuration) AS avgSessionDuration,
              SUM(avgConfigurationsPerSession) AS avgConfigurationsPerSession,
              SUM(avgConfigurationsPerVisitor) AS avgConfigurationsPerVisitor,
              SUM(avgSessionsPerVisitor) AS avgSessionsPerVisitor,
              SUM(savedConfigurations) AS savedConfigurations 
            FROM
              (
                (SELECT 
                  NULL AS id,
                  \`date\`,
                  \`partition\`,
                  collectedAt,
                  COUNT(DISTINCT visitorId) AS visitors,
                  COUNT(*) AS sessions,
                  SUM(configurations) AS configurations,
                  AVG(sessionDuration) / COUNT(*) AS avgSessionDuration,
                  SUM(configurations) / COUNT(*) AS avgConfigurationsPerSession,
                  SUM(configurations) / COUNT(DISTINCT visitorId) AS avgConfigurationsPerVisitor,
                  COUNT(*) / COUNT(DISTINCT visitorId) AS avgSessionsPerVisitor,
                  SUM(savedConfigurations) AS savedConfigurations 
                FROM
                  (SELECT 
                    CONCAT(
                      DATE(FROM_UNIXTIME(\`time\`)),
                      ' ',
                      HOUR(FROM_UNIXTIME(\`time\`)),                     
                      ':00:00'
                    ) AS \`date\`,
                    MINUTE(FROM_UNIXTIME(\`time\`)) AS \`partition\`,
                    visitorId,
                    sessionId,
                    MAX(
                      IF(
                        \`type\` = 'session_duration',
                        \`data\`,
                        0
                      )
                    ) AS sessionDuration,
                    SUM(IF(\`type\` = 'pick_variant', 1, 0)) AS configurations,
                    AVG(
                      IF(
                        \`type\` = 'pick_variant_duration',
                        \`data\`,
                        0
                      )
                    ) AS configurationDuration,
                    SUM(
                      IF(\`type\` = 'save_configuration', 1, 0)
                    ) AS savedConfigurations,
                    NOW() AS collectedAt 
                  FROM
                    analytics_log 
                  WHERE \`time\` BETWEEN UNIX_TIMESTAMP(?) 
                    AND UNIX_TIMESTAMP(?) 
                  GROUP BY visitorId,
                    sessionId,
                    MINUTE(FROM_UNIXTIME(\`time\`))) as tmp_minutely_stats_intermediate 
                GROUP BY \`date\`,
                  \`partition\`) 
                union
                (SELECT 
                  NULL AS id,
                  ? AS \`date\`,
                  MINUTE(?) AS \`partition\`,
                  NOW() AS collectedAt,
                  0 AS visitors,
                  0 AS sessions,
                  0 AS configurations,
                  0 AS avgSessionDuration,
                  0 AS avgConfigurationsPerSession,
                  0 AS avgConfigurationsPerVisitor,
                  0 AS avgSessionsPerVisitor,
                  0 AS savedConfigurations)
              ) aaa `;

            await (await this.ormService.getConnection()).execute(sql, [partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().from.format('YYYY-MM-DD HH:00:00'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')]);

            // aggregate common stats
            sql = named(`INSERT INTO  analytics_common_minutely_stats (SELECT null as id, CONCAT(DATE(FROM_UNIXTIME(\`time\`)), ' ', HOUR(FROM_UNIXTIME(\`time\`))) AS \`date\`,	
                    MINUTE(FROM_UNIXTIME(\`time\`)) AS \`partition\`, 
                    'browser' AS metricName,
                    browser AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY browser, MINUTE(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, CONCAT(DATE(FROM_UNIXTIME(\`time\`)), ' ',HOUR(FROM_UNIXTIME(\`time\`))) AS \`date\`,
                    MINUTE(FROM_UNIXTIME(\`time\`)) AS \`partition\`, 
                    'device' AS metricName,
                    device AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY device, MINUTE(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, CONCAT(DATE(FROM_UNIXTIME(\`time\`)), ' ',HOUR(FROM_UNIXTIME(\`time\`))) AS \`date\`,	 
                    MINUTE(FROM_UNIXTIME(\`time\`)) AS \`partition\`,
                    'country' AS metricName,
                    country AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY country, MINUTE(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, CONCAT(DATE(FROM_UNIXTIME(\`time\`)), ' ',HOUR(FROM_UNIXTIME(\`time\`))) AS \`date\`,	
                    MINUTE(FROM_UNIXTIME(\`time\`)) AS \`partition\`, 
                    'os' AS metricName,
                    os AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY os, MINUTE(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, CONCAT(DATE(FROM_UNIXTIME(\`time\`)), ' ',HOUR(FROM_UNIXTIME(\`time\`))) AS \`date\`,	 
                    MINUTE(FROM_UNIXTIME(\`time\`)) AS \`partition\`,
                    'variant' AS metricName,
                    SUBSTRING_INDEX(\`event\`, ':', -1) AS metricValue,
                    CONCAT(SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 2), ':', -1), ':',  SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 3), ':', -1)) AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`type\` = 'pick_variant' && \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY \`event\`, MINUTE(FROM_UNIXTIME(\`time\`)))
                    `)({
                from: partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'),
                to: partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')
            });
            await (await this.ormService.getConnection()).query(sql);


        } catch (e) {
            this.logger.error('aggregateMinutelyStats error: ', e);
        }
    }


    async aggregateMonthlyStats(partition: Partition): Promise<any> {
        try {

            let sql = `INSERT INTO \`analytics_monthly_stats\` SELECT 
              id,
              \`year\`,
              \`month\`,
              collectedAt,
              SUM(visitors) AS visitors,
              SUM(sessions) AS sessions,
              SUM(configurations) AS configurations,
              SUM(avgSessionDuration) AS avgSessionDuration,
              SUM(avgConfigurationsPerSession) AS avgConfigurationsPerSession,
              SUM(avgConfigurationsPerVisitor) AS avgConfigurationsPerVisitor,
              SUM(avgSessionsPerVisitor) AS avgSessionsPerVisitor,
              SUM(savedConfigurations) AS savedConfigurations 
            FROM
              (
                (SELECT 
                  NULL AS id,
                  \`year\`,
                  \`month\`,
                  collectedAt,
                  COUNT(DISTINCT visitorId) AS visitors,
                  COUNT(*) AS sessions,
                  SUM(configurations) AS configurations,
                  AVG(sessionDuration) / COUNT(*) AS avgSessionDuration,
                  SUM(configurations) / COUNT(*) AS avgConfigurationsPerSession,
                  SUM(configurations) / COUNT(DISTINCT visitorId) AS avgConfigurationsPerVisitor,
                  COUNT(*) / COUNT(DISTINCT visitorId) AS avgSessionsPerVisitor,
                  SUM(savedConfigurations) AS savedConfigurations 
                FROM
                  (SELECT 
                    YEAR(FROM_UNIXTIME(\`time\`)) AS \`year\`,
                    MONTH(FROM_UNIXTIME(\`time\`)) AS \`month\`,
                    visitorId,
                    sessionId,
                    MAX(
                      IF(
                        \`type\` = 'session_duration',
                        \`data\`,
                        0
                      )
                    ) AS sessionDuration,
                    SUM(IF(\`type\` = 'pick_variant', 1, 0)) AS configurations,
                    AVG(
                      IF(
                        \`type\` = 'pick_variant_duration',
                        \`data\`,
                        0
                      )
                    ) AS configurationDuration,
                    SUM(
                      IF(\`type\` = 'save_configuration', 1, 0)
                    ) AS savedConfigurations,
                    NOW() AS collectedAt 
                  FROM
                    analytics_log 
                  WHERE \`time\` BETWEEN UNIX_TIMESTAMP(?) 
                    AND UNIX_TIMESTAMP(?) 
                  GROUP BY visitorId,
                    sessionId,
                    MONTH(FROM_UNIXTIME(\`time\`))) AS tmp_month_stats_intermediate 
                GROUP BY \`year\`,
                  \`month\`) 
                UNION
                (SELECT 
                  NULL AS id,
                  YEAR(?) AS \`year\`,
                  MONTH(?) AS \`month\`,
                  NOW() AS collectedAt,
                  0 AS visitors,
                  0 AS sessions,
                  0 AS configurations,
                  0 AS avgSessionDuration,
                  0 AS avgConfigurationsPerSession,
                  0 AS avgConfigurationsPerVisitor,
                  0 AS avgSessionsPerVisitor,
                  0 AS savedConfigurations)
              ) AS aaa `;
            await (await this.ormService.getConnection()).execute(sql, [partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'), partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')]);


            // aggregate common stats
            sql = named(`INSERT INTO  analytics_common_monthly_stats (SELECT null as id, 
                    YEAR(FROM_UNIXTIME(\`time\`)) AS \`year\`,
                    MONTH(FROM_UNIXTIME(\`time\`)) AS \`month\`,	 
                    'browser' AS metricName,
                    browser AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY browser, MONTH(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, 
                    YEAR(FROM_UNIXTIME(\`time\`)) AS \`year\`,
                    MONTH(FROM_UNIXTIME(\`time\`)) AS \`month\`,	 
                    'device' AS metricName,
                    device AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY device, MONTH(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, 
                    YEAR(FROM_UNIXTIME(\`time\`)) AS \`year\`,
                    MONTH(FROM_UNIXTIME(\`time\`)) AS \`month\`,	 
                    'country' AS metricName,
                    country AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY country, MONTH(FROM_UNIXTIME(\`time\`)))	
                    
                    UNION
                    
                    (SELECT null as id, 
                    YEAR(FROM_UNIXTIME(\`time\`)) AS \`year\`,
                    MONTH(FROM_UNIXTIME(\`time\`)) AS \`month\`,	 
                    'os' AS metricName,
                    os AS metricValue,
                    NULL AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY os, MONTH(FROM_UNIXTIME(\`time\`)))
                    
                    UNION
                    
                    (SELECT null as id, 
                    YEAR(FROM_UNIXTIME(\`time\`)) AS \`year\`,
                    MONTH(FROM_UNIXTIME(\`time\`)) AS \`month\`,	 
                    'variant' AS metricName,
                    SUBSTRING_INDEX(\`event\`, ':', -1) AS metricValue,
                    CONCAT(SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 2), ':', -1), ':',  SUBSTRING_INDEX(SUBSTRING_INDEX(\`event\`, ':', 3), ':', -1)) AS category,
                    COUNT(distinct visitorId) AS amount,
                    NOW() AS collectedAt
                    FROM analytics_log 
                    WHERE \`type\` = 'pick_variant' && \`time\` BETWEEN UNIX_TIMESTAMP(:from) AND UNIX_TIMESTAMP(:to)
                    GROUP BY \`event\`, MONTH(FROM_UNIXTIME(\`time\`)))
                    `)({
                from: partition.dateTimeInterval().from.format('YYYY-MM-DD HH:mm:ss'),
                to: partition.dateTimeInterval().to.format('YYYY-MM-DD HH:mm:ss')
            });
            await (await this.ormService.getConnection()).query(sql);

        } catch (e) {
            this.logger.error('aggregateDailyStats error: ', e);
        }
    }


    async collectHourlyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure | null> {
        try {

            let sql = named(`SELECT *, 'hourly' as \`type\` FROM analytics_hourly_stats
                    WHERE \`date\` BETWEEN :from AND :to
                    ORDER BY \`date\`, \`partition\``)
            ({
                from: from.format('YYYY-MM-DD'),
                to: to.format('YYYY-MM-DD')
            });

            let stats = await (await this.ormService.getConnection()).execute(sql);


            sql = named(`SELECT \`date\`, \`partition\`, metricName, metricValue, IFNULL(category, 'N/A') AS category, SUM(amount) AS amount
                    FROM analytics_common_hourly_stats
                    WHERE \`date\` BETWEEN :from AND :to
                    GROUP BY \`metricName\`, \`metricValue\`, category`)
            ({
                from: from.format('YYYY-MM-DD'),
                to: to.format('YYYY-MM-DD')
            });

            let commonStats = await (await this.ormService.getConnection()).execute(sql);

            let totalsStats = await this.retrieveTotals(from, to);

            return {
                main: stats[0],
                common: commonStats[0],
                totals: totalsStats[0][0]
            }

        } catch (e) {
            this.logger.error('collectHourlyStats error: ', e);
        }
        return null;
    }

    async collectDailyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure | null> {
        try {

            let sql = named(`SELECT *, 'daily' as \`type\` FROM analytics_daily_stats
                    WHERE \`date\` BETWEEN :from AND :to
                    ORDER BY \`date\``)
            ({
                from: from.format('YYYY-MM-DD'),
                to: to.format('YYYY-MM-DD')
            });

            let stats = await (await this.ormService.getConnection()).execute(sql);


            sql = named(`SELECT \`date\`, metricName, metricValue, IFNULL(category, 'N/A') AS category, SUM(amount) AS amount
                    FROM analytics_common_daily_stats
                    WHERE \`date\` BETWEEN :from AND :to
                    GROUP BY \`metricName\`, \`metricValue\`, category`)
            ({
                from: from.format('YYYY-MM-DD'),
                to: to.format('YYYY-MM-DD')
            });

            let commonStats = await (await this.ormService.getConnection()).execute(sql);


            // totals
            let totalsStats = await this.retrieveTotals(from, to);

            return {
                main: stats[0],
                common: commonStats[0],
                totals: totalsStats[0][0]
            }

        } catch (e) {
            this.logger.error('collectDailyStats error: ', e);
        }
        return null;
    }

    async collectMonthlyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure | null> {
        try {

            this.logger.debug('collectMonthlySatas', from, to);

            let sql = named(`SELECT *, 'monthly' as \`type\` 
                    FROM (SELECT *, CONCAT(\`year\`, '-', \`month\`) AS \`date\` FROM analytics_monthly_stats) AS aaa
                    WHERE \`date\` between :from AND :to
                    ORDER BY \`year\`, \`month\``)
            ({
                from: Number.parseInt(from.format('YYYY-M')),
                to: Number.parseInt(to.format('YYYY-M')),
            });

            let stats = await (await this.ormService.getConnection()).execute(sql);

            this.logger.debug(sql);


            sql = named(`SELECT *
                    FROM (SELECT metricName, metricValue, IFNULL(category, 'N/A') AS category, SUM(amount) AS amount, CONCAT(\`year\`, '-', \`month\`) AS \`date\` FROM analytics_common_monthly_stats GROUP BY metricName, metricValue,category,\`date\`) AS aaa
                    WHERE \`date\` between :from AND :to
                    GROUP BY \`metricName\`, \`metricValue\`, category, \`date\``)
            ({
                from: Number.parseInt(from.format('YYYY-M')),
                to: Number.parseInt(to.format('YYYY-M')),
            });

            let commonStats = await (await this.ormService.getConnection()).execute(sql);

            let totalsStats = await this.retrieveTotals(from, to);

            return {
                main: stats[0],
                common: commonStats[0],
                totals: totalsStats[0][0]
            }

        } catch (e) {
            this.logger.error('collectMonthlyStats error: ', e);
        }
        return null;
    }


    async collectMinutelyStats(from: moment.Moment, to: moment.Moment): Promise<IDataStructure | any> {
        try {

            let sql = named(`SELECT *, 'minutely' as \`type\` FROM analytics_minutely_stats
                    WHERE \`date\` BETWEEN :from AND :to
                    ORDER BY \`date\`, \`partition\``)
            ({
                from: from.format('YYYY-MM-DD HH'),
                to: to.format('YYYY-MM-DD HH')
            });

            let stats = await (await this.ormService.getConnection()).execute(sql);


            sql = named(`SELECT \`date\`, \`partition\`, metricName, metricValue, IFNULL(category, 'N/A') AS category, SUM(amount) AS amount
                    FROM analytics_common_minutely_stats
                    WHERE \`date\` BETWEEN :from AND :to
                    GROUP BY \`metricName\`, \`metricValue\`, category`)
            ({
                from: from.format('YYYY-MM-DD HH'),
                to: to.format('YYYY-MM-DD HH')
            });
            let commonStats = await (await this.ormService.getConnection()).execute(sql);

            // totals

            let totalsStats = await this.retrieveTotals(from, to);

            return {
                main: stats[0],
                common: commonStats[0],
                totals: totalsStats[0][0]
            };

        } catch (e) {
            this.logger.error('collectMinutelyStats error: ', e);
        }
        return null;
    }

    private async retrieveTotals(from: moment.Moment, to: moment.Moment) {
        let sql = named(`
                SELECT 
                  SUM(visitors) AS visitors,
                  SUM(sessions) AS sessions,
                  SUM(configurations) AS configurations,
                  SUM(avgSessionDuration) AS avgSessionDuration,
                  SUM(avgConfigurationsPerSession) AS avgConfigurationsPerSession,
                  SUM(avgConfigurationsPerVisitor) AS avgConfigurationsPerVisitor,
                  SUM(avgSessionsPerVisitor) AS avgSessionsPerVisitor,
                  SUM(savedConfigurations) AS savedConfigurations 
                FROM
                  (
                    (SELECT 
                      COUNT(DISTINCT visitorId) AS visitors,
                      COUNT(*) AS sessions,
                      SUM(configurations) AS configurations,
                      AVG(sessionDuration) / COUNT(*) AS avgSessionDuration,
                      SUM(configurations) / COUNT(*) AS avgConfigurationsPerSession,
                      SUM(configurations) / COUNT(DISTINCT visitorId) AS avgConfigurationsPerVisitor,
                      COUNT(*) / COUNT(DISTINCT visitorId) AS avgSessionsPerVisitor,
                      SUM(savedConfigurations) AS savedConfigurations 
                    FROM
                      (SELECT 
                        DATE(FROM_UNIXTIME(\`time\`)) AS \`date\`,
                        visitorId,
                        sessionId,
                        MAX(
                          IF(
                            \`type\` = 'session_duration',
                            \`data\`,
                            0
                          )
                        ) AS sessionDuration,
                        SUM(IF(\`type\` = 'pick_variant', 1, 0)) AS configurations,
                        AVG(
                          IF(
                            \`type\` = 'pick_variant_duration',
                            \`data\`,
                            0
                          )
                        ) AS configurationDuration,
                        SUM(
                          IF(\`type\` = 'save_configuration', 1, 0)
                        ) AS savedConfigurations,
                        NOW() AS collectedAt 
                      FROM
                        analytics_log 
                      WHERE \`time\` BETWEEN UNIX_TIMESTAMP(:from) 
                        AND UNIX_TIMESTAMP(:to) 
                      GROUP BY visitorId,
                        sessionId,
                        DATE(FROM_UNIXTIME(\`time\`))) AS tmp_daily_stats_intermediate) 
                    UNION
                    (SELECT 
                      0 AS visitors,
                      0 AS sessions,
                      0 AS configurations,
                      0 AS avgSessionDuration,
                      0 AS avgConfigurationsPerSession,
                      0 AS avgConfigurationsPerVisitor,
                      0 AS avgSessionsPerVisitor,
                      0 AS savedConfigurations)
                  ) AS aaa `)
        ({
            from: from.format('YYYY-MM-DD HH:mm:ss'),
            to: to.format('YYYY-MM-DD HH:mm:ss')
        });

        return (await this.ormService.getConnection()).execute(sql);
    }
}