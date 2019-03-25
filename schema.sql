/*
SQLyog Ultimate v11.52 (64 bit)
MySQL - 10.3.13-MariaDB-1:10.3.13+maria~bionic
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

/*Table structure for table `analytics_common_daily_stats` */

DROP TABLE IF EXISTS `analytics_common_daily_stats`;

CREATE TABLE `analytics_common_daily_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `metricName` varchar(100) NOT NULL,
  `metricValue` varchar(150) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `amount` float NOT NULL,
  `collectedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `metricName` (`metricName`),
  KEY `metricValue` (`metricValue`),
  KEY `category` (`category`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_common_hourly_stats` */

DROP TABLE IF EXISTS `analytics_common_hourly_stats`;

CREATE TABLE `analytics_common_hourly_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `partition` smallint(6) NOT NULL,
  `metricName` varchar(100) NOT NULL,
  `metricValue` varchar(150) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `amount` float NOT NULL,
  `collectedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`,`partition`),
  KEY `metricName` (`partition`),
  KEY `metricValue` (`metricValue`),
  KEY `category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_common_minutely_stats` */

DROP TABLE IF EXISTS `analytics_common_minutely_stats`;

CREATE TABLE `analytics_common_minutely_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL,
  `partition` int(11) NOT NULL,
  `metricName` varchar(100) NOT NULL,
  `metricValue` varchar(150) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `amount` float NOT NULL,
  `collectedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`,`partition`),
  KEY `metricName` (`metricName`),
  KEY `metricValue` (`metricValue`),
  KEY `category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_common_monthly_stats` */

DROP TABLE IF EXISTS `analytics_common_monthly_stats`;

CREATE TABLE `analytics_common_monthly_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` smallint(6) NOT NULL,
  `month` smallint(6) DEFAULT NULL,
  `metricName` varchar(100) NOT NULL,
  `metricValue` varchar(150) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `amount` float NOT NULL,
  `collectedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`year`,`month`),
  KEY `metricName` (`metricName`),
  KEY `metricValue` (`metricValue`),
  KEY `category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_daily_stats` */

DROP TABLE IF EXISTS `analytics_daily_stats`;

CREATE TABLE `analytics_daily_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `collectedAt` datetime NOT NULL,
  `visitors` float NOT NULL,
  `sessions` int(11) NOT NULL,
  `configurations` float NOT NULL,
  `avgSessionDuration` float NOT NULL,
  `avgConfigurationsPerSession` float NOT NULL,
  `avgConfigurationsPerVisitor` float NOT NULL,
  `avgSessionsPerVisitor` float NOT NULL,
  `savedConfigurations` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_hourly_stats` */

DROP TABLE IF EXISTS `analytics_hourly_stats`;

CREATE TABLE `analytics_hourly_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `partition` smallint(6) NOT NULL,
  `collectedAt` datetime NOT NULL,
  `visitors` float NOT NULL,
  `sessions` int(11) NOT NULL,
  `configurations` float NOT NULL,
  `avgSessionDuration` float NOT NULL,
  `avgConfigurationsPerSession` float NOT NULL,
  `avgConfigurationsPerVisitor` float NOT NULL,
  `avgSessionsPerVisitor` float NOT NULL,
  `savedConfigurations` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`,`partition`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_log` */

DROP TABLE IF EXISTS `analytics_log`;

CREATE TABLE `analytics_log` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `event` varchar(150) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `time` int(11) NOT NULL,
  `visitorId` char(36) NOT NULL,
  `sessionId` char(36) NOT NULL,
  `ip` varchar(100) NOT NULL,
  `country` char(2) NOT NULL,
  `os` varchar(100) NOT NULL,
  `device` varchar(100) NOT NULL,
  `browser` varchar(100) DEFAULT NULL,
  `data` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `time` (`time`),
  KEY `event_name` (`event`),
  KEY `visitor` (`visitorId`),
  KEY `session` (`sessionId`),
  KEY `type` (`type`),
  KEY `browser` (`browser`),
  KEY `os` (`os`),
  KEY `device` (`device`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_minutely_stats` */

DROP TABLE IF EXISTS `analytics_minutely_stats`;

CREATE TABLE `analytics_minutely_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` datetime NOT NULL,
  `partition` int(11) NOT NULL,
  `collectedAt` datetime NOT NULL,
  `visitors` float NOT NULL,
  `sessions` int(11) DEFAULT NULL,
  `configurations` float NOT NULL,
  `avgSessionDuration` float NOT NULL,
  `avgConfigurationsPerSession` float NOT NULL,
  `avgConfigurationsPerVisitor` float NOT NULL,
  `avgSessionsPerVisitor` float NOT NULL,
  `savedConfigurations` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`date`,`partition`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*Table structure for table `analytics_monthly_stats` */

DROP TABLE IF EXISTS `analytics_monthly_stats`;

CREATE TABLE `analytics_monthly_stats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `year` smallint(6) NOT NULL,
  `month` smallint(6) DEFAULT NULL,
  `collectedAt` datetime NOT NULL,
  `visitors` float NOT NULL,
  `sessions` int(11) NOT NULL,
  `configurations` float NOT NULL,
  `avgSessionDuration` float NOT NULL,
  `avgConfigurationsPerSession` float NOT NULL,
  `avgConfigurationsPerVisitor` float NOT NULL,
  `avgSessionsPerVisitor` float NOT NULL,
  `savedConfigurations` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `date` (`year`,`month`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
