
DROP TABLE IF EXISTS `minarepo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `minarepo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(100) NOT NULL,
  `user` varchar(100) NOT NULL,
  `geo` geometry NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `image` mediumtext,
  `comment` mediumtext,
  `address` varchar(255) DEFAULT NULL,
  `level` int not null default 0,
  `finished` tinyint default 0,
  PRIMARY KEY (`id`),
  SPATIAL KEY `minarepo_geo` (`geo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

drop table if exists `comment`;
CREATE TABLE comment(
  id bigint primary key auto_increment,
  report_id bigint not null,
  user varchar(100),
  comment text,
  `timestamp` timestamp not null default CURRENT_TIMESTAMP,
  `image` text
);

create index comment_rid_ts on comment (report_id, timestamp);

drop table if exists `geo_layer`;
create table geo_layer(
  id bigint primary key auto_increment,
  name varchar(100) not null,
  file_size integer not null,
  content longtext not null,
  created datetime not null
);
