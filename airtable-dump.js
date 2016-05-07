#!/usr/bin/env node

var Airtable = require('airtable');
var fs = require('fs');
var mkdirp = require('mkdirp');
var shelljs = require('shelljs');


function build_record(record) {
    return {
        "Base Name": record._table._base._name,
        "Base ID": record._table._base.getId(),
        "Table Name": record._table.name,
        "Table ID": record._table.id,
        "Record ID": record.getId(),
        "Fields": record.fields
    };
}


function dump_table(table, cb) {
    var dumped_records = [];

    table.select({
        maxRecords: 100,
        view: "Main View"
    }).eachPage(function page(records, fetchNextPage) {
        records.forEach(function(record) {
            dumped_records.push(build_record(record));
        });
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();

    }, function done(error) {
        if (error) throw error;
        cb(dumped_records);
    });

}


function dump_base(base, backup_dir) {
    base.table_names.forEach(function(table_name) {
        var file_name = backup_dir + '/' + base._name + '.' + table_name + '.json';

        dump_table(
            base(table_name),
            write_backup.bind(undefined, file_name.replace(/\s+/g, "_"))
        );
    });
}


function write_backup(file_name, dumped_records) {
    fs.writeFile(file_name, JSON.stringify(dumped_records, null, 2), function(error) {
        if (error) throw error;
        console.log('Wrote ' + file_name);
    });
}


function backup(bases, backup_dir) {
    mkdirp.sync(backup_dir);

    for (var base_name in bases) {
        var base = Airtable.base(bases[base_name].id);

        // Save base name and table names from bases.json
        // so we don't have to pass them around.
        base._name = base_name;
        base.table_names = bases[base_name].tables;

        dump_base(base, backup_dir);
    }
    // write time of backup
    fs.writeFileSync(backup_dir + '/timestamp.txt', new Date().toISOString());
}


//  Read list of bases out of bases.json
var bases = require('./bases.json');

// Read API key from CLI
var api_key = process.argv[2];
Airtable.configure({apiKey: api_key});

var backup_ts =  new Date().toISOString();
var backup_dir = 'Airtable_Backups/' + backup_ts
console.log("Backing up the following bases into " + backup_dir + ":\n ", Object.keys(bases).join('\n  '));

backup(bases, backup_dir);
